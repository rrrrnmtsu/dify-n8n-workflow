# SEO キーワードリサーチ Pro版 セットアップガイド

## 概要

このガイドでは、検索ボリューム・競合度・上位サイト分析機能を含むPro版SEOキーワードリサーチワークフローのセットアップ方法を説明します。

---

## 🎯 Pro版の追加機能

基本版に加えて、以下の機能が利用可能になります：

### 1. キーワードボリュームデータ
- **検索ボリューム** (月間検索回数)
- **競合度** (LOW / MEDIUM / HIGH)
- **CPC** (クリック単価 - USD)

### 2. 競合サイト分析
- **上位10サイトのURL取得**
- **上位5ドメインの抽出**

---

## 📋 必要なもの

### 基本要件（既存）
- [x] n8n（ローカル環境）
- [x] Googleアカウント
- [x] Google OAuth2認証情報

### 新規要件（Pro版）
- [x] **DataForSEO アカウント** - キーワードボリューム取得用
- [x] **SerpStack アカウント** - SERP結果取得用

---

## ステップ1: API アカウントのセットアップ

### A. DataForSEO アカウント作成

#### 1. アカウント登録
1. [DataForSEO](https://dataforseo.com/) にアクセス
2. 右上の「Sign Up」をクリック
3. メールアドレスとパスワードを入力して登録
4. メール認証を完了

#### 2. 認証情報の取得
1. ダッシュボードにログイン
2. 左メニューから「**API Access**」をクリック
3. 以下の情報をコピー：
   - **Login** (ユーザー名)
   - **Password** (APIパスワード)

**重要**: この情報は後でn8nの認証設定で使用します

#### 3. 料金プラン
- **開発用**: $1/月（1,000リクエスト）
- **スタンダード**: $5/月（10,000リクエスト）
- **プロ**: $10/月（25,000リクエスト）

**推奨**: 月100-200キーワードなら$1プランで十分

---

### B. SerpStack アカウント作成

#### 1. アカウント登録
1. [SerpStack](https://serpstack.com/) にアクセス
2. 「Sign Up Free」をクリック
3. メールアドレスを入力して登録
4. メール認証を完了

#### 2. API キーの取得
1. ダッシュボードにログイン
2. 画面上部に「**Your API Access Key**」が表示される
3. APIキーをコピー

例: `abc123def456ghi789jkl012mno345pq`

#### 3. 無料プラン
- **リクエスト数**: 5,000回/月
- **検索結果**: 上位10件まで取得可能
- **地域指定**: 対応
- **制限**: 商用利用は有料プラン必須

**推奨**: まずは無料プランでテスト → 必要に応じて有料化

---

## ステップ2: Google Sheets の準備

### 1. テンプレートCSVをインポート

`seo-keyword-research-advanced-template.csv` を使用：

| 列名 | 説明 | 例 |
|------|------|-----|
| Keywords | 検索キーワード | SEO対策 |
| List of keywords | 自動生成されたキーワード（自動入力） | SEO対策 ツール, SEO対策 やり方... |
| Region | 地域コード | JP / US |
| Search Volume | 月間検索ボリューム（自動入力） | 12000 |
| Competition | 競合度（自動入力） | MEDIUM |
| CPC | クリック単価（自動入力） | 1.25 |
| Top 5 Domains | 上位5ドメイン（自動入力） | example.com, test.jp... |

### 2. Google Sheets 作成手順

#### オプションA: CSVから新規作成
1. Google Drive にアクセス
2. 「新規」→「ファイルのアップロード」
3. `seo-keyword-research-advanced-template.csv` を選択
4. アップロード完了後、右クリック→「アプリで開く」→「Googleスプレッドシート」
5. スプレッドシートIDをコピー（URLの`/d/`と`/edit`の間）

#### オプションB: 手動作成
1. Google Sheets で新規シートを作成
2. シート名を「**SEO Keywords Research**」に変更
3. 以下の列を作成：
   - A列: Keywords
   - B列: List of keywords
   - C列: Region
   - D列: Search Volume
   - E列: Competition
   - F列: CPC
   - G列: Top 5 Domains

4. サンプルデータを入力（テストしやすい5行程度）

---

## ステップ3: n8n 認証情報の設定

### A. DataForSEO 認証（HTTP Basic Auth）

1. n8n を開く: `http://localhost:5678`
2. 右上メニュー → 「**Credentials**」
3. 「**Add credential**」をクリック
4. 検索欄に「HTTP Basic Auth」と入力
5. 以下を設定：

| フィールド | 値 |
|-----------|-----|
| Credential Name | DataForSEO API |
| User | [DataForSEOのLogin] |
| Password | [DataForSEOのPassword] |

6. 「**Save**」をクリック

---

### B. Google Sheets OAuth2 認証（既存）

すでに基本版で設定済みの場合はスキップ可能

詳細は `GOOGLE-OAUTH-SETUP.md` を参照

---

## ステップ4: ワークフローのインポート

### 1. ワークフローファイルのインポート

1. n8n ホーム画面で「**Import from File**」をクリック
2. `seo-keyword-research-advanced.json` を選択
3. 「**Open workflow**」をクリック

---

### 2. スプレッドシートIDの設定

以下の2つのノードで設定が必要です：

#### A. Read Keywords ノード
1. ノードをダブルクリック
2. **Document** → 「From list」を選択
3. 「**By ID**」を選択
4. 作成したスプレッドシートのIDを貼り付け
5. **Sheet** → 「**SEO Keywords Research**」を選択

#### B. Update Google Sheets ノード
1. ノードをダブルクリック
2. **Document** → 「From list」を選択
3. 「**By ID**」を選択
4. 作成したスプレッドシートのIDを貼り付け
5. **Sheet** → 「**SEO Keywords Research**」を選択

---

### 3. API認証の設定

#### A. Get Search Volume ノード
1. ノードをダブルクリック
2. **Authentication** → 「**Basic Auth**」を選択
3. **Credential to connect with** → 「**DataForSEO API**」を選択

#### B. Get SERP Results ノード
1. ノードをダブルクリック
2. **URL** フィールドで以下を修正：
```javascript
=https://api.serpstack.com/search?access_key=YOUR_SERPSTACK_API_KEY&query={{ encodeURIComponent($('Loop Over Items').item.json.Keywords) }}&gl={{ $('Loop Over Items').item.json.Region || 'us' }}&num=10
```

`YOUR_SERPSTACK_API_KEY` を実際のAPIキーに置き換え

例:
```javascript
=https://api.serpstack.com/search?access_key=abc123def456ghi789jkl012mno345pq&query={{ encodeURIComponent($('Loop Over Items').item.json.Keywords) }}&gl={{ $('Loop Over Items').item.json.Region || 'us' }}&num=10
```

---

## ステップ5: テスト実行

### 1. 準備確認

- [x] Google Sheetsにサンプルデータが入っている
- [x] Read Keywordsノードで正しいシートが選択されている
- [x] DataForSEO認証が設定されている
- [x] SerpStack APIキーが設定されている

---

### 2. 実行手順

1. ワークフロー画面右上の「**Save**」をクリック
2. 「**Execute Workflow**」をクリック
3. 各ノードが順番に実行される（緑色に変化）
4. Loop Over Itemsが繰り返し実行される

---

### 3. 期待される結果

#### 実行前のスプレッドシート
```
Keywords         | List of keywords | Region | Search Volume | Competition | CPC | Top 5 Domains
----------------|------------------|--------|---------------|-------------|-----|---------------
SEO対策          |                  | JP     |               |             |     |
ウェブマーケティング |                  | JP     |               |             |     |
web design      |                  | US     |               |             |     |
```

#### 実行後のスプレッドシート
```
Keywords         | List of keywords                    | Region | Search Volume | Competition | CPC  | Top 5 Domains
----------------|-------------------------------------|--------|---------------|-------------|------|---------------------------
SEO対策          | SEO対策 ツール, SEO対策 やり方...    | JP     | 12000         | MEDIUM      | 1.25 | example.com, test.jp...
ウェブマーケティング | ウェブマーケティング 会社...         | JP     | 8900          | HIGH        | 2.10 | marketing.com, web.jp...
web design      | web design inspiration...           | US     | 45000         | LOW         | 3.50 | webdesign.com, design.io...
```

---

## ステップ6: 結果の確認

### 各列のチェックポイント

#### 1. List of keywords
- Google Autocompleteからの関連キーワード
- カンマ区切りで10個程度

#### 2. Search Volume
- 月間検索ボリューム（数値）
- 0 = データなし
- 1,000以上 = 人気キーワード

#### 3. Competition
- `LOW` = 競合が少ない（狙い目）
- `MEDIUM` = 中程度の競合
- `HIGH` = 競合が多い（難易度高）
- `N/A` = データなし

#### 4. CPC
- クリック単価（USD）
- 高い = 広告価値が高い
- 0 = データなし

#### 5. Top 5 Domains
- 上位にランクインしているドメイン
- カンマ区切りで最大5個
- 競合サイトの分析に使用

---

## トラブルシューティング

### エラー1: DataForSEO認証エラー
**症状**: `401 Unauthorized`

**対処法**:
1. DataForSEOのダッシュボードで認証情報を再確認
2. n8nの「Credentials」でLoginとPasswordが正しいか確認
3. DataForSEOのアカウント残高を確認（$1以上必要）

---

### エラー2: SerpStack APIエラー
**症状**: `Invalid API key` または `Monthly limit exceeded`

**対処法**:
1. SerpStackのダッシュボードでAPIキーを再確認
2. Get SERP Resultsノードで正しいキーが設定されているか確認
3. 月間リクエスト制限（5,000回）を超えていないか確認

---

### エラー3: Location Code エラー
**症状**: `Invalid location_code`

**対処法**:
スプレッドシートのRegion列が「JP」または「US」であることを確認

**対応表**:
- JP → DataForSEO location_code: 2392
- US → DataForSEO location_code: 2840

他の国を追加する場合は、[DataForSEO Locations](https://docs.dataforseo.com/v3/serp/google/locations/) を参照

---

### エラー4: 一部のデータが空
**症状**: Search Volumeが0、Competitionが「N/A」

**原因**: DataForSEOにデータがない（マイナーキーワード）

**対処法**:
- これは正常な動作です
- より一般的なキーワードでテストしてください
- 0やN/Aはそのまま分析に使用可能

---

### エラー5: ループが終わらない
**症状**: ワークフローが永遠に実行され続ける

**対処法**:
1. 「Stop Workflow」をクリック
2. Loop Over Itemsノードの設定を確認
3. Batch Size が「1」になっているか確認
4. Optionsをデフォルトに戻す

---

## パフォーマンス最適化

### 1. 処理速度の調整

#### API制限対策: Wait ノードの追加

DataForSEOとSerpStackには API レート制限があります。

**推奨設定**:
1. Get Search Volumeの後に「Wait」ノードを追加
2. Amount: **1**
3. Unit: **Seconds**

これにより1行あたり約3秒かかります（3つのAPI呼び出し × 1秒）

---

### 2. バッチ処理

複数行を同時処理したい場合：

1. Loop Over Itemsノードを開く
2. Batch Size を **3** に変更
3. ただし、API制限に注意（エラーが出たら1に戻す）

---

### 3. コスト管理

#### DataForSEO 使用量の確認
1. DataForSEOダッシュボード → API Usage
2. 残りのリクエスト数を確認
3. 1キーワード = 1リクエスト

#### SerpStack 使用量の確認
1. SerpStackダッシュボード
2. 月間使用量を確認（5,000回まで無料）
3. 1キーワード = 1リクエスト

#### コスト試算
- 月100キーワード: DataForSEO $1/月 + SerpStack 無料 = **$1/月**
- 月500キーワード: DataForSEO $5/月 + SerpStack 無料 = **$5/月**
- 月6,000キーワード: DataForSEO $10/月 + SerpStack $10/月 = **$20/月**

---

## 応用例

### 1. キーワード優先度の判定

以下の指標でキーワードを評価：

#### 高優先度キーワード
- Search Volume: 1,000以上
- Competition: LOW または MEDIUM
- CPC: 1.0以上

#### 中優先度キーワード
- Search Volume: 100-1,000
- Competition: MEDIUM
- CPC: 0.5-1.0

#### 低優先度キーワード
- Search Volume: 100未満
- Competition: HIGH
- CPC: 0.5未満

---

### 2. 競合サイト分析

**Top 5 Domains** を使って：
1. 上位サイトの共通点を分析
2. どのようなコンテンツが評価されているか調査
3. 自サイトとの差分を把握

---

### 3. 定期実行（スケジュール）

Pro版を定期的に実行する場合：

1. Manual Triggerを削除
2. 「Schedule Trigger」ノードを追加
3. 実行間隔を設定（例: 毎週月曜 9:00）
4. Activeにする

---

## まとめ

### セットアップ完了チェックリスト

- [x] DataForSEOアカウント作成
- [x] SerpStackアカウント作成
- [x] Google Sheets作成（7列）
- [x] n8nにワークフローをインポート
- [x] DataForSEO認証設定
- [x] SerpStack APIキー設定
- [x] スプレッドシートID設定
- [x] テスト実行成功

---

### 次のステップ

1. ✅ **初回実行**: サンプルデータでテスト
2. ✅ **実データ投入**: 実際のキーワードでリサーチ開始
3. ✅ **結果分析**: Search Volume/Competition/CPCを評価
4. ✅ **競合調査**: Top 5 Domainsを分析
5. ✅ **コンテンツ戦略**: 優先キーワードを選定

---

## 参考資料

### API ドキュメント
- [DataForSEO - Keywords Data API](https://docs.dataforseo.com/v3/keywords_data/google_ads/search_volume/live/)
- [SerpStack API Documentation](https://serpstack.com/documentation)

### n8n 公式ドキュメント
- [Loop Over Items Pattern](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.splitinbatches/)
- [Google Sheets Node](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlesheets/)

---

**作成日**: 2025-10-29
**最終更新**: 2025-10-29
**対応ワークフロー**: seo-keyword-research-advanced.json
