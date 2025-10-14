-- 売上日報自動集計システム - データベーススキーマ
-- 実行方法: docker compose exec postgres psql -U dify -d dify -f /path/to/sales_report_schema.sql

-- ==========================================
-- 1. 売上レポートファイル管理テーブル
-- ==========================================
CREATE TABLE IF NOT EXISTS sales_reports (
  id SERIAL PRIMARY KEY,
  report_date DATE NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(10) NOT NULL CHECK (file_type IN ('xlsx', 'pdf')),
  file_size INTEGER,
  file_name VARCHAR(255),
  telegram_message_id BIGINT,
  telegram_user_id BIGINT,
  telegram_username VARCHAR(100),
  status VARCHAR(50) DEFAULT 'received' CHECK (status IN ('received', 'processing', 'completed', 'error', 'retry')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_sales_reports_date ON sales_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_sales_reports_status ON sales_reports(status);
CREATE INDEX IF NOT EXISTS idx_sales_reports_created_at ON sales_reports(created_at DESC);

-- コメント
COMMENT ON TABLE sales_reports IS 'Telegramから受信した売上レポートファイルの管理';
COMMENT ON COLUMN sales_reports.status IS 'received: 受信済み, processing: 処理中, completed: 完了, error: エラー, retry: リトライ中';

-- ==========================================
-- 2. 売上データテーブル
-- ==========================================
CREATE TABLE IF NOT EXISTS sales_data (
  id SERIAL PRIMARY KEY,
  report_id INTEGER REFERENCES sales_reports(id) ON DELETE SET NULL,
  sales_date DATE NOT NULL UNIQUE,
  male_count INTEGER CHECK (male_count >= 0),
  female_count INTEGER CHECK (female_count >= 0),
  total_customer_count INTEGER GENERATED ALWAYS AS (COALESCE(male_count, 0) + COALESCE(female_count, 0)) STORED,
  section_a_sales DECIMAL(12, 2) CHECK (section_a_sales >= 0),
  section_b_sales DECIMAL(12, 2) CHECK (section_b_sales >= 0),
  section_c_sales DECIMAL(12, 2) CHECK (section_c_sales >= 0),
  other_sales DECIMAL(12, 2) CHECK (other_sales >= 0),
  total_sales DECIMAL(12, 2) NOT NULL CHECK (total_sales >= 0),
  notes TEXT,
  is_holiday BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_sales_data_date ON sales_data(sales_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_data_month ON sales_data(DATE_TRUNC('month', sales_date));

-- コメント
COMMENT ON TABLE sales_data IS '日別売上データ';
COMMENT ON COLUMN sales_data.is_holiday IS '休業日フラグ（営業しなかった日）';

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_sales_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sales_data_updated_at
  BEFORE UPDATE ON sales_data
  FOR EACH ROW
  EXECUTE FUNCTION update_sales_data_updated_at();

-- ==========================================
-- 3. 月次集計ビュー
-- ==========================================
CREATE OR REPLACE VIEW monthly_sales_summary AS
SELECT
  DATE_TRUNC('month', sales_date) AS month,
  COUNT(*) AS business_days,
  SUM(male_count) AS total_male_count,
  SUM(female_count) AS total_female_count,
  SUM(total_customer_count) AS total_customer_count,
  ROUND(AVG(total_customer_count), 1) AS avg_daily_customers,
  SUM(section_a_sales) AS total_section_a_sales,
  SUM(section_b_sales) AS total_section_b_sales,
  SUM(section_c_sales) AS total_section_c_sales,
  SUM(other_sales) AS total_other_sales,
  SUM(total_sales) AS total_monthly_sales,
  ROUND(AVG(total_sales), 2) AS avg_daily_sales,
  MAX(total_sales) AS max_daily_sales,
  MIN(total_sales) AS min_daily_sales
FROM sales_data
WHERE is_holiday = FALSE
GROUP BY DATE_TRUNC('month', sales_date)
ORDER BY month DESC;

COMMENT ON VIEW monthly_sales_summary IS '月次売上集計ビュー';

-- ==========================================
-- 4. エラーログテーブル
-- ==========================================
CREATE TABLE IF NOT EXISTS error_logs (
  id SERIAL PRIMARY KEY,
  report_id INTEGER REFERENCES sales_reports(id) ON DELETE CASCADE,
  workflow_name VARCHAR(100),
  error_type VARCHAR(100),
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  retry_count INTEGER DEFAULT 0,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_error_logs_report_id ON error_logs(report_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved) WHERE resolved = FALSE;

COMMENT ON TABLE error_logs IS 'ワークフロー実行時のエラーログ';

-- ==========================================
-- 5. Google Sheets同期履歴テーブル
-- ==========================================
CREATE TABLE IF NOT EXISTS sheets_sync_history (
  id SERIAL PRIMARY KEY,
  sales_data_id INTEGER REFERENCES sales_data(id) ON DELETE CASCADE,
  spreadsheet_id VARCHAR(100),
  sheet_name VARCHAR(100),
  row_number INTEGER,
  sync_status VARCHAR(50) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'success', 'failed')),
  error_message TEXT,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_sheets_sync_sales_data_id ON sheets_sync_history(sales_data_id);
CREATE INDEX IF NOT EXISTS idx_sheets_sync_status ON sheets_sync_history(sync_status);

COMMENT ON TABLE sheets_sync_history IS 'Google Sheetsへの同期履歴';

-- ==========================================
-- 6. システム設定テーブル
-- ==========================================
CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type VARCHAR(50) DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- デフォルト設定の挿入
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
  ('telegram_bot_enabled', 'true', 'boolean', 'Telegram Bot受信の有効/無効'),
  ('auto_process_files', 'true', 'boolean', 'ファイル自動処理の有効/無効'),
  ('google_sheets_auto_sync', 'true', 'boolean', 'Google Sheets自動同期の有効/無効'),
  ('error_notification_enabled', 'true', 'boolean', 'エラー通知の有効/無効'),
  ('max_retry_count', '3', 'number', 'エラー時の最大リトライ回数'),
  ('report_retention_days', '365', 'number', 'レポートファイル保持期間（日）')
ON CONFLICT (setting_key) DO NOTHING;

COMMENT ON TABLE system_settings IS 'システム設定管理';

-- ==========================================
-- 7. 便利なクエリ関数
-- ==========================================

-- 最新10件の売上データを取得
CREATE OR REPLACE FUNCTION get_latest_sales(days INTEGER DEFAULT 10)
RETURNS TABLE (
  sales_date DATE,
  male_count INTEGER,
  female_count INTEGER,
  total_sales DECIMAL(12, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.sales_date, s.male_count, s.female_count, s.total_sales
  FROM sales_data s
  WHERE s.is_holiday = FALSE
  ORDER BY s.sales_date DESC
  LIMIT days;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_latest_sales IS '最新N件の売上データを取得';

-- 特定月の売上データを取得
CREATE OR REPLACE FUNCTION get_monthly_sales(target_year INTEGER, target_month INTEGER)
RETURNS TABLE (
  sales_date DATE,
  total_customer_count INTEGER,
  total_sales DECIMAL(12, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.sales_date, s.total_customer_count, s.total_sales
  FROM sales_data s
  WHERE EXTRACT(YEAR FROM s.sales_date) = target_year
    AND EXTRACT(MONTH FROM s.sales_date) = target_month
    AND s.is_holiday = FALSE
  ORDER BY s.sales_date;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_monthly_sales IS '特定月の売上データを取得';

-- 前日比・前週比を含む最新データ取得
CREATE OR REPLACE FUNCTION get_sales_with_comparison(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  sales_date DATE,
  total_sales DECIMAL(12, 2),
  previous_day_sales DECIMAL(12, 2),
  day_over_day_change_pct DECIMAL(5, 2),
  previous_week_sales DECIMAL(12, 2),
  week_over_week_change_pct DECIMAL(5, 2)
) AS $$
BEGIN
  RETURN QUERY
  WITH current_sales AS (
    SELECT s.sales_date, s.total_sales
    FROM sales_data s
    WHERE s.sales_date = target_date
  ),
  previous_day AS (
    SELECT s.total_sales
    FROM sales_data s
    WHERE s.sales_date = target_date - INTERVAL '1 day'
      AND s.is_holiday = FALSE
  ),
  previous_week AS (
    SELECT s.total_sales
    FROM sales_data s
    WHERE s.sales_date = target_date - INTERVAL '7 days'
      AND s.is_holiday = FALSE
  )
  SELECT
    cs.sales_date,
    cs.total_sales,
    pd.total_sales AS previous_day_sales,
    ROUND(((cs.total_sales - pd.total_sales) / NULLIF(pd.total_sales, 0) * 100), 2) AS day_over_day_change_pct,
    pw.total_sales AS previous_week_sales,
    ROUND(((cs.total_sales - pw.total_sales) / NULLIF(pw.total_sales, 0) * 100), 2) AS week_over_week_change_pct
  FROM current_sales cs
  LEFT JOIN previous_day pd ON TRUE
  LEFT JOIN previous_week pw ON TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_sales_with_comparison IS '前日比・前週比を含む売上データ取得';

-- ==========================================
-- 8. データクリーンアップ用関数
-- ==========================================

-- 古いエラーログを削除
CREATE OR REPLACE FUNCTION cleanup_old_error_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM error_logs
  WHERE created_at < CURRENT_DATE - retention_days * INTERVAL '1 day'
    AND resolved = TRUE;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_error_logs IS '古い解決済みエラーログを削除';

-- ==========================================
-- 9. 初期データ・サンプルデータ
-- ==========================================

-- サンプルデータ（テスト用）
-- INSERT INTO sales_data (sales_date, male_count, female_count, section_a_sales, section_b_sales, total_sales) VALUES
--   ('2025-10-01', 45, 78, 1234567, 987654, 2222221),
--   ('2025-10-02', 52, 81, 1345678, 1012345, 2358023),
--   ('2025-10-03', 48, 75, 1189456, 945123, 2134579);

-- ==========================================
-- 10. 権限設定（必要に応じて）
-- ==========================================

-- n8n用ユーザーに権限付与（既存のdifyユーザーを使用）
GRANT SELECT, INSERT, UPDATE ON sales_reports TO dify;
GRANT SELECT, INSERT, UPDATE ON sales_data TO dify;
GRANT SELECT, INSERT ON error_logs TO dify;
GRANT SELECT, INSERT ON sheets_sync_history TO dify;
GRANT SELECT, UPDATE ON system_settings TO dify;

-- シーケンスへの権限
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO dify;

-- ビューへの権限
GRANT SELECT ON monthly_sales_summary TO dify;

-- 関数実行権限
GRANT EXECUTE ON FUNCTION get_latest_sales TO dify;
GRANT EXECUTE ON FUNCTION get_monthly_sales TO dify;
GRANT EXECUTE ON FUNCTION get_sales_with_comparison TO dify;

-- ==========================================
-- セットアップ完了確認
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '売上日報自動集計システム - データベース初期化完了';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'テーブル作成: ✓';
  RAISE NOTICE 'インデックス作成: ✓';
  RAISE NOTICE 'ビュー作成: ✓';
  RAISE NOTICE '関数作成: ✓';
  RAISE NOTICE '権限設定: ✓';
  RAISE NOTICE '========================================';
END $$;

-- テーブル一覧表示
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND columns.table_name = tables.table_name) AS column_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'sales_%' OR table_name IN ('error_logs', 'sheets_sync_history', 'system_settings')
ORDER BY table_name;
