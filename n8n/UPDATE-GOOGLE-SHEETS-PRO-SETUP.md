# Update Google Sheets ノード 設定ガイド（Pro版）

## 概要

このガイドでは、Pro版SEOキーワードリサーチワークフローの「Update Google Sheets」ノードの詳細な設定方法を説明します。

---

## 前提条件

- Google Sheets OAuth2認証が完了していること
- スプレッドシートが作成されていること
- Prepare Final Updateノードから正しいデータが渡されていること

---

## ステップ1: 基本設定

### 1-1. ノードを開く

1. ワークフローで「**Update Google Sheets**」ノードをダブルクリック

---

### 1-2. 基本パラメータ

| 設定項目 | 値 |
|---------|-----|
| **Credential to connect with** | Google Sheets OAuth2認証情報を選択 |
| **Resource** | Spreadsheet |
| **Operation** | Update |

---

## ステップ2: Document（スプレッドシート）設定

### 2-1. Document ID設定

1. **Document**: `From list` → `By ID` を選択
2. **Document ID**: あなたのスプレッドシートIDを入力

#### スプレッドシートIDの取得方法

GoogleスプレッドシートのURLから取得：
```
https://docs.google.com/spreadsheets/d/【ここがスプレッドシートID】/edit
```

**例**:
```
URL: https://docs.google.com/spreadsheets/d/1abc2def3ghi4jkl5mno6pqr7stu8vwx9yz0/edit
ID:  1abc2def3ghi4jkl5mno6pqr7stu8vwx9yz0
```

---

### 2-2. Sheet Name設定

1. **Sheet**: `From list` → `By Name` を選択
2. **Sheet Name**: `SEO Keywords Research` を入力

**注意**: スプレッドシートのシート名と完全に一致する必要があります。

---

## ステップ3: Columns（列マッピング）設定

### 3-1. Mapping Mode

**Columns**: `Map Each Column Manually` を選択

これにより、各列に対して個別にExpressionを設定できます。

---

### 3-2. Column Mappings（Value設定）

以下の6つの列マッピングを設定します：

---

#### **1. row_number（マッチング用）**

| 項目 | 値 |
|------|-----|
| **Column** | row_number |
| **Value** | `={{ $json.row_number }}` |

**説明**:
- この列でスプレッドシートの行を特定します
- Prepare Final Updateノードから渡された`row_number`を使用

---

#### **2. List of keywords**

| 項目 | 値 |
|------|-----|
| **Column** | List of keywords |
| **Value** | `={{ $json.keywords_list }}` |

**説明**:
- Google Autocompleteから取得した関連キーワードのリスト
- カンマ区切りの文字列として格納

**入力例**:
```
SEO対策 ツール, SEO対策 やり方, SEO対策 無料
```

---

#### **3. Search Volume**

| 項目 | 値 |
|------|-----|
| **Column** | Search Volume |
| **Value** | `={{ $json.search_volume }}` |

**説明**:
- DataForSEO APIから取得した月間検索ボリューム
- 数値型

**入力例**:
```
12000
```

---

#### **4. Competition**

| 項目 | 値 |
|------|-----|
| **Column** | Competition |
| **Value** | `={{ $json.competition }}` |

**説明**:
- DataForSEO APIから取得した競合度
- 文字列型（LOW / MEDIUM / HIGH / N/A）

**入力例**:
```
MEDIUM
```

---

#### **5. CPC**

| 項目 | 値 |
|------|-----|
| **Column** | CPC |
| **Value** | `={{ $json.cpc }}` |

**説明**:
- DataForSEO APIから取得したクリック単価（USD）
- 数値型

**入力例**:
```
1.25
```

---

#### **6. Top 5 Domains**

| 項目 | 値 |
|------|-----|
| **Column** | Top 5 Domains |
| **Value** | `={{ $json.top_domains }}` |

**説明**:
- SerpStack APIから取得した上位5ドメイン
- カンマ区切りの文字列

**入力例**:
```
example.com, test.jp, sample.net, demo.org, trial.io
```

---

## ステップ4: Column to Match On（マッチング列）

### 4-1. Matching Columns設定

**Column to match on**: `row_number` を選択

**説明**:
- この列の値でスプレッドシートの行を特定します
- `row_number`が一致する行のみ更新されます

**重要**:
- スプレッドシートに`row_number`列が存在する必要があります
- Read Keywordsノードで自動的に追加されます

---

## ステップ5: Options（オプション設定）

### 5-1. 推奨設定

| オプション | 推奨値 | 説明 |
|-----------|--------|------|
| **Value Input Mode** | User Entered | 数値や日付を自動変換 |
| **Value Render Mode** | Formatted Value | フォーマット済みの値を取得 |

---

## 完全な設定例（n8n UI）

### 画面での設定手順

#### **1. 基本設定**
```
Credential: Google Sheets OAuth2
Resource: Spreadsheet
Operation: Update
```

#### **2. Document設定**
```
Document: By ID
  └─ Document ID: 1abc2def3ghi4jkl5mno6pqr7stu8vwx9yz0

Sheet: By Name
  └─ Sheet Name: SEO Keywords Research
```

#### **3. Columns設定**
```
Columns: Map Each Column Manually
  └─ Column Mappings:
      1. row_number = {{ $json.row_number }}
      2. List of keywords = {{ $json.keywords_list }}
      3. Search Volume = {{ $json.search_volume }}
      4. Competition = {{ $json.competition }}
      5. CPC = {{ $json.cpc }}
      6. Top 5 Domains = {{ $json.top_domains }}

  └─ Column to match on: row_number
```

---

## データフローの確認

### Prepare Final Update → Update Google Sheets

**Prepare Final Updateの出力**:
```json
{
  "row_number": "2",
  "keywords_list": "SEO対策 ツール, SEO対策 やり方, SEO対策 無料",
  "search_volume": 12000,
  "competition": "MEDIUM",
  "cpc": 1.25,
  "top_domains": "example.com, test.jp, sample.net, demo.org, trial.io"
}
```

**Update Google Sheetsで更新される内容**:
| row_number | Keywords | List of keywords | Region | Search Volume | Competition | CPC | Top 5 Domains |
|------------|----------|------------------|--------|---------------|-------------|-----|---------------|
| 2 | SEO対策 | SEO対策 ツール, SEO対策 やり方... | JP | 12000 | MEDIUM | 1.25 | example.com, test.jp... |

---

## Expression（式）の詳細説明

### 基本構文

```javascript
={{ $json.フィールド名 }}
```

### 各フィールドの取得元

| Expression | 取得元ノード | 説明 |
|-----------|-------------|------|
| `$json.row_number` | Loop Over Items | 元のスプレッドシートの行番号 |
| `$json.keywords_list` | Aggregate Keywords | 関連キーワードのリスト |
| `$json.search_volume` | Extract Volume Data | 月間検索ボリューム |
| `$json.competition` | Extract Volume Data | 競合度 |
| `$json.cpc` | Extract Volume Data | クリック単価 |
| `$json.top_domains` | Extract SERP Data | 上位ドメイン |

### データの流れ

```
Loop Over Items → row_number
    ↓
Aggregate Keywords → keywords_list
Extract Volume Data → search_volume, competition, cpc
Extract SERP Data → top_domains
    ↓
Merge All Data（統合）
    ↓
Prepare Final Update（整形）
    ↓
Update Google Sheets（書き込み）
```

---

## トラブルシューティング

### エラー1: Column not found

**症状**:
```
Column "List of keywords" not found in spreadsheet
```

**原因**:
- スプレッドシートに該当する列が存在しない
- 列名のスペルが間違っている

**対処法**:
1. スプレッドシートの列名を確認
2. Update Google Sheetsノードの列名と完全に一致させる
3. 大文字小文字、スペースに注意

---

### エラー2: No matching rows

**症状**:
```
No rows matched the criteria
```

**原因**:
- `row_number`が一致する行がない
- `row_number`列が存在しない

**対処法**:
1. スプレッドシートに`row_number`列が存在するか確認
2. Read Keywordsノードが正しく動作しているか確認
3. Loop Over Itemsで`row_number`が正しく渡されているか確認

---

### エラー3: Invalid value

**症状**:
```
Invalid value for column "Search Volume"
```

**原因**:
- データ型が一致しない（文字列 vs 数値）
- 空の値やnullが含まれている

**対処法**:
1. Expressionを確認:
```javascript
// 数値型の場合、デフォルト値を設定
={{ $json.search_volume || 0 }}

// 文字列型の場合
={{ $json.competition || 'N/A' }}
```

---

### エラー4: Permission denied

**症状**:
```
The caller does not have permission
```

**原因**:
- Google Sheets OAuth2認証のスコープが不足
- スプレッドシートの共有設定が間違っている

**対処法**:
1. 認証を再設定（[GOOGLE-OAUTH-SETUP.md](GOOGLE-OAUTH-SETUP.md)参照）
2. スプレッドシートを認証したGoogleアカウントと共有
3. 編集権限を付与

---

## よくある質問

### Q1: 複数の列を一度に更新できますか？

**A**: はい、Column Mappingsに複数の列を追加することで、一度に複数列を更新できます。

---

### Q2: 特定の列だけ更新したい

**A**: Column Mappingsに更新したい列のみを追加してください。他の列は変更されません。

---

### Q3: 既存のデータを上書きしたくない

**A**: `Column to match on`を使用することで、一致する行のみ更新されます。新しい行は追加されません。

---

### Q4: 数値がテキストとして保存される

**A**: Options → Value Input Mode を `User Entered` に設定すると、Googleスプレッドシートが自動的に数値として認識します。

---

## テスト方法

### ステップ1: 単体テスト

1. Update Google Sheetsノードを選択
2. 左サイドバー → 「Execute node」
3. テストデータを確認:

```json
{
  "row_number": "2",
  "keywords_list": "test keyword 1, test keyword 2",
  "search_volume": 1000,
  "competition": "LOW",
  "cpc": 0.5,
  "top_domains": "test1.com, test2.com"
}
```

4. 「Execute node」をクリック
5. スプレッドシートで結果を確認

---

### ステップ2: ワークフロー全体のテスト

1. スプレッドシートに2-3行のテストデータを入力
2. ワークフロー実行
3. 各列が正しく更新されているか確認:
   - List of keywords: カンマ区切りの文字列
   - Search Volume: 数値
   - Competition: LOW/MEDIUM/HIGH
   - CPC: 小数点数値
   - Top 5 Domains: カンマ区切りの文字列

---

## まとめ

### 設定チェックリスト

- [ ] Google Sheets OAuth2認証設定済み
- [ ] スプレッドシートID設定
- [ ] Sheet Name設定（SEO Keywords Research）
- [ ] Mapping Mode: Map Each Column Manually
- [ ] Column Mappingsに6つの列を追加:
  - [ ] row_number = `{{ $json.row_number }}`
  - [ ] List of keywords = `{{ $json.keywords_list }}`
  - [ ] Search Volume = `{{ $json.search_volume }}`
  - [ ] Competition = `{{ $json.competition }}`
  - [ ] CPC = `{{ $json.cpc }}`
  - [ ] Top 5 Domains = `{{ $json.top_domains }}`
- [ ] Column to match on: row_number
- [ ] テスト実行成功
- [ ] スプレッドシートに正しく書き込まれている

---

## 関連ドキュメント

- [GOOGLE-OAUTH-SETUP.md](GOOGLE-OAUTH-SETUP.md) - Google OAuth2認証設定
- [UPDATE-SHEETS-NODE-SETUP.md](UPDATE-SHEETS-NODE-SETUP.md) - 基本版の設定ガイド
- [ADVANCED-SETUP-GUIDE.md](ADVANCED-SETUP-GUIDE.md) - Pro版全体のセットアップ

---

**作成日**: 2025-10-29
**対応ワークフロー**: seo-keyword-research-advanced.json (v2.0)
