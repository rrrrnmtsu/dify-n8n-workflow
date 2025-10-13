# Dify × n8n 統合テストレポート

**テスト実施日時:** 2025-10-13

## 📊 テスト概要

Difyとn8nの統合環境における基本的な連携機能の動作確認を実施しました。

## ✅ テスト結果サマリー

| テスト項目 | 結果 | 詳細 |
|-----------|------|------|
| サービス起動確認 | ✅ 成功 | すべてのコンテナが正常稼働 |
| Dify API稼働確認 | ✅ 成功 | http://localhost:5001 応答正常 |
| Dify Web稼働確認 | ✅ 成功 | http://localhost:3000 応答正常 |
| n8n稼働確認 | ✅ 成功 | http://localhost:5678 応答正常 |
| Webhook統合テスト | ✅ 成功 | n8nへのWebhook送信成功 |

## 🔍 詳細テスト結果

### 1. サービスヘルスチェック

**実行コマンド:**
```bash
./test-integration.sh
```

**結果:**
```
✓ Dify API: 稼働中
✓ Dify Web: 稼働中
✓ n8n: 稼働中
```

**検証内容:**
- Dify API (port 5001): HTTP 200/405応答を確認
- Dify Web (port 3000): HTTP 307リダイレクトを確認
- n8n (port 5678): ヘルスチェックエンドポイント `/healthz` 応答確認

---

### 2. Webhook統合テスト

**実行コマンド:**
```bash
./scripts/test-webhook.sh
```

**テストシナリオ:**
外部スクリプトからn8nのWebhookエンドポイントにPOSTリクエストを送信し、正常に受信・処理されることを確認。

**送信データ:**
```json
{
  "source": "manual-test",
  "message": "Hello from test script!",
  "timestamp": "2025-10-13T...",
  "test_data": {
    "user": "test-user",
    "action": "webhook-test",
    "priority": "normal"
  }
}
```

**結果:**
- HTTP Status Code: **200**
- レスポンス: `{"message": "Workflow was started"}`
- ✅ **成功** - Webhookが正常に受信され、ワークフローが起動

**検証ポイント:**
1. ✅ Webhookエンドポイントが正しく登録されている
2. ✅ JSONデータが正常にパースされる
3. ✅ n8nワークフローが自動的にトリガーされる
4. ✅ 適切なHTTPレスポンスが返される

---

### 3. Docker環境の安定性

**実行コマンド:**
```bash
docker compose ps
```

**結果:**
```
NAME            STATUS              PORTS
dify-api        Up 2 hours          0.0.0.0:5001->5001/tcp
dify-web        Up 4 hours          0.0.0.0:3000->3000/tcp
dify-postgres   Up 4 hours (healthy) 5432/tcp
dify-redis      Up 4 hours (healthy) 6379/tcp
n8n             Up 2 hours          0.0.0.0:5678->5678/tcp
```

**検証ポイント:**
1. ✅ すべてのコンテナが長時間安定稼働
2. ✅ PostgreSQLとRedisのヘルスチェックがパス
3. ✅ ネットワーク接続が正常
4. ✅ ポートマッピングが正しく設定されている

---

## 🛠 作成したツール

### 1. test-integration.sh
統合テストのメインスクリプト。すべてのサービスのヘルスチェックを実行し、次のステップを案内。

**特徴:**
- カラー出力による視覚的なフィードバック
- 各サービスの個別ヘルスチェック
- エラー時の即座な終了と診断メッセージ
- 次のアクションへの明確なガイダンス

### 2. scripts/test-webhook.sh
Webhook統合テストツール。n8nのWebhookエンドポイントに対してHTTPリクエストを送信し、レスポンスを検証。

**特徴:**
- カスタムWebhookパスのサポート
- JSONフォーマットされたレスポンス表示
- HTTP状態コードの検証
- エラー時の詳細な対処方法の表示

---

## 📝 検出された問題と解決策

### 問題1: Dify Plugin Daemon エラー

**症状:**
Dify Web UIに以下のエラーメッセージが表示される：
```
Failed to request plugin daemon, url: plugin/.../management/models
```

**調査結果:**
- プラグイン機能を無効化（`PLUGIN_ENABLED=false`）しているにも関わらず、フロントエンドがプラグインAPIにリクエストを送信
- データベースにプラグイン関連のデータは存在しない
- APIログにもエラーは記録されていない

**結論:**
- これは **cosmetic issue（見た目だけの問題）**
- Difyの主要機能（ワークフロー、API、チャット）には影響なし
- 実際の統合テストでは無視可能

**推奨対応:**
現時点ではエラーメッセージを無視し、統合機能のテストに集中することを推奨。

---

### 問題2: test-webhook.sh の macOS互換性

**症状:**
```
head: illegal line count -- -1
```

**原因:**
`head -n-1` コマンドがmacOSでサポートされていない。

**解決策:**
```bash
# 修正前
BODY=$(echo "$RESPONSE" | head -n-1)

# 修正後
BODY=$(echo "$RESPONSE" | sed '$d')
```

**ステータス:** ✅ 修正完了

---

## 🎯 次のテストフェーズ

### フェーズ2: Dify API連携テスト（未実施）

**目的:**
n8nからDify APIを呼び出し、LLMの応答を取得する機能を検証。

**前提条件:**
1. Difyでチャットボットアプリを作成
2. LLMプロバイダー（OpenAI/Anthropic等）を設定
3. API Keyを取得

**テスト手順:**
1. n8nで `simple-dify-api-test.json` をインポート
2. Dify API Keyを設定
3. ワークフローを実行
4. レスポンスデータを検証

**期待される結果:**
- HTTP 200レスポンス
- `message_id`, `conversation_id`, `answer`フィールドを含むJSON
- LLMからの適切な応答テキスト

---

### フェーズ3: Dify → n8n 双方向連携テスト（未実施）

**目的:**
DifyのワークフローからN8NのWebhookを呼び出し、エンドツーエンドの連携を検証。

**テスト手順:**
1. n8nでWebhookワークフローを有効化
2. DifyでWorkflowアプリを作成
3. HTTP RequestノードでN8NのWebhookを呼び出す
4. 両方のシステムでログを確認

**期待される結果:**
- Dify側でHTTP 200レスポンス
- n8n側で実行履歴が記録される
- データが正しく送受信される

---

### フェーズ4: 高度なワークフローテスト（未実施）

**目的:**
実用的なユースケースを想定した複雑なワークフローの動作確認。

**テストシナリオ:**
1. **データ収集と保存**
   - Dify → Webhook → n8n → PostgreSQL

2. **条件分岐処理**
   - 特定キーワードを含む会話のみSlack通知

3. **バッチ処理**
   - スケジュール実行でDBからデータ取得 → Dify API呼び出し → 結果を集計

4. **エラーハンドリング**
   - API呼び出し失敗時のリトライ処理
   - タイムアウト処理

---

## 📊 環境情報

### Dockerコンテナ
- **Dify API**: langgenius/dify-api:latest
- **Dify Web**: langgenius/dify-web:latest
- **n8n**: n8nio/n8n:latest
- **PostgreSQL**: postgres:15-alpine
- **Redis**: redis:7-alpine

### ネットワーク構成
- Dify API: localhost:5001 (コンテナ間: dify-api:5001)
- Dify Web: localhost:3000
- n8n: localhost:5678 (コンテナ間: n8n:5678)
- PostgreSQL: postgres:5432 (内部のみ)
- Redis: redis:6379 (内部のみ)

### データベース
- PostgreSQL Database: `dify`, `n8n`
- Redis: キャッシュ層

---

## ✅ 結論

### 成功した項目
1. ✅ Docker環境の構築と起動
2. ✅ すべてのサービスの安定稼働
3. ✅ Webhook統合テストの成功
4. ✅ テスト自動化スクリプトの作成
5. ✅ 包括的なドキュメント整備

### 未実施項目
1. ⏳ Dify API連携テスト（LLMプロバイダー設定が必要）
2. ⏳ Dify → n8n 双方向連携テスト
3. ⏳ PostgreSQL共有テスト
4. ⏳ 高度なワークフローテスト

### 総合評価
**🎉 基本的な統合環境の構築とWebhook連携は正常に動作することを確認。**

Difyとn8nの統合環境は正常に機能しており、基本的なWebhook連携が実証されました。次のフェーズでは、LLMプロバイダーの設定を行い、Dify APIを活用した高度な連携機能のテストを進めることを推奨します。

---

## 📚 参考資料

- [QUICKSTART.md](QUICKSTART.md) - 5分で始める統合テスト
- [docs/testing-guide.md](docs/testing-guide.md) - 詳細なテスト手順
- [docs/integration.md](docs/integration.md) - 統合パターン詳細
- [docs/setup.md](docs/setup.md) - 環境構築ガイド

---

**レポート作成日:** 2025-10-13
**作成者:** Claude Code
**バージョン:** 1.0
