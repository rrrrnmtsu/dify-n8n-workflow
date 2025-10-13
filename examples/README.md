# サンプルワークフロー

このディレクトリには、Difyとn8nの連携を実現するサンプルワークフローが含まれています。

## ワークフロー一覧

### 1. dify-webhook-receiver.json

**概要:**
Difyから送信されるWebhookイベントを受信し、データベースに保存、重要な会話はSlackに通知するワークフロー。

**処理フロー:**
```
Webhook受信 → データ処理 → PostgreSQL保存 → 重要度判定 → Slack通知 → レスポンス返却
```

**主な機能:**
- Difyからのリアルタイム会話データ受信
- 会話ログのデータベース保存
- 「重要」というキーワードを含む会話のSlack通知
- Webhookレスポンスの返却

**必要な設定:**
- PostgreSQL接続設定（conversation_logsテーブル）
- Slack API認証情報

**テーブル作成SQL:**
```sql
CREATE TABLE conversation_logs (
  id SERIAL PRIMARY KEY,
  conversation_id VARCHAR(255),
  user_input TEXT,
  agent_output TEXT,
  timestamp TIMESTAMP,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversation_id ON conversation_logs(conversation_id);
CREATE INDEX idx_timestamp ON conversation_logs(timestamp);
```

**使い方:**
1. n8nにワークフローをインポート
2. PostgreSQL、Slack認証情報を設定
3. Webhook URLを取得（例: `http://localhost:5678/webhook/dify-event`）
4. Difyワークフローに「HTTP Request」ノードを追加し、上記URLへPOSTリクエストを送信

---

### 2. dify-api-caller.json

**概要:**
定期実行で未処理の質問を取得し、Dify APIでAI処理を実行、結果をメール送信するバッチ処理ワークフロー。

**処理フロー:**
```
スケジュール実行 → 未処理質問取得 → バッチ分割 → Dify API呼び出し → レスポンス処理 → DB更新 → メール送信 → 待機
```

**主な機能:**
- 1時間ごとの自動実行
- 未処理質問の一括取得（最大10件）
- Dify APIでAI回答生成
- データベース更新（処理済みフラグ）
- ユーザーへのメール送信
- レート制限対応（2秒待機）

**必要な設定:**
- PostgreSQL接続設定（pending_questionsテーブル）
- Dify API認証情報（Header Auth: `Authorization: Bearer YOUR_API_KEY`）
- SMTP設定（メール送信）

**テーブル作成SQL:**
```sql
CREATE TABLE pending_questions (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  question TEXT NOT NULL,
  processed BOOLEAN DEFAULT false,
  answer TEXT,
  conversation_id VARCHAR(255),
  message_id VARCHAR(255),
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_processed ON pending_questions(processed);
CREATE INDEX idx_created_at ON pending_questions(created_at);
```

**使い方:**
1. n8nにワークフローをインポート
2. PostgreSQL、Dify API、SMTP認証情報を設定
3. pending_questionsテーブルにテストデータを投入
4. ワークフローをアクティブ化

**テストデータ投入例:**
```sql
INSERT INTO pending_questions (email, question)
VALUES
  ('user1@example.com', 'AI技術の最新トレンドは何ですか?'),
  ('user2@example.com', 'データ分析の効率的な方法を教えてください。');
```

---

## 認証情報の設定

### PostgreSQL設定

**Connection Details:**
```
Host: postgres
Port: 5432
Database: dify
User: dify
Password: (.envファイルで設定したパスワード)
SSL: Disable
```

### Dify API設定

**Header Auth:**
```
Name: Authorization
Value: Bearer YOUR_DIFY_API_KEY
```

**APIキー取得方法:**
1. Dify Console（http://localhost:3000）にログイン
2. Settings → API Keys
3. 「Create Secret Key」をクリック
4. 生成されたキーをコピー

### Slack API設定

**必要な情報:**
- Workspace: あなたのSlackワークスペース
- Access Token: Slack App作成後に取得
- Channel: 通知先チャンネル名（例: `dify-alerts`）

**Slack App設定手順:**
1. https://api.slack.com/apps にアクセス
2. 「Create New App」→「From scratch」
3. OAuth & Permissions → Scopes に以下を追加:
   - `chat:write`
   - `chat:write.public`
4. Install App to Workspace
5. Bot User OAuth Tokenをコピー

### SMTP設定（メール送信）

**一般的な設定例:**
```
Host: smtp.gmail.com
Port: 587
Secure: true
User: your-email@gmail.com
Password: your-app-password
```

**Gmail使用時の注意:**
- 2段階認証を有効化
- アプリパスワードを生成して使用

---

## カスタマイズ例

### Webhook受信ワークフローのカスタマイズ

#### 1. 保存先をCSVファイルに変更
「Save to PostgreSQL」ノードを「Write Files」ノードに置き換え:

```javascript
// CSVフォーマット作成
const csv = `${$json.conversationId},${$json.userInput},${$json.agentOutput},${$json.timestamp}\n`;

// ファイル書き込み
return [{
  fileName: '/shared/conversation_logs.csv',
  data: csv,
  append: true
}];
```

#### 2. 通知条件の変更
「Check Important」ノードの条件を変更:

```
条件: userInput contains "緊急"
条件: agentOutput length > 1000
条件: timestamp is within last 5 minutes
```

### API呼び出しワークフローのカスタマイズ

#### 1. 実行頻度の変更
「Schedule Trigger」ノードの設定を変更:

```
毎日9時: 0 9 * * *
毎週月曜9時: 0 9 * * 1
毎月1日9時: 0 9 1 * *
```

#### 2. バッチサイズの調整
「Fetch Pending Questions」ノードのクエリを変更:

```sql
-- 10件 → 50件に変更
LIMIT 50
```

「Split In Batches」のbatchSizeを調整:

```
batchSize: 5  -- 一度に5件処理
```

---

## トラブルシューティング

### Webhookが受信できない

**確認項目:**
1. n8nのWebhook URLが正しいか
2. Difyからリクエストが送信されているか（Difyログ確認）
3. ネットワーク接続（docker network確認）

**デバッグ方法:**
```bash
# n8nログ確認
docker-compose logs n8n | grep webhook

# Dify APIログ確認
docker-compose logs dify-api | grep HTTP
```

### Dify API呼び出しエラー

**エラー: 401 Unauthorized**
- APIキーが正しく設定されているか確認
- Authorization Headerフォーマット確認: `Bearer YOUR_KEY`

**エラー: 500 Internal Server Error**
- Dify APIのログ確認
- リクエストボディのフォーマット確認

**エラー: Timeout**
- タイムアウト設定を延長
- Dify APIの負荷状況確認

### データベース接続エラー

**接続できない:**
```bash
# PostgreSQL接続確認
docker-compose exec postgres psql -U dify -c "SELECT 1"

# ネットワーク確認
docker network inspect dify-n8n-workflow_dify_network
```

**テーブルが存在しない:**
```bash
# テーブル一覧確認
docker-compose exec postgres psql -U dify -d dify -c "\dt"

# テーブル作成
docker-compose exec postgres psql -U dify -d dify -f /path/to/schema.sql
```

---

## パフォーマンス最適化

### バッチ処理の最適化

1. **バッチサイズの調整**
   - 小さすぎる: オーバーヘッドが大きい
   - 大きすぎる: タイムアウトリスク
   - 推奨: 5-10件

2. **待機時間の調整**
   - APIレート制限に応じて調整
   - 推奨: 1-3秒

3. **並列処理の活用**
   - 独立したタスクは並列実行
   - n8nの「Split In Batches」+ 並列ノード配置

---

## 次のステップ

1. サンプルワークフローをインポートして動作確認
2. 自社のユースケースに合わせてカスタマイズ
3. エラーハンドリング・ログ記録の強化
4. 本番環境向けのセキュリティ設定
5. モニタリング・アラート設定

詳細は[integration.md](../docs/integration.md)を参照してください。
