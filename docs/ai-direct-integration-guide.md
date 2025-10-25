# AI直接統合ガイド（Difyなし実装）

**作成日**: 2025-10-21
**対象**: Difyをスキップしてn8nから直接AI APIを呼び出す実装

---

## 📋 概要

このガイドでは、Difyを使用せず、n8nワークフローから**OpenAI APIまたはAnthropic API**を直接呼び出してPDF解析を行う方法を説明します。

### メリット

✅ **シンプル**: Difyアプリ作成不要
✅ **即座に動作**: セットアップ時間5分
✅ **柔軟性**: n8nワークフロー内で完結
✅ **コスト管理**: API使用量を直接制御

### デメリット

⚠️ **プロンプト管理**: ワークフロー内に埋め込み
⚠️ **バージョン管理**: Difyの履歴機能なし
⚠️ **監視**: 専用ダッシュボードなし

---

## 🚀 セットアップ手順

### ステップ1: APIキーの取得

#### オプションA: Anthropic Claude (推奨)

1. [Anthropic Console](https://console.anthropic.com/) にアクセス
2. APIキーを作成
3. `.env`ファイルに追加:

```bash
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
```

**推奨理由**:
- Claude 3.5 SonnetはPDF Vision APIをサポート
- PDFを直接送信可能（OCR不要）
- 日本語の解析精度が高い

**料金**:
- Claude 3.5 Sonnet: $3/MTok (入力), $15/MTok (出力)
- 1回のPDF解析: 約$0.05-0.10

---

#### オプションB: OpenAI GPT-4o

1. [OpenAI Platform](https://platform.openai.com/) にアクセス
2. APIキーを作成
3. `.env`ファイルに追加:

```bash
OPENAI_API_KEY=sk-proj-xxxxx
```

**料金**:
- GPT-4o: $2.50/MTok (入力), $10/MTok (出力)
- 1回のPDF解析: 約$0.03-0.08

---

### ステップ2: 環境変数の設定

`.env`ファイルを編集:

```bash
# AI API設定（どちらか1つ、または両方）
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
OPENAI_API_KEY=sk-proj-xxxxx

# Telegram設定（既存）
TELEGRAM_BOT_TOKEN=8401202439:AAHwPAMl26dYPi7J6N2LV_o32VKb2T0BtbI
TELEGRAM_CHAT_ID=-4796493812
```

保存後、Docker環境を再起動:

```bash
cd /Users/remma/dify-n8n-workflow
docker compose down
docker compose up -d
```

---

### ステップ3: n8nワークフローのインポート

1. **n8nにアクセス**: http://localhost:5678

2. **ワークフローをインポート**:
   - 左上メニュー → 「Import from File」
   - ファイル選択: `examples/sales-report-workflows/03-complete-workflow-with-ai.json`
   - 「Import」をクリック

3. **認証情報の設定**:

   **Telegram Bot認証**:
   - ノード「Send Success Message」をクリック
   - 「Credentials」→「Create New」
   - Access Token: `8401202439:AAHwPAMl26dYPi7J6N2LV_o32VKb2T0BtbI`
   - 「Save」

   **PostgreSQL認証**:
   - ノード「Save to Database」をクリック
   - 「Credentials」→「Create New」
   - Host: `db`
   - Database: `dify`
   - User: `dify`
   - Password: `.env`ファイルの`POSTGRES_PASSWORD`
   - Port: `5432`
   - 「Save」

4. **ワークフローを保存**: 右上「Save」

5. **ワークフローを有効化**: 右上トグルスイッチをON

---

## 🔧 ワークフロー構造

### 処理フロー

```
1. Schedule Trigger (30秒ごと)
   ↓
2. Get Telegram Updates
   ↓
3. Filter Sales Reports (Excel/PDF判定)
   ↓
4. Get File Path
   ↓
5. Download File
   ↓
6. Prepare PDF Data (Base64変換)
   ↓
7. Parse with AI ← AI API呼び出し
   ↓
8. Save to Database
   ↓
9. Send Success Message
```

### エラーハンドリング

```
Parse with AI でエラー発生
   ↓
Log Error to DB
   ↓
Send Error Message (Telegram通知)
```

---

## 🤖 AI解析の仕組み

### Claude Vision API（Anthropic）

**使用モデル**: `claude-3-5-sonnet-20241022`

**処理フロー**:
1. PDFをBase64エンコード
2. Claude Vision APIにPDFを直接送信
3. システムプロンプトで抽出ルールを指示
4. JSON形式で構造化データを取得

**リクエスト例**:
```javascript
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 2048,
  "temperature": 0.1,
  "system": "売上データ抽出専門AI...",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "document",
          "source": {
            "type": "base64",
            "media_type": "application/pdf",
            "data": "<base64-encoded-pdf>"
          }
        },
        {
          "type": "text",
          "text": "このPDFから売上データを抽出してください"
        }
      ]
    }
  ]
}
```

---

### OpenAI GPT-4o（フォールバック）

**使用モデル**: `gpt-4o`

**処理フロー**:
1. PDFテキストを抽出（別途OCRが必要）
2. GPT-4oにテキストを送信
3. JSON形式で構造化データを取得

**リクエスト例**:
```javascript
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "system",
      "content": "売上データ抽出専門AI..."
    },
    {
      "role": "user",
      "content": "以下のテキストから売上データを抽出: ..."
    }
  ],
  "temperature": 0.1,
  "response_format": { "type": "json_object" }
}
```

---

## 📊 抽出データのフォーマット

### 出力JSON構造

```json
{
  "business_date": "2025-10-18",
  "male_count": 75,
  "female_count": 51,
  "total_customer_count": 126,
  "section_a_sales": 1246600,
  "section_b_sales": 989400,
  "section_c_sales": 478000,
  "other_sales": null,
  "total_sales": 1854200,
  "confidence": "high",
  "notes": null
}
```

### データ検証

ワークフロー内で以下を自動検証:

✅ **来客数の整合性**: 男性 + 女性 = 合計
✅ **売上合計**: セクション別売上の合計チェック
✅ **日付の妥当性**: 過去1年以内かチェック
✅ **異常値検出**: 負数や極端に大きい値を検出

---

## 🧪 テスト方法

### ステップ1: 手動実行テスト

1. n8nワークフローを開く
2. 「Schedule Trigger」ノードを右クリック
3. 「Execute Node」を選択
4. 各ノードの出力を確認

### ステップ2: 実ファイルでのテスト

1. Telegramグループにテスト用PDFを送信
2. 30秒以内にワークフローが自動実行
3. Telegramで処理完了メッセージを確認
4. データベースを確認:

```bash
docker exec -it dify-n8n-workflow-db-1 psql -U dify -d dify
```

```sql
SELECT * FROM sales_data ORDER BY created_at DESC LIMIT 1;
```

### ステップ3: エラーケースのテスト

以下のファイルで動作確認:
- ❌ 画像ファイル（.jpg）→ フィルタで除外
- ❌ テキストファイル（.txt）→ フィルタで除外
- ⚠️ 空のPDF → エラーログに記録、Telegram通知
- ⚠️ データ不足のPDF → `confidence: low` で保存

---

## 🔍 トラブルシューティング

### 問題1: API認証エラー

**症状**:
```
Error: No API key found
```

**解決策**:
1. `.env`ファイルを確認
2. `ANTHROPIC_API_KEY`または`OPENAI_API_KEY`が設定されているか
3. Docker環境を再起動

---

### 問題2: JSON解析エラー

**症状**:
```
Error: No JSON found in response
```

**原因**: AIがマークダウン形式で返している

**解決策**:
- Claude APIの場合: 自動的に正規表現で抽出
- OpenAIの場合: `response_format: json_object`を指定済み
- プロンプトを確認（システムプロンプトで「JSON形式のみ」を強調）

---

### 問題3: PDF読み取りエラー

**症状**:
```
Error: PDF parsing failed
```

**原因**:
- Claude以外のAPIを使用（Vision API未対応）
- PDFが破損している

**解決策**:
- Anthropic APIキーを設定（Claude Vision使用）
- PDFの再送信を依頼

---

### 問題4: データベース保存エラー

**症状**:
```
Error: duplicate key value violates unique constraint
```

**原因**: 同じ日付のデータが既に存在

**解決策**:
- ワークフローは自動的に`UPSERT`を実行（既存データを更新）
- 手動で重複データを削除:

```sql
DELETE FROM sales_data WHERE sales_date = '2025-10-18';
```

---

## 💰 コスト試算

### 1日の処理量（想定）

- 1日1件のPDF受信
- 1PDFあたり約5,000トークン（入力）
- 1PDFあたり約500トークン（出力）

### 月間コスト

#### Claude 3.5 Sonnet

```
入力: 5,000 tokens × 30日 × $3/MTok = $0.45
出力:   500 tokens × 30日 × $15/MTok = $0.23
合計: $0.68/月
```

#### OpenAI GPT-4o

```
入力: 5,000 tokens × 30日 × $2.5/MTok = $0.38
出力:   500 tokens × 30日 × $10/MTok = $0.15
合計: $0.53/月
```

**実際のコスト**: 月額 **$0.50〜$1.00**（処理エラー・再試行含む）

---

## 📈 パフォーマンス最適化

### 1. トークン削減

**現在**: システムプロンプト約1,500 tokens

**最適化案**:
- Few-shot examplesを削減
- プロンプトの簡潔化
- 20-30%のコスト削減可能

### 2. キャッシング（Claude専用）

Anthropic APIの[Prompt Caching](https://docs.anthropic.com/claude/docs/prompt-caching)を活用:

```javascript
{
  "system": [
    {
      "type": "text",
      "text": "システムプロンプト...",
      "cache_control": { "type": "ephemeral" }
    }
  ]
}
```

**効果**: システムプロンプトのキャッシュで90%コスト削減（5分間有効）

### 3. 並列処理

複数ファイルを同時処理する場合:
- n8nの`Split In Batches`ノードで制御
- API Rate Limitに注意

---

## 🔄 Difyへの移行（将来的な選択肢）

このAI直接統合は、後でDifyに移行可能です:

### 移行手順

1. **Difyアプリ作成**: 同じプロンプトを使用
2. **API Endpoint変更**: n8nワークフローのHTTP Requestノードを修正
3. **環境変数更新**: `DIFY_API_KEY`を追加

### 移行のメリット

- プロンプトのバージョン管理
- A/Bテスト機能
- 使用量ダッシュボード
- プロンプト最適化ツール

---

## 📝 次のステップ

### 実装済み

✅ Telegram Bot受信
✅ PDF解析（AI直接呼び出し）
✅ データベース保存
✅ エラーハンドリング
✅ Telegram通知

### 未実装（今後の拡張）

⏳ **Excel対応**: .xlsxファイルのパース
⏳ **Google Sheets連携**: 自動スプレッドシート更新
⏳ **ダッシュボード**: 売上レポート可視化
⏳ **手動修正機能**: データ編集UI

---

## 🆘 サポート

### ドキュメント

- [Anthropic API Docs](https://docs.anthropic.com/)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [n8n Documentation](https://docs.n8n.io/)

### トラブル時の確認項目

1. ✅ Docker全サービスが起動中か
2. ✅ `.env`ファイルのAPIキーが正しいか
3. ✅ n8nワークフローが有効化されているか
4. ✅ Telegram BotがPrivacy Mode無効か
5. ✅ データベース接続が正常か

---

**実装完了**: 2025-10-21
**バージョン**: 1.0
**メンテナンス**: 月次でプロンプトとコストを見直し
