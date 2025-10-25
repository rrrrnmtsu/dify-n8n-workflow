# 🚨 次に実施すること（Privacy Mode 問題解決）

## 現在の問題

Telegram Bot の **Privacy Mode が有効** のため、グループメッセージを受信できていません。

**確認済み:**
```bash
curl -s "https://api.telegram.org/bot8401202439:AAHwPAMl26dYPi7J6N2LV_o32VKb2T0BtbI/getMe" | jq '.result.can_read_all_group_messages'
# 結果: false ← これが問題
```

---

## ✅ 解決手順（5分で完了）

### 1️⃣ BotFather で Privacy Mode を無効化

Telegram アプリで：

1. `@BotFather` を開く
2. `/setprivacy` と送信
3. `@cross_logbot` を選択
4. `Disable` を選択
5. 「Success! The new status is: DISABLED.」と表示されることを確認

---

### 2️⃣ Bot をグループから削除

**⚠️ この手順は必須です！省略すると設定が反映されません。**

1. Telegram で「CROSS ROPPONNGI 経理 日報」グループを開く
2. グループ設定 → メンバー
3. `cross_logbot` を選択
4. 「グループから削除」

---

### 3️⃣ Bot をグループに再追加

1. グループ設定 → メンバーを追加
2. `@cross_logbot` を検索
3. 追加

---

### 4️⃣ 確認

以下のコマンドを実行：

```bash
curl -s "https://api.telegram.org/bot8401202439:AAHwPAMl26dYPi7J6N2LV_o32VKb2T0BtbI/getMe" | jq '.result.can_read_all_group_messages'
```

**期待される結果:**
```
true
```

`true` になっていれば成功です！

---

### 5️⃣ メッセージ受信テスト

グループで「テスト」と送信し、以下を実行：

```bash
curl -s "https://api.telegram.org/bot8401202439:AAHwPAMl26dYPi7J6N2LV_o32VKb2T0BtbI/getUpdates" | jq '.result[-1].message.text'
```

**期待される結果:**
```
"テスト"
```

送信したメッセージが表示されれば成功です！

---

### 6️⃣ ファイル受信テスト

グループでファイル（Excel または PDF）を送信し、以下を実行：

```bash
curl -s "https://api.telegram.org/bot8401202439:AAHwPAMl26dYPi7J6N2LV_o32VKb2T0BtbI/getUpdates" | jq '.result[-1].message.document.file_name'
```

**期待される結果:**
```
"test.xlsx"
```

送信したファイル名が表示されれば完璧です！

---

## 📋 完了後の確認事項

- [ ] `can_read_all_group_messages` が `true`
- [ ] テストメッセージが `getUpdates` で取得できる
- [ ] テストファイルが `getUpdates` で取得できる

---

## 🚀 次のステップ

上記の確認が完了したら、私に以下のように報告してください：

```
完了しました
```

その後、n8n ワークフローのテストと、実際のファイル処理実装に進みます。

---

## 📖 詳細ドキュメント

より詳しい情報は以下を参照：
- [Privacy Mode トラブルシューティング完全版](docs/troubleshooting-privacy-mode.md)
- [Telegram Bot セットアップガイド](docs/telegram-bot-setup.md)
