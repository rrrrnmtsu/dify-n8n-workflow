# DataForSEO API エラー修正ガイド

## エラー内容

```
Problem in node 'Get Search Volume'
The resource you are requesting could not be found
```

このエラーは、DataForSEO APIのエンドポイントまたはリクエスト形式が正しくない場合に発生します。

---

## 原因と解決策

### 原因1: エンドポイントURLの誤り

DataForSEO APIには複数のエンドポイントがあり、正しいものを使用する必要があります。

#### ❌ 間違ったエンドポイント（現在の設定）
```
https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live
```

#### ✅ 正しいエンドポイント（推奨）
```
https://api.dataforseo.com/v3/dataforseo_labs/google/search_volume/live
```

---

## 修正手順

### ステップ1: n8nワークフローを開く

1. n8n を開く: `http://localhost:5678`
2. 「SEO キーワードリサーチ（Pro版）」ワークフローを開く
3. 「**Get Search Volume**」ノードをダブルクリック

---

### ステップ2: URLを修正

#### 現在のURL
```javascript
=https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live
```

#### 修正後のURL（オプション1: DataForSEO Labs API）
```javascript
=https://api.dataforseo.com/v3/dataforseo_labs/google/search_volume/live
```

#### 修正後のURL（オプション2: Google Ads API - より正確だが高価）
```javascript
=https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live
```

---

### ステップ3: リクエストボディを確認

#### 現在のJSON Body
```json
=[
  {
    "location_code": {{ $('Loop Over Items').item.json.Region === 'JP' ? 2392 : 2840 }},
    "language_code": "{{ $('Loop Over Items').item.json.Region === 'JP' ? 'ja' : 'en' }}",
    "keywords": [
      "{{ $('Loop Over Items').item.json.Keywords }}"
    ]
  }
]
```

これは **Google Ads API** 用の形式です。

#### DataForSEO Labs API用に修正（推奨）

**修正後のJSON Body**:
```json
=[
  {
    "location_code": {{ $('Loop Over Items').item.json.Region === 'JP' ? 2392 : 2840 }},
    "language_code": "{{ $('Loop Over Items').item.json.Region === 'JP' ? 'ja' : 'en' }}",
    "keywords": [
      "{{ $('Loop Over Items').item.json.Keywords }}"
    ]
  }
]
```

実は、リクエストボディの形式は同じです。問題はエンドポイントURLです。

---

## 詳細な修正手順

### オプションA: DataForSEO Labs API を使用（推奨）

#### 特徴
- ✅ より安価（$0.001/キーワード）
- ✅ 月間検索ボリューム取得可能
- ⚠️ 競合度（Competition）は取得できない可能性
- ⚠️ CPCの精度が低い

#### 修正内容

1. **Get Search Volume ノード**を開く
2. **URL**を以下に変更:
```javascript
=https://api.dataforseo.com/v3/dataforseo_labs/google/search_volume/live
```

3. **JSON Body**はそのまま（変更不要）

4. **Extract Volume Data ノード**を開く
5. **Assignments**を確認（レスポンス構造が異なる場合は修正）

**DataForSEO Labs APIのレスポンス例**:
```json
{
  "tasks": [
    {
      "result": [
        {
          "keyword": "SEO対策",
          "search_volume": 12000,
          "competition": null,
          "cpc": null
        }
      ]
    }
  ]
}
```

**Extract Volume Data の修正**:
```javascript
// search_volume
={{ $json.tasks?.[0]?.result?.[0]?.search_volume || 0 }}

// competition (取得できない場合)
={{ $json.tasks?.[0]?.result?.[0]?.competition || 'N/A' }}

// cpc (取得できない場合)
={{ $json.tasks?.[0]?.result?.[0]?.cpc || 0 }}
```

---

### オプションB: Google Ads API を使用（高精度）

#### 特徴
- ✅ 競合度（Competition）取得可能
- ✅ CPC取得可能（高精度）
- ✅ Google広告データに基づく
- ❌ より高価（$0.01/キーワード）

#### 修正内容

1. **Get Search Volume ノード**を開く
2. **URL**を以下に変更:
```javascript
=https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live
```

3. **Method**を確認: `POST` であることを確認

4. **Authentication**を確認: `Basic Auth` であることを確認

5. **Headers**に以下を追加:
   - Name: `Content-Type`
   - Value: `application/json`

6. **JSON Body**を以下に変更:
```json
=[
  {
    "location_code": {{ $('Loop Over Items').item.json.Region === 'JP' ? 2392 : 2840 }},
    "language_code": "{{ $('Loop Over Items').item.json.Region === 'JP' ? 'ja' : 'en' }}",
    "keywords": [
      "{{ $('Loop Over Items').item.json.Keywords }}"
    ]
  }
]
```

**Google Ads APIのレスポンス例**:
```json
{
  "tasks": [
    {
      "result": [
        {
          "keyword": "SEO対策",
          "search_volume": 12000,
          "competition": "MEDIUM",
          "competition_index": 50,
          "cpc": 1.25,
          "low_top_of_page_bid": 0.8,
          "high_top_of_page_bid": 2.5
        }
      ]
    }
  ]
}
```

**Extract Volume Data（既存のままでOK）**:
```javascript
// search_volume
={{ $json.tasks?.[0]?.result?.[0]?.search_volume || 0 }}

// competition
={{ $json.tasks?.[0]?.result?.[0]?.competition || 'N/A' }}

// cpc
={{ $json.tasks?.[0]?.result?.[0]?.cpc || 0 }}
```

---

## 原因2: 認証エラー

### 確認事項

1. **Basic Auth認証が正しく設定されているか**
   - n8n → Credentials → HTTP Basic Auth
   - User: DataForSEOのLogin（メールアドレス）
   - Password: DataForSEOのPassword（APIパスワード）

2. **認証情報がノードに紐付いているか**
   - Get Search Volumeノードの「Credential to connect with」が設定されているか確認

---

## 原因3: アカウント残高不足

### 確認方法

1. [DataForSEOダッシュボード](https://app.dataforseo.com/) にログイン
2. 「**Balance**」を確認
3. $0以下の場合は入金が必要

### 最低入金額
- **最低**: $1
- **推奨**: $5（テスト用）

---

## 原因4: HTTPメソッドの誤り

### 確認事項

**Get Search Volume** ノードで以下を確認:

| 設定項目 | 正しい値 |
|---------|---------|
| Method | `POST` |
| Authentication | `Basic Auth` |
| Send Body | `true` (有効) |
| Body Content Type | `JSON` |

---

## テスト手順

### ステップ1: 単体テスト

1. **Get Search Volume** ノードを選択
2. 左サイドバーの「**Execute node**」をクリック
3. 「**Add test data**」をクリック
4. 以下のJSONを入力:

```json
{
  "Keywords": "web design",
  "Region": "US"
}
```

5. 「**Execute node**」をクリック

---

### ステップ2: レスポンスの確認

#### ✅ 成功した場合

**DataForSEO Labs API**:
```json
{
  "status_code": 20000,
  "status_message": "Ok.",
  "tasks": [
    {
      "id": "12345678-1234-1234-1234-123456789012",
      "status_code": 20000,
      "status_message": "Ok.",
      "result": [
        {
          "keyword": "web design",
          "location_code": 2840,
          "language_code": "en",
          "search_volume": 45000
        }
      ]
    }
  ]
}
```

**Google Ads API**:
```json
{
  "status_code": 20000,
  "status_message": "Ok.",
  "tasks": [
    {
      "result": [
        {
          "keyword": "web design",
          "search_volume": 45000,
          "competition": "LOW",
          "cpc": 3.5
        }
      ]
    }
  ]
}
```

#### ❌ エラーの場合

**404 Not Found**:
```json
{
  "status_code": 40400,
  "status_message": "The resource you are requesting could not be found"
}
```
→ URLが間違っています

**401 Unauthorized**:
```json
{
  "status_code": 40100,
  "status_message": "Authentication failed"
}
```
→ Basic Auth認証が間違っています

**402 Payment Required**:
```json
{
  "status_code": 40200,
  "status_message": "Insufficient funds"
}
```
→ アカウント残高が不足しています

---

## 推奨される修正（まとめ）

### 最もシンプルな解決策

#### 1. URLをDataForSEO Labs APIに変更

**Get Search Volume ノード**:
```javascript
URL: https://api.dataforseo.com/v3/dataforseo_labs/google/search_volume/live
```

#### 2. Basic Auth認証を確認

- User: DataForSEOのログインメールアドレス
- Password: DataForSEOのAPIパスワード

#### 3. アカウント残高を確認

- 最低$1以上あることを確認

#### 4. テスト実行

- 単体テストで動作確認
- レスポンスに `search_volume` が含まれていることを確認

---

## 代替案: 無料APIを使用

DataForSEO APIが高価すぎる場合、以下の無料APIを検討：

### 1. Google Trends API（非公式）

**メリット**:
- 完全無料
- トレンドデータ取得可能

**デメリット**:
- 正確な検索ボリューム数値は取得不可
- 相対的なトレンドのみ

### 2. Ubersuggest API

**メリット**:
- 無料枠あり（月100リクエスト）
- 検索ボリューム取得可能

**デメリット**:
- 無料枠が少ない
- 精度が低い

### 3. キーワードボリューム機能を削除

**基本版（v1.1）に戻る**:
- 検索ボリューム機能なし
- Google Autocompleteのみ使用
- 完全無料

---

## 完全な修正済みノード設定

### Get Search Volume ノード（DataForSEO Labs API版）

```json
{
  "parameters": {
    "authentication": "basicAuth",
    "method": "POST",
    "url": "=https://api.dataforseo.com/v3/dataforseo_labs/google/search_volume/live",
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "=[\n  {\n    \"location_code\": {{ $('Loop Over Items').item.json.Region === 'JP' ? 2392 : 2840 }},\n    \"language_code\": \"{{ $('Loop Over Items').item.json.Region === 'JP' ? 'ja' : 'en' }}\",\n    \"keywords\": [\n      \"{{ $('Loop Over Items').item.json.Keywords }}\"\n    ]\n  }\n]",
    "options": {
      "timeout": 30000
    }
  },
  "name": "Get Search Volume",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [700, 200],
  "credentials": {
    "httpBasicAuth": {
      "name": "DataForSEO API"
    }
  }
}
```

---

## トラブルシューティングチェックリスト

- [ ] URLが正しい（`/v3/dataforseo_labs/google/search_volume/live`）
- [ ] Methodが`POST`
- [ ] Authenticationが`Basic Auth`
- [ ] 認証情報が正しい（Login + Password）
- [ ] Send Bodyが有効
- [ ] Body Content Typeが`JSON`
- [ ] JSONの形式が正しい
- [ ] アカウント残高が$1以上
- [ ] Region列が`JP`または`US`
- [ ] Keywords列にデータが入っている

---

## 次のステップ

1. ✅ 上記の修正を実施
2. ✅ 単体テストで動作確認
3. ✅ ワークフロー全体を実行
4. ✅ スプレッドシートに結果が書き込まれることを確認

修正後も問題が解決しない場合は、エラーメッセージの詳細を確認してください。

---

**作成日**: 2025-10-29
**対応ワークフロー**: seo-keyword-research-advanced.json (v2.0)
