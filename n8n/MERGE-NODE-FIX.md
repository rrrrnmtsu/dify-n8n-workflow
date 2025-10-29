# Merge All Data ノード エラー修正ガイド

## エラー内容

```
Problem in node 'Merge All Data'
You need to define at least one pair of fields in "Fields to Match" to match on
```

このエラーは、Merge ノード（v3）の設定が不完全なために発生しています。

---

## 原因

Merge ノード v3では、以下の3種類の`Combine By`オプションがあります：

1. **Matching Fields** - 共通フィールドでマッチング（フィールド指定が必須）
2. **Position** - 位置ベースでマージ（順序が重要）
3. **All Possible Combinations** - すべての組み合わせを生成

現在のワークフローでは、3つのブランチ（キーワード生成、ボリュームデータ、SERPデータ）を統合しようとしていますが、`Matching Fields`が選択されているのにフィールドが指定されていないため、エラーが発生しています。

---

## 解決策（3つのオプション）

### **オプション1: Position を使用（推奨・最も簡単）**

3つのブランチが同じ順序でデータを出力する場合、位置ベースでマージします。

#### 修正手順

1. **Merge All Data ノードを開く**
   - ワークフローで「Merge All Data」ノードをダブルクリック

2. **Combine By を変更**
   - Mode: `Combine`
   - Combine By: **`Position`** を選択 ← 重要

3. **Output 設定**
   - Output: `Input 1 + Input 2 (merged fields)`
   - これにより、すべてのフィールドが統合されます

4. **保存**
   - 「Save」をクリック

**メリット**:
- ✅ 設定が最も簡単
- ✅ フィールド指定不要
- ✅ 3つの入力を自動的に統合

**デメリット**:
- ⚠️ 入力の順序が重要
- ⚠️ 各ブランチが同じ順序でデータを出力する必要がある

---

### **オプション2: Matching Fields を使用（より厳密）**

共通のフィールド（例: `row_number`）でマッチングする方法です。

#### 前提条件

3つのブランチすべてに共通のフィールドが必要です。

#### 修正手順

**ステップ1: 各Extractノードに row_number を追加**

1. **Aggregate Keywords ノード**を開く
2. Assignments に追加:
```javascript
Name: row_number
Value: ={{ $('Loop Over Items').item.json.row_number }}
```

3. **Extract Volume Data ノード**を開く
4. Assignments に追加:
```javascript
Name: row_number
Value: ={{ $('Loop Over Items').item.json.row_number }}
```

5. **Extract SERP Data ノード**を開く
6. Assignments に追加:
```javascript
Name: row_number
Value: ={{ $('Loop Over Items').item.json.row_number }}
```

**ステップ2: Merge All Data ノードを設定**

1. Mode: `Combine`
2. Combine By: **`Matching Fields`** を選択
3. Fields to Match を設定:
   - Input 1 Field: `row_number`
   - Input 2 Field: `row_number`
4. Output: `Input 1 + Input 2 (merged fields)`

**メリット**:
- ✅ より厳密なマッチング
- ✅ 順序に依存しない
- ✅ 大量データでも安全

**デメリット**:
- ❌ 設定が複雑
- ❌ すべてのノードに共通フィールドが必要

---

### **オプション3: All Possible Combinations を使用（特殊用途）**

すべての入力の組み合わせを生成します。

#### 使用例

Input 1に2アイテム、Input 2に2アイテムがある場合、4つの組み合わせ（2×2）が生成されます。

#### 設定

1. Mode: `Combine`
2. Combine By: **`All Possible Combinations`**
3. Output: `Input 1 + Input 2 (merged fields)`

**注意**:
- ⚠️ 通常のワークフローには不向き
- ⚠️ 組み合わせ数が爆発的に増える可能性
- ⚠️ このワークフローでは推奨しません

---

#### ステップ4: 接続を再設定

3つのブランチを接続します：

1. **Input 1**: `Aggregate Keywords` → `Merge All Data`
2. **Input 2**: `Extract Volume Data` → `Merge All Data`
3. **Input 3**: `Extract SERP Data` → `Merge All Data`

**接続方法**:
- Aggregate Keywords ノードの出力 → Merge All Data ノードの入力1
- Extract Volume Data ノードの出力 → Merge All Data ノードの入力2
- Extract SERP Data ノードの出力 → Merge All Data ノードの入力3

---

#### ステップ5: 出力を接続

1. `Merge All Data` → `Prepare Final Update`

---

## 完全な設定例（JSON）

### オプション1: Position を使用（推奨）

```json
{
  "parameters": {
    "mode": "combine",
    "combineBy": "combineByPosition",
    "options": {}
  },
  "id": "merge-all-data-pro",
  "name": "Merge All Data",
  "type": "n8n-nodes-base.merge",
  "typeVersion": 3,
  "position": [1700, 400]
}
```

### オプション2: Matching Fields を使用

```json
{
  "parameters": {
    "mode": "combine",
    "combineBy": "combineByFields",
    "fieldsToMatchMultiple": [
      {
        "field1": "row_number",
        "field2": "row_number"
      }
    ],
    "options": {}
  },
  "id": "merge-all-data-pro",
  "name": "Merge All Data",
  "type": "n8n-nodes-base.merge",
  "typeVersion": 3,
  "position": [1700, 400]
}
```

### オプション3: All Possible Combinations

```json
{
  "parameters": {
    "mode": "combine",
    "combineBy": "combineAll",
    "options": {}
  },
  "id": "merge-all-data-pro",
  "name": "Merge All Data",
  "type": "n8n-nodes-base.merge",
  "typeVersion": 3,
  "position": [1700, 400]
}
```

---

## n8n UI での詳細設定

### オプション1: Position（推奨）

1. **Mode**: `Combine` を選択
2. **Combine By**: `Position` を選択
3. **Output**: `Input 1 + Input 2 (merged fields)` を選択

### オプション2: Matching Fields

1. **Mode**: `Combine` を選択
2. **Combine By**: `Matching Fields` を選択
3. **Fields to Match** を設定:
   - Add Fields to Match をクリック
   - Input 1 Field: `row_number`
   - Input 2 Field: `row_number`
4. **Output**: `Input 1 + Input 2 (merged fields)` を選択

### オプション3: All Possible Combinations

1. **Mode**: `Combine` を選択
2. **Combine By**: `All Possible Combinations` を選択
3. **Output**: `Input 1 + Input 2 (merged fields)` を選択

---

## 動作確認

### テストデータの準備

各ブランチが以下のようなデータを出力すると仮定：

**Aggregate Keywords (Input 1)**:
```json
{
  "keyword": ["SEO対策 ツール", "SEO対策 やり方", "SEO対策 無料"]
}
```

**Extract Volume Data (Input 2)**:
```json
{
  "search_volume": 12000,
  "competition": "MEDIUM",
  "cpc": 1.25
}
```

**Extract SERP Data (Input 3)**:
```json
{
  "top_10_urls": ["https://example1.com", "https://example2.com", ...],
  "top_domains": ["example1.com", "example2.com", ...]
}
```

### 期待される Merge 結果

```json
{
  "keyword": ["SEO対策 ツール", "SEO対策 やり方", "SEO対策 無料"],
  "search_volume": 12000,
  "competition": "MEDIUM",
  "cpc": 1.25,
  "top_10_urls": ["https://example1.com", "https://example2.com", ...],
  "top_domains": ["example1.com", "example2.com", ...]
}
```

すべてのフィールドが1つのオブジェクトに統合されます。

---

## 代替案: Combine by Fields を使用（上級者向け）

共通フィールドでマッチングしたい場合は、`Combine by Fields` を使用します。

### 前提条件

3つのブランチすべてに共通のフィールド（例: `row_number`）が必要です。

### 設定手順

1. **各Extractノードで row_number を追加**

**Aggregate Keywords ノード**を修正:
```javascript
{
  "keyword": [...],
  "row_number": "={{ $('Loop Over Items').item.json.row_number }}"
}
```

**Extract Volume Data ノード**を修正:
```javascript
{
  "search_volume": ...,
  "competition": ...,
  "cpc": ...,
  "row_number": "={{ $('Loop Over Items').item.json.row_number }}"
}
```

**Extract SERP Data ノード**を修正:
```javascript
{
  "top_10_urls": [...],
  "top_domains": [...],
  "row_number": "={{ $('Loop Over Items').item.json.row_number }}"
}
```

2. **Merge All Data ノードを設定**

- Mode: `Combine`
- Combine By: `Combine by fields`
- Fields to Match:
  - Input 1 Field: `row_number`
  - Input 2 Field: `row_number`

**注意**: v3では複数入力（3つ以上）のフィールドマッチングが複雑です。推奨は「Merge by Position」です。

---

## トラブルシューティング

### 問題1: 入力データが空

**症状**:
Merge All Dataノードで "No data" と表示される

**原因**:
- 上流のノード（Aggregate Keywords、Extract Volume Data、Extract SERP Data）のいずれかが失敗している

**対処法**:
1. 各ノードを個別にテスト実行
2. エラーがあるノードを修正
3. すべてのノードが成功してからMergeを実行

---

### 問題2: データの順序が異なる

**症状**:
Merge後のデータが意図しない組み合わせになる

**原因**:
- 3つのブランチの実行順序や出力順序が異なる

**対処法**:
- 「Combine by Position」では順序が重要
- すべてのブランチが同じキーワードに対して同じ順序でデータを出力することを確認
- または「Combine by Fields」を使用（上級者向け）

---

### 問題3: フィールドが重複する

**症状**:
Merge後に同じフィールド名が複数存在する

**原因**:
- 複数の入力に同じフィールド名がある（例: すべてに `keyword` フィールド）

**対処法**:
1. Extractノードでフィールド名を変更
   - Input 1: `keywords_list`
   - Input 2: `volume_data`
   - Input 3: `serp_data`
2. Merge ノードの Output 設定で「Keep input data as separate fields」を選択

---

## 推奨される最終設定

### シンプルで確実な方法

1. **Merge All Data ノード**
   - Mode: `Combine`
   - Combine By: `Merge by position`
   - Output: `Input 1 + Input 2 (merged fields)`

2. **上流ノードの確認**
   - Aggregate Keywords: 正常に動作
   - Extract Volume Data: 正常に動作
   - Extract SERP Data: 正常に動作

3. **データの順序**
   - すべてのブランチが Loop Over Items の同じアイテムを処理
   - 同じ順序でデータを出力

---

## 修正後のテスト手順

### ステップ1: 個別ノードのテスト

1. **Aggregate Keywords** を単体実行 → 成功確認
2. **Extract Volume Data** を単体実行 → 成功確認
3. **Extract SERP Data** を単体実行 → 成功確認

### ステップ2: Merge ノードのテスト

1. **Merge All Data** ノードを選択
2. 左サイドバー → 「Execute node」
3. 結果を確認：
   - すべてのフィールドが統合されている
   - データ構造が正しい

### ステップ3: ワークフロー全体のテスト

1. ワークフロー画面右上 → 「Execute Workflow」
2. すべてのノードが緑色になることを確認
3. Google Sheetsに結果が書き込まれることを確認

---

## 完全な接続図

```
Loop Over Items
    ↓ (3分岐)
    ├─→ Branch 1: Autogenerate Keywords → ... → Aggregate Keywords ─┐
    ├─→ Branch 2: Get Search Volume → Extract Volume Data ──────────┼─→ Merge All Data → Prepare Final Update
    └─→ Branch 3: Get SERP Results → Extract SERP Data ─────────────┘
```

3つの入力が Merge All Data で統合され、Prepare Final Update に渡されます。

---

## まとめ

### 修正チェックリスト

- [x] Merge All Data ノードを開く
- [x] Mode: `Combine` に設定
- [x] Combine By: `Merge by position` に設定
- [x] 3つの入力が正しく接続されている
  - Input 1: Aggregate Keywords
  - Input 2: Extract Volume Data
  - Input 3: Extract SERP Data
- [x] 出力が Prepare Final Update に接続されている
- [x] 保存して実行
- [x] エラーが解消されている

---

**作成日**: 2025-10-29
**対応ワークフロー**: seo-keyword-research-advanced.json (v2.0)
