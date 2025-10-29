# SEO キーワードリサーチ ワークフロー 実装サマリー

## 📊 実装バージョン一覧

### 1. 基本版（v1.0）
**ファイル**: `seo-keyword-research-workflow.json`

**機能**:
- Google Autocomplete APIで関連キーワード自動生成
- 日英両対応（JP/US）
- Google Sheetsと連携

**制限**:
- 検索ボリュームなし
- 競合分析なし
- 最初の1行のみ処理

---

### 2. 複数行対応版（v1.1）
**ファイル**: `seo-keyword-research-workflow-multi-row.json`

**機能**:
- v1.0の全機能
- **Loop Over Items で全行を順番に処理**
- エラーハンドリング改善

**改善点**:
- 1行ずつ処理して全行を更新
- `.item` エラーを `.first()` で解決

**制限**:
- 検索ボリュームなし
- 競合分析なし

---

### 3. Pro版（v2.0）- 最新版
**ファイル**: `seo-keyword-research-advanced.json`

**機能**:
- v1.1の全機能
- **検索ボリューム取得**（DataForSEO API）
- **競合度・CPC取得**（DataForSEO API）
- **上位サイト分析**（SerpStack API）
- **並列処理**（3つのAPI同時実行）

**新規データ**:
| 列名 | 取得元 | 説明 |
|------|--------|------|
| Search Volume | DataForSEO | 月間検索回数 |
| Competition | DataForSEO | 競合度（LOW/MEDIUM/HIGH） |
| CPC | DataForSEO | クリック単価（USD） |
| Top 5 Domains | SerpStack | 上位5ドメイン |

**コスト**:
- DataForSEO: $1-10/月
- SerpStack: 無料（5,000リクエスト/月）

---

## 📁 ファイル構成

### ワークフローファイル
```
seo-keyword-research-workflow.json              # v1.0 基本版
seo-keyword-research-workflow-multi-row.json    # v1.1 複数行対応版
seo-keyword-research-advanced.json              # v2.0 Pro版（最新）
```

### テンプレートファイル
```
seo-keyword-research-template.csv               # 基本版用
seo-keyword-research-advanced-template.csv      # Pro版用（7列）
```

### ドキュメント

#### セットアップガイド
```
SEO-KEYWORD-RESEARCH-SETUP.md                   # 基本版セットアップ
QUICKSTART.md                                    # 基本版クイックスタート（5分）
ADVANCED-SETUP-GUIDE.md                          # Pro版セットアップ
ADVANCED-QUICKSTART.md                           # Pro版クイックスタート（5分）
```

#### 技術ドキュメント
```
GOOGLE-OAUTH-SETUP.md                            # Google OAuth2認証設定
UPDATE-SHEETS-NODE-SETUP.md                      # Update Sheetsノード設定
API-RESEARCH-REPORT.md                           # API選定レポート
```

#### トラブルシューティング
```
ERROR-FIX-MULTIPLE-MATCHING-ITEMS.md            # `.item` エラーの解決方法
MULTI-ROW-FIX-GUIDE.md                          # 複数行処理の実装ガイド
```

#### その他
```
N8N-VS-GAS-COMPARISON.md                        # n8n vs GAS 比較分析
IMPLEMENTATION-SUMMARY.md                        # このファイル
```

---

## 🎯 推奨される使用パターン

### パターンA: 無料で始める（基本版）
**使用バージョン**: v1.1 複数行対応版

**メリット**:
- 完全無料
- シンプルな設定
- Google認証のみ

**デメリット**:
- 検索ボリューム不明
- 競合分析不可

**推奨対象**:
- とりあえず試したい
- 予算がない
- シンプルなキーワードリストが欲しい

---

### パターンB: 本格的に運用（Pro版）
**使用バージョン**: v2.0 Pro版

**メリット**:
- 検索ボリューム取得
- 競合度分析
- CPC（広告価値）取得
- 上位サイト分析

**デメリット**:
- 月額$1-10のコスト
- API設定が必要

**推奨対象**:
- SEO本格運用
- キーワード戦略を立てたい
- データドリブンな判断をしたい

---

## 🔄 移行パス

### 基本版 → Pro版への移行

#### ステップ1: API アカウント作成
1. DataForSEOアカウント作成
2. SerpStackアカウント作成

#### ステップ2: Google Sheets更新
1. 既存シートに4列追加:
   - Search Volume
   - Competition
   - CPC
   - Top 5 Domains

#### ステップ3: ワークフロー置き換え
1. Pro版JSONをインポート
2. スプレッドシートID設定
3. API認証設定
4. テスト実行

**所要時間**: 約10分

---

## 📈 処理性能

### 基本版（v1.1）
- **処理速度**: 1キーワードあたり約1秒
- **コスト**: 完全無料
- **制限**: Google Autocomplete APIのレート制限のみ

### Pro版（v2.0）
- **処理速度**: 1キーワードあたり約3秒
- **コスト**: 月$1-10（キーワード数に応じて）
- **制限**:
  - DataForSEO: 1,000-25,000リクエスト/月
  - SerpStack: 5,000リクエスト/月（無料枠）

---

## 💡 活用例

### 1. コンテンツ企画
**使用データ**:
- Search Volume: 需要の大きさを把握
- Competition: 競合の多さを評価
- List of keywords: 関連トピックを発見

**活用方法**:
1. Search Volume 1,000以上のキーワードを抽出
2. Competition が LOW/MEDIUM のものを優先
3. 関連キーワードからコンテンツアイデアを生成

---

### 2. 広告出稿判断
**使用データ**:
- CPC: 広告単価
- Competition: 入札競合
- Search Volume: 潜在リーチ数

**活用方法**:
1. CPC 3.0以上 = 広告価値が高い
2. Competition HIGH = 入札競合が激しい
3. ROI試算に活用

---

### 3. 競合サイト分析
**使用データ**:
- Top 5 Domains: 上位サイト
- List of keywords: 関連検索ワード

**活用方法**:
1. 上位サイトの共通点を分析
2. どのようなコンテンツが評価されているか調査
3. 差別化ポイントを見つける

---

## 🛠️ カスタマイズ例

### 1. 他の国・地域を追加

**DataForSEO Location Codes**:
- JP (日本): 2392
- US (米国): 2840
- UK (英国): 2826
- CA (カナダ): 2124
- AU (オーストラリア): 2036

**修正箇所**: Get Search Volume ノードの `location_code`

---

### 2. 取得結果数の変更

**SerpStack**:
```javascript
// 現在: 10件
&num=10

// 変更例: 20件
&num=20
```

**修正箇所**: Get SERP Results ノードのURL

---

### 3. キーワード候補数の変更

**Google Autocomplete**:
- デフォルト: 約10個
- Google側の仕様により固定（変更不可）

**代替案**: 複数のバリエーションで再検索

---

### 4. Wait時間の調整

**API制限対策**:
1. Autogenerate Keywordsの後に「Wait」ノード追加
2. Amount: 1秒
3. Unit: Seconds

**推奨設定**:
- 少量（<100キーワード/日）: Wait不要
- 中量（100-500キーワード/日）: 1秒Wait
- 大量（500+キーワード/日）: 2秒Wait

---

## ⚠️ よくあるエラーと対処法

### エラー1: Multiple matching items
**対処法**: `ERROR-FIX-MULTIPLE-MATCHING-ITEMS.md` を参照

### エラー2: 最初の行しか処理されない
**対処法**: `MULTI-ROW-FIX-GUIDE.md` を参照

### エラー3: DataForSEO認証エラー
**対処法**: LoginとPasswordを再確認 → `ADVANCED-SETUP-GUIDE.md`

### エラー4: SerpStack APIエラー
**対処法**: APIキーを再確認 → `ADVANCED-QUICKSTART.md`

### エラー5: Google OAuth2エラー
**対処法**: `GOOGLE-OAUTH-SETUP.md` を参照

---

## 📚 学習リソース

### n8n 公式ドキュメント
- [Loop Over Items Pattern](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.splitinbatches/)
- [Google Sheets Node](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlesheets/)
- [HTTP Request Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)

### API ドキュメント
- [DataForSEO - Keywords Data API](https://docs.dataforseo.com/v3/keywords_data/google_ads/search_volume/live/)
- [SerpStack API Documentation](https://serpstack.com/documentation)
- [Google Autocomplete API](https://developers.google.com/custom-search/docs/xml_results#WebSearch_Autocomplete_API)

---

## 🎓 次のステップ

### 初心者向け
1. ✅ 基本版（v1.1）から始める
2. ✅ 5-10キーワードでテスト
3. ✅ 結果をスプレッドシートで確認
4. ✅ 慣れたらPro版（v2.0）に移行

### 中級者向け
1. ✅ Pro版（v2.0）を導入
2. ✅ 100-200キーワードでテスト
3. ✅ データを分析してコンテンツ戦略を立案
4. ✅ 定期実行（Schedule Trigger）を設定

### 上級者向け
1. ✅ カスタマイズ（他の国・地域を追加）
2. ✅ 他のAPIと連携（Moz API、Ahrefs API等）
3. ✅ AI分析を追加（OpenAI API）
4. ✅ Slack/Notion連携でレポート自動化

---

## 📊 コスト試算

### 基本版（v1.1）
```
n8n: 無料（ローカル環境）
Google Sheets API: 無料
Google Autocomplete API: 無料
-------------------------------
合計: 0円/月
```

### Pro版（v2.0）

#### ケース1: 小規模運用（月100キーワード）
```
n8n: 無料（ローカル環境）
DataForSEO: $1/月（1,000リクエスト）
SerpStack: 無料（5,000リクエスト/月）
-------------------------------
合計: $1/月（約150円）
```

#### ケース2: 中規模運用（月500キーワード）
```
n8n: 無料（ローカル環境）
DataForSEO: $5/月（10,000リクエスト）
SerpStack: 無料（5,000リクエスト/月）
-------------------------------
合計: $5/月（約750円）
```

#### ケース3: 大規模運用（月6,000キーワード）
```
n8n: 無料（ローカル環境）
DataForSEO: $10/月（25,000リクエスト）
SerpStack: $10/月（10,000リクエスト）
-------------------------------
合計: $20/月（約3,000円）
```

---

## 🏆 まとめ

### 実装の成果

#### 基本機能
- ✅ 関連キーワード自動生成
- ✅ 日英両対応
- ✅ Google Sheets連携
- ✅ 複数行処理

#### Pro版機能
- ✅ 検索ボリューム取得
- ✅ 競合度分析
- ✅ CPC（広告価値）取得
- ✅ 上位サイト分析
- ✅ 並列処理で高速化

#### ドキュメント整備
- ✅ セットアップガイド（基本版・Pro版）
- ✅ クイックスタート（5分で開始）
- ✅ トラブルシューティング
- ✅ API選定レポート
- ✅ n8n vs GAS 比較分析

### 推奨される選択

#### 今すぐ無料で始めたい
→ **基本版（v1.1）** を使用
→ `QUICKSTART.md` を参照

#### 本格的にSEO運用したい
→ **Pro版（v2.0）** を使用
→ `ADVANCED-QUICKSTART.md` を参照

---

**作成日**: 2025-10-29
**最終更新**: 2025-10-29
**対応バージョン**: v1.0 / v1.1 / v2.0
