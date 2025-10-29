# エラー解決ガイド: Multiple matching items

## エラー内容

```
Multiple matching items for item [0]
An expression here won't work because it uses .item and n8n can't figure out the matching item.
(There are multiple possible matches)

Try using .first(), .last() or .all()[index] instead of .item or reference a different node.
```

---

## 原因

このエラーは、**Update Google Sheets**ノードで以下の式を使用した際に発生します：

```javascript
// エラーが出る式
={{ $('Limit').item.json.row_number }}
```

**なぜエラーが出るのか？**
- `Aggregate`ノードで複数のアイテムが1つに集約されている
- その後の`Update Google Sheets`ノードから見ると、`Limit`ノードに複数のアイテムが存在
- `.item` では「どのアイテムを参照するか」が曖昧になる

---

## 解決方法（3つの選択肢）

### ✅ 解決方法1: `.first()` を使用（推奨）

**最初のアイテムを参照する**

```javascript
// 修正後の式
={{ $('Limit').first().json.row_number }}
```

**説明**:
- `Limit`ノードの最初のアイテムを取得
- 1つのキーワードずつ処理する場合に最適

---

### ✅ 解決方法2: `.last()` を使用

**最後のアイテムを参照する**

```javascript
={{ $('Limit').last().json.row_number }}
```

**説明**:
- `Limit`ノードの最後のアイテムを取得
- 最新のデータを優先したい場合に使用

---

### ✅ 解決方法3: `.all()[index]` を使用

**特定のインデックスのアイテムを参照する**

```javascript
// 最初のアイテム（インデックス0）
={{ $('Limit').all()[0].json.row_number }}

// 2番目のアイテム（インデックス1）
={{ $('Limit').all()[1].json.row_number }}
```

**説明**:
- 特定の位置のアイテムを直接指定
- より細かい制御が必要な場合に使用

---

## 実際の修正手順

### ステップ1: Update Google Sheetsノードを開く
1. ワークフローキャンバスで「Update Google Sheets」ノードをダブルクリック

---

### ステップ2: Value Mappingsを修正

#### 修正前（エラーが出る式）
```javascript
Column: row_number
Value: ={{ $('Limit').item.json.row_number }}
```

#### 修正後（推奨）
```javascript
Column: row_number
Value: ={{ $('Limit').first().json.row_number }}
```

---

### ステップ3: 保存してテスト
1. 設定画面右上の「**Execute Node**」をクリック
2. エラーが消えたことを確認
3. 「**Back to canvas**」をクリック
4. ワークフロー全体を保存

---

## ワークフロー全体の修正版JSON

### 修正箇所

**Update Google Sheetsノード**の`columns.value`セクション:

```json
{
  "columns": {
    "mappingMode": "defineBelow",
    "value": {
      "row_number": "={{ $('Limit').first().json.row_number }}",
      "List of keywords": "={{ $json.Keywords.join(', ') }}"
    },
    "matchingColumns": ["row_number"]
  }
}
```

---

## 完全修正版ワークフローJSON

正しく動作する完全なJSONファイルを作成しました：

**ファイルパス**: `seo-keyword-research-workflow-fixed.json`

---

## なぜ `.first()` が推奨なのか？

### このワークフローの動作フロー

```
Read Keywords (複数行)
  ↓
Limit (最大10件に制限)
  ↓ [各行が個別のアイテムとして存在]
Autogenerate Keywords (各行ごとに実行)
  ↓
Format Keywords
  ↓
Split Out
  ↓
Clean Keywords
  ↓
Aggregate (全アイテムを1つに集約)
  ↓ [1つのアイテムに集約されたが、元の行情報が必要]
Update Google Sheets ← ここでエラー発生！
```

**問題**:
- `Aggregate`で複数のアイテムが1つに集約される
- しかし、`row_number`は元の`Limit`ノードから取得する必要がある
- `Limit`ノードには複数のアイテムが残っている

**解決**:
- `.first()` で最初のアイテムの`row_number`を取得
- これが更新対象の行番号になる

---

## より良い解決方法（ワークフローの改善）

### 問題の根本原因
現在のワークフローでは、複数のキーワードを一度に処理してAggregateで集約しているため、行番号の参照が曖昧になります。

### 改善案1: Loop Over Itemsを使用

各キーワードを1つずつ順番に処理する方法：

```
Read Keywords
  ↓
Loop Over Items (SplitInBatches)
  ↓ 1件ずつ処理
Autogenerate Keywords
  ↓
Format Keywords
  ↓
Split Out
  ↓
Clean Keywords
  ↓
Aggregate
  ↓
Update Google Sheets
  ↓
Loop back (次のアイテムへ)
```

**メリット**:
- 各キーワードの処理が独立
- `row_number`の参照が明確
- エラーが起きにくい

---

### 改善案2: Code ノードで処理

データを構造化して処理する方法：

```javascript
// Code ノード
const items = $input.all();

return items.map(item => ({
  json: {
    row_number: item.json.row_number,
    keywords: item.json.Keywords.join(', ')
  }
}));
```

---

## トラブルシューティング

### エラー1: `.first()` でもエラーが出る
**症状**: `Cannot read property 'json' of undefined`

**原因**: `Limit`ノードにデータが存在しない

**対処法**:
1. ワークフローを最初から実行
2. 各ノードの実行結果を確認
3. `Read Keywords`でデータが取得できているか確認

---

### エラー2: 行番号が間違っている
**症状**: 違う行が更新される

**原因**: `.first()` で常に最初の行番号を取得している

**対処法**:
- ワークフローの構造を見直す
- Loop Over Itemsを使用して1件ずつ処理

---

### エラー3: 複数行が同時に更新されない
**症状**: 1行しか更新されない

**原因**: Aggregateで集約された後、1つのアイテムになっている

**対処法**:
- これは正常な動作です
- 複数行を同時に更新したい場合は、ワークフロー構造を変更する必要あり

---

## 推奨される修正（簡易版）

### 現在のワークフローを最小限の変更で修正

**変更点**: Value Mappingsの式のみ修正

```javascript
// 修正前
row_number: ={{ $('Limit').item.json.row_number }}

// 修正後
row_number: ={{ $('Limit').first().json.row_number }}
```

**注意事項**:
- この修正で基本的な動作は可能
- ただし、複数のキーワードを同時処理する場合は制限あり
- 1件ずつ処理したい場合は、ワークフロー構造の変更を推奨

---

## まとめ

### クイック修正（今すぐ動かす）

**Update Google Sheetsノード**で以下を変更:

```javascript
// この式を
={{ $('Limit').item.json.row_number }}

// これに変更
={{ $('Limit').first().json.row_number }}
```

### 推奨される対応

1. ✅ **今すぐ**: `.first()` に変更してエラーを解消
2. ✅ **後で**: ワークフロー構造を見直して改善
3. ✅ **将来**: Loop Over Itemsを使用した構造に変更

---

## 参考資料

### n8n公式ドキュメント
- [Working with multiple items](https://docs.n8n.io/data/data-structure/#working-with-multiple-items)
- [Expressions](https://docs.n8n.io/code-examples/expressions/)
- [Item Linking](https://docs.n8n.io/data/data-mapping/#item-linking)

### 関連するn8nメソッド
```javascript
// 最初のアイテム
$('NodeName').first()

// 最後のアイテム
$('NodeName').last()

// 全アイテム
$('NodeName').all()

// 特定のインデックス
$('NodeName').all()[0]

// 現在のアイテム（単一実行時のみ）
$('NodeName').item
```

---

**作成日**: 2025-10-28
**最終更新**: 2025-10-28
