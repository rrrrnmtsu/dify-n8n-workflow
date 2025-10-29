# SerpStack API キー設定ガイド

## 概要

このガイドでは、SerpStack APIキーの取得からn8nワークフローへの設定まで、ステップバイステップで解説します。

---

## ステップ1: SerpStack アカウント作成とAPIキー取得

### 1-1. アカウント登録

1. [SerpStack公式サイト](https://serpstack.com/) にアクセス
2. 画面右上の「**Sign Up Free**」をクリック
3. 以下の情報を入力：
   - Email Address
   - Password
4. 「**Create Account**」をクリック
5. 登録したメールアドレスに確認メールが届く
6. メール内の「**Verify Email**」リンクをクリック

---

### 1-2. APIキーの取得

1. SerpStackにログイン
2. ダッシュボードが表示される
3. 画面上部に「**Your API Access Key**」セクションがある
4. APIキーが表示されている（例: `abc123def456ghi789jkl012mno345pq`）
5. 「**Copy**」ボタンでコピー、または手動でコピー

**重要**: このAPIキーは後でn8nワークフローに設定するため、メモ帳などに保存しておいてください。

---

### 1-3. 無料プランの確認

ダッシュボードで以下を確認：

| 項目 | 無料プラン |
|------|-----------|
| 月間リクエスト数 | 5,000回 |
| 検索結果取得数 | 上位10件まで |
| HTTPS対応 | ❌ (HTTP のみ) |
| 地域指定 | ✅ |
| 商用利用 | ❌ (有料プランのみ) |

**推奨**: テスト・個人利用なら無料プランで十分。商用利用の場合は有料プラン（$30/月〜）が必要。

---

## ステップ2: n8nワークフローでの設定方法

SerpStack APIキーはn8nの「Credentials」機能ではなく、**直接ワークフローのURLに埋め込む**必要があります。

### 2-1. ワークフローのインポート

1. n8nを開く: `http://localhost:5678`
2. 左メニューから「**Workflows**」をクリック
3. 右上の「**Import from File**」をクリック
4. `seo-keyword-research-advanced.json` を選択
5. 「**Open workflow**」をクリック

---

### 2-2. Get SERP Results ノードの設定

#### A. ノードを開く

1. ワークフロー画面で「**Get SERP Results**」ノードをダブルクリック
2. ノード設定画面が開く

#### B. 現在の設定を確認

**URL** フィールドに以下のように表示されている：

```javascript
=https://api.serpstack.com/search?access_key=YOUR_SERPSTACK_API_KEY&query={{ encodeURIComponent($('Loop Over Items').item.json.Keywords) }}&gl={{ $('Loop Over Items').item.json.Region || 'us' }}&num=10
```

#### C. APIキーを置き換え

`YOUR_SERPSTACK_API_KEY` の部分を、ステップ1-2で取得した実際のAPIキーに置き換えます。

**修正前**:
```javascript
access_key=YOUR_SERPSTACK_API_KEY
```

**修正後** (例: APIキーが `abc123def456` の場合):
```javascript
access_key=abc123def456
```

#### D. 完成形の例

```javascript
=https://api.serpstack.com/search?access_key=abc123def456ghi789jkl012mno345pq&query={{ encodeURIComponent($('Loop Over Items').item.json.Keywords) }}&gl={{ $('Loop Over Items').item.json.Region || 'us' }}&num=10
```

---

### 2-3. パラメータの説明

URLに含まれる各パラメータの意味：

| パラメータ | 説明 | 例 |
|-----------|------|-----|
| `access_key` | **あなたのAPIキー**（必須） | abc123def456... |
| `query` | 検索キーワード（動的に設定） | SEO対策 |
| `gl` | 地域コード（JP or US） | jp / us |
| `num` | 取得する検索結果数 | 10 |

#### 動的パラメータの詳細

- **query**: `{{ encodeURIComponent($('Loop Over Items').item.json.Keywords) }}`
  - スプレッドシートの「Keywords」列から取得
  - URLエンコードされる（日本語対応）

- **gl**: `{{ $('Loop Over Items').item.json.Region || 'us' }}`
  - スプレッドシートの「Region」列から取得（JP or US）
  - 未設定の場合は 'us' がデフォルト

---

### 2-4. 設定を保存

1. URLの修正が完了したら「**Save**」をクリック
2. ノード設定画面を閉じる
3. ワークフロー画面右上の「**Save**」をクリック

---

## ステップ3: 動作確認

### 3-1. テスト用スプレッドシートの準備

Google Sheetsに以下のサンプルデータを入力：

| Keywords | List of keywords | Region | Search Volume | Competition | CPC | Top 5 Domains |
|----------|------------------|--------|---------------|-------------|-----|---------------|
| SEO対策   |                  | JP     |               |             |     |               |
| web design |                | US     |               |             |     |               |

---

### 3-2. Get SERP Results ノードの単体テスト

#### A. 手動テストデータの作成

1. ワークフロー画面で「**Get SERP Results**」ノードを選択
2. 左サイドバーの「**Execute node**」をクリック
3. 「**Add test data**」をクリック
4. 以下のJSONを入力：

```json
{
  "Keywords": "SEO対策",
  "Region": "JP"
}
```

5. 「**Execute node**」をクリック

#### B. 結果の確認

**成功した場合**:
```json
{
  "request_info": {
    "success": true
  },
  "search_parameters": {
    "q": "SEO対策",
    "gl": "jp",
    "num": 10
  },
  "organic_results": [
    {
      "position": 1,
      "title": "...",
      "url": "https://example.com/...",
      "domain": "example.com"
    },
    ...
  ]
}
```

**失敗した場合**:
```json
{
  "success": false,
  "error": {
    "code": 101,
    "type": "invalid_access_key",
    "info": "You have not supplied a valid API Access Key."
  }
}
```

→ APIキーが間違っています。再度確認してください。

---

### 3-3. ワークフロー全体のテスト

1. ワークフロー画面右上の「**Execute Workflow**」をクリック
2. 各ノードが順番に実行される
3. 「**Get SERP Results**」ノードが緑色になったら成功
4. ノードをクリックして結果を確認

---

## よくあるエラーと対処法

### エラー1: Invalid API Access Key

**症状**:
```json
{
  "error": {
    "code": 101,
    "type": "invalid_access_key",
    "info": "You have not supplied a valid API Access Key."
  }
}
```

**原因**:
- APIキーが間違っている
- APIキーにスペースが含まれている
- `YOUR_SERPSTACK_API_KEY` のまま変更していない

**対処法**:
1. SerpStackダッシュボードでAPIキーを再コピー
2. n8nの「Get SERP Results」ノードで再設定
3. 前後にスペースがないか確認

---

### エラー2: Monthly Limit Exceeded

**症状**:
```json
{
  "error": {
    "code": 104,
    "type": "usage_limit_reached",
    "info": "Your monthly API request volume has been reached."
  }
}
```

**原因**:
- 無料プランの5,000リクエスト/月を超過

**対処法**:
1. SerpStackダッシュボードで使用量を確認
2. 翌月まで待つ、または有料プランにアップグレード
3. テスト時はキーワード数を少なく（5-10個）

---

### エラー3: HTTPS Not Supported

**症状**:
```json
{
  "error": {
    "code": 105,
    "type": "https_access_restricted",
    "info": "Access Restricted - Your current Subscription Plan does not support HTTPS Encryption."
  }
}
```

**原因**:
- 無料プランはHTTPSに非対応
- URLが `https://` で始まっている

**対処法**:
ワークフローのURLを **http://** に変更：

**修正前**:
```javascript
=https://api.serpstack.com/search?access_key=...
```

**修正後**:
```javascript
=http://api.serpstack.com/search?access_key=...
```

---

### エラー4: No organic_results

**症状**:
レスポンスに `organic_results` が含まれていない

**原因**:
- 地域コード（gl）が間違っている
- キーワードが特殊すぎて検索結果がない

**対処法**:
1. スプレッドシートの「Region」列が「JP」または「US」であることを確認
2. より一般的なキーワードでテスト（例: 「web design」「SEO」）

---

## ステップ4: セキュリティ対策

### 4-1. APIキーの保護

APIキーはワークフローJSONに直接埋め込まれるため、以下に注意：

⚠️ **やってはいけないこと**:
- ❌ ワークフローJSONを公開リポジトリにpush
- ❌ APIキーをSlack/Discord等に貼り付け
- ❌ スクリーンショットでAPIキーを公開

✅ **推奨事項**:
- ✅ `.gitignore` でワークフローJSONを除外
- ✅ APIキーは環境変数で管理（高度な設定）
- ✅ 定期的にAPIキーをローテーション

---

### 4-2. .gitignore 設定（推奨）

プロジェクトルートに `.gitignore` を作成：

```
# n8n workflow with API keys
n8n/seo-keyword-research-advanced.json

# または、全てのワークフローを除外
n8n/*.json
!n8n/README.json
```

---

### 4-3. 環境変数を使った設定（上級者向け）

n8nの環境変数機能を使ってAPIキーを外部化する方法：

#### A. n8nの環境変数設定

`.env` ファイルに追加：
```bash
N8N_SERPSTACK_API_KEY=abc123def456ghi789jkl012mno345pq
```

#### B. ワークフローでの参照

URLを以下のように変更：
```javascript
=http://api.serpstack.com/search?access_key={{ $env.N8N_SERPSTACK_API_KEY }}&query={{ encodeURIComponent($('Loop Over Items').item.json.Keywords) }}&gl={{ $('Loop Over Items').item.json.Region || 'us' }}&num=10
```

#### C. n8nの再起動

```bash
# Dockerの場合
docker compose restart

# ローカルインストールの場合
n8n stop
n8n start
```

---

## ステップ5: 使用量の監視

### 5-1. ダッシュボードで確認

1. SerpStackにログイン
2. ダッシュボードに以下が表示される：
   - **Requests This Month**: 今月の使用量
   - **Requests Remaining**: 残りリクエスト数
   - **Next Reset**: リセット日

### 5-2. 使用量の計算

Pro版ワークフローでは：
- **1キーワード = 1リクエスト**

例：
- 月100キーワード = 100リクエスト（残り4,900）
- 月1,000キーワード = 1,000リクエスト（残り4,000）
- 月5,000キーワード = 5,000リクエスト（上限到達）

---

## ステップ6: 有料プランへのアップグレード（オプション）

無料枠（5,000リクエスト/月）を超える場合：

### 料金プラン

| プラン | 月額 | リクエスト数 | HTTPS | 商用利用 |
|--------|------|-------------|-------|---------|
| Free | $0 | 5,000 | ❌ | ❌ |
| Basic | $30 | 10,000 | ✅ | ✅ |
| Professional | $50 | 50,000 | ✅ | ✅ |
| Business | $100 | 100,000 | ✅ | ✅ |

### アップグレード手順

1. SerpStackダッシュボード → 「**Upgrade Plan**」
2. 希望のプランを選択
3. クレジットカード情報を入力
4. 即座にアップグレード完了（APIキーは変更なし）

---

## まとめ

### セットアップチェックリスト

- [x] SerpStackアカウント作成
- [x] APIキー取得（コピー）
- [x] n8nにワークフローをインポート
- [x] Get SERP Resultsノードを開く
- [x] `YOUR_SERPSTACK_API_KEY` を実際のAPIキーに置き換え
- [x] ワークフローを保存
- [x] テスト実行
- [x] 結果確認（organic_resultsが取得できている）
- [x] 使用量監視

---

### 次のステップ

1. ✅ **DataForSEO認証の設定**: [ADVANCED-SETUP-GUIDE.md](ADVANCED-SETUP-GUIDE.md) のステップ3Aを参照
2. ✅ **Google Sheets設定**: スプレッドシートIDの設定
3. ✅ **本番実行**: 実際のキーワードでリサーチ開始

---

## 参考資料

### SerpStack 公式ドキュメント
- [API Documentation](https://serpstack.com/documentation)
- [Error Codes](https://serpstack.com/documentation#error_codes)
- [Search Parameters](https://serpstack.com/documentation#search_parameters)

### n8n 公式ドキュメント
- [HTTP Request Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)
- [Expression Editor](https://docs.n8n.io/code-examples/expressions/)

---

**作成日**: 2025-10-29
**最終更新**: 2025-10-29
**対応ワークフロー**: seo-keyword-research-advanced.json (v2.0)
