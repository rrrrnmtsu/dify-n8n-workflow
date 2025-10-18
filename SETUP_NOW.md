# 🚀 Telegram Bot セットアップ - 今すぐ開始

## ステップ1: Telegram Botを作成（5分）

### 1.1 Telegramアプリを開く
スマートフォンまたはデスクトップでTelegramアプリを起動

### 1.2 BotFatherを検索
1. 検索バーで `@BotFather` を入力
2. BotFather（青いチェックマーク付き）を選択
3. 「START」または `/start` を送信

### 1.3 新しいBotを作成
以下のコマンドを送信:
```
/newbot
```

### 1.4 Bot名を入力
例:
```
売上日報Bot
```
または
```
Sales Report Bot
```

### 1.5 Botユーザー名を入力
**重要:** 末尾に `bot` が必要です

例:
```
your_company_sales_bot
```

### 1.6 Bot Tokenを保存
成功すると以下のようなメッセージが表示されます:

```
Done! Congratulations on your new bot.

Use this token to access the HTTP API:
1234567890:ABCdefGHIjklMNOpqrsTUVwxyz1234567
```

**🔐 このTokenをコピーして安全な場所に保存してください**

---

## ステップ2: グループチャットを準備（3分）

### 2.1 既存のグループを使う場合
既に売上日報を送信しているTelegramグループがあれば、それを使用できます。

### 2.2 新しいグループを作成する場合
1. Telegramで「新しいグループ」を作成
2. グループ名: 「売上日報グループ」など
3. メンバーを追加（必要に応じて）

### 2.3 BotをグループInvite追加
1. グループを開く
2. グループ名をタップ → メンバーを追加
3. 先ほど作成したBotを検索して追加
4. グループにBotが参加したことを確認

### 2.4 テストメッセージを送信
グループチャットで何でも良いので送信:
```
テスト
```

---

## ステップ3: Chat IDを取得（2分）

### 3.1 ブラウザでAPIにアクセス

以下のURLをブラウザで開く（`<YOUR_BOT_TOKEN>` を実際のTokenに置き換え）:

```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
```

**実際の例:**
```
https://api.telegram.org/bot1234567890:ABCdefGHIjklMNOpqrsTUVwxyz1234567/getUpdates
```

### 3.2 Chat IDを見つける

レスポンスJSONの中から `"chat":{"id":` の部分を探します:

```json
{
  "ok": true,
  "result": [
    {
      "update_id": 123456789,
      "message": {
        "chat": {
          "id": -1001234567890,
          "title": "売上日報グループ",
          "type": "supergroup"
        }
      }
    }
  ]
}
```

**Chat ID: `-1001234567890`** をコピー

**💡 ヒント:**
- グループのChat IDは必ず負の数です
- `-100` で始まります
- 見つからない場合は、グループでもう一度メッセージを送ってから再度アクセス

---

## ステップ4: 環境変数を設定（2分）

### 4.1 .envファイルを開く

```bash
cd /Users/remma/dify-n8n-workflow
nano .env
```

### 4.2 以下の行を追加（ファイルの最後に追加）

```env
# Telegram Bot Settings
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz1234567
TELEGRAM_CHAT_ID=-1001234567890
```

**重要:** 実際の値に置き換えてください

### 4.3 保存して終了

1. `Ctrl + O` （保存）
2. `Enter` （確認）
3. `Ctrl + X` （終了）

---

## ステップ5: 動作確認（3分）

### 5.1 Bot情報を確認

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe"
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

### 5.2 テストメッセージを送信

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage" \
  -d "chat_id=<YOUR_CHAT_ID>" \
  -d "text=🤖 Bot設定が完了しました！売上日報ファイルを送信してください。"
```

**成功すると:** グループチャットにBotからメッセージが届きます

---

## ✅ チェックリスト

Telegram Bot設定が完了したか確認:

- [ ] Telegram Botを作成した
- [ ] Bot Tokenを取得・保存した
- [ ] グループチャットにBotを追加した
- [ ] Chat IDを取得した
- [ ] .envファイルに設定を追加した
- [ ] Bot情報確認コマンドが成功した
- [ ] テストメッセージがグループに届いた

---

## 🎯 次のステップ

### すぐに実行: n8nでワークフローをインポート

1. **n8nにアクセス**
   ```
   ブラウザで http://localhost:5678 を開く
   ```

2. **Telegram認証情報を追加**
   - 左メニュー「Credentials」をクリック
   - 「+ Add Credential」→「Telegram API」を選択
   - **Access Token:** あなたのBot Tokenを入力
   - 「Save」をクリック

3. **PostgreSQL認証情報を追加**
   - 「+ Add Credential」→「Postgres」を選択
   - 設定:
     ```
     Host: postgres
     Port: 5432
     Database: dify
     User: dify
     Password: （.envファイルのPOSTGRES_PASSWORDの値）
     ```
   - 「Save」をクリック

4. **ワークフローをインポート**
   - 左上メニュー → 「Workflows」
   - 「Import from File」をクリック
   - `examples/sales-report-workflows/01-telegram-receiver.json` を選択
   - インポート後、各ノードの認証情報を紐付け:
     - **Telegram Trigger:** 先ほど作成したTelegram認証情報を選択
     - **Save to PostgreSQL:** PostgreSQL認証情報を選択
     - **Send Confirmation:** Telegram認証情報を選択
   - 右上の「Save」をクリック
   - 右上のトグルスイッチを「Active」にする

5. **テストファイルを送信**
   - Telegramグループに任意のExcelまたはPDFファイルを送信
   - Botから確認メッセージが届くことを確認
   - n8nの「Executions」で実行履歴を確認

---

## 🆘 トラブルシューティング

### Bot Tokenが無効
- BotFatherで再度Tokenを確認
- .envファイルの記述ミスを確認
- Dockerを再起動: `docker compose restart`

### Chat IDが取得できない
- グループでBotにメンション: `@your_company_sales_bot テスト`
- Botがグループメンバーであることを確認
- getUpdatesを再度実行

### テストメッセージが届かない
- Chat IDが正しいか確認（負の数で-100で始まる）
- Botがグループから削除されていないか確認

---

## 📞 準備完了したら

Telegram Botの設定が完了したら、次のいずれかを選択してください:

1. **n8nワークフローをインポートしてテスト** （上記の「次のステップ」参照）
2. **Excel/PDF処理ワークフローの実装に進む**
3. **設計の確認・調整**

準備ができたら教えてください！
