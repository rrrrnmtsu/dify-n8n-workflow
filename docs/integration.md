# Dify × n8n 連携ガイド

## 連携パターン一覧

### 1. Webhook連携（Dify → n8n）

Difyのワークフロー/エージェントから、n8nへWebhookで処理を連携するパターン。

#### 実装手順

##### n8n側の設定

1. n8nで新規ワークフローを作成
2. 「Webhook」ノードを追加
3. Webhook URLをコピー（例: `http://localhost:5678/webhook/dify-event`）

##### Dify側の設定

1. Difyのワークフロー内に「HTTP Request」ノードを追加
2. Method: `POST`
3. URL: n8nのWebhook URL
4. Body:
```json
{
  "conversation_id": "{{conversation_id}}",
  "user_input": "{{user_input}}",
  "agent_output": "{{agent_output}}",
  "timestamp": "{{timestamp}}"
}
```

#### ユースケース

- チャット会話の自動保存
- ユーザーアクションのトリガー
- 外部システムへの通知
- データ集計・分析

---

### 2. API連携（n8n → Dify）

n8nからDify APIを呼び出して、AIエージェントを実行するパターン。

#### 実装手順

##### Dify APIキー取得

1. Dify Console → Settings → API Keys
2. 新しいAPIキーを作成
3. APIキーをコピー

##### n8n側の設定

1. 「HTTP Request」ノードを追加
2. 以下の設定を行う:

```
Method: POST
URL: http://dify-api:5001/v1/chat-messages
Authentication: Header Auth
  - Name: Authorization
  - Value: Bearer YOUR_DIFY_API_KEY

Headers:
  - Content-Type: application/json

Body (JSON):
{
  "inputs": {},
  "query": "{{$json.user_message}}",
  "response_mode": "blocking",
  "conversation_id": "",
  "user": "n8n-user"
}
```

#### ユースケース

- 外部トリガーでAI処理を実行
- スケジュール実行でのAI分析
- 大量データの一括AI処理
- マルチステップAIワークフロー

---

### 3. データベース共有連携

PostgreSQLを介したデータ共有パターン。

#### 実装手順

##### PostgreSQL接続設定（n8n）

1. n8n Credentials → 「Postgres」を追加
2. 接続情報:
```
Host: postgres
Port: 5432
Database: dify
User: dify
Password: (.envで設定したパスワード)
SSL: Disable
```

##### Difyデータテーブル参照

```sql
-- 会話履歴取得
SELECT
  c.id as conversation_id,
  c.created_at,
  m.query as user_message,
  m.answer as ai_response
FROM conversations c
JOIN messages m ON c.id = m.conversation_id
WHERE c.created_at > NOW() - INTERVAL '1 day'
ORDER BY c.created_at DESC;
```

#### ユースケース

- 会話履歴の分析・集計
- レポート生成
- データエクスポート
- カスタムダッシュボード作成

---

### 4. ファイル共有連携

共有ボリューム経由でのファイル連携パターン。

#### 実装手順

##### 共有ディレクトリ活用

docker-compose.ymlで設定済みの`./shared`ディレクトリを使用:

```yaml
volumes:
  - ./shared:/shared
```

##### n8nでのファイル操作

1. 「Read/Write Files from Disk」ノードを使用
2. ファイルパス: `/shared/data.json`

##### Difyでのファイル参照

カスタムPythonコードノードで参照:

```python
import json

# ファイル読み込み
with open('/shared/data.json', 'r') as f:
    data = json.load(f)

# 処理
result = process_data(data)

# ファイル書き込み
with open('/shared/result.json', 'w') as f:
    json.dump(result, f)
```

#### ユースケース

- 大容量データの受け渡し
- 画像・音声ファイルの処理
- CSVデータの一括処理
- レポートファイル生成

---

## 連携設計のベストプラクティス

### 1. エラーハンドリング

#### n8n側
- 「Error Trigger」ノードでエラーをキャッチ
- リトライロジックの実装
- エラー通知の設定

#### Dify側
- Try-Catchブロックの活用
- フォールバック処理の実装
- エラーログの記録

### 2. データ検証

```javascript
// n8nでのバリデーション例
if (!$json.user_input || $json.user_input.length === 0) {
  throw new Error('user_input is required');
}

if ($json.user_input.length > 1000) {
  throw new Error('user_input exceeds maximum length');
}
```

### 3. レート制限対応

```javascript
// n8nでのレート制限実装
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// リクエスト間に遅延を挿入
await delay(1000);
```

### 4. セキュリティ

- APIキーは環境変数で管理
- Webhook URLに認証トークンを付与
- IPホワイトリスト設定（本番環境）
- HTTPS通信の使用（本番環境）

---

## 実装例

### 例1: チャットログ自動保存システム

**フロー:**
```
Dify Chat → Webhook → n8n → PostgreSQL保存 → Slack通知
```

**n8nワークフロー構成:**
1. Webhook Trigger
2. データ変換ノード
3. Postgres Insert
4. Slack通知ノード

### 例2: 定期AI分析レポート

**フロー:**
```
n8n Schedule → データ取得 → Dify API → レポート生成 → メール送信
```

**n8nワークフロー構成:**
1. Cron Trigger（毎日9時）
2. データベースクエリ
3. Dify API呼び出し
4. PDF生成
5. メール送信

### 例3: ユーザーリクエストの並列AI処理

**フロー:**
```
n8n Webhook → データ分割 → 並列Dify API呼び出し → 結果統合 → レスポンス
```

**n8nワークフロー構成:**
1. Webhook Trigger
2. Split In Batches
3. 複数のDify API並列呼び出し
4. Merge Node
5. HTTP Response

---

## パフォーマンス最適化

### 1. 非同期処理の活用

```javascript
// n8nで非同期処理
const promises = items.map(item =>
  $http.request({
    method: 'POST',
    url: 'http://dify-api:5001/v1/chat-messages',
    body: { query: item.text }
  })
);

const results = await Promise.all(promises);
```

### 2. キャッシュ戦略

- Redisを活用した結果キャッシュ
- 同一クエリの重複実行防止
- TTL設定で適切なキャッシュ期限管理

### 3. バッチ処理

- 大量データは分割して処理
- n8nの「Split In Batches」ノード活用
- タイムアウト設定の適切な調整

---

## モニタリング・ログ

### ログ収集設定

```bash
# n8nワークフロー実行ログ
docker-compose logs n8n | grep "Workflow execution"

# Dify APIログ
docker-compose logs dify-api | grep "API Request"
```

### メトリクス監視

- 実行時間の測定
- エラー率の追跡
- スループットの監視
- リソース使用率の確認

---

## トラブルシューティング

### 接続エラー

```bash
# ネットワーク確認
docker network ls
docker network inspect dify-n8n-workflow_workflow_network

# DNS解決確認
docker-compose exec n8n ping dify-api
```

### Webhook受信できない

1. n8n Webhook URLの確認
2. ファイアウォール設定の確認
3. ネットワーク設定の確認
4. ログでリクエストを追跡

### API認証エラー

1. APIキーの有効性確認
2. Authorizationヘッダー形式確認
3. CORS設定の確認（本番環境）

---

## 参考リソース

- [Dify API Documentation](https://docs.dify.ai/api)
- [n8n Documentation](https://docs.n8n.io/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
