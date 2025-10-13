# 🚀 クイックスタートガイド

このガイドに従って、5分でDifyとN8nの統合テストを開始できます。

## ステップ1: サービスの起動確認

```bash
cd /Users/remma/dify-n8n-workflow
docker compose ps
```

すべてのサービスが `Up` 状態であることを確認してください。

## ステップ2: アクセス確認

### Dify
- URL: http://localhost:3000
- ブラウザでアクセスし、ログイン画面が表示されることを確認
- アカウント作成またはログイン

### n8n
- URL: http://localhost:5678
- ブラウザでアクセスし、ワークフロー画面が表示されることを確認
- アカウント作成またはログイン

## ステップ3: 最初の統合テスト

### テストA: n8n Webhookの動作確認

#### 1. n8nでWebhookワークフローをインポート

1. n8n (http://localhost:5678) にアクセス
2. 左上のメニュー（三本線アイコン）をクリック
3. 「Workflows」→「Import from File」を選択
4. `examples/simple-webhook-test.json` を選択してインポート
5. ワークフローが開いたら、右上の「Save」ボタンをクリック

#### 2. Webhook URLを確認

1. 「Webhook」ノードをクリック
2. 下部に表示される「Test URL」をコピー（例: `http://localhost:5678/webhook-test/dify-test`）
3. または「Production URL」を使用（ワークフローを有効化後）

#### 3. Webhookをテスト

ターミナルで以下のコマンドを実行:

```bash
curl -X POST http://localhost:5678/webhook-test/dify-test \
  -H "Content-Type: application/json" \
  -d '{
    "source": "manual-test",
    "message": "Hello from curl!",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
  }'
```

**期待される結果:**
```json
{
  "status": "success",
  "message": "Data received from Dify",
  "timestamp": "2025-10-13T..."
}
```

#### 4. n8nで実行履歴を確認

1. n8nの左メニューから「Executions」をクリック
2. 最新の実行履歴が「Success」になっていることを確認
3. クリックして詳細を確認（送信したデータが表示される）

---

### テストB: Dify APIの動作確認

#### 1. Difyでアプリを作成

1. Dify (http://localhost:3000) にアクセス
2. 左メニューから「Studio」を選択
3. 「Create from Blank」をクリック
4. アプリタイプ: **Chatbot** を選択
5. アプリ名: `N8N Test App`
6. 「Create」をクリック

#### 2. LLMプロバイダーを設定（オプション）

**注意:** LLMプロバイダーを設定しない場合、API呼び出しはエラーになります。

1. 左メニューの「Settings」→「Model Provider」を選択
2. OpenAI、Anthropic、またはその他のプロバイダーを追加
3. APIキーを設定

**または:**
- システムデフォルトのモデルを使用（Difyの初期設定による）

#### 3. API Keyを取得

1. 作成したアプリの画面で、右上の「Publish」ボタンをクリック
2. 「API Access」タブを選択
3. 「API Key」の「Create Secret Key」をクリック
4. 表示されたAPIキーをコピー（例: `app-xxxxxxxxxxxx`）
5. **重要:** このキーは一度しか表示されないので、安全な場所に保存

#### 4. n8nでDify API呼び出しワークフローをインポート

1. n8n (http://localhost:5678) にアクセス
2. 左上のメニューから「Workflows」→「Import from File」
3. `examples/simple-dify-api-test.json` を選択してインポート
4. ワークフローが開く

#### 5. APIキーを設定

1. 「Call Dify API」ノードをクリック
2. 「Headers」セクションを展開
3. `Authorization` ヘッダーの値を `Bearer YOUR_DIFY_API_KEY_HERE` から `Bearer app-xxxxxxxxxxxx` に変更（実際のAPIキーに置き換え）
4. 右上の「Save」ボタンをクリック

#### 6. ワークフローを実行

1. 右上の「Execute Workflow」ボタンをクリック
2. 実行が完了するまで待つ（数秒〜数十秒）
3. 各ノードの出力を確認

**期待される結果:**
- 「Call Dify API」ノード: DifyからのレスポンスJSON
- 「Process Response」ノード: 整形されたデータ（`message_id`, `conversation_id`, `answer`など）

---

## ステップ4: Difyからn8nへのWebhook連携テスト

### 1. n8nでWebhook URLを準備

1. `Simple Dify Webhook Test` ワークフローを開く
2. Webhookノードの「Production URL」をコピー
   - 例: `http://n8n:5678/webhook/dify-test`
3. ワークフローを「Active」に切り替え（右上のトグルスイッチ）

### 2. Difyでワークフローアプリを作成

1. Dify Studioで「Create from Blank」→「Workflow」を選択
2. アプリ名: `Webhook Test to N8N`

### 3. HTTP Requestノードを追加

1. キャンバス上の「Start」ノードの右側の「+」ボタンをクリック
2. 「HTTP Request」を検索して選択
3. HTTP Requestノードの設定:
   - **Method**: POST
   - **URL**: `http://n8n:5678/webhook/dify-test`
   - **Headers**:
     - Key: `Content-Type`, Value: `application/json`
   - **Body**:
     ```json
     {
       "source": "dify",
       "message": "Hello from Dify!",
       "timestamp": "{{#sys.date#}}"
     }
     ```
4. HTTP Requestノードを「End」ノードに接続

### 4. ワークフローを実行

1. 右上の「Run」ボタンをクリック
2. HTTP Requestノードが緑色（成功）になることを確認
3. n8nの「Executions」で新しい実行履歴が追加されていることを確認

---

## トラブルシューティング

### エラー: "Connection refused"

**原因:** コンテナ間通信でlocalhostを使用している

**解決策:**
- DifyからN8Nへ: `http://n8n:5678/...` を使用
- N8NからDifyへ: `http://dify-api:5001/...` を使用
- ブラウザからアクセス: `http://localhost:3000` と `http://localhost:5678` を使用

### エラー: "401 Unauthorized" (Dify API)

**原因:** APIキーが無効または未設定

**解決策:**
1. Difyで新しいAPIキーを生成
2. n8nのHTTP RequestノードのAuthorizationヘッダーを更新
3. `Bearer app-xxxxxxxxxxxx` の形式であることを確認

### エラー: Dify APIが "Model not configured"

**原因:** LLMプロバイダーが未設定

**解決策:**
1. Difyの「Settings」→「Model Provider」でプロバイダーを追加
2. OpenAI、Anthropic、またはローカルLLMを設定

### ログの確認方法

```bash
# すべてのサービスのログ
docker compose logs -f

# 特定のサービスのみ
docker compose logs -f dify-api
docker compose logs -f n8n

# 最新100行のみ
docker compose logs --tail 100 dify-api
```

---

## 次のステップ

✅ **基本的な統合が動作したら:**

1. **高度なワークフローを試す**
   - [統合テストガイド](docs/testing-guide.md) を参照
   - PostgreSQL連携、条件分岐、スケジュール実行など

2. **実用的なユースケースを実装**
   - チャットボットからのデータ収集
   - バッチ処理とレポート生成
   - 外部サービス連携（Slack、メールなど）

3. **本番環境への準備**
   - 認証の強化
   - HTTPS設定
   - バックアップ戦略
   - モニタリング設定

---

## 参考ドキュメント

- [統合テストガイド](docs/testing-guide.md) - 詳細なテスト手順
- [統合パターン](docs/integration.md) - 4つの統合パターンの詳細
- [セットアップガイド](docs/setup.md) - 環境構築とトラブルシューティング
- [Dify公式ドキュメント](https://docs.dify.ai/)
- [n8n公式ドキュメント](https://docs.n8n.io/)

---

## サポート

問題が発生した場合:
1. `docker compose logs` でログを確認
2. [トラブルシューティングガイド](docs/setup.md#troubleshooting) を参照
3. GitHubリポジトリでIssueを作成

**楽しいワークフロー開発を！** 🎉
