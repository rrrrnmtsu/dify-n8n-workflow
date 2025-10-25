# Telegram Bot Privacy Mode トラブルシューティング

## 🚨 問題の概要

**症状:**
- Telegram グループにファイルやメッセージを送信しても、Bot が受信できない
- `getUpdates` API が空の `result: []` を返す
- Bot が送信したメッセージは届くが、ユーザーのメッセージを受信できない

**原因:**
Bot の Privacy Mode が有効になっており、グループ内の全てのメッセージを受信できない状態。

---

## 🔍 現在の状態確認

### 1. Privacy Mode ステータス確認

```bash
curl -s "https://api.telegram.org/bot8401202439:AAHwPAMl26dYPi7J6N2LV_o32VKb2T0BtbI/getMe" | jq '.result.can_read_all_group_messages'
```

**現在の結果:**
```json
false
```

**これは Privacy Mode が有効であることを示しています。**

---

## ✅ 解決手順（完全版）

### Step 1: BotFather で Privacy Mode を無効化

1. **Telegram で BotFather を開く**
   - 検索: `@BotFather`

2. **`/setprivacy` コマンドを送信**

3. **Bot を選択**
   - `@cross_logbot` を選択

4. **`Disable` を選択**
   - これにより、Bot がグループ内の全てのメッセージを受信できるようになります

5. **確認メッセージ**
   ```
   Success! The new status is: DISABLED.
   /help
   ```

---

### Step 2: Bot をグループから削除（重要）

**⚠️ この手順を省略すると設定が反映されません！**

1. **Telegram で「CROSS ROPPONNGI 経理 日報」グループを開く**

2. **グループ設定 → メンバー → cross_logbot を選択**

3. **「グループから削除」を実行**

---

### Step 3: Bot をグループに再追加

1. **グループ設定 → メンバーを追加**

2. **`@cross_logbot` を検索**

3. **追加を実行**

4. **Bot が参加したメッセージが表示されることを確認**

---

### Step 4: 設定反映の確認

```bash
curl -s "https://api.telegram.org/bot8401202439:AAHwPAMl26dYPi7J6N2LV_o32VKb2T0BtbI/getMe" | jq '.result.can_read_all_group_messages'
```

**期待される結果:**
```json
true
```

`true` になっていれば設定反映成功です。

---

### Step 5: メッセージ受信テスト

1. **グループでテストメッセージを送信**
   ```
   テスト
   ```

2. **getUpdates で確認**
   ```bash
   curl -s "https://api.telegram.org/bot8401202439:AAHwPAMl26dYPi7J6N2LV_o32VKb2T0BtbI/getUpdates" | jq '.'
   ```

3. **期待される結果**
   ```json
   {
     "ok": true,
     "result": [
       {
         "update_id": 592193868,
         "message": {
           "message_id": 9,
           "from": {
             "id": 123456789,
             "is_bot": false,
             "first_name": "Your Name"
           },
           "chat": {
             "id": -4796493812,
             "title": "CROSS ROPPONNGI 経理 日報",
             "type": "group"
           },
           "date": 1760924600,
           "text": "テスト"
         }
       }
     ]
   }
   ```

---

### Step 6: ファイル受信テスト

1. **グループでテストファイルを送信**
   - Excel ファイル (.xlsx) または PDF ファイル (.pdf)

2. **getUpdates で確認**
   ```bash
   curl -s "https://api.telegram.org/bot8401202439:AAHwPAMl26dYPi7J6N2LV_o32VKb2T0BtbI/getUpdates" | jq '.result[] | select(.message.document != null)'
   ```

3. **期待される結果**
   ```json
   {
     "update_id": 592193869,
     "message": {
       "message_id": 10,
       "from": {...},
       "chat": {
         "id": -4796493812,
         "title": "CROSS ROPPONNGI 経理 日報",
         "type": "group"
       },
       "date": 1760924700,
       "document": {
         "file_name": "test.xlsx",
         "mime_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
         "file_id": "BQACAgUAAxkBAAIBCmb...",
         "file_unique_id": "AgADBQACmb...",
         "file_size": 12345
       }
     }
   }
   ```

---

## 🔧 よくある問題

### Q1: Step 1 完了後、すぐに `getMe` で確認したが `false` のまま

**A:** Bot をグループから削除→再追加していないため。Step 2-3 を実施してください。

---

### Q2: Step 3 完了後も `false` のまま

**A:** 以下を確認：
1. BotFather で正しく `Disable` を選択したか
2. 正しい Bot を選択したか（`@cross_logbot`）
3. Telegram アプリを再起動してみる

---

### Q3: `getUpdates` が空のまま

**A:** 以下を確認：
1. グループでメッセージを送信したか
2. Bot がグループメンバーになっているか
3. 正しい Chat ID（-4796493812）のグループか確認

---

### Q4: Bot 再追加後、古いメッセージが大量に返ってくる

**A:** 正常です。`offset` パラメータで最新のメッセージのみ取得できます：

```bash
curl -s "https://api.telegram.org/bot8401202439:AAHwPAMl26dYPi7J6N2LV_o32VKb2T0BtbI/getUpdates?offset=-1" | jq '.'
```

---

## 📊 確認チェックリスト

実施完了後、以下を確認してください：

- [ ] BotFather で `/setprivacy` → `Disable` を選択
- [ ] Bot をグループから削除
- [ ] Bot をグループに再追加
- [ ] `getMe` API で `can_read_all_group_messages: true` を確認
- [ ] テストメッセージ送信で `getUpdates` に表示されることを確認
- [ ] テストファイル送信で `document` フィールドが取得できることを確認

---

## 🚀 次のステップ

全ての確認が完了したら：

1. n8n ワークフロー「Telegram File Receiver (Polling)」を Active 化
2. 実際の売上日報ファイルを送信してテスト
3. ファイルダウンロードと処理の実装に進む

---

## 📞 問題が解決しない場合

上記の手順を全て実施しても問題が解決しない場合：

1. **Bot Token の再生成を検討**
   - BotFather で `/revoke` → 新しい Token を `.env` に設定

2. **新しい Bot を作成**
   - 一から Bot を作り直し、最初から Privacy Mode を `Disable` に設定

3. **Telegram API ステータス確認**
   - https://telegram.org/status で障害情報を確認
