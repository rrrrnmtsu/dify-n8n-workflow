# Telegram Bot セットアップガイド

## 📋 概要

売上日報自動集計システムで使用するTelegram Botの作成と設定手順。

---

## 🤖 Step 1: Telegram Botの作成

### 1.1 BotFatherにアクセス

1. Telegramアプリを開く
2. 検索で `@BotFather` を検索
3. BotFatherを開いて `/start` コマンドを送信

### 1.2 新しいBotを作成

```
/newbot
```

### 1.3 Bot情報を入力

**Bot名を入力:**
```
売上日報Bot
```
または
```
Sales Report Bot
```

**Botのユーザー名を入力:**（末尾に`bot`が必要）
```
your_company_sales_bot
```

### 1.4 Bot Tokenを保存

成功すると以下のようなメッセージが表示されます：

```
Done! Congratulations on your new bot.
You will find it at t.me/your_company_sales_bot

Use this token to access the HTTP API:
1234567890:ABCdefGHIjklMNOpqrsTUVwxyz1234567

Keep your token secure and store it safely...
```

**🔐 このTokenを安全に保存してください！**

---

## 🔧 Step 2: Bot設定のカスタマイズ

### 2.1 Bot説明を設定

```
/setdescription
```

選択: `@your_company_sales_bot`

説明文を入力:
```
売上日報を自動で受信・集計するBotです。
ExcelファイルまたはPDFファイルをこのBotに送信してください。
```

### 2.2 Botコマンドを設定（オプション）

```
/setcommands
```

選択: `@your_company_sales_bot`

コマンドリストを入力:
```
start - Botを起動
help - 使い方を表示
status - 処理状況を確認
latest - 最新の売上データを表示
```

### 2.3 プライバシー設定（重要）

```
/setprivacy
```

選択: `@your_company_sales_bot`

選択: `Disable` （グループメッセージを全て受信）

**⚠️ 重要:** プライバシー設定変更後は以下の手順が**必須**です：

1. Botが既に参加しているグループから**一旦削除**
2. Botを**再度グループに追加**

この手順を実施しないと、設定変更が反映されません。

**確認方法:**
```bash
curl -s "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe" | jq '.result.can_read_all_group_messages'
```

- `true`: 設定変更成功（全てのメッセージを受信可能）
- `false`: 設定変更未反映（Bot削除→再追加が必要）

---

## 👥 Step 3: グループチャットへの追加

### 3.1 報告用グループを作成（既存のグループを使う場合はスキップ）

1. Telegramで新しいグループを作成
2. グループ名: `売上日報グループ` など
3. メンバーを追加

### 3.2 BotをグループinviteAdd

1. グループ設定を開く
2. 「メンバーを追加」を選択
3. `@your_company_sales_bot` を検索して追加
4. グループにBotが参加したことを確認

### 3.3 Botに管理者権限を付与（推奨）

1. グループ設定 → 管理者
2. Botを管理者に追加
3. 必要な権限:
   - メッセージの削除
   - メッセージの固定（オプション）

---

## 🔍 Step 4: Chat IDの取得

### 4.1 グループでメッセージを送信

グループチャットで任意のメッセージを送信:
```
テスト
```

### 4.2 getUpdates APIで確認

ブラウザまたはcurlで以下にアクセス:

```bash
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
```

**例:**
```bash
https://api.telegram.org/bot1234567890:ABCdefGHIjklMNOpqrsTUVwxyz1234567/getUpdates
```

### 4.3 Chat IDをコピー

レスポンスの中から `chat.id` を探します:

```json
{
  "ok": true,
  "result": [
    {
      "update_id": 123456789,
      "message": {
        "message_id": 1,
        "from": {...},
        "chat": {
          "id": -1001234567890,
          "title": "売上日報グループ",
          "type": "supergroup"
        },
        "date": 1697000000,
        "text": "テスト"
      }
    }
  ]
}
```

**Chat ID: `-1001234567890`** をコピー

**注意:** グループのChat IDは負の数で、`-100` で始まります。

---

## ⚙️ Step 5: 環境変数の設定

### 5.1 .envファイルを編集

```bash
cd /Users/remma/dify-n8n-workflow
nano .env
```

### 5.2 Telegram設定を追加

```env
# Telegram Bot Settings
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz1234567
TELEGRAM_CHAT_ID=-1001234567890
TELEGRAM_BOT_USERNAME=your_company_sales_bot
```

### 5.3 保存して終了

`Ctrl + O` → Enter → `Ctrl + X`

---

## ✅ Step 6: 動作確認

### 6.1 Bot Tokenのテスト

```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe
```

**期待される結果:**
```json
{
  "ok": true,
  "result": {
    "id": 1234567890,
    "is_bot": true,
    "first_name": "売上日報Bot",
    "username": "your_company_sales_bot"
  }
}
```

### 6.2 メッセージ送信テスト

```bash
curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": "<YOUR_CHAT_ID>",
    "text": "🤖 Botの設定が完了しました！売上日報ファイルを送信してください。"
  }'
```

**期待される結果:** グループチャットにメッセージが表示される

### 6.3 ファイル受信テスト

1. グループチャットにテストファイルを送信（ExcelまたはPDF）
2. 以下のコマンドで受信確認:

```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
```

3. レスポンスに `document` フィールドが含まれていることを確認

---

## 🔐 セキュリティのベストプラクティス

### 1. Bot Tokenの管理

- ✅ `.env` ファイルに保存（Gitにコミットしない）
- ✅ `.gitignore` に `.env` が含まれていることを確認
- ❌ コードに直接記述しない
- ❌ 公開リポジトリに含めない

### 2. Chat IDの制限

n8nワークフローで特定のChat IDからのメッセージのみ処理:

```javascript
// n8n Code Node
const allowedChatId = parseInt(process.env.TELEGRAM_CHAT_ID);
const incomingChatId = $input.item.json.message.chat.id;

if (incomingChatId !== allowedChatId) {
  throw new Error('Unauthorized chat ID');
}

return $input.item;
```

### 3. ファイルタイプの検証

```javascript
// 許可するファイル拡張子
const allowedExtensions = ['xlsx', 'xls', 'pdf'];
const fileName = $input.item.json.message.document.file_name;
const extension = fileName.split('.').pop().toLowerCase();

if (!allowedExtensions.includes(extension)) {
  throw new Error(`File type .${extension} not allowed`);
}
```

---

## 🚀 n8nでの使用方法

### Telegram Triggerノードの設定

1. n8nで新しいワークフローを作成
2. 「Telegram Trigger」ノードを追加
3. 設定:
   - **Authentication**: 「Telegram API」を選択
   - **Credential**: 新規作成
     - **Bot Token**: `TELEGRAM_BOT_TOKEN` の値を入力
   - **Updates**: `message`
   - **Additional Fields**:
     - **Download Files**: `true` （ファイルを自動ダウンロード）

### Telegram Sendノードの設定（通知用）

1. 「Telegram」ノードを追加
2. 設定:
   - **Resource**: `Message`
   - **Operation**: `Send`
   - **Chat ID**: `{{ $env.TELEGRAM_CHAT_ID }}`
   - **Text**: 送信するメッセージ

---

## 📱 使い方（エンドユーザー向け）

### ファイルの送信方法

1. Telegramで売上日報グループを開く
2. ファイルを添付:
   - 📎 アイコンをタップ
   - ExcelファイルまたはPDFファイルを選択
3. 送信

**ファイル命名規則（推奨）:**
```
売上日報_2025-10-13.xlsx
売上日報_20251013.pdf
```

### 処理状況の確認

Botから以下のような通知が届きます:

1. **受信確認:**
   ```
   ✅ ファイルを受信しました
   📄 ファイル名: 売上日報_2025-10-13.xlsx
   ⏳ 処理を開始します...
   ```

2. **処理完了:**
   ```
   ✅ 処理が完了しました
   📅 日付: 2025-10-13
   💰 総売上: ¥2,222,221
   📊 Google Sheetsを更新しました
   ```

3. **エラー発生:**
   ```
   ❌ エラーが発生しました
   📄 ファイル名: 売上日報_2025-10-13.xlsx
   ⚠️ 理由: 指定されたセルが見つかりません
   🔄 手動で確認してください
   ```

---

## 🛠 トラブルシューティング

### Bot Tokenが無効

**症状:** `401 Unauthorized` エラー

**解決策:**
1. BotFatherでTokenを再確認
2. `.env` ファイルの `TELEGRAM_BOT_TOKEN` を確認
3. Docker環境を再起動: `docker compose restart`

### Chat IDが見つからない

**症状:** `getUpdates` で空のレスポンス

**解決策:**
1. グループでBotにメンションしてメッセージ送信: `@your_company_sales_bot テスト`
2. Botがグループメンバーであることを確認
3. プライバシー設定を確認（Disable推奨）

### ファイルが受信されない

**症状:** ファイル送信してもBotが反応しない

**解決策:**

**1. Privacy Mode設定を確認:**
```bash
curl -s "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe" | jq '.result.can_read_all_group_messages'
```

- `false`の場合: Privacy Modeが有効（グループメッセージを受信できない）
  - BotFatherで `/setprivacy` → Botを選択 → `Disable` を選択
  - **Bot削除→再追加が必須**

**2. getUpdatesでメッセージ確認:**
```bash
curl -s "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates" | jq '.'
```

- 空の`result: []`の場合:
  - グループでメッセージ送信後、再度確認
  - Botがグループメンバーか確認
  - Webhook設定を確認（Pollingモードの場合は空にする）

**3. その他の確認項目:**
1. Botに管理者権限があるか確認
2. n8nの「Download Files」設定を確認
3. n8nワークフローがActiveになっているか確認

---

## 📞 次のステップ

- ✅ Telegram Bot作成完了
- ✅ グループに追加完了
- ✅ Chat ID取得完了
- ✅ 環境変数設定完了
- ⏳ n8nワークフロー構築（次のステップ）

次は [n8nワークフローの構築](../examples/sales-report-workflows/) に進んでください。
