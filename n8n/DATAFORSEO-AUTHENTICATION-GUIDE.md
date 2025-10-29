# DataForSEO 認証設定ガイド

## 概要

DataForSEO APIは**HTTP Basic Authentication**を使用します。このガイドでは、認証情報の取得からn8nでの設定まで詳しく解説します。

---

## ステップ1: DataForSEO 認証情報の取得

### 1-1. アカウント作成

1. [DataForSEO](https://dataforseo.com/) にアクセス
2. 右上の「**Sign Up**」をクリック
3. 以下の情報を入力：
   - Email Address
   - Password
   - Company Name（任意）
4. 「**Create Account**」をクリック
5. 確認メールが届くのでメール認証を完了

---

### 1-2. 認証情報の確認

1. [DataForSEOダッシュボード](https://app.dataforseo.com/) にログイン
2. 左メニューから「**API Access**」をクリック
3. 以下の情報が表示される：

```
Login: your-email@example.com
Password: abcd1234efgh5678
```

**重要**:
- **Login**: 登録したメールアドレス
- **Password**: APIパスワード（ダッシュボードログイン用パスワードとは異なる）

4. この2つの情報をメモ帳などに保存

---

### 1-3. APIパスワードのリセット（必要な場合）

APIパスワードを忘れた場合：

1. API Accessページで「**Reset Password**」をクリック
2. 新しいAPIパスワードが生成される
3. **即座にコピー**（再表示されません）

---

## ステップ2: n8nでの認証設定

### 2-1. HTTP Basic Auth認証情報の作成

1. n8nを開く: `http://localhost:5678`
2. 右上のユーザーアイコン → 「**Credentials**」をクリック
3. 右上の「**Add Credential**」をクリック
4. 検索欄に「**HTTP Basic Auth**」と入力
5. 「**HTTP Basic Auth**」を選択

---

### 2-2. 認証情報の入力

以下の情報を入力：

| フィールド | 値 | 例 |
|-----------|-----|-----|
| **Credential Name** | DataForSEO API | DataForSEO API |
| **User** | DataForSEOのLogin（メールアドレス） | your-email@example.com |
| **Password** | DataForSEOのAPIパスワード | abcd1234efgh5678 |

#### 設定例

```
Credential Name: DataForSEO API
User: tanaka@example.com
Password: a1b2c3d4e5f6g7h8
```

**注意**:
- ❌ **User**にダッシュボードログイン用パスワードを入力しない
- ❌ **Password**にメールアドレスを入力しない
- ✅ API Accessページに表示されている通りに正確に入力

---

### 2-3. 認証情報の保存

1. すべてのフィールドを入力後、「**Save**」をクリック
2. 認証情報リストに「DataForSEO API」が表示されることを確認

---

## ステップ3: ワークフローでの認証設定

### 3-1. Get Search Volume ノードを開く

1. Pro版ワークフローを開く
2. 「**Get Search Volume**」ノードをダブルクリック
3. ノード設定画面が開く

---

### 3-2. 認証方法の選択

#### A. Authentication設定

1. 「**Authentication**」セクションを確認
2. ドロップダウンから「**Basic Auth**」を選択

---

### 3-3. 認証情報の紐付け

1. 「**Credential to connect with**」フィールドが表示される
2. ドロップダウンから「**DataForSEO API**」を選択

**表示されない場合**:
- 「**Create New**」をクリック
- ステップ2の手順で新規作成

---

### 3-4. その他の設定確認

以下の設定も確認：

| 設定項目 | 正しい値 |
|---------|---------|
| **Method** | POST |
| **URL** | https://api.dataforseo.com/v3/dataforseo_labs/google/search_volume/live |
| **Send Body** | ✅ 有効 |
| **Body Content Type** | JSON |

---

### 3-5. 保存

1. 「**Save**」をクリック（ノード設定画面）
2. 「**Save**」をクリック（ワークフロー画面右上）

---

## ステップ4: 認証テスト

### 4-1. 単体テスト

1. 「**Get Search Volume**」ノードを選択
2. 左サイドバーの「**Execute node**」をクリック
3. テストデータを入力：

```json
{
  "Keywords": "web design",
  "Region": "US"
}
```

4. 「**Execute node**」をクリック

---

### 4-2. 成功時のレスポンス

```json
{
  "version": "0.1.20250101",
  "status_code": 20000,
  "status_message": "Ok.",
  "time": "0.5 sec",
  "cost": 0.001,
  "tasks_count": 1,
  "tasks_error": 0,
  "tasks": [
    {
      "id": "01234567-89ab-cdef-0123-456789abcdef",
      "status_code": 20000,
      "status_message": "Ok.",
      "time": "0.3 sec",
      "cost": 0.001,
      "result_count": 1,
      "path": [...],
      "data": {...},
      "result": [
        {
          "keyword": "web design",
          "location_code": 2840,
          "language_code": "en",
          "search_partners": false,
          "competition": null,
          "cpc": null,
          "search_volume": 45000
        }
      ]
    }
  ]
}
```

**成功のサイン**:
- ✅ `status_code: 20000`
- ✅ `status_message: "Ok."`
- ✅ `search_volume` に数値が含まれている

---

### 4-3. 失敗時のエラー

#### エラー1: 認証失敗（401 Unauthorized）

```json
{
  "status_code": 40100,
  "status_message": "Authentication failed. Verify that you are using the correct credentials."
}
```

**原因**:
- UserまたはPasswordが間違っている
- APIパスワードではなくダッシュボードログイン用パスワードを使用している

**対処法**:
1. DataForSEOダッシュボード → API Access で認証情報を再確認
2. n8n → Credentials → DataForSEO API を編集
3. 正しいLoginとPasswordを再入力

---

#### エラー2: 残高不足（402 Payment Required）

```json
{
  "status_code": 40200,
  "status_message": "Insufficient account balance. Please add funds to your account."
}
```

**原因**:
- アカウント残高が$0以下

**対処法**:
1. DataForSEOダッシュボード → Billing
2. 「**Add Funds**」をクリック
3. 最低$1以上を入金（推奨: $5）

---

#### エラー3: リソースが見つからない（404 Not Found）

```json
{
  "status_code": 40400,
  "status_message": "The resource you are requesting could not be found"
}
```

**原因**:
- URLが間違っている
- エンドポイントが存在しない

**対処法**:
- URLを確認: `https://api.dataforseo.com/v3/dataforseo_labs/google/search_volume/live`
- [DATAFORSEO-API-FIX.md](DATAFORSEO-API-FIX.md) を参照

---

## よくある間違い

### ❌ 間違い1: ダッシュボードログイン用パスワードを使用

```
User: tanaka@example.com
Password: MyDashboardPassword123  ← 間違い
```

**正しい**:
```
User: tanaka@example.com
Password: a1b2c3d4e5f6g7h8  ← API Accessページのパスワード
```

---

### ❌ 間違い2: UserとPasswordを逆にする

```
User: a1b2c3d4e5f6g7h8  ← 間違い
Password: tanaka@example.com  ← 間違い
```

**正しい**:
```
User: tanaka@example.com
Password: a1b2c3d4e5f6g7h8
```

---

### ❌ 間違い3: スペースが含まれている

```
User:  tanaka@example.com  ← 前後にスペース
Password: a1b2c3d4e5f6g7h8
```

**正しい**:
```
User: tanaka@example.com  ← スペースなし
Password: a1b2c3d4e5f6g7h8
```

---

## 追加設定（オプション）

### Timeout設定

APIレスポンスが遅い場合、タイムアウト時間を延長：

1. Get Search Volumeノード → Options
2. 「**Timeout**」を設定: `30000`（30秒）

---

### Retry設定

一時的なエラーに対する自動リトライ：

1. Get Search Volumeノード → Options
2. 「**Retry on Fail**」を有効化
3. 「**Max Tries**」: `3`
4. 「**Wait Between Tries**」: `2000`（2秒）

---

## セキュリティのベストプラクティス

### 1. 認証情報の保護

⚠️ **やってはいけないこと**:
- ❌ 認証情報をSlack/Discord等に貼り付け
- ❌ スクリーンショットで認証情報を公開
- ❌ GitHubの公開リポジトリにpush

✅ **推奨事項**:
- ✅ n8nの認証情報機能のみで管理
- ✅ 定期的にAPIパスワードをリセット
- ✅ 複数人で使用する場合はサブアカウントを作成

---

### 2. アクセス制御

DataForSEOダッシュボードで以下を設定可能：

1. **IP制限**: 特定のIPアドレスのみ許可
2. **API制限**: 使用可能なAPIエンドポイントを制限
3. **予算制限**: 1日あたりの最大使用額を設定

---

## トラブルシューティング

### 問題: 認証情報が保存できない

**原因**:
- n8nのデータベース権限エラー

**対処法**:
```bash
# n8nを再起動
docker compose restart

# または
n8n stop
n8n start
```

---

### 問題: 認証情報が選択できない

**原因**:
- ワークフローにインポートした認証情報IDが存在しない

**対処法**:
1. Get Search Volumeノード → Authentication → Basic Auth
2. Credential to connect with → 「Create New」
3. 新規作成

---

### 問題: 認証は成功するが課金される

**原因**:
- DataForSEO APIは成功したリクエストに対して課金

**対処法**:
- テストは最小限に（5-10回程度）
- 開発中は無料のGoogle Autocomplete APIのみ使用
- 本番実行前に予算を設定

---

## 認証設定の完全な例

### n8n Credentials設定

```
Name: DataForSEO API
Type: HTTP Basic Auth
User: tanaka@example.com
Password: a1b2c3d4e5f6g7h8
```

### Get Search Volume ノード設定

```json
{
  "parameters": {
    "authentication": "basicAuth",
    "method": "POST",
    "url": "=https://api.dataforseo.com/v3/dataforseo_labs/google/search_volume/live",
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "=[{\"location_code\":{{...}},\"language_code\":\"...\",\"keywords\":[\"...\"]}]",
    "options": {
      "timeout": 30000,
      "retry": {
        "enabled": true,
        "maxTries": 3,
        "waitBetween": 2000
      }
    }
  },
  "credentials": {
    "httpBasicAuth": {
      "name": "DataForSEO API"
    }
  }
}
```

---

## まとめ

### セットアップチェックリスト

- [x] DataForSEOアカウント作成
- [x] API Access ページでLoginとPasswordを確認
- [x] n8nで HTTP Basic Auth 認証情報を作成
- [x] User: メールアドレス
- [x] Password: APIパスワード
- [x] Get Search Volume ノードで認証を設定
- [x] Authentication: Basic Auth
- [x] Credential: DataForSEO API
- [x] 単体テストで動作確認
- [x] レスポンスに search_volume が含まれている

---

### 次のステップ

1. ✅ 認証設定完了
2. ✅ URLを修正（[DATAFORSEO-API-FIX.md](DATAFORSEO-API-FIX.md)参照）
3. ✅ ワークフロー全体を実行
4. ✅ 結果確認

---

## 参考資料

### DataForSEO 公式ドキュメント
- [Authentication](https://docs.dataforseo.com/v3/auth/)
- [API Access](https://app.dataforseo.com/api-access)
- [Pricing](https://dataforseo.com/pricing)

### n8n 公式ドキュメント
- [HTTP Basic Auth](https://docs.n8n.io/integrations/builtin/credentials/httpbasicauth/)
- [HTTP Request Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)

---

**作成日**: 2025-10-29
**最終更新**: 2025-10-29
**対応ワークフロー**: seo-keyword-research-advanced.json (v2.0)
