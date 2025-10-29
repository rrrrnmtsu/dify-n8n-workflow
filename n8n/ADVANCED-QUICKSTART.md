# SEO キーワードリサーチ Pro版 クイックスタート（5分）

## 🚀 最速セットアップ

### 必要なもの
- n8n（既にインストール済み）
- Googleアカウント（既にOAuth設定済み）
- **DataForSEOアカウント** ← 新規
- **SerpStackアカウント** ← 新規

---

## ステップ1: API アカウント作成（2分）

### DataForSEO
1. https://dataforseo.com/ → Sign Up
2. メール認証
3. Dashboard → API Access → **Login** と **Password** をコピー
4. 料金プラン選択: $1/月（1,000リクエスト）

### SerpStack
1. https://serpstack.com/ → Sign Up Free
2. メール認証
3. Dashboard → **API Access Key** をコピー
4. 無料プラン: 5,000リクエスト/月

---

## ステップ2: Google Sheets作成（1分）

### CSVをインポート
1. `seo-keyword-research-advanced-template.csv` をGoogle Driveにアップロード
2. 右クリック → 「アプリで開く」→「Googleスプレッドシート」
3. スプレッドシートIDをコピー（URLの `/d/` と `/edit` の間）

### 列構成確認
```
Keywords | List of keywords | Region | Search Volume | Competition | CPC | Top 5 Domains
---------|------------------|--------|---------------|-------------|-----|---------------
SEO対策   |                  | JP     |               |             |     |
web design|                 | US     |               |             |     |
```

---

## ステップ3: n8n 設定（2分）

### A. DataForSEO認証
1. n8n → Credentials → Add credential
2. 「HTTP Basic Auth」を選択
3. 設定:
   - Credential Name: `DataForSEO API`
   - User: [DataForSEOのLogin]
   - Password: [DataForSEOのPassword]
4. Save

### B. ワークフローインポート
1. n8n → Import from File
2. `seo-keyword-research-advanced.json` を選択
3. Open workflow

### C. 3箇所を修正

#### 1. Read Keywords ノード
- Document → スプレッドシートID入力
- Sheet → 「SEO Keywords Research」選択

#### 2. Get Search Volume ノード
- Authentication → Basic Auth
- Credential → 「DataForSEO API」選択

#### 3. Get SERP Results ノード
URLを修正:
```javascript
=https://api.serpstack.com/search?access_key=YOUR_API_KEY&query={{ encodeURIComponent($('Loop Over Items').item.json.Keywords) }}&gl={{ $('Loop Over Items').item.json.Region || 'us' }}&num=10
```

`YOUR_API_KEY` を実際のSerpStack APIキーに置き換え

#### 4. Update Google Sheets ノード
- Document → スプレッドシートID入力
- Sheet → 「SEO Keywords Research」選択

---

## ステップ4: 実行（30秒）

1. Save をクリック
2. Execute Workflow をクリック
3. 各行が順番に処理される（1行あたり約3秒）

---

## 実行結果の確認

### 実行前
```
Keywords    | Region
------------|-------
SEO対策      | JP
web design  | US
```

### 実行後
```
Keywords    | List of keywords          | Region | Search Volume | Competition | CPC  | Top 5 Domains
------------|---------------------------|--------|---------------|-------------|------|------------------
SEO対策      | SEO対策 ツール, やり方...  | JP     | 12000         | MEDIUM      | 1.25 | example.com...
web design  | web design inspiration... | US     | 45000         | LOW         | 3.50 | webdesign.com...
```

---

## トラブルシューティング

### DataForSEO認証エラー
→ LoginとPasswordを再確認

### SerpStack APIエラー
→ APIキーを再確認

### データが0やN/A
→ 正常です（データがないキーワード）

---

## 詳細ガイド

より詳しい説明は以下を参照:
- `ADVANCED-SETUP-GUIDE.md` - 詳細セットアップ手順
- `API-RESEARCH-REPORT.md` - API選定の背景
- `N8N-VS-GAS-COMPARISON.md` - n8n vs GAS 比較

---

**所要時間**: 合計5分
**コスト**: $1/月〜（DataForSEO + SerpStack無料枠）
**処理速度**: 1キーワードあたり約3秒

**作成日**: 2025-10-29
