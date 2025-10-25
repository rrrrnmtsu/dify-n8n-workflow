# CROSS ROPPONGI 売上日報自動化システム - 完全ドキュメント

**作成日**: 2025-10-22
**最終更新**: 2025-10-22
**ステータス**: ✅ 本番稼働中

---

## 📋 目次

1. [システム概要](#システム概要)
2. [アーキテクチャ](#アーキテクチャ)
3. [ワークフロー詳細](#ワークフロー詳細)
4. [技術仕様](#技術仕様)
5. [運用方法](#運用方法)
6. [トラブルシューティング](#トラブルシューティング)
7. [セットアップ履歴](#セットアップ履歴)

---

## システム概要

### 目的
CROSS ROPPONGIの売上日報Excelファイルを、TelegramからGoogle Sheetsに自動同期するシステム。

### 主な機能
- ✅ Telegramグループから自動的にExcelファイル取得
- ✅ 23項目のデータを自動抽出・解析
- ✅ Google Sheetsに自動同期（UPSERT）
- ✅ 処理完了をTelegramに通知
- ✅ 重複処理防止機能（5分制限）
- ✅ 毎朝8:30に自動実行

### 対象ファイル形式
**ファイル名**: `yyyymmddCROSSROPPONGI.xlsx`
**例**: `20251021CROSSROPPONGI.xlsx`

**Excelシート構造**:
- シート名: 日付の「日」部分（例: 21日 → `21`）
- セル配置: 固定レイアウト（詳細は技術仕様参照）

---

## アーキテクチャ

### システム構成図

```
┌─────────────────────────────────────────────────────────────┐
│                     Telegram Group                          │
│          (CROSS ROPPONNGI 経理 日報)                       │
│                 Chat ID: -4796493812                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Excelファイルアップロード
                     │ yyyymmddCROSSROPPONGI.xlsx
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      n8n Workflow                           │
│              (毎朝8:30自動実行)                            │
│                                                             │
│  Schedule Trigger → Get Telegram Updates                   │
│         ↓                                                   │
│  Filter Excel Files (重複チェック・5分制限)               │
│         ↓                                                   │
│  Get File Path → Download Excel                            │
│         ↓                                                   │
│  Code (ファイル名修正)                                     │
│         ↓                                                   │
│  Parse Excel via API ──→ Excel Parser (Flask)              │
│         ↓                 (Python + openpyxl)              │
│  Sync to Google Sheets                                      │
│         ↓                                                   │
│  Set (通知データ準備)                                      │
│         ↓                                                   │
│  Send Success Message → Telegram                           │
└─────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Google Sheets                             │
│   Spreadsheet ID: 14ACKU8Rl9ZHtlNvSHeyHr2BSqunRmFAB1nJ7... │
│   Sheet Name: Sheet1                                        │
│   UPSERT: 営業日列でマッチング                             │
└─────────────────────────────────────────────────────────────┘
```

### Docker構成

```yaml
services:
  - n8n: ワークフロー自動化エンジン (Port: 5678)
  - excel-parser: Excel解析API (Port: 5002→5000)
  - postgres: データベース (n8n + Dify共用)
  - redis: キャッシュ (Dify用)
  - dify-api: (停止中)
  - dify-web: (停止中)
```

---

## ワークフロー詳細

### ノード構成

#### 1. Schedule Trigger
**設定**:
- Cron Expression: `30 8 * * *` (毎朝8:30 JST)
- Timezone: Asia/Tokyo

#### 2. Get Telegram Updates (HTTP Request)
**設定**:
- Method: POST
- URL: `https://api.telegram.org/bot8401202439:AAHwPAMl26dYPi7J6N2LV_o32VKb2T0BtbI/getUpdates`
- Body:
  ```json
  {
    "offset": {{ $execution.customData.get('last_update_id') || 0 }},
    "timeout": 25,
    "allowed_updates": ["message"]
  }
  ```

#### 3. Filter Excel Files (Code Node)
**機能**:
- ファイル名パターンチェック: `^(\d{4})(\d{2})(\d{2})CROSSROPPONGI\.`
- Chat ID フィルタ: `-4796493812`
- 重複処理防止: 同じファイル名を5分以内に再処理しない
- ファイル名ごとにグループ化し、最新のみ処理

**重要な定数**:
```javascript
const allowedChatId = -4796493812;
const DUPLICATE_THRESHOLD = 300; // 5分
```

**保存データ**:
- `last_processed_files`: ファイル名と処理時刻のマップ (JSON文字列)
- `last_update_id`: 最後に処理したupdate_id

#### 4. Get File Path (HTTP Request)
**設定**:
- Method: GET
- URL: `https://api.telegram.org/bot8401202439:AAHwPAMl26dYPi7J6N2LV_o32VKb2T0BtbI/getFile?file_id={{ $json.file_id }}`

#### 5. Download Excel (HTTP Request)
**設定**:
- Method: GET
- URL: `https://api.telegram.org/file/bot8401202439:AAHwPAMl26dYPi7J6N2LV_o32VKb2T0BtbI/{{ $json.result.file_path }}`
- Response Format: File (Binary)

#### 6. Code (JavaScript)
**機能**: バイナリデータのファイル名を元のファイル名に修正

```javascript
const originalFileName = $('Filter Excel Files').item.json.file_name;
const binaryData = $input.first().binary.data;

const updatedBinary = {
  ...binaryData,
  fileName: originalFileName
};

return [{
  json: $input.first().json,
  binary: {
    data: updatedBinary
  }
}];
```

#### 7. Parse Excel via API (HTTP Request)
**設定**:
- Method: POST
- URL: `http://excel-parser:5000/parse`
- Body Content Type: Multipart Form Data
- Parameters:
  - Name: `file`
  - Type: n8n Binary File
  - Field: `data`

**出力例**:
```json
{
  "source_file": "20251021CROSSROPPONGI.xlsx",
  "sheet_name": "21",
  "business_date": "2025-10-21",
  "total_customer_count": 75,
  "male_count": 40,
  "female_count": 35,
  "total_sales": 1854200,
  "cash_shortage": 0,
  "section_sales": {
    "front": 50000,
    "cloak_supplies": 10000,
    "locker": 5000,
    "bar1": 300000,
    "bar2": 250000,
    "bar3": 200000,
    "bar4": 150000,
    "vip1": 200000,
    "vvip": 50000,
    "party": 19200
  },
  "receivables": {
    "uncollected": 50000,
    "collected": 10000
  },
  "vip_details": {
    "vip_customers": [...],
    "vvip_customers": [...]
  },
  "validation": {
    "warnings": [],
    "errors": []
  }
}
```

#### 8. Sync to Google Sheets
**設定**:
- Operation: Append or Update Row
- Document ID: `14ACKU8Rl9ZHtlNvSHeyHr2BSqunRmFAB1nJ7Nqm6_2o`
- Sheet Name: `Sheet1`
- Mapping Column Mode: Map Each Column Manually
- Column to Match On: `営業日`

**列マッピング** (式モード):
```
営業日: $json.business_date
総来客数: $json.total_customer_count
男性: $json.male_count
女性: $json.female_count
総売上: $json.total_sales
現金化不足: $json.cash_shortage
FRONT売上: $json.section_sales.front
CLOAK/備品売上: $json.section_sales.cloak_supplies
LOCKER売上: $json.section_sales.locker
BAR1売上: $json.section_sales.bar1
BAR2売上: $json.section_sales.bar2
BAR3売上: $json.section_sales.bar3
BAR4売上: $json.section_sales.bar4
VIP1売上: $json.section_sales.vip1
VVIP売上: $json.section_sales.vvip
PARTY売上: $json.section_sales.party
未収金: $json.receivables.uncollected
未収回収: $json.receivables.collected
VIP詳細JSON: JSON.stringify($json.vip_details)
```

#### 9. Set (Manual Mapping)
**機能**: Telegram通知用のデータを準備

**Mappings**:
```
telegram_chat_id: {{ $('Filter Excel Files').first().json.chat_id }}
telegram_message_id: {{ $('Filter Excel Files').first().json.message_id }}
file_name: {{ $('Filter Excel Files').first().json.file_name }}
business_date: {{ $('Parse Excel via API').first().json.business_date }}
total_sales: {{ $('Parse Excel via API').first().json.total_sales }}
total_customer_count: {{ $('Parse Excel via API').first().json.total_customer_count }}
```

#### 10. Send Success Message (HTTP Request)
**設定**:
- Method: POST
- URL: `https://api.telegram.org/bot8401202439:AAHwPAMl26dYPi7J6N2LV_o32VKb2T0BtbI/sendMessage`
- Body:
```json
{
  "chat_id": {{ $json.telegram_chat_id }},
  "text": "✅ {{ $json.file_name }} のデータをGoogle Sheetsに同期しました。\n\n営業日: {{ $json.business_date }}\n総売上: ¥{{ $json.total_sales }}\n総来客数: {{ $json.total_customer_count }}名"
}
```

---

## 技術仕様

### Excel Parser API

**技術スタック**:
- Python 3.11
- Flask 3.0.0
- openpyxl 3.1.2
- gunicorn 21.2.0

**Dockerfile**:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir flask==3.0.0 openpyxl==3.1.2 gunicorn==21.2.0
COPY app.py /app/
EXPOSE 5000
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "120", "app:app"]
```

**エンドポイント**:

#### GET /health
**レスポンス**:
```json
{
  "status": "ok",
  "service": "excel-parser"
}
```

#### POST /parse
**リクエスト**:
- Content-Type: multipart/form-data
- Parameter: `file` (Excelファイル)
- Query Parameter (オプション): `filename` (元のファイル名)

**処理フロー**:
1. ファイル名から日付抽出: `(\d{4})(\d{2})(\d{2})`
2. 日の部分をシート名として使用: `str(int(day))`
3. openpyxlでExcelファイル読み込み
4. 固定セル位置から23項目のデータ抽出
5. データ検証（来客数の整合性など）
6. JSON形式で返却

**セル位置マッピング**:

| データ項目 | セル位置 | 型 |
|-----------|---------|-----|
| 営業日 | P2:R2 | 日付 |
| 総来客数 | O2 | 数値 |
| 男性 | T2 | 数値 |
| 女性 | U2 | 数値 |
| 総売上 | K64:M65 | 通貨 |
| 現金化不足 | O64:O65 | 通貨 |
| FRONT売上 | F5 | 通貨 |
| CLOAK/備品売上 | F10 | 通貨 |
| LOCKER売上 | F14 | 通貨 |
| BAR1売上 | F15 | 通貨 |
| BAR2売上 | F16 | 通貨 |
| BAR3売上 | F17 | 通貨 |
| BAR4売上 | F18 | 通貨 |
| VIP1売上 | F32 | 通貨 |
| VVIP売上 | F33 | 通貨 |
| PARTY売上 | F48 | 通貨 |
| 未収金 | J61:K61 | 通貨 |
| 未収回収 | Q61:R61 | 通貨 |
| VIP名前 | AA5:AA27 | 配列 |
| VIP金額 | AB5:AB27 | 通貨配列 |
| VVIP名前 | AA29:AA52 | 配列 |
| VVIP金額 | AB29:AB52 | 通貨配列 |

**エラーレスポンス**:
```json
{
  "error": "エラーメッセージ",
  "type": "エラータイプ"
}
```

### Docker Compose設定

**ポートマッピング**:
- n8n: `5678:5678`
- excel-parser: `5002:5000` (macOS Control Centerとの競合回避)
- dify-api: `5001:5001` (停止中)
- dify-web: `3000:3000` (停止中)

**ネットワーク**:
- `dify_network`: Dify関連サービス
- `workflow_network`: n8n ↔ excel-parser

### Google Sheets API

**認証方式**: OAuth2
**スコープ**: Google Sheets API

**Credential設定**:
- Type: Google Sheets OAuth2
- OAuth Consent Screen: External (テストユーザー設定済み)
- Test User: ユーザーのGmailアドレス

**Spreadsheet構造**:
- Sheet名: `Sheet1`
- ヘッダー行: 1行目
- データ開始: 2行目
- UPSERT条件: 営業日列でマッチング

---

## 運用方法

### 日次運用フロー

```
1. 営業終了後: Excelファイル作成
   ├─ ファイル名: yyyymmddCROSSROPPONGI.xlsx
   ├─ シート名: 日付の日部分（例: 21）
   └─ セル配置: 定義済みレイアウトに従う

2. Telegramにアップロード
   └─ グループ: CROSS ROPPONNGI 経理 日報

3. 翌朝8:30: 自動処理
   ├─ n8nが自動実行
   ├─ Excel解析
   ├─ Google Sheets同期
   └─ Telegram通知

4. 確認
   ├─ Google Sheetsでデータ確認
   └─ Telegram通知メッセージ確認
```

### ファイル命名規則

**✅ 正しい例**:
- `20251021CROSSROPPONGI.xlsx`
- `20251022CROSSROPPONGI.xlsx`

**❌ 間違った例**:
- `20251021CROSSROPPONGI店舗日報.xlsx` (余分な文字)
- `20251021CROSSROPPONG.xlsx` (スペルミス)
- `20251021crossroppongi.xlsx` (小文字)
- `2025-10-21CROSSROPPONGI.xlsx` (ハイフン)

### 重複処理の動作

**ケース1: 同じファイル名を短時間で再アップロード**
```
08:30 - 20251021CROSSROPPONGI.xlsx アップロード → 処理
08:32 - 20251021CROSSROPPONGI.xlsx 再アップロード → スキップ (5分以内)
08:36 - 20251021CROSSROPPONGI.xlsx 再アップロード → 処理 (5分超過)
```

**ケース2: 異なるファイル名**
```
同時アップロード:
- 20251020CROSSROPPONGI.xlsx → 処理
- 20251021CROSSROPPONGI.xlsx → 処理
- 20251022CROSSROPPONGI.xlsx → 処理

全て処理される
```

### メンテナンス

#### 日次チェック
- Google Sheetsでデータ確認
- Telegram通知の受信確認

#### 週次チェック
- n8n Executionsタブでエラー確認
- Excel Parserログ確認: `docker logs excel-parser`

#### 月次チェック
- Google Sheets API使用量確認
- Dockerコンテナのディスク使用量確認

---

## トラブルシューティング

### よくあるエラーと解決方法

#### エラー1: ファイル名パターン不一致
**症状**: Filter Excel FilesのOUTPUTが空

**原因**: ファイル名が `yyyymmddCROSSROPPONGI.xlsx` 形式ではない

**解決策**:
1. ファイル名を確認
2. 正しい形式に修正してアップロード
3. ログ確認: `console.log`に詳細が記録される

#### エラー2: Sheet not found
**症状**: Parse Excel via APIで「Sheet 'XX' not found」

**原因**: Excelファイル内のシート名が日付と一致しない

**解決策**:
1. Excelファイルを開く
2. シート名を確認（例: 21日 → シート名は `21`）
3. シート名を修正

#### エラー3: Google Sheets同期失敗
**症状**: Sync to Google Sheetsでエラー

**原因考えられる**:
- Credential期限切れ
- Spreadsheet ID間違い
- Sheet名間違い
- Column to Match On設定ミス

**解決策**:
1. n8n Credentialsで再認証
2. Spreadsheet IDを確認
3. Sheet名を確認（`Sheet1`）
4. Column to Match Onが `営業日` に設定されているか確認

#### エラー4: Excel Parserに接続できない
**症状**: Parse Excel via APIで「Connection refused」

**原因**: excel-parserコンテナが起動していない

**解決策**:
```bash
# コンテナ確認
docker ps | grep excel-parser

# 起動していない場合
cd /Users/remma/dify-n8n-workflow
docker compose up -d excel-parser

# ログ確認
docker logs excel-parser

# ヘルスチェック
curl http://localhost:5002/health
```

#### エラー5: 古いファイルが処理される
**症状**: ワークフロー有効化時に古いファイルが処理される

**解決策**:
```bash
# Telegram updateをクリア
curl "https://api.telegram.org/bot8401202439:AAHwPAMl26dYPi7J6N2LV_o32VKb2T0BtbI/getUpdates?offset=-1"
```

### ログ確認方法

#### n8n実行ログ
1. n8n UI → Executions
2. 該当の実行をクリック
3. 各ノードをクリックしてINPUT/OUTPUT確認

#### Excel Parserログ
```bash
docker logs excel-parser --tail 50
docker logs excel-parser -f  # リアルタイム監視
```

#### n8nコンテナログ
```bash
docker logs n8n --tail 50
```

### データ復旧

#### Google Sheetsからデータが削除された場合
1. Google Sheets → ファイル → 版の履歴
2. 該当の版を復元

#### 処理に失敗したファイルを再処理
1. Telegramから該当ファイルを削除
2. 5分以上待つ
3. ファイルを再アップロード
4. 次回の8:30実行を待つ、または手動実行

---

## セットアップ履歴

### 実装完了日: 2025-10-22

### 主要な実装ステップ

#### Phase 1: 基盤構築
1. Docker Compose環境構築
2. n8n + PostgreSQL + Redis セットアップ
3. Telegram Bot作成・設定

#### Phase 2: Excel Parser開発
1. Python Flask API作成
2. openpyxlでExcel解析ロジック実装
3. セル位置マッピング定義
4. データ検証機能追加
5. Dockerコンテナ化

#### Phase 3: n8nワークフロー構築
1. 基本ワークフロー作成
2. Telegram統合
3. Excel Parser API統合
4. Google Sheets統合
5. エラーハンドリング

#### Phase 4: 機能追加・最適化
1. 重複処理防止機能（5分制限）
2. ファイル名修正ロジック（Codeノード）
3. Telegram通知機能
4. トリガー最適化（8:30実行）

### 解決した主な課題

#### 課題1: XLSXモジュールがn8nで使えない
**解決策**: Python Flask APIを別コンテナで作成

#### 課題2: バイナリファイル名が自動生成される
**解決策**: Codeノードでメタデータを修正

#### 課題3: ポート5000がmacOSと競合
**解決策**: ポートマッピングを5002:5000に変更

#### 課題4: Google Sheetsに式が文字列で保存される
**解決策**: 列マッピングで式モード（fx）を使用

#### 課題5: 古いTelegram updateが処理される
**解決策**: getUpdates?offset=-1でクリア + トリガー最適化

#### 課題6: datetime変数のスコープエラー
**解決策**: import文の重複削除、グローバルインポート使用

### 設定ファイル

#### 主要ファイル一覧
```
/Users/remma/dify-n8n-workflow/
├── docker-compose.yml
├── .env
├── services/
│   └── excel-parser/
│       ├── Dockerfile
│       └── app.py
├── config/
│   └── excel-cell-mapping.json
├── examples/
│   └── sales-report-workflows/
│       └── 05-excel-to-sheets-sync-v2.json
├── docs/
│   ├── n8n-excel-parser-setup.md
│   └── google-sheets-setup.md
└── SYSTEM_DOCUMENTATION.md (このファイル)
```

#### 環境変数 (.env)
```bash
# Telegram Bot
TELEGRAM_BOT_TOKEN=8401202439:AAHwPAMl26dYPi7J6N2LV_o32VKb2T0BtbI
TELEGRAM_CHAT_ID=-4796493812

# Google Sheets
GOOGLE_SHEET_ID=14ACKU8Rl9ZHtlNvSHeyHr2BSqunRmFAB1nJ7Nqm6_2o

# n8n
N8N_USER=admin
N8N_PASSWORD=admin_password
N8N_PORT=5678

# Database
POSTGRES_USER=dify
POSTGRES_PASSWORD=dify_password
POSTGRES_DB=dify
```

---

## 今後の拡張案

### 優先度: 高
- [ ] エラー時のメール/Slack通知
- [ ] データバックアップ機能
- [ ] 処理履歴ログのDB保存

### 優先度: 中
- [ ] VIP詳細の別シート展開（現在はJSON文字列）
- [ ] データ検証エラー時の処理停止
- [ ] 週次/月次サマリーレポート自動生成
- [ ] ダッシュボード（Google Data Studioなど）

### 優先度: 低
- [ ] 複数店舗対応
- [ ] 過去データの一括インポート
- [ ] API認証の追加（Excel Parser）

---

## 付録

### 関連URL

- **n8n**: http://localhost:5678
- **Excel Parser Health**: http://localhost:5002/health
- **Google Sheets**: https://docs.google.com/spreadsheets/d/14ACKU8Rl9ZHtlNvSHeyHr2BSqunRmFAB1nJ7Nqm6_2o
- **Telegram Bot API Docs**: https://core.telegram.org/bots/api

### 連絡先

**システム管理者**: r.M (@rnmtsu)
**Telegramグループ**: CROSS ROPPONNGI 経理 日報

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2025-10-22 | 1.0.0 | 初版作成・本番稼働開始 |

---

**Document End**
