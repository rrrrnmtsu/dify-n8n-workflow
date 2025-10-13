# テスト稼働ガイド

Codex で Dify と n8n の連携検証を進めるための手順をまとめています。Docker コンテナの起動から双方向の連携テストまで、一連の流れをここに集約しました。

## 1. 事前準備チェック

- `.env` の必須項目（PostgreSQL／Redis パスワード、Dify シークレットキー、n8n 認証情報など）を設定済みであること
- Docker / Docker Compose が動作すること（`docker --version` / `docker compose version` で確認）
- `examples/` ディレクトリ内のサンプルワークフローを n8n へインポートできるよう準備

> `.env` の例は `.env.example` を参照。Basic 認証を無効化したい場合は `N8N_BASIC_AUTH_ACTIVE=false` を設定してください。

## 2. コンテナ起動と状態確認

```bash
docker compose up -d
docker compose ps
```

期待される状態:

- `dify-api` / `dify-web` / `dify-postgres` / `dify-redis` / `n8n` が `Up` になっている

ヘルスチェック:

```bash
# Dify API
curl http://localhost:5001/health

# n8n API (ログイン前は 401 になる場合があります)
curl -I http://localhost:5678/rest/ping
```

## 3. n8n 初期セットアップ

1. ブラウザで `http://localhost:5678` を開く
2. 初回起動時はアカウント作成（または Basic 認証）を完了する
3. メイン画面が表示されたら以下を実施:
   - `examples/dify-webhook-receiver.json` を **Import** で読み込む
   - Postgres クレデンシャルを作成  
     - Host: `postgres`  
     - Port: `5432`  
     - Database: `.env` の `POSTGRES_DB`（既定: `dify`）  
     - User / Password: `.env` の `POSTGRES_USER` / `POSTGRES_PASSWORD`
   - （任意）Slack など外部サービスのクレデンシャルを設定

インポートしたワークフローを **Activate** にしておくと Webhook を受け取れる状態になります。

## 4. Dify 初期セットアップ

1. ブラウザで `http://localhost:3000` へアクセス
2. 管理者アカウントを作成し、ログイン
3. サンプルの検証を行うために以下を準備:
   - 新規アプリ（チャットボット等）を作成
   - ワークフロー内に「HTTP Request」ノードを追加し、n8n Webhook を呼び出せるよう設定  
     - メソッド: `POST`  
     - URL: `http://n8n:5678/webhook/dify-event`（コンテナ内からのアクセスはサービス名で OK）  
     - Body: `application/json`

## 5. テストシナリオ A（Dify → n8n Webhook）

1. Dify の HTTP Request ノードに以下のボディを設定

```json
{
  "conversation_id": "{{conversation_id}}",
  "user_input": "{{user_input}}",
  "agent_output": "{{agent_output}}",
  "timestamp": "{{timestamp}}"
}
```

2. Dify でテスト実行
3. n8n の実行ログで Webhook が走っているか確認
4. PostgreSQL にデータが入ったか確認する場合

```bash
docker compose exec postgres psql -U ${POSTGRES_USER:-dify} -d ${POSTGRES_DB:-dify} -c "SELECT * FROM conversation_logs ORDER BY id DESC LIMIT 5;"
```

### 手動テスト用サンプル（n8n の Webhook に直接送る）

```bash
./scripts/send-sample-webhook.sh
```

`JSON_PAYLOAD` 環境変数を渡すことで任意のペイロードに差し替えられます。

```bash
JSON_PAYLOAD='{ "conversation_id": "demo", "user_input": "重要なお知らせ", "agent_output": "了解しました" }' ./scripts/send-sample-webhook.sh
```

## 6. テストシナリオ B（n8n → Dify API 呼び出し）

1. Dify Console → Settings → API Keys で API キーを発行
2. `examples/dify-api-caller.json` を n8n にインポート
3. 「HTTP Request」ノードに `Authorization: Bearer <DIFY_API_KEY>` を設定
4. PostgreSQL に `pending_questions` テーブルを作成し、サンプルデータを投入（`examples/README.md` 参照）
5. ワークフローを実行し、Dify からの応答がメールや DB に反映されるか確認

## 7. ログ・リソース確認のポイント

```bash
# 直近ログ
docker compose logs -f --tail=100 dify-api
docker compose logs -f --tail=100 n8n

# コンテナリソースの確認
docker stats
```

エラーが出た場合は `docs/setup.md` / `docs/integration.md` のトラブルシューティングセクションも参照してください。

## 8. 後片付け

```bash
# コンテナ停止
docker compose down

# ボリュームも削除（テストデータを破棄したい場合のみ）
docker compose down -v
```

以上で Codex からでも一通りのテスト稼働を実施できます。必要に応じてワークフローやクレデンシャルを調整し、本番環境向けの設定へ発展させてください。
