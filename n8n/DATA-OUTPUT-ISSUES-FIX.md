# データ出力問題の修正ガイド

## 発生している問題

実行は成功するが、以下の問題が発生：

1. ✅ 実行成功
2. ❌ Keywords列のワードが消去される
3. ❌ Search Volume列がすべて0
4. ❌ CPC列がすべて0
5. ❌ Top 5 Domains列がすべてBlank

---

## 問題1: Keywords列が消去される

### 原因

Update Google Sheetsノードで、**Keywords列を更新対象に含めていない**ため、既存のデータが保持されないか、誤って空白で上書きされている可能性があります。

### 解決策

#### オプションA: Keywords列を更新対象から除外（推奨）

**Update Google Sheetsノードの設定を変更**:

現在の設定:
```
Column Mappings:
  - row_number = {{ $json.row_number }}
  - List of keywords = {{ $json.keywords_list }}
  - Search Volume = {{ $json.search_volume }}
  - Competition = {{ $json.competition }}
  - CPC = {{ $json.cpc }}
  - Top 5 Domains = {{ $json.top_domains }}
```

**Keywords列がマッピングに含まれていない** → これは正しい

**しかし、問題が発生する場合**:
- Update Google SheetsのOptionsで「Clear Data Before Update」がオンになっている可能性

**対処法**:
1. Update Google Sheetsノードを開く
2. **Options** → 「**Clear Data Before Update**」を**オフ**にする

---

#### オプションB: Keywords列を明示的に保持

**Prepare Final Updateノードに以下を追加**:

```javascript
Name: Keywords
Value: ={{ $('Loop Over Items').item.json.Keywords }}
```

**Update Google Sheetsノードに以下を追加**:

```
Column Mappings:
  + Keywords = {{ $json.Keywords }}  // 追加
```

これで、元のKeywords値が保持されます。

---

## 問題2: Search Volume が 0

### 原因の調査

#### ステップ1: Extract Volume Dataノードの出力を確認

1. ワークフロー実行後、**Extract Volume Data**ノードをクリック
2. 「Output」タブを確認
3. 以下のようなデータが表示されているか確認:

```json
{
  "search_volume": 12000,
  "competition": "MEDIUM",
  "cpc": 1.25
}
```

---

### パターンA: Extract Volume Dataの出力が正しい

**問題**: データは取得できているが、スプレッドシートに書き込まれない

**原因**: Update Google Sheetsノードの列マッピングが間違っている

**対処法**:

Update Google Sheetsノードで、列名を確認:
```
Column: Search Volume (スペースに注意)
Value: ={{ $json.search_volume }}
```

スプレッドシートの列名と**完全に一致**する必要があります。

---

### パターンB: Extract Volume Dataの出力が空 or エラー

**問題**: DataForSEO APIからデータが取得できていない

**原因1: APIレスポンスの構造が違う**

Get Search Volumeノードの出力を確認:
```json
{
  "version": "0.1.20250101",
  "status_code": 20000,
  "status_message": "Ok.",
  "tasks": [
    {
      "result": [
        {
          "keyword": "SEO対策",
          "search_volume": 0,  // ← 0の場合
          "competition": null,
          "cpc": null
        }
      ]
    }
  ]
}
```

**DataForSEO APIがデータを持っていない場合**、search_volumeが0になります。

**対処法**:
- より一般的なキーワードでテスト（例: "SEO", "web design"）
- DataForSEO Labsではなく、Google Ads APIエンドポイントを使用

---

**原因2: APIエンドポイントが間違っている**

現在のエンドポイント:
```
https://api.dataforseo.com/v3/dataforseo_labs/google/search_volume/live
```

**問題**: DataForSEO Labsは一部のキーワードでデータがない

**対処法**: Google Ads APIに変更

Get Search Volumeノードで以下に変更:
```
URL: https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live
```

ただし、**コストが10倍高い**（$0.001/keyword → $0.01/keyword）

---

**原因3: Location CodeとLanguage Codeの問題**

現在の設定:
```javascript
location_code: {{ $('Loop Over Items').item.json.Region === 'JP' ? 2392 : 2840 }}
language_code: "{{ $('Loop Over Items').item.json.Region === 'JP' ? 'ja' : 'en' }}"
```

**問題**: DataForSEO APIが該当地域のデータを持っていない

**対処法**:
1. Get Search Volumeノードの出力でエラーメッセージを確認
2. DataForSEOダッシュボードでサポートされているlocation_codeを確認

---

### Extract Volume Dataノードの修正

**現在の設定**:
```javascript
search_volume: ={{ $json.tasks?.[0]?.result?.[0]?.search_volume || 0 }}
competition: ={{ $json.tasks?.[0]?.result?.[0]?.competition || 'N/A' }}
cpc: ={{ $json.tasks?.[0]?.result?.[0]?.cpc || 0 }}
```

**問題**: APIレスポンスが期待通りの構造でない場合、デフォルト値（0, N/A）になる

**デバッグ用に修正**:
```javascript
search_volume: ={{ $json.tasks?.[0]?.result?.[0]?.search_volume ?? -1 }}
competition: ={{ $json.tasks?.[0]?.result?.[0]?.competition ?? 'ERROR' }}
cpc: ={{ $json.tasks?.[0]?.result?.[0]?.cpc ?? -1 }}
```

これで、データがない場合は-1や"ERROR"が表示され、APIの問題か判別できます。

---

## 問題3: CPC が 0

### 原因

Search Volumeと同じ原因の可能性が高い。

### 追加の確認事項

**DataForSEO Labs APIの制限**:
- DataForSEO Labs APIでは、**CPCデータが取得できない**場合があります
- Google Ads APIを使用する必要があります

**確認方法**:
1. Get Search Volumeノードの出力を確認
2. `cpc`フィールドが`null`または存在しない場合 → API制限

**対処法**:
- Google Ads APIエンドポイントに変更（コスト増）
- または、CPCデータを諦める（無料で運用）

---

## 問題4: Top 5 Domains が Blank

### 原因の調査

#### ステップ1: Extract SERP Dataノードの出力を確認

1. **Extract SERP Data**ノードをクリック
2. 「Output」タブを確認
3. 以下のようなデータが表示されているか:

```json
{
  "top_10_urls": [
    "https://example1.com/...",
    "https://example2.com/...",
    ...
  ],
  "top_domains": [
    "example1.com",
    "example2.com",
    "example3.com",
    "example4.com",
    "example5.com"
  ]
}
```

---

### パターンA: Extract SERP Dataの出力が正しい

**問題**: データは取得できているが、スプレッドシートに書き込まれない

**原因1: Prepare Final Updateの設定が間違っている**

Prepare Final Updateノードで以下を確認:
```javascript
Name: top_domains
Type: string
Value: ={{ $('Extract SERP Data').item.json.top_domains.slice(0, 5).join(', ') }}
```

**問題**: `.item` が間違っている可能性

**修正**:
```javascript
Value: ={{ $('Extract SERP Data').first().json.top_domains.slice(0, 5).join(', ') }}
```

または、Merge All Data後のデータを参照:
```javascript
Value: ={{ $json.top_domains.slice(0, 5).join(', ') }}
```

---

**原因2: top_domainsが配列のまま渡されている**

**問題**: 配列を文字列に変換していない

**確認**: Prepare Final Updateの出力を確認
```json
{
  "top_domains": ["example1.com", "example2.com", ...]  // ← 配列のまま
}
```

**修正**: Prepare Final Updateで以下に変更
```javascript
Name: top_domains
Type: string
Value: ={{ Array.isArray($json.top_domains) ? $json.top_domains.slice(0, 5).join(', ') : $json.top_domains }}
```

これで、配列の場合は文字列に変換されます。

---

### パターンB: Extract SERP Dataの出力が空

**問題**: SerpStack APIからデータが取得できていない

**原因1: APIレスポンスにorganic_resultsがない**

Get SERP Resultsノードの出力を確認:
```json
{
  "request_info": {
    "success": true
  },
  "organic_results": []  // ← 空
}
```

**対処法**:
- より一般的なキーワードでテスト
- 地域コード（gl）を確認
- SerpStackの無料プランの制限を確認

---

**原因2: Extract SERP Dataの式が間違っている**

現在の設定:
```javascript
top_domains: ={{ $json.organic_results?.slice(0, 10).map(r => { try { return new URL(r.url).hostname } catch { return '' } }).filter(d => d) || [] }}
```

**問題**: SerpStackのレスポンス構造が違う可能性

**デバッグ用に修正**:
```javascript
top_domains: ={{ $json.organic_results?.map(r => r.url) || ['NO_DATA'] }}
```

これで、URLが取得できているか確認できます。

---

## 統合的なデバッグ手順

### ステップ1: 各ノードの出力を確認

1. ワークフロー実行
2. 以下のノードをクリックして出力を確認:
   - **Extract Volume Data** → search_volume, competition, cpc
   - **Extract SERP Data** → top_10_urls, top_domains
   - **Merge All Data** → すべてのデータが統合されているか
   - **Prepare Final Update** → スプレッドシート書き込み用のデータ

---

### ステップ2: Prepare Final Updateの出力を確認

期待される出力:
```json
{
  "row_number": "2",
  "Keywords": "SEO対策",  // ← これがあればKeywords列は保持される
  "keywords_list": "SEO対策 ツール, ...",
  "search_volume": 12000,  // ← 0以外
  "competition": "MEDIUM",
  "cpc": 1.25,  // ← 0以外
  "top_domains": "example1.com, example2.com, ..."  // ← Blankでない
}
```

実際の出力:
```json
{
  "row_number": "2",
  "keywords_list": "...",
  "search_volume": 0,  // ← 問題
  "competition": "N/A",
  "cpc": 0,  // ← 問題
  "top_domains": ""  // ← 問題
}
```

---

### ステップ3: APIレスポンスを確認

#### Get Search Volume の出力

期待:
```json
{
  "tasks": [{
    "result": [{
      "search_volume": 12000,
      "competition": "MEDIUM",
      "cpc": 1.25
    }]
  }]
}
```

実際:
```json
{
  "tasks": [{
    "result": [{
      "search_volume": 0,  // ← DataForSEOがデータを持っていない
      "competition": null,
      "cpc": null
    }]
  }]
}
```

---

#### Get SERP Results の出力

期待:
```json
{
  "organic_results": [
    {
      "position": 1,
      "url": "https://example.com/..."
    },
    ...
  ]
}
```

実際:
```json
{
  "organic_results": []  // ← SerpStackがデータを持っていない
}
```

---

## 推奨される修正手順

### 修正1: Keywords列の保持

**Prepare Final Updateノードに追加**:
```javascript
Name: Keywords
Type: string
Value: ={{ $('Loop Over Items').item.json.Keywords }}
```

**Update Google Sheetsノードに追加**:
```
Column: Keywords
Value: ={{ $json.Keywords }}
```

---

### 修正2: DataForSEO APIエンドポイント変更

より正確なデータを取得するため、Google Ads APIを使用:

**Get Search Volumeノード**:
```
URL: https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live
```

**注意**: コストが10倍増（$0.001 → $0.01 per keyword）

---

### 修正3: Extract SERP Dataの修正

**Extract SERP Dataノード**を開き、以下を修正:

**top_domains**:
```javascript
// 現在
top_domains: ={{ $json.organic_results?.slice(0, 10).map(r => { try { return new URL(r.url).hostname } catch { return '' } }).filter(d => d) || [] }}

// 修正後（エラーハンドリング強化）
top_domains: ={{
  ($json.organic_results || [])
    .slice(0, 10)
    .map(r => {
      try {
        return new URL(r.url || '').hostname;
      } catch {
        return '';
      }
    })
    .filter(d => d && d !== '')
    .slice(0, 5)
}}
```

---

### 修正4: Prepare Final Updateの修正

**top_domains**を配列から文字列に変換:

```javascript
// 現在
top_domains: ={{ $('Extract SERP Data').item.json.top_domains.slice(0, 5).join(', ') }}

// 修正後
top_domains: ={{
  Array.isArray($json.top_domains)
    ? $json.top_domains.slice(0, 5).join(', ')
    : ($json.top_domains || 'No data')
}}
```

---

## テスト用の推奨キーワード

APIがデータを持っている可能性が高いキーワード:

### 日本語（JP）
- SEO
- マーケティング
- ウェブデザイン

### 英語（US）
- seo
- marketing
- web design
- digital marketing

これらの一般的なキーワードでテストしてください。

---

## まとめ

### 修正チェックリスト

- [ ] Keywords列の保持を追加
- [ ] Update Google SheetsのOptionsで「Clear Data Before Update」をオフ
- [ ] DataForSEO APIエンドポイントをGoogle Ads APIに変更（オプション）
- [ ] Extract SERP Dataのエラーハンドリング強化
- [ ] Prepare Final Updateでtop_domainsを文字列に変換
- [ ] 一般的なキーワードでテスト実行
- [ ] 各ノードの出力を確認
- [ ] スプレッドシートの結果を確認

---

**作成日**: 2025-10-29
**対応ワークフロー**: seo-keyword-research-advanced.json (v2.0)
