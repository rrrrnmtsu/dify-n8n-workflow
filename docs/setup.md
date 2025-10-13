# セットアップガイド

## 環境構築の詳細手順

### 1. システム要件

#### 最小要件
- CPU: 2コア以上
- RAM: 8GB以上
- ストレージ: 20GB以上の空き容量
- OS: macOS / Linux / Windows (WSL2)

#### 推奨要件
- CPU: 4コア以上
- RAM: 16GB以上
- ストレージ: 50GB以上の空き容量
- SSD推奨

### 2. 必須ソフトウェア

```bash
# Docker バージョン確認
docker --version
# Docker Compose 20.10.0以上推奨

# Docker Compose バージョン確認
docker-compose --version
```

### 3. 環境変数の詳細設定

#### 3.1 データベース設定

```env
# PostgreSQL
POSTGRES_USER=dify              # データベースユーザー名
POSTGRES_PASSWORD=強力なパスワード  # 本番環境では必ず変更
POSTGRES_DB=dify                # Difyデータベース名
N8N_DB=n8n                      # n8nデータベース名
```

#### 3.2 Redis設定

```env
REDIS_PASSWORD=強力なパスワード    # 本番環境では必ず変更
```

#### 3.3 Dify設定

```env
# シークレットキー（32文字以上のランダム文字列）
DIFY_SECRET_KEY=$(openssl rand -base64 32)

# 動作モード
DIFY_MODE=production  # development / production

# ログレベル
LOG_LEVEL=INFO  # DEBUG / INFO / WARNING / ERROR

# API URL（外部公開する場合は適切なURLに変更）
DIFY_API_URL=http://localhost:5001
DIFY_CONSOLE_URL=http://localhost:3000
```

#### 3.4 n8n設定

```env
# Basic認証
N8N_BASIC_AUTH_ACTIVE=true
N8N_USER=admin
N8N_PASSWORD=強力なパスワード

# Webhook設定
N8N_WEBHOOK_URL=http://localhost:5678
N8N_HOST=localhost
N8N_PROTOCOL=http

# 実行設定
N8N_EXECUTIONS_MODE=regular  # regular / queue
N8N_EXECUTIONS_TIMEOUT=300   # デフォルトタイムアウト（秒）
N8N_EXECUTIONS_TIMEOUT_MAX=3600  # 最大タイムアウト（秒）
```

### 4. 初回起動手順

#### 4.1 環境変数ファイル作成

```bash
# .env.exampleをコピー
cp .env.example .env

# エディタで編集
nano .env
# または
vim .env
```

#### 4.2 Docker Compose起動

```bash
# バックグラウンドで起動
docker-compose up -d

# ログをリアルタイム表示して起動
docker-compose up
```

#### 4.3 起動確認

```bash
# 全コンテナの状態確認
docker-compose ps

# 期待される出力:
# NAME           STATUS    PORTS
# dify-api       Up        0.0.0.0:5001->5001/tcp
# dify-web       Up        0.0.0.0:3000->3000/tcp
# dify-postgres  Up        5432/tcp
# dify-redis     Up        6379/tcp
# n8n            Up        0.0.0.0:5678->5678/tcp
```

#### 4.4 ヘルスチェック

```bash
# Dify API
curl http://localhost:5001/health

# n8n
curl http://localhost:5678/healthz
```

### 5. 初期設定

#### 5.1 Dify初期設定

1. ブラウザで http://localhost:3000 にアクセス
2. 初回アクセス時に管理者アカウントを作成
3. LLMプロバイダー設定（OpenAI, Anthropic, etc.）
4. APIキーを設定

#### 5.2 n8n初期設定

1. ブラウザで http://localhost:5678 にアクセス
2. Basic認証でログイン（`.env`で設定した認証情報）
3. 初回ウィザードに従ってセットアップ
4. クレデンシャル設定（必要なAPI連携）

### 6. データ永続化

#### 6.1 Dockerボリューム確認

```bash
# ボリューム一覧
docker volume ls | grep dify-n8n

# 期待されるボリューム:
# dify-n8n-workflow_postgres_data
# dify-n8n-workflow_redis_data
# dify-n8n-workflow_dify_api_data
# dify-n8n-workflow_n8n_data
```

#### 6.2 バックアップ

```bash
# PostgreSQLデータベースバックアップ
docker-compose exec postgres pg_dump -U dify dify > backup_dify_$(date +%Y%m%d).sql
docker-compose exec postgres pg_dump -U dify n8n > backup_n8n_$(date +%Y%m%d).sql

# n8nワークフロー設定バックアップ
docker-compose exec n8n n8n export:workflow --backup --output=/workflows/backup
```

#### 6.3 リストア

```bash
# データベースリストア
cat backup_dify_20250101.sql | docker-compose exec -T postgres psql -U dify dify
cat backup_n8n_20250101.sql | docker-compose exec -T postgres psql -U dify n8n
```

### 7. アップデート手順

```bash
# イメージ更新
docker-compose pull

# コンテナ再作成
docker-compose up -d --force-recreate

# 古いイメージ削除
docker image prune -f
```

### 8. トラブルシューティング

#### 8.1 コンテナが起動しない

```bash
# ログ確認
docker-compose logs dify-api
docker-compose logs n8n

# コンテナ再作成
docker-compose down
docker-compose up -d
```

#### 8.2 データベース接続エラー

```bash
# PostgreSQL接続確認
docker-compose exec postgres psql -U dify -c "SELECT version();"

# Redis接続確認
docker-compose exec redis redis-cli -a ${REDIS_PASSWORD} ping
```

#### 8.3 ポート競合

```bash
# 使用中のポート確認
lsof -i :3000
lsof -i :5001
lsof -i :5678

# .envファイルでポート変更
DIFY_WEB_PORT=3001
DIFY_API_PORT=5002
N8N_PORT=5679
```

### 9. セキュリティ設定

#### 9.1 ファイアウォール設定

```bash
# 必要なポートのみ開放
# 本番環境ではリバースプロキシ経由を推奨
```

#### 9.2 HTTPS設定（本番環境）

Nginx / Caddy / Traefikなどのリバースプロキシを使用してHTTPS化を推奨します。

#### 9.3 定期的なセキュリティアップデート

```bash
# 週次でイメージ更新を推奨
docker-compose pull
docker-compose up -d
```

### 10. パフォーマンスチューニング

#### 10.1 PostgreSQL最適化

```sql
-- 接続数設定
ALTER SYSTEM SET max_connections = 200;

-- 共有バッファ設定
ALTER SYSTEM SET shared_buffers = '2GB';

-- 設定リロード
SELECT pg_reload_conf();
```

#### 10.2 Redis最適化

```bash
# maxmemory設定
docker-compose exec redis redis-cli CONFIG SET maxmemory 1gb
docker-compose exec redis redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### 11. モニタリング

#### 11.1 リソース使用状況確認

```bash
# CPU・メモリ使用状況
docker stats

# ディスク使用状況
docker system df
```

#### 11.2 ログ監視

```bash
# リアルタイムログ監視
docker-compose logs -f --tail=100

# エラーログのみ抽出
docker-compose logs | grep ERROR
```
