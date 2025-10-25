# 🚀 クイックスタート: AI直接統合（5分で完了）

**最終更新**: 2025-10-21
**対象**: Difyなしで即座にAI解析を開始する

---

## ⚡ 5分セットアップ

### ステップ1: APIキーを取得（2分）

**Anthropic Claude（推奨）**:
1. https://console.anthropic.com/ にアクセス
2. 「Get API Keys」→ 「Create Key」
3. キーをコピー: `sk-ant-api03-xxxxx`

または

**OpenAI GPT-4o**:
1. https://platform.openai.com/ にアクセス
2. 「API Keys」→ 「Create new secret key」
3. キーをコピー: `sk-proj-xxxxx`

---

### ステップ2: 環境変数を設定（1分）

`.env`ファイルを編集:

```bash
cd /Users/remma/dify-n8n-workflow
nano .env
```

以下を追加（または既存行を編集）:

```bash
# Claude（推奨）
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# または OpenAI
OPENAI_API_KEY=sk-proj-xxxxx
```

保存: `Ctrl+O` → `Enter` → `Ctrl+X`

---

### ステップ3: Docker再起動（30秒）

```bash
docker compose down
docker compose up -d
```

---

### ステップ4: n8nでワークフローをインポート（1分半）

1. **n8nにアクセス**: http://localhost:5678

2. **ワークフローをインポート**:
   - 左上メニュー「☰」→ 「Workflows」→ 「Import from File」
   - ファイル選択:
     ```
     /Users/remma/dify-n8n-workflow/examples/sales-report-workflows/03-complete-workflow-with-ai.json
     ```
   - 「Import」をクリック

3. **認証情報を設定**:

   **Telegram Bot**（2箇所）:
   - 「Send Success Message」ノードをクリック
   - 「Credentials」→ 「Create New」
   - Access Token: `8401202439:AAHwPAMl26dYPi7J6N2LV_o32VKb2T0BtbI`
   - 「Save」
   - 「Send Error Message」ノードでも同じ認証情報を選択

   **PostgreSQL**（2箇所）:
   - 「Save to Database」ノードをクリック
   - 「Credentials」→ 「Create New」
   - 以下を入力:
     ```
     Host: db
     Database: dify
     User: dify
     Password: GKy9RJs1zTYoq++ZX32jOQVdw8Tspnd1
     Port: 5432
     ```
   - 「Save」
   - 「Log Error to DB」ノードでも同じ認証情報を選択

4. **ワークフローを保存・有効化**:
   - 右上「Save」をクリック
   - 右上のトグルスイッチをON（Active）

---

### ステップ5: テスト（30秒）

1. **Telegramグループに移動**: 「CROSS ROPPONNGI 経理 日報」

2. **テスト用PDFを送信**:
   - `test-files`フォルダの実ファイルを使用
   - または新しいPDFをアップロード

3. **30秒以内に自動処理**:
   - n8nが自動的にファイルを検出
   - AI解析を実行
   - データベースに保存
   - Telegramに処理結果を通知

4. **結果確認**:
   - Telegramで「✅ 処理が完了しました！」メッセージを確認
   - 売上データが表示されます

---

## ✅ 完了チェックリスト

- [ ] APIキーを取得（AnthropicまたはOpenAI）
- [ ] `.env`ファイルに`ANTHROPIC_API_KEY`または`OPENAI_API_KEY`を追加
- [ ] `docker compose down && docker compose up -d`を実行
- [ ] n8nでワークフローをインポート
- [ ] Telegram Bot認証情報を設定
- [ ] PostgreSQL認証情報を設定
- [ ] ワークフローを保存・有効化
- [ ] テストPDFをTelegramに送信
- [ ] 処理完了メッセージを受信

---

## 🎯 動作確認方法

### 方法1: Telegram通知を確認

処理成功時のメッセージ例:

```
✅ 処理が完了しました!

📊 売上データ
📅 営業日: 2025-10-18
👥 来客数: 126名
　└ 男性: 75名
　└ 女性: 51名
💰 総売上: ¥1,854,200

🏢 セクション別売上
　• フロア: ¥1,246,600
　• VIP: ¥989,400
　• PARTY: ¥478,000

💾 データベースに保存しました
```

---

### 方法2: データベースを確認

```bash
docker exec -it dify-n8n-workflow-db-1 psql -U dify -d dify
```

```sql
SELECT
  sales_date,
  total_customer_count,
  total_sales,
  source_file,
  created_at
FROM sales_data
ORDER BY created_at DESC
LIMIT 3;
```

---

### 方法3: n8n実行履歴を確認

1. n8n → 「Executions」タブ
2. 最新の実行を確認
3. 各ノードの出力を検証
4. 「Parse with AI」ノードで抽出データを確認

---

## ⚠️ トラブルシューティング

### エラー1: API認証エラー

**メッセージ**:
```
No API key found. Set OPENAI_API_KEY or ANTHROPIC_API_KEY
```

**解決策**:
1. `.env`ファイルを確認
2. APIキーが正しいか確認
3. `docker compose down && docker compose up -d`で再起動

---

### エラー2: ワークフローが実行されない

**原因**: ワークフローが無効化されている

**解決策**:
1. n8nでワークフローを開く
2. 右上のトグルスイッチがON（緑色）か確認
3. OFFの場合はクリックしてONにする

---

### エラー3: Telegram通知が届かない

**原因**: Telegram認証情報が未設定

**解決策**:
1. 「Send Success Message」ノードをクリック
2. 「Credentials」が設定されているか確認
3. 未設定の場合は上記ステップ4の手順を実施

---

### エラー4: データベース保存エラー

**原因**: PostgreSQL認証情報が未設定

**解決策**:
1. 「Save to Database」ノードをクリック
2. 「Credentials」を設定
3. Host: `db`, Database: `dify`, User: `dify`, Password: `.env`から取得

---

## 💰 コスト

### Anthropic Claude 3.5 Sonnet

- **1回の処理**: $0.05〜$0.10
- **1日1件**: 月額 **約$3**
- **1日3件**: 月額 **約$9**

### OpenAI GPT-4o

- **1回の処理**: $0.03〜$0.08
- **1日1件**: 月額 **約$2**
- **1日3件**: 月額 **約$6**

**推奨**: 月額$5のクレジットで十分運用可能

---

## 📊 処理フロー（自動実行）

```
1. 30秒ごとにTelegramをチェック
   ↓
2. PDFまたはExcelファイルを検出
   ↓
3. ファイルをダウンロード
   ↓
4. AI APIでデータ抽出（Claude/OpenAI）
   ↓
5. データベースに保存
   ↓
6. Telegramに処理結果を通知
```

**処理時間**: 1ファイルあたり **5〜15秒**

---

## 📚 詳細ドキュメント

- **完全ガイド**: [docs/ai-direct-integration-guide.md](docs/ai-direct-integration-guide.md)
- **Telegram Bot設定**: [docs/telegram-bot-setup.md](docs/telegram-bot-setup.md)
- **データベーススキーマ**: [database/sales_report_schema.sql](database/sales_report_schema.sql)

---

## 🎓 次のステップ

セットアップが完了したら:

1. ✅ **実運用開始**: 毎日の売上報告を自動処理
2. ⏳ **Excel対応**: .xlsxファイルのパース実装
3. ⏳ **Google Sheets連携**: スプレッドシート自動更新
4. ⏳ **ダッシュボード構築**: 売上レポート可視化

---

## 🆘 サポート

### 問題が解決しない場合

1. **Docker全サービスの状態確認**:
   ```bash
   docker compose ps
   ```
   全てのサービスが`Up`状態か確認

2. **ログ確認**:
   ```bash
   docker compose logs n8n --tail 50
   ```

3. **環境変数確認**:
   ```bash
   docker compose exec n8n env | grep API_KEY
   ```

---

**セットアップ完了**: これで自動売上報告システムが稼働中です！
**所要時間**: 5分
**月額コスト**: $2〜$5
