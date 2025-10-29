# SEOキーワードリサーチ n8nワークフロー 実装手順書

## 概要
Googleスプレッドシートから基本キーワードを読み込み、Google検索のオートコンプリートAPIで関連キーワードを自動生成し、結果をスプレッドシートに保存する自動化ワークフロー。

**特徴**:
- 日本語・英語キーワード両対応
- 手動実行
- APIキー不要（Google Autocomplete APIは無料）
- 1クリックで最大10件のキーワードを処理

---

## 前提条件

### 必要な環境
- [x] n8n（ローカル環境）が稼働中
- [x] Googleアカウント
- [x] Google Sheets API認証設定済み

---

## セットアップ手順

### ステップ1: Googleスプレッドシートの作成

#### 1-1. 新規スプレッドシート作成
1. [Google Sheets](https://sheets.google.com)にアクセス
2. 「空白のスプレッドシート」を作成
3. シート名を「SEO Keywords Research」に変更

#### 1-2. テンプレートのインポート
**方法A: CSVファイルからインポート**
```bash
# 作成済みのテンプレートファイル
/Users/remma/project/dify-n8n-workflow/n8n/seo-keyword-research-template.csv
```
- Google Sheetsで「ファイル」→「インポート」→ CSVファイルを選択

**方法B: 手動で列を作成**

| 列名 | 説明 | 入力例 |
|------|------|--------|
| Keywords | 調査したい基本キーワード | SEO対策, web design |
| List of keywords | 生成された関連キーワード（自動入力） | （空欄） |
| Region | 地域コード | JP, US |

#### 1-3. サンプルデータの入力
```
Keywords            | List of keywords | Region
--------------------|------------------|--------
SEO対策             |                  | JP
ウェブマーケティング |                  | JP
web design          |                  | US
digital marketing   |                  | US
コンテンツ制作      |                  | JP
```

#### 1-4. スプレッドシートIDの確認
URLから確認:
```
https://docs.google.com/spreadsheets/d/【このIDをコピー】/edit
```
例: `1JOuc5Cihk-IWznqCMdoDUwEskkO8NuLHhkgCCcDA20E`

---

### ステップ2: n8nでの認証設定

#### 2-1. Google Sheets認証の追加
1. n8nを開く: `http://localhost:5678`
2. 右上「Settings」→「Credentials」
3. 「Add Credential」をクリック
4. 「Google Sheets OAuth2 API」を選択
5. Googleアカウントで認証
6. 認証名を設定（例: `My Google Sheets`）

---

### ステップ3: ワークフローのインポート

#### 3-1. JSONファイルのインポート
1. n8nのトップページで「Import from File」をクリック
2. 以下のファイルを選択:
```bash
/Users/remma/project/dify-n8n-workflow/n8n/seo-keyword-research-workflow.json
```

#### 3-2. スプレッドシートIDの設定
インポート後、以下の2つのノードを編集:

**A. Read Keywordsノード**
- `documentId` を自分のスプレッドシートIDに変更
- 認証情報を選択

**B. Update Google Sheetsノード**
- `documentId` を自分のスプレッドシートIDに変更
- 認証情報を選択

#### 3-3. ワークフローの保存
- 右上「Save」をクリック
- ワークフロー名: `SEO キーワードリサーチ（日英対応版）`

---

### ステップ4: 動作テスト

#### 4-1. テスト実行
1. 「Manual Trigger」ノードを選択
2. 「Execute Node」をクリック
3. 各ノードが緑色になることを確認

#### 4-2. 結果確認
Googleスプレッドシートの「List of keywords」列に関連キーワードが表示されることを確認

**期待される結果例**:
```
Keywords: SEO対策
→ List of keywords: SEO対策 ツール, SEO対策 やり方, SEO対策 費用, SEO対策 チェックリスト...
```

---

## ワークフローの詳細

### ノード構成（全9ノード）

```
Manual Trigger
  ↓
Read Keywords (Googleスプレッドシート読み込み)
  ↓
Limit (処理数制限: 10件)
  ↓
Autogenerate Keywords (Google Autocomplete API)
  ↓
Format Keywords (XML→JSON変換)
  ↓
Split Out (配列分割)
  ↓
Clean Keywords (データクリーニング)
  ↓
Aggregate (集約)
  ↓
Update Google Sheets (スプレッドシート更新)
```

### 各ノードの役割

#### 1. Manual Trigger
- **機能**: 手動実行トリガー
- **設定**: なし

#### 2. Read Keywords
- **機能**: Googleスプレッドシートからキーワード読み込み
- **必須設定**:
  - `documentId`: スプレッドシートID
  - `sheetName`: シート名（`SEO Keywords Research`）
  - 認証情報

#### 3. Limit
- **機能**: 処理数制限（API負荷軽減）
- **デフォルト**: 10件
- **カスタマイズ**: `maxItems` で変更可能

#### 4. Autogenerate Keywords
- **機能**: Google Autocomplete APIで関連キーワード生成
- **API URL**: `https://google.com/complete/search?output=toolbar&gl={{ Region }}&q={{ Keywords }}`
- **パラメータ**:
  - `gl`: 地域コード（JP/US）
  - `q`: 検索キーワード

#### 5. Format Keywords
- **機能**: XML形式の結果をJSON形式に変換
- **設定**: デフォルト

#### 6. Split Out
- **機能**: 配列データを個別アイテムに分割
- **対象フィールド**: `toplevel.CompleteSuggestion`

#### 7. Clean Keywords
- **機能**: キーワードデータの抽出とクリーニング
- **出力**: `Keywords` 配列

#### 8. Aggregate
- **機能**: 全キーワードを1つのアイテムに集約
- **集約フィールド**: `Keywords`

#### 9. Update Google Sheets
- **機能**: 結果をスプレッドシートに書き込み
- **更新列**: `List of keywords`
- **マッチング**: `row_number`（行番号）

---

## カスタマイズ方法

### 1. 処理件数の変更
**Limitノード**の`maxItems`を変更:
- デフォルト: 10件
- 推奨範囲: 5〜50件
- 注意: 多すぎるとAPI制限に引っかかる可能性

### 2. 地域設定の追加
スプレッドシートの`Region`列で以下が使用可能:
- `JP`: 日本
- `US`: アメリカ
- `UK`: イギリス
- `DE`: ドイツ
- その他: [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2)の国コード

### 3. 出力形式の変更
**Update Google Sheetsノード**で区切り文字を変更:
```javascript
// カンマ区切り（デフォルト）
$json.Keywords.join(', ')

// 改行区切り
$json.Keywords.join('\n')

// セミコロン区切り
$json.Keywords.join('; ')
```

### 4. 定期実行への変更
**Manual Trigger**を**Schedule Trigger**に変更:
1. Manual Triggerノードを削除
2. Schedule Triggerノードを追加
3. 実行間隔を設定（例: 1日1回、毎朝9時）

---

## トラブルシューティング

### エラー1: 認証エラー
**症状**: `Authentication failed`
**対処法**:
1. Google Sheets認証を再設定
2. スプレッドシートの共有設定を確認
3. OAuth2スコープに`https://www.googleapis.com/auth/spreadsheets`が含まれていることを確認

### エラー2: スプレッドシートが見つからない
**症状**: `Spreadsheet not found`
**対処法**:
1. スプレッドシートIDが正しいか確認
2. シート名が`SEO Keywords Research`と完全一致するか確認
3. Googleアカウントでスプレッドシートにアクセス権限があるか確認

### エラー3: Google Autocomplete APIエラー
**症状**: `HTTP Request failed`
**対処法**:
1. インターネット接続を確認
2. URLエンコーディングが正しいか確認
3. リクエスト頻度を下げる（Limitを減らす）

### エラー4: キーワードが生成されない
**症状**: `List of keywords`が空欄のまま
**対処法**:
1. 入力キーワードが英数字・ひらがな・カタカナのみか確認
2. 地域設定（Region列）が正しいか確認
3. Autogenerate Keywordsノードの実行結果を確認

---

## 運用のベストプラクティス

### 1. キーワード入力の工夫
- **具体的なキーワード**: 抽象的すぎないキーワードを選ぶ
- **業界用語**: 専門用語も効果的
- **商品名・サービス名**: 固有名詞でも可

### 2. 地域設定の使い分け
- **日本市場向け**: `Region = JP`
- **海外市場向け**: `Region = US`（英語圏）
- **多言語対応**: 同じキーワードでRegionを変えて複数行作成

### 3. 定期的な更新
- 月1回程度、新しいキーワードを追加
- トレンドに合わせてキーワードを更新
- 古い結果は別シートに移動

### 4. データ活用
- 生成されたキーワードをコンテンツ制作に活用
- キーワードボリュームツールと組み合わせ
- 競合分析に利用

---

## 拡張アイデア

### 1. キーワードボリューム取得の追加
- [Google Keyword Planner API](https://developers.google.com/google-ads/api/docs/keyword-planning/overview)と連携
- 検索ボリュームを追加列として保存

### 2. 競合分析の追加
- Serpstack API等で上位サイトを取得
- ドメイン権威値（DA/DR）を記録

### 3. 複数検索エンジン対応
- Bing Autocomplete API
- YouTube Autocomplete API
- Amazon Autocomplete API

### 4. AIによるキーワード分類
- OpenAI APIで意図分類（Informational/Commercial/Transactional）
- カテゴリ自動タグ付け

---

## 参考リソース

### 公式ドキュメント
- [n8n Documentation](https://docs.n8n.io/)
- [Google Sheets API](https://developers.google.com/sheets/api)
- [n8n Google Sheets Node](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlesheets/)

### 関連ツール
- [Google Keyword Planner](https://ads.google.com/home/tools/keyword-planner/)
- [Ahrefs Keywords Explorer](https://ahrefs.com/keywords-explorer)
- [SEMrush Keyword Magic Tool](https://www.semrush.com/analytics/keywordmagic/start)

---

## サポート

### 問題が発生した場合
1. このドキュメントのトラブルシューティングを確認
2. n8nのログを確認（実行履歴から詳細を表示）
3. Googleスプレッドシートのデータ形式を確認

### ワークフローの改善提案
- より効率的な処理方法
- 新しい機能の追加
- バグ報告

---

**作成日**: 2025-10-28
**バージョン**: 1.0
**最終更新**: 2025-10-28
