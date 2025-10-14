# 売上日報自動集計システム - 実装設計書

## 📋 システム概要

テレグラムで受信した売上日報（Excel/PDF）を自動解析し、Google Sheetsダッシュボードに集計するワークフローシステム。

---

## 🎯 要件定義

### インプット
- **ソース**: Telegram報告用グループチャット
- **タイミング**: 営業終了後の早朝
- **ファイル形式**:
  - Excel: 1ヶ月分のシート（日別シートで営業日のみデータあり）
  - PDF: 営業日のみ

### 取得データ項目
1. 営業日（日付）
2. 男性人数
3. 女性人数
4. 各セクション売上
5. 総売上

### アウトプット
- **Google Sheets ダッシュボード**
  - 日付別売上
  - 月次集計
  - 自動グラフ更新

---

## 🏗 システムアーキテクチャ

### Phase 1: データ受信・保存
```
Telegram Bot → n8n Webhook → ファイル保存 → メタデータ記録
```

### Phase 2: ファイル解析
```
n8n (ファイル検出) → Dify (Excel/PDF解析・データ抽出) → 構造化データ生成
```

### Phase 3: データ集計・更新
```
構造化データ → n8n → Google Sheets API → ダッシュボード更新 → 通知
```

---

## 🔧 技術スタック

### 必要なコンポーネント

#### 1. Telegram Bot API
- **用途**: グループチャットからのファイル受信
- **必要な設定**: Bot Token、グループChat ID
- **n8nノード**: Telegram Trigger

#### 2. ファイル処理
- **Excel解析**:
  - n8nの`Spreadsheet File`ノード
  - または`Code`ノードでライブラリ使用（xlsx、ExcelJS）
- **PDF解析**:
  - Difyでテキスト抽出
  - OCR必要な場合: Google Vision API連携

#### 3. Dify
- **用途**:
  - ファイルからのデータ抽出
  - 数値の検証・補完
  - 異常値検知
- **必要なプロンプト**: データ抽出・構造化プロンプト

#### 4. Google Sheets API
- **用途**: ダッシュボード更新
- **必要な認証**: OAuth 2.0 または Service Account
- **n8nノード**: Google Sheets

#### 5. 通知
- **Telegram**: 処理完了通知
- **LINE**: オプション
- **Notion**: レポートページ作成

---

## 📐 ワークフロー詳細設計

### Workflow 1: Telegram → ファイル受信・保存

```yaml
名前: Sales Report Receiver
トリガー: Telegram Message (Document)

ステップ:
1. Telegram Trigger
   - イベント: message
   - フィルター: document または file

2. ファイル判定
   - 条件分岐: .xlsx または .pdf

3. ファイルダウンロード
   - Telegram API経由でファイル取得

4. ファイル保存
   - パス: /app/data/reports/YYYY-MM-DD_report.xlsx
   - メタデータ: 日時、送信者、ファイル名

5. PostgreSQL記録
   - テーブル: sales_reports
   - カラム: id, date, file_path, file_type, status, created_at

6. 次ワークフローをトリガー
   - Webhook呼び出し: Report Processor
```

### Workflow 2: ファイル解析・データ抽出

```yaml
名前: Sales Report Processor
トリガー: Webhook (from Receiver)

ステップ:
1. Webhook受信
   - データ: file_path, file_type, report_date

2. ファイル読み込み
   - Excelの場合: Spreadsheet Fileノード
   - PDFの場合: PDF読み込み → テキスト抽出

3. データ抽出 (Code Node + Dify API)
   Excel処理:
   - 営業日シートの特定 (シート名または日付列で判定)
   - 指定セルの値を取得
     - A1: 営業日
     - B5: 男性人数
     - C5: 女性人数
     - D10: セクションA売上
     - E10: セクションB売上
     - F10: 総売上

   PDF処理:
   - Dify APIでテキスト解析
   - プロンプト: "この売上報告書から以下のデータを抽出してJSONで返してください..."

4. データ検証
   - 必須項目チェック
   - 数値範囲チェック
   - 異常値検知（前日比、前月比）

5. 構造化データ作成
   JSON形式:
   {
     "date": "2025-10-13",
     "male_count": 45,
     "female_count": 78,
     "section_a_sales": 1234567,
     "section_b_sales": 987654,
     "total_sales": 2222221,
     "source_file": "path/to/file",
     "processed_at": "2025-10-13T10:30:00Z"
   }

6. PostgreSQL保存
   - テーブル: sales_data

7. 次ワークフローをトリガー
   - Webhook: Dashboard Updater
```

### Workflow 3: Google Sheets更新

```yaml
名前: Dashboard Updater
トリガー: Webhook (from Processor)

ステップ:
1. Webhook受信
   - 構造化データ受信

2. Google Sheets接続
   - 認証: OAuth 2.0
   - スプレッドシートID指定

3. 日次データ更新
   - シート名: "日次売上"
   - 行追加または更新（日付で検索）
   - 列マッピング:
     A列: 日付
     B列: 男性人数
     C列: 女性人数
     D列: セクションA売上
     E列: セクションB売上
     F列: 総売上

4. 月次集計更新
   - シート名: "月次集計"
   - SUMIF/QUERY関数で自動集計
   - 必要に応じてn8nで集計計算

5. 更新確認
   - 書き込み成功チェック

6. 通知送信
   - Telegram: "✅ 2025-10-13の売上データを更新しました"
   - Notion: レポートページ作成（オプション）

7. ステータス更新
   - PostgreSQL: status = 'completed'
```

### Workflow 4: エラーハンドリング・通知

```yaml
名前: Error Handler
トリガー: エラー発生時

ステップ:
1. エラー検知
   - ファイル読み込み失敗
   - データ抽出失敗
   - Google Sheets更新失敗

2. エラー分類
   - リトライ可能: ネットワークエラー、一時的な障害
   - リトライ不可: ファイル破損、認証エラー

3. リトライロジック
   - 最大3回、指数バックオフ（1秒、2秒、4秒）

4. エラー通知
   - Telegram: 管理者グループに通知
   - 内容: エラー内容、ファイル情報、リトライ状況

5. ログ記録
   - PostgreSQL: error_logs テーブル
```

---

## 🗄 データベーススキーマ

### テーブル: sales_reports
```sql
CREATE TABLE sales_reports (
  id SERIAL PRIMARY KEY,
  report_date DATE NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(10) NOT NULL, -- 'xlsx' or 'pdf'
  file_size INTEGER,
  telegram_message_id BIGINT,
  status VARCHAR(50) DEFAULT 'received', -- received, processing, completed, error
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  error_message TEXT
);

CREATE INDEX idx_report_date ON sales_reports(report_date);
CREATE INDEX idx_status ON sales_reports(status);
```

### テーブル: sales_data
```sql
CREATE TABLE sales_data (
  id SERIAL PRIMARY KEY,
  report_id INTEGER REFERENCES sales_reports(id),
  sales_date DATE NOT NULL UNIQUE,
  male_count INTEGER,
  female_count INTEGER,
  total_customer_count INTEGER,
  section_a_sales DECIMAL(12, 2),
  section_b_sales DECIMAL(12, 2),
  section_c_sales DECIMAL(12, 2),
  total_sales DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sales_date ON sales_data(sales_date);
```

### テーブル: error_logs
```sql
CREATE TABLE error_logs (
  id SERIAL PRIMARY KEY,
  report_id INTEGER REFERENCES sales_reports(id),
  error_type VARCHAR(100),
  error_message TEXT,
  stack_trace TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔐 セキュリティ・認証設定

### 1. Telegram Bot設定
```bash
# BotFatherで新しいBotを作成
# 1. @BotFatherにメッセージ
# 2. /newbot コマンド
# 3. Bot名とユーザー名を設定
# 4. Bot Tokenを取得

# グループChat IDの取得方法
# 1. Botをグループに追加
# 2. グループで何かメッセージ送信
# 3. https://api.telegram.org/bot<TOKEN>/getUpdates にアクセス
# 4. chat.id を確認
```

### 2. Google Sheets認証
```yaml
方法1: OAuth 2.0 (推奨)
- Google Cloud Consoleでプロジェクト作成
- Google Sheets API有効化
- OAuth 2.0クライアントID作成
- n8nで認証フロー実行

方法2: Service Account
- Google Cloud Consoleでサービスアカウント作成
- JSON Key取得
- 対象スプレッドシートを共有
- n8nにJSON Keyを設定
```

### 3. 環境変数
```env
# Telegram
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=-1001234567890

# Google Sheets
GOOGLE_SHEETS_SPREADSHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@xxx.iam.gserviceaccount.com

# Dify
DIFY_API_KEY=app-xxxxxxxxxxxx
DIFY_API_ENDPOINT=http://dify-api:5001

# Storage
REPORTS_STORAGE_PATH=/app/data/reports
```

---

## 📊 Google Sheetsダッシュボード構造

### シート1: 日次売上
```
A列 | B列     | C列     | D列         | E列         | F列
日付 | 男性人数 | 女性人数 | セクションA | セクションB | 総売上
2025-10-01 | 45 | 78 | 1,234,567 | 987,654 | 2,222,221
2025-10-02 | 52 | 81 | 1,345,678 | 1,012,345 | 2,358,023
...
```

### シート2: 月次集計
```
A列   | B列       | C列       | D列
月    | 営業日数   | 総客数     | 総売上
2025-10 | 15 | 1,850 | 35,000,000
2025-11 | ... | ... | ...
```

### シート3: グラフ
- 日別売上推移（折れ線グラフ）
- 月次売上比較（棒グラフ）
- セクション別売上構成（円グラフ）

---

## 🚀 実装ステップ

### Step 1: Telegram Bot作成（5分）
1. @BotFatherでBot作成
2. Bot TokenとChat IDを取得
3. .envファイルに追加

### Step 2: Google Sheets準備（10分）
1. 新しいスプレッドシート作成
2. シート構造作成（日次売上、月次集計）
3. サービスアカウント作成・共有設定

### Step 3: データベーステーブル作成（5分）
```bash
docker compose exec postgres psql -U dify -d dify -f /path/to/schema.sql
```

### Step 4: n8nワークフロー構築（60-90分）
1. Telegram Receiverワークフロー作成
2. File Processorワークフロー作成
3. Dashboard Updaterワークフロー作成
4. Error Handlerワークフロー作成

### Step 5: テスト（30分）
1. サンプルExcelファイルで動作確認
2. サンプルPDFファイルで動作確認
3. エラーシナリオのテスト

### Step 6: 本番運用開始
1. 実際のTelegramグループに統合
2. モニタリング開始
3. フィードバック収集と調整

---

## 💡 拡張機能アイデア

### Phase 2
- 異常値検知とアラート（前日比-20%以上など）
- 週次・月次レポートの自動生成とメール配信
- Notionへのレポートページ自動作成

### Phase 3
- 予測分析（売上予測、客数予測）
- 競合店舗との比較分析
- スタッフ別パフォーマンス分析

---

## 📞 次のアクション

1. **Telegram Bot作成** - すぐに実行可能
2. **Google Sheets作成** - テンプレート提供可能
3. **n8nワークフロー実装開始** - ステップバイステップで構築

準備ができたら教えてください！
