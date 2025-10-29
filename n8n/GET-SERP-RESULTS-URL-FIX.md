# Get SERP Results ノード URLエラー修正ガイド

## エラー内容

```
Invalid URL: ```javascript
=https://api.serpstack.com/search?access_key=...
```. URL must start with "http" or "https".
```

このエラーは、URLフィールドに**不要なマークダウンコードブロック記号**（```javascript と ```）が含まれているために発生しています。

---

## 原因

n8nのURLフィールドに、ドキュメントからコピーした際にマークダウンの記号も一緒にペーストしてしまった。

**誤った入力例**:
```
```javascript
=https://api.serpstack.com/search?access_key=...
```
```

**正しい入力**:
```
=https://api.serpstack.com/search?access_key=...
```

---

## 解決策

### **ステップ1: Get SERP Results ノードを開く**

1. ワークフローで「**Get SERP Results**」ノードをダブルクリック
2. URLフィールドを確認

---

### **ステップ2: URLを修正**

**現在のURL（間違い）**:
```
```javascript
=https://api.serpstack.com/search?access_key=6a5a68527ed861b745805532d60baada&query={{ encodeURIComponent($('Loop Over Items').item.json.Keywords) }}&gl={{ $('Loop Over Items').item.json.Region || 'us' }}&num=10
```
```

**修正後のURL（正しい）**:
```
=https://api.serpstack.com/search?access_key=6a5a68527ed861b745805532d60baada&query={{ encodeURIComponent($('Loop Over Items').item.json.Keywords) }}&gl={{ $('Loop Over Items').item.json.Region || 'us' }}&num=10
```

---

### **ステップ3: 修正手順**

#### 方法A: URLフィールドを直接編集

1. URLフィールドの内容を**全選択**（Ctrl+A / Cmd+A）
2. **削除**
3. 以下を**正確に**ペースト:

```
=https://api.serpstack.com/search?access_key=YOUR_API_KEY&query={{ encodeURIComponent($('Loop Over Items').item.json.Keywords) }}&gl={{ $('Loop Over Items').item.json.Region || 'us' }}&num=10
```

4. `YOUR_API_KEY` を実際のSerpStack APIキーに置き換え

例:
```
=https://api.serpstack.com/search?access_key=6a5a68527ed861b745805532d60baada&query={{ encodeURIComponent($('Loop Over Items').item.json.Keywords) }}&gl={{ $('Loop Over Items').item.json.Region || 'us' }}&num=10
```

---

#### 方法B: ノードを削除して再作成

設定がおかしくなっている場合:

1. Get SERP Resultsノードを**削除**
2. 新しい**HTTP Request**ノードを追加
3. 以下を設定:

| 設定項目 | 値 |
|---------|-----|
| **Method** | GET |
| **URL** | 下記のURL（マークダウン記号なし） |

**URL**:
```
=https://api.serpstack.com/search?access_key=YOUR_API_KEY&query={{ encodeURIComponent($('Loop Over Items').item.json.Keywords) }}&gl={{ $('Loop Over Items').item.json.Region || 'us' }}&num=10
```

---

### **ステップ4: 保存して実行**

1. ノード設定画面で「**Save**」
2. ワークフロー画面で「**Save**」
3. 「**Execute Workflow**」で動作確認

---

## 正しいURL設定のポイント

### ✅ 正しい例

**n8nのExpression（先頭に`=`がある）**:
```
=https://api.serpstack.com/search?access_key=abc123&query={{ encodeURIComponent($('Loop Over Items').item.json.Keywords) }}&gl={{ $('Loop Over Items').item.json.Region || 'us' }}&num=10
```

### ❌ 間違った例

**ケース1: マークダウンコードブロックが含まれている**
```
```javascript
=https://api.serpstack.com/search?access_key=abc123...
```
```
→ エラー: Invalid URL

**ケース2: 先頭の`=`がない**
```
https://api.serpstack.com/search?access_key=abc123...
```
→ 動的な変数（{{ ... }}）が展開されない

**ケース3: スペースが含まれている**
```
= https://api.serpstack.com/search?access_key=abc123...
```
→ エラー: Invalid URL

---

## URL構造の説明

### 完全なURL

```
=https://api.serpstack.com/search?access_key=YOUR_API_KEY&query={{ encodeURIComponent($('Loop Over Items').item.json.Keywords) }}&gl={{ $('Loop Over Items').item.json.Region || 'us' }}&num=10
```

### パラメータの説明

| パラメータ | 説明 | 例 |
|-----------|------|-----|
| `=` | n8nのExpression開始記号 | 必須 |
| `https://api.serpstack.com/search` | SerpStack APIエンドポイント | 固定 |
| `?access_key=YOUR_API_KEY` | あなたのAPIキー | 実際のキーに置き換え |
| `&query={{ ... }}` | 検索キーワード（動的） | Loop Over Itemsから取得 |
| `&gl={{ ... }}` | 地域コード（JP/US） | Loop Over Itemsから取得 |
| `&num=10` | 取得する結果数 | 10件 |

---

## 動的変数の確認

URLに含まれる動的変数:

### 1. キーワード
```javascript
{{ encodeURIComponent($('Loop Over Items').item.json.Keywords) }}
```
- スプレッドシートの「Keywords」列から取得
- URLエンコードされる（日本語対応）

### 2. 地域コード
```javascript
{{ $('Loop Over Items').item.json.Region || 'us' }}
```
- スプレッドシートの「Region」列から取得
- 未設定の場合は'us'がデフォルト
- JPの場合は小文字の'jp'に変換される

---

## テスト方法

### 単体テスト

1. **Get SERP Results**ノードを選択
2. 左サイドバー → 「**Execute node**」
3. テストデータを入力:

```json
{
  "Keywords": "SEO対策",
  "Region": "JP"
}
```

4. 「**Execute node**」をクリック

### 期待される結果

**成功時**:
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
      "url": "https://example.com/..."
    },
    ...
  ]
}
```

**失敗時**:
```
Invalid URL: ... URL must start with "http" or "https".
```
→ URLにマークダウン記号や不要な文字が含まれています

---

## よくある間違い

### ❌ 間違い1: ドキュメントからコピーペーストでマークダウンも含めてしまう

```
```javascript
=https://api.serpstack.com/...
```
```

**対処法**:
- プレーンテキストとしてコピー
- または手動でマークダウン記号（```javascript と ```）を削除

---

### ❌ 間違い2: 改行が含まれている

```
=https://api.serpstack.com/search?
access_key=abc123&
query={{ ... }}
```

**対処法**:
- URLは1行で記述
- 改行を削除

---

### ❌ 間違い3: 全角文字が含まれている

```
=https://api.serpstack.com/search?access_key＝abc123
```
（`=`が全角になっている）

**対処法**:
- 半角英数字のみ使用
- 全角文字を半角に変換

---

## 完全な設定例（コピペ用）

### テンプレート

```
=https://api.serpstack.com/search?access_key=YOUR_API_KEY&query={{ encodeURIComponent($('Loop Over Items').item.json.Keywords) }}&gl={{ $('Loop Over Items').item.json.Region || 'us' }}&num=10
```

### 実際の例（APIキー設定済み）

```
=https://api.serpstack.com/search?access_key=6a5a68527ed861b745805532d60baada&query={{ encodeURIComponent($('Loop Over Items').item.json.Keywords) }}&gl={{ $('Loop Over Items').item.json.Region || 'us' }}&num=10
```

**注意**:
- `YOUR_API_KEY` を実際のAPIキーに置き換えてください
- コピーペースト時に前後の改行やスペースが入らないように注意

---

## トラブルシューティング

### 問題: URLが長すぎてエラー

**症状**: URL too long

**対処法**:
- SerpStackの無料プランでは問題なし
- クエリパラメータを確認（不要なパラメータを削除）

---

### 問題: 変数が展開されない

**症状**: URLに `{{ ... }}` がそのまま表示される

**原因**: 先頭の `=` がない

**対処法**:
- URLの先頭に `=` を追加
- Expressionモードで記述

---

### 問題: APIキーエラー

**症状**: `Invalid API key`

**原因**: APIキーが間違っている

**対処法**:
- [SerpStackダッシュボード](https://serpstack.com/dashboard) でAPIキーを再確認
- コピーペースト時にスペースが入っていないか確認

---

## 修正チェックリスト

- [ ] Get SERP Resultsノードを開く
- [ ] URLフィールドを確認
- [ ] マークダウン記号（```javascript と ```）を削除
- [ ] 先頭に `=` があることを確認
- [ ] APIキーが正しいことを確認
- [ ] 改行やスペースがないことを確認
- [ ] 保存
- [ ] テスト実行
- [ ] エラーが解消されている

---

## まとめ

### 最も重要なポイント

✅ **URLはこの形式で記述**:
```
=https://api.serpstack.com/search?access_key=YOUR_API_KEY&query={{ encodeURIComponent($('Loop Over Items').item.json.Keywords) }}&gl={{ $('Loop Over Items').item.json.Region || 'us' }}&num=10
```

❌ **マークダウン記号は含めない**:
- ````javascript` ← 不要
- ` ``` ` ← 不要

✅ **コピーペースト時の注意**:
- ドキュメントからコピーする場合は、プレーンテキストとして貼り付け
- 前後の改行・スペースを削除

---

**作成日**: 2025-10-29
**対応ワークフロー**: seo-keyword-research-advanced.json (v2.0)
