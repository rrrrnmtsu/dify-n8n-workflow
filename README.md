# Dify × n8n ワークフロー統合環境

Dify（LLMアプリケーション開発プラットフォーム）とn8n（ワークフロー自動化ツール）を統合したテスト・開発環境です。

## 📋 概要

このリポジトリは、Difyとn8nを組み合わせた自動化ワークフローを構築・テストするための環境を提供します。

### 主要コンポーネント

- **Dify**: LLMアプリケーション開発プラットフォーム
  - AIエージェント構築
  - プロンプト管理
  - LLMモデル統合

- **n8n**: ワークフロー自動化プラットフォーム
  - ビジュアルワークフローエディタ
  - Webhook対応
  - 300+のインテグレーション

- **PostgreSQL**: データベース（Dify・n8n共通）
- **Redis**: キャッシュ層（Dify用）

## 🚀 クイックスタート

**すぐに始めたい方は [QUICKSTART.md](QUICKSTART.md) をご覧ください！**
5分で統合テストを開始できます。

### 前提条件

- Docker & Docker Compose インストール済み
- Git インストール済み
- 8GB以上のRAM推奨

### セットアップ手順

1. **リポジトリをクローン**
```bash
git clone https://github.com/rrrrnmtsu/dify-n8n-workflow.git
cd dify-n8n-workflow
```

2. **環境変数を設定**
```bash
cp .env.example .env
# .envファイルを編集して、パスワードやAPIキーを設定
nano .env
```

3. **Docker環境を起動**
```bash
docker compose up -d
```

4. **起動確認**
```bash
docker-compose ps
```

### アクセスURL

| サービス | URL | 初期認証情報 |
|---------|-----|------------|
| Dify Web Console | http://localhost:3000 | 初回アクセス時に設定 |
| Dify API | http://localhost:5001 | - |
| n8n | http://localhost:5678 | admin / admin_password_changeme |

## 📁 ディレクトリ構造

```
dify-n8n-workflow/
├── docker-compose.yml      # Docker Compose設定
├── .env.example            # 環境変数テンプレート
├── .env                    # 環境変数（gitignore対象）
├── README.md               # このファイル
├── dify/                   # Dify関連ファイル
│   └── configs/           # カスタム設定
├── n8n/                    # n8n関連ファイル
│   └── workflows/         # ワークフロー定義
├── shared/                 # 共有ファイル領域
├── docs/                   # ドキュメント
│   ├── setup.md           # セットアップガイド
│   ├── workflows.md       # ワークフロー設計ガイド
│   └── integration.md     # 連携方法
└── examples/               # サンプルワークフロー
    ├── dify-webhook.json  # DifyからWebhook受信
    └── ai-automation.json # AI自動化フロー
```

## 🔧 基本操作

### サービス管理

```bash
# 起動
docker-compose up -d

# 停止
docker-compose down

# ログ確認
docker-compose logs -f

# 特定サービスのログ
docker-compose logs -f dify-api
docker-compose logs -f n8n

# 再起動
docker-compose restart

# 完全削除（データも削除）
docker-compose down -v
```

### データベース接続

```bash
# PostgreSQL接続
docker-compose exec postgres psql -U dify -d dify

# Redis接続
docker-compose exec redis redis-cli -a redis_password_changeme
```

## 🔗 Dify × n8n 連携パターン

### 1. Webhook連携
Difyからn8nへWebhookで処理を連携

```
Dify Agent → Webhook → n8n Workflow → 外部API/DB
```

### 2. API連携
n8nからDify APIを呼び出してAI処理を実行

```
n8n Trigger → Dify API Request → レスポンス処理 → 後続処理
```

### 3. データベース共有
PostgreSQLを介したデータ共有

```
Dify (書き込み) → PostgreSQL ← n8n (読み取り/処理)
```

## 📚 ドキュメント

詳細なドキュメントは[docs/](docs/)ディレクトリを参照してください。

### スタートガイド
- **[🚀 QUICKSTART.md](QUICKSTART.md)** - 5分で始める統合テスト
- [セットアップガイド](docs/setup.md) - 環境構築の詳細手順
- [統合テストガイド](docs/testing-guide.md) - 実践的なテスト手順

### リファレンス
- [連携パターン詳細](docs/integration.md) - 4つの統合パターンの詳細
- サンプルワークフロー:
  - [simple-webhook-test.json](examples/simple-webhook-test.json) - シンプルなWebhookテスト
  - [simple-dify-api-test.json](examples/simple-dify-api-test.json) - Dify API呼び出しテスト
  - [dify-webhook-receiver.json](examples/dify-webhook-receiver.json) - 高度なWebhook処理（DB保存、条件分岐）
  - [dify-api-caller.json](examples/dify-api-caller.json) - バッチ処理とスケジュール実行

## 🛠 トラブルシューティング

### ポート競合エラー
他のサービスがポートを使用している場合、`.env`ファイルでポート番号を変更してください。

```env
DIFY_API_PORT=5001  # 他のポートに変更
DIFY_WEB_PORT=3000  # 他のポートに変更
N8N_PORT=5678       # 他のポートに変更
```

### コンテナが起動しない
```bash
# ログ確認
docker-compose logs

# コンテナ削除して再起動
docker-compose down -v
docker-compose up -d
```

### データベース接続エラー
```bash
# PostgreSQLヘルスチェック
docker-compose exec postgres pg_isready -U dify

# PostgreSQL再起動
docker-compose restart postgres
```

## 🔐 セキュリティ設定

本番環境で使用する場合は、以下を必ず変更してください：

1. `.env`内のすべてのパスワード
2. `DIFY_SECRET_KEY`（32文字以上のランダム文字列）
3. `N8N_BASIC_AUTH_PASSWORD`
4. 必要に応じてHTTPS/SSL設定

## 📝 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🤝 コントリビューション

Issue・Pull Requestを歓迎します。

## 📞 サポート

- Dify公式ドキュメント: https://docs.dify.ai/
- n8n公式ドキュメント: https://docs.n8n.io/
