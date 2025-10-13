# Dify & n8n 統合テストガイド

このガイドでは、DifyとN8nの統合機能を実際にテストする手順を説明します。

## 前提条件

- すべてのサービスが起動していること (`docker compose ps` で確認)
- Dify: http://localhost:3000 にアクセス可能
- n8n: http://localhost:5678 にアクセス可能

## テスト1: Webhook連携（Dify → n8n）

### 目的
Difyのワークフローから外部Webhook（n8n）を呼び出し、データを受け渡す

### 手順

#### 1. n8nでWebhook受信ワークフローを作成

1. n8n (http://localhost:5678) にアクセス
2. 左上の「+」ボタンで新規ワークフローを作成
3. 「Add first step」をクリック
4. 検索で「Webhook」と入力し、「Webhook」ノードを追加
5. Webhookノードの設定:
   - **HTTP Method**: POST
   - **Path**: `dify-test`
   - **Authentication**: None（テスト用）
   - **Respond**: Immediately
   - **Response Code**: 200
   - **Response Body**: `{"status": "success", "message": "Data received from Dify"}`
6. 右上の「Save」ボタンでワークフローを保存（名前: `Dify Webhook Test`）
7. Webhook URLをコピー: `http://localhost:5678/webhook/dify-test`

#### 2. Difyでワークフローアプリを作成

1. Dify (http://localhost:3000) にアクセス
2. 左メニューから「Studio」を選択
3. 「Create from Blank」をクリック
4. アプリタイプ: **Workflow** を選択
5. アプリ名: `N8N Webhook Test`

#### 3. Difyワークフローにノードを追加

1. **Start** ノードはデフォルトで存在
2. 「+」ボタンをクリックして **HTTP Request** ノードを追加
3. HTTP Requestノードの設定:
   - **Method**: POST
   - **URL**: `http://n8n:5678/webhook/dify-test`
   - **Headers**:
     - `Content-Type`: `application/json`
   - **Body**:
     ```json
     {
       "source": "dify",
       "timestamp": "{{sys.date}}",
       "message": "Hello from Dify!"
     }
     ```
4. HTTP Requestノードを **End** ノードに接続
5. 右上の「Publish」ボタンでワークフローを公開

#### 4. テスト実行

1. Difyの右上「Run」ボタンをクリック
2. n8n側で「Executions」タブを確認
3. 新しい実行履歴が表示され、ステータスが「Success」であることを確認
4. 実行履歴をクリックして、受信したデータを確認

### 期待される結果

- Difyから送信されたデータがn8nで正常に受信される
- n8nの実行履歴に以下のデータが記録される:
  ```json
  {
    "source": "dify",
    "timestamp": "2025-10-13T...",
    "message": "Hello from Dify!"
  }
  ```

---

## テスト2: API連携（n8n → Dify）

### 目的
n8nからDify APIを呼び出し、LLMを活用した処理を実行

### 手順

#### 1. Dify APIキーを取得

1. Dify (http://localhost:3000) にアクセス
2. 左メニューから「Studio」を選択
3. 既存のアプリを選択するか、新規作成（タイプ: **Chatbot**）
4. 右上の「Publish」ボタンをクリック
5. 「API Access」タブを選択
6. **API Key** をコピー（`app-xxx` の形式）
7. **API Endpoint** を確認: `http://localhost:5001/v1`

#### 2. n8nでDify API呼び出しワークフローを作成

1. n8n (http://localhost:5678) で新規ワークフローを作成
2. 「Add first step」で **Manual Trigger** ノードを追加
3. 「+」ボタンで **HTTP Request** ノードを追加
4. HTTP Requestノードの設定:
   - **Method**: POST
   - **URL**: `http://dify-api:5001/v1/chat-messages`
   - **Authentication**: None
   - **Headers**:
     - `Authorization`: `Bearer YOUR_API_KEY`（上記で取得したAPIキーに置き換え）
     - `Content-Type`: `application/json`
   - **Body**:
     ```json
     {
       "inputs": {},
       "query": "こんにちは！DifyとN8nの統合テストを実施しています。",
       "response_mode": "blocking",
       "user": "n8n-test"
     }
     ```
5. ワークフローを保存（名前: `Dify API Test`）

#### 3. テスト実行

1. n8nの「Execute Workflow」ボタンをクリック
2. HTTP Requestノードの出力を確認
3. Difyからのレスポンスに `answer` フィールドが含まれていることを確認

### 期待される結果

- n8nからDify APIが正常に呼び出される
- Difyのレスポンスに以下のような構造が含まれる:
  ```json
  {
    "event": "message",
    "message_id": "...",
    "conversation_id": "...",
    "answer": "こんにちは!...",
    "created_at": 1697000000
  }
  ```

---

## テスト3: サンプルワークフローのインポート

プロジェクトには2つのサンプルワークフローが含まれています:

### 1. Dify Webhook Receiver (`examples/dify-webhook-receiver.json`)

**機能:**
- DifyからのWebhookを受信
- PostgreSQLにデータを保存
- 条件分岐処理
- Slack通知（オプション）

**インポート手順:**
1. n8nで「Workflows」→「Import from File」を選択
2. `examples/dify-webhook-receiver.json` を選択
3. PostgreSQL接続情報を設定
4. （オプション）Slack通知を有効化する場合は認証情報を設定

### 2. Dify API Caller (`examples/dify-api-caller.json`)

**機能:**
- スケジュール実行（毎日定時）
- PostgreSQLからデータを取得
- Dify APIでバッチ処理
- 処理結果をメール送信

**インポート手順:**
1. n8nで「Workflows」→「Import from File」を選択
2. `examples/dify-api-caller.json` を選択
3. Dify APIキーを設定
4. PostgreSQL接続情報を設定
5. メール送信設定を構成

---

## トラブルシューティング

### Difyから n8n へのWebhookが失敗する

**症状:** Dify側で「Connection refused」エラー

**原因:** DifyコンテナからN8Nコンテナへの通信にコンテナ名を使用していない

**解決策:**
- DifyのHTTP Request URLは `http://n8n:5678/webhook/...` を使用
- `localhost` や `127.0.0.1` は使用しない（コンテナ間通信では機能しない）

### n8nから Dify APIへのリクエストが失敗する

**症状:** n8n側で「ECONNREFUSED」エラー

**原因:** N8NコンテナからDify APIコンテナへの通信にコンテナ名を使用していない

**解決策:**
- n8nのHTTP Request URLは `http://dify-api:5001/v1/...` を使用
- `localhost` は使用しない

### Dify APIキーが無効

**症状:** 401 Unauthorized エラー

**解決策:**
1. Difyで新しいAPIキーを生成
2. `Authorization: Bearer YOUR_API_KEY` ヘッダーが正しく設定されているか確認
3. APIキーの先頭に `app-` があることを確認

### PostgreSQL接続エラー

**症状:** n8nからPostgreSQLに接続できない

**解決策:**
- ホスト: `postgres`（コンテナ名）
- ポート: `5432`
- データベース: `dify` または `n8n`
- ユーザー: `dify`
- パスワード: `.env` ファイルの `POSTGRES_PASSWORD` を確認

---

## 次のステップ

1. **LLMプロバイダーの設定**
   - Difyの「Settings」→「Model Provider」で OpenAI/Anthropic などを設定

2. **高度なワークフローの構築**
   - 条件分岐、ループ、データ変換などを組み合わせた複雑なワークフロー

3. **本番環境への移行**
   - 環境変数の見直し
   - 認証の強化（Basic Auth、OAuth）
   - HTTPSの設定
   - バックアップ戦略の策定

4. **パフォーマンス最適化**
   - PostgreSQL接続プーリング
   - Redisキャッシュの活用
   - ワークフロー実行の並列化

---

## 参考リソース

- [Dify公式ドキュメント](https://docs.dify.ai/)
- [n8n公式ドキュメント](https://docs.n8n.io/)
- [統合パターン詳細](./integration.md)
- [セットアップガイド](./setup.md)
