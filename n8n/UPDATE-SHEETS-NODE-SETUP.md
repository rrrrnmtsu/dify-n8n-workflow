# Update Google Sheetsノード 設定ガイド

## 概要
このガイドでは、n8nの「Update Google Sheets」ノードの各設定項目について、具体的な設定値と設定方法を説明します。

---

## 基本設定

### 1. Operation（操作）
**設定値**: `Update`

- **説明**: スプレッドシートの既存データを更新する操作
- **設定方法**: ドロップダウンから「Update」を選択
- **他の選択肢**:
  - `Append`: 新しい行を追加
  - `Clear`: データをクリア
  - `Delete`: 行を削除
  - `Read`: データを読み込み

---

### 2. Document（ドキュメント）

#### Resource Locator Mode: ID
**設定値**: `YOUR_SPREADSHEET_ID_HERE`（実際のスプレッドシートIDに置き換え）

**スプレッドシートIDの取得方法**:
1. Googleスプレッドシートを開く
2. URLをコピー:
   ```
   https://docs.google.com/spreadsheets/d/1JOuc5Cihk-IWznqCMdoDUwEskkO8NuLHhkgCCcDA20E/edit
   ```
3. `/d/` と `/edit` の間の文字列がID:
   ```
   1JOuc5Cihk-IWznqCMdoDUwEskkO8NuLHhkgCCcDA20E
   ```

**設定画面**:
```
Document
  Mode: ID ▼
  Value: [ここにスプレッドシートIDを貼り付け]
```

**注意事項**:
- ✅ URL全体ではなく、IDのみをコピー
- ✅ スペースや改行が入らないように注意
- ❌ `https://docs.google.com/...` のようなURL全体を貼り付けない

---

### 3. Sheet（シート名）

#### Resource Locator Mode: Name
**設定値**: `SEO Keywords Research`

**設定方法**:
1. Mode: `Name`（名前で指定）を選択
2. Value: `SEO Keywords Research` と入力

**重要**:
- ✅ シート名は**完全一致**する必要があります
- ✅ 大文字・小文字を区別します
- ✅ スペースも完全一致させる
- ❌ タブやスペースの余分な入力に注意

**確認方法**:
1. Googleスプレッドシートを開く
2. 下部のタブ名を確認
3. 完全に一致する名前を入力

---

## 詳細設定: Columns（列のマッピング）

### Mapping Mode（マッピングモード）
**設定値**: `Define Below`（手動でマッピングを定義）

### Matching Columns（マッチング列）
**設定値**: `row_number`

**説明**:
- どの行を更新するかを特定するための列
- `row_number` はGoogleスプレッドシートが自動で付与する行番号
- この列の値が一致する行を更新します

**設定画面**:
```
Matching Columns
  [x] row_number
```

---

### Value Mappings（値のマッピング）

#### 設定する列

**1. row_number（行番号）**
```javascript
={{ $('Limit').item.json.row_number }}
```

- **説明**: 更新対象の行番号
- **データソース**: Limitノードから取得した行番号
- **用途**: どの行を更新するかを特定

---

**2. List of keywords（関連キーワードのリスト）**
```javascript
={{ $json.Keywords.join(', ') }}
```

- **説明**: 生成された関連キーワードをカンマ区切りで結合
- **データソース**: 前のノード（Aggregate）から取得した`Keywords`配列
- **出力例**: `SEO対策 ツール, SEO対策 やり方, SEO対策 費用`

**区切り文字のカスタマイズ**:
```javascript
// カンマ + スペース（デフォルト）
$json.Keywords.join(', ')

// 改行区切り
$json.Keywords.join('\n')

// セミコロン区切り
$json.Keywords.join('; ')

// パイプ区切り
$json.Keywords.join(' | ')
```

---

### Schema（スキーマ定義）

スキーマは、スプレッドシートの列構造を定義します。

#### 必須列の定義

**1. Keywords（基本キーワード）**
```json
{
  "id": "Keywords",
  "displayName": "Keywords",
  "required": false,
  "defaultMatch": false,
  "display": true,
  "type": "string",
  "canBeUsedToMatch": true
}
```

**2. List of keywords（関連キーワード）**
```json
{
  "id": "List of keywords",
  "displayName": "List of keywords",
  "required": false,
  "defaultMatch": false,
  "display": true,
  "type": "string",
  "canBeUsedToMatch": true
}
```

**3. Region（地域）**
```json
{
  "id": "Region",
  "displayName": "Region",
  "required": false,
  "defaultMatch": false,
  "display": true,
  "type": "string",
  "canBeUsedToMatch": true
}
```

**4. row_number（行番号）**
```json
{
  "id": "row_number",
  "displayName": "row_number",
  "required": false,
  "defaultMatch": false,
  "display": true,
  "type": "string",
  "canBeUsedToMatch": true,
  "readOnly": true
}
```

**注意事項**:
- `row_number` は `readOnly: true` に設定
- 列名は完全一致する必要あり
- スキーマは自動生成される場合もある

---

## 実際の設定画面での入力

### n8nの設定画面イメージ

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Update Google Sheets
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Credential to connect with
  [My Google Sheets ▼]

Operation
  [Update ▼]

Document
  Mode: [ID ▼]
  Value: [1JOuc5Cihk-IWznqCMdoDUwEskkO8NuLHhkgCCcDA20E]

Sheet
  Mode: [Name ▼]
  Value: [SEO Keywords Research]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Columns
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Mapping Mode
  [Define Below ▼]

Matching Columns
  [x] row_number

Value Mappings
  ┌─────────────────────────────────────┐
  │ Column: row_number                  │
  │ Value: ={{ $('Limit').item.json... │
  ├─────────────────────────────────────┤
  │ Column: List of keywords            │
  │ Value: ={{ $json.Keywords.join(... │
  └─────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ステップバイステップ設定手順

### 手順1: ノードを開く
1. ワークフローキャンバスで「Update Google Sheets」ノードをダブルクリック
2. 設定パネルが開きます

---

### 手順2: 認証情報を選択
1. 「Credential to connect with」をクリック
2. 既存の認証情報を選択（例: `My Google Sheets`）
3. 未設定の場合は「Create New」で新規作成

---

### 手順3: Operationを設定
1. 「Operation」ドロップダウンをクリック
2. 「**Update**」を選択

---

### 手順4: Documentを設定
1. 「Document」セクションで「Mode」を「**ID**」に設定
2. 「Value」フィールドにスプレッドシートIDを貼り付け
   ```
   1JOuc5Cihk-IWznqCMdoDUwEskkO8NuLHhkgCCcDA20E
   ```

---

### 手順5: Sheetを設定
1. 「Sheet」セクションで「Mode」を「**Name**」に設定
2. 「Value」フィールドにシート名を入力
   ```
   SEO Keywords Research
   ```

---

### 手順6: Columnsを設定

#### 6-1. Mapping Modeを設定
1. 「Mapping Mode」を「**Define Below**」に設定

#### 6-2. Matching Columnsを設定
1. 「Matching Columns」で「**row_number**」にチェック

#### 6-3. Value Mappingsを設定
1. 「Add Value」をクリック
2. **1つ目のマッピング**:
   - Column: `row_number`
   - Value: `={{ $('Limit').item.json.row_number }}`

3. 「Add Value」をクリック
4. **2つ目のマッピング**:
   - Column: `List of keywords`
   - Value: `={{ $json.Keywords.join(', ') }}`

---

### 手順7: 保存とテスト
1. 設定画面右上の「**Execute Node**」をクリック（テスト実行）
2. エラーがないか確認
3. 問題なければ「**Back to canvas**」をクリック
4. ワークフロー全体を保存

---

## トラブルシューティング

### エラー1: 「Column not found」
**症状**: 列が見つからないというエラー

**原因**:
- スプレッドシートの列名とマッピングの列名が一致していない

**対処法**:
1. Googleスプレッドシートを開く
2. 列名を正確に確認（スペースや大文字・小文字に注意）
3. n8nの設定で列名を完全一致させる

---

### エラー2: 「No matching rows found」
**症状**: 更新対象の行が見つからない

**原因**:
- `row_number` の値が存在しない
- Matching Columnsの設定が間違っている

**対処法**:
1. 「Read Keywords」ノードの実行結果を確認
2. `row_number` が正しく取得されているか確認
3. Matching Columnsに `row_number` が設定されているか確認

---

### エラー3: 「Authentication failed」
**症状**: 認証エラー

**原因**:
- Google OAuth2認証が切れている
- 認証情報が間違っている

**対処法**:
1. Settings → Credentials
2. Google Sheets認証を削除して再作成
3. OAuth接続をやり直す

---

### エラー4: データが更新されない
**症状**: エラーは出ないが、スプレッドシートが更新されない

**原因**:
- 式（Expression）の記述ミス
- データが空

**対処法**:
1. 「Execute Node」で実行結果を確認
2. `$json.Keywords` にデータが入っているか確認
3. 式エディタで構文エラーがないか確認

---

## 高度な設定

### 複数列の更新

3列以上を更新する場合:

```javascript
// Value Mappings
1. row_number: ={{ $('Limit').item.json.row_number }}
2. List of keywords: ={{ $json.Keywords.join(', ') }}
3. Updated_at: ={{ $now.toISO() }}  // 更新日時
4. Keyword_count: ={{ $json.Keywords.length }}  // キーワード数
```

---

### 条件付き更新

特定の条件でのみ更新:

```javascript
// Regionが"JP"の場合のみキーワードを更新
={{
  $('Limit').item.json.Region === 'JP'
    ? $json.Keywords.join(', ')
    : '更新なし'
}}
```

---

### エラーハンドリング

キーワードが取得できなかった場合の処理:

```javascript
// キーワードが空の場合は「データなし」と表示
={{
  $json.Keywords && $json.Keywords.length > 0
    ? $json.Keywords.join(', ')
    : 'データなし'
}}
```

---

## 設定チェックリスト

実装前に以下を確認してください:

- [ ] Google OAuth2認証が設定済み
- [ ] スプレッドシートIDが正しい
- [ ] シート名が完全一致している
- [ ] Matching Columnsに `row_number` が設定されている
- [ ] Value Mappingsで以下が設定されている:
  - [ ] `row_number` のマッピング
  - [ ] `List of keywords` のマッピング
- [ ] 式（Expression）に構文エラーがない
- [ ] テスト実行でエラーが出ない

---

## まとめ

### 必須設定項目

| 項目 | 設定値 |
|------|--------|
| **Operation** | Update |
| **Document ID** | 自分のスプレッドシートID |
| **Sheet Name** | SEO Keywords Research |
| **Matching Columns** | row_number |
| **Value Mappings** | row_number + List of keywords |

### 重要ポイント

1. ✅ スプレッドシートIDとシート名は完全一致させる
2. ✅ Matching Columnsで更新対象を特定
3. ✅ Value Mappingsで更新する列と値を定義
4. ✅ 式（Expression）の構文を確認
5. ✅ テスト実行で動作確認

---

**作成日**: 2025-10-28
**最終更新**: 2025-10-28
