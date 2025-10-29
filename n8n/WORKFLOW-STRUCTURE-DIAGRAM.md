# SEOキーワードリサーチ Pro版 ワークフロー構造図

## 概要

このドキュメントでは、Pro版ワークフローの完全な構造と各ノードの接続を可視化します。

---

## 全体フロー図

```
Manual Trigger
    ↓
Read Keywords (Google Sheets)
    ↓
Loop Over Items (1行ずつ処理)
    ↓
    ├──────────────┬──────────────┬──────────────┐
    ↓              ↓              ↓              ↓
Branch 1       Branch 2       Branch 3       (次の行へ)
キーワード生成   ボリューム      SERP分析
    ↓              ↓              ↓
Autogenerate   Get Search     Get SERP
Keywords       Volume         Results
    ↓              ↓              ↓
Format         Extract        Extract
Keywords       Volume Data    SERP Data
    ↓              ↓              ↓
Split Out          │              │
    ↓              │              │
Extract            │              │
Keyword            │              │
    ↓              │              │
Aggregate          │              │
Keywords           │              │
    ↓              ↓              ↓
    └──────────────┴──────────────┘
               ↓
         Merge All Data (3つの入力を統合)
               ↓
      Prepare Final Update
               ↓
      Update Google Sheets
               ↓
          Loop Over Items (ループバック)
```

---

## 詳細な接続構造

### ステップ1: 初期化

```
Manual Trigger
    ↓ (main output)
Read Keywords
```

**説明**:
- Manual Triggerで手動実行開始
- Read KeywordsでGoogle Sheetsからデータ読み込み

---

### ステップ2: ループ開始

```
Read Keywords
    ↓ (main output)
Loop Over Items
```

**説明**:
- スプレッドシートの全行をLoop Over Itemsに渡す
- Loop Over Itemsが1行ずつ処理

---

### ステップ3: 3分岐並列処理

```
Loop Over Items
    ├─ output[1] → Autogenerate Keywords
    ├─ output[1] → Get Search Volume
    └─ output[1] → Get SERP Results
```

**説明**:
- Loop Over Itemsの出力1（処理中のデータ）が3つのブランチに分岐
- 3つのブランチは**並列実行**される

---

### ステップ4: Branch 1（キーワード生成）

```
Autogenerate Keywords
    ↓
Format Keywords
    ↓
Split Out
    ↓
Extract Keyword
    ↓
Aggregate Keywords
    ↓ (main output)
Merge All Data (Input 1)
```

**各ノードの役割**:
1. **Autogenerate Keywords**: Google Autocomplete APIにリクエスト
2. **Format Keywords**: XML形式をJSONに変換
3. **Split Out**: 配列を個別アイテムに分割
4. **Extract Keyword**: キーワード文字列を抽出
5. **Aggregate Keywords**: 全キーワードを配列にまとめる

---

### ステップ5: Branch 2（ボリュームデータ）

```
Get Search Volume
    ↓
Extract Volume Data
    ↓ (main output)
Merge All Data (Input 2)
```

**各ノードの役割**:
1. **Get Search Volume**: DataForSEO APIにリクエスト
2. **Extract Volume Data**: search_volume, competition, cpcを抽出

---

### ステップ6: Branch 3（SERP分析）

```
Get SERP Results
    ↓
Extract SERP Data
    ↓ (main output)
Merge All Data (Input 3)
```

**各ノードの役割**:
1. **Get SERP Results**: SerpStack APIにリクエスト
2. **Extract SERP Data**: top_10_urls, top_domainsを抽出

---

### ステップ7: データ統合

```
Merge All Data
    ├─ Input 1: Aggregate Keywords
    ├─ Input 2: Extract Volume Data
    └─ Input 3: Extract SERP Data
         ↓ (main output)
    Prepare Final Update
```

**説明**:
- 3つのブランチの出力を1つに統合
- Merge All Dataは**3つの入力が全て到着するまで待機**

---

### ステップ8: 最終処理

```
Prepare Final Update
    ↓ (main output)
Update Google Sheets
    ↓ (main output)
Loop Over Items (ループバック)
```

**説明**:
1. **Prepare Final Update**: スプレッドシート書き込み用にデータ整形
2. **Update Google Sheets**: Google Sheetsに書き込み
3. **Loop Over Items**: ループバック（次の行の処理へ）

---

## ノード接続の詳細

### Merge All Data の入力

| Input | 接続元ノード | データ内容 |
|-------|-------------|-----------|
| **Input 1** | Aggregate Keywords | キーワードリスト配列 |
| **Input 2** | Extract Volume Data | ボリューム・競合・CPC |
| **Input 3** | Extract SERP Data | 上位URL・ドメイン |

**設定**:
```
Mode: Combine
Combine By: Position
Number of Inputs: 3
```

---

### Loop Over Items のループバック

```
Update Google Sheets
    ↓ (main output)
Loop Over Items (index 0)
```

**説明**:
- 1行の処理が完了したら、Loop Over Itemsに戻る
- Loop Over Itemsが次の行を処理
- すべての行が処理されるまで繰り返し

**ループ終了条件**:
- Loop Over Itemsの output[0]（完了時）が発火
- ワークフロー終了

---

## 各ノードの出力数

### Loop Over Items

| Output | 説明 | 接続先 |
|--------|------|--------|
| **Output 0** | すべての処理完了時 | なし（ワークフロー終了） |
| **Output 1** | 処理中のアイテム | Autogenerate Keywords, Get Search Volume, Get SERP Results |

---

### その他のノード

ほとんどのノードは1つの出力のみ:
- **Output 0** (main): 次のノードへデータを渡す

---

## データフロー例

### 入力データ（Loop Over Items）

```json
{
  "Keywords": "SEO対策",
  "List of keywords": "",
  "Region": "JP",
  "Search Volume": "",
  "Competition": "",
  "CPC": "",
  "Top 5 Domains": "",
  "row_number": 2
}
```

---

### Branch 1の出力（Aggregate Keywords）

```json
{
  "keyword": [
    "SEO対策 ツール",
    "SEO対策 やり方",
    "SEO対策 無料"
  ]
}
```

---

### Branch 2の出力（Extract Volume Data）

```json
{
  "search_volume": 12000,
  "competition": "MEDIUM",
  "cpc": 1.25
}
```

---

### Branch 3の出力（Extract SERP Data）

```json
{
  "top_10_urls": [
    "https://example1.com",
    "https://example2.com",
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

### Merge All Dataの出力

```json
{
  "keyword": ["SEO対策 ツール", "SEO対策 やり方", "SEO対策 無料"],
  "search_volume": 12000,
  "competition": "MEDIUM",
  "cpc": 1.25,
  "top_10_urls": [...],
  "top_domains": ["example1.com", "example2.com", ...]
}
```

---

### Prepare Final Updateの出力

```json
{
  "row_number": "2",
  "keywords_list": "SEO対策 ツール, SEO対策 やり方, SEO対策 無料",
  "search_volume": 12000,
  "competition": "MEDIUM",
  "cpc": 1.25,
  "top_domains": "example1.com, example2.com, example3.com, example4.com, example5.com"
}
```

---

### Update Google Sheetsで書き込まれるデータ

| row_number | Keywords | List of keywords | Region | Search Volume | Competition | CPC | Top 5 Domains |
|------------|----------|------------------|--------|---------------|-------------|-----|---------------|
| 2 | SEO対策 | SEO対策 ツール, SEO対策 やり方... | JP | 12000 | MEDIUM | 1.25 | example1.com, example2.com... |

---

## Extract SERP Dataの接続について

### 質問: Extract SERP Dataノードの先に次のノードが接続されていない？

**回答**: いいえ、正しく接続されています！

### 接続構造

```
Extract SERP Data
    ↓ (main output)
Merge All Data (Input 3)
```

**説明**:
- Extract SERP Dataの出力は**Merge All DataのInput 3**に接続
- n8nのUIでは、複数入力を持つノードに接続する際、視覚的に分かりにくい場合があります

---

### Merge All Dataの入力ポート

```
Merge All Data
    ↓ Input 1 ← Aggregate Keywords
    ↓ Input 2 ← Extract Volume Data
    ↓ Input 3 ← Extract SERP Data
```

**重要**:
- Merge All Dataには**3つの入力ポート**があります
- Extract SERP Dataは**Input 3**に接続されています
- すべての入力が揃わないと、Merge All Dataは実行されません

---

## 接続の確認方法

### n8nワークフロー画面での確認

1. **Extract SERP Dataノードを選択**
2. 出力の線を目で追う
3. **Merge All Dataノードの右側（Input 3）**に接続されているはず

### 視覚的な確認

```
Extract SERP Data ──────┐
                        │
Extract Volume Data ────┼→ Merge All Data
                        │
Aggregate Keywords ─────┘
```

3本の線がMerge All Dataノードに集まっています。

---

## トラブルシューティング

### 問題: Extract SERP Dataが接続されていないように見える

**原因**:
- ワークフローが複雑で、視覚的に見づらい
- ノードの配置が重なっている

**確認方法**:
1. Extract SERP Dataノードを選択
2. n8nのUIで接続線がハイライトされる
3. Merge All Dataノードまで線が伸びているか確認

---

### 問題: Merge All Dataでエラーが出る

**症状**:
```
Missing input data for Input 3
```

**原因**:
- Extract SERP Dataが実行されていない
- Extract SERP Dataが失敗している

**対処法**:
1. Extract SERP Dataノードを単体テスト
2. Get SERP ResultsノードのAPIキーを確認
3. ワークフロー全体を再実行

---

## まとめ

### Extract SERP Dataは正しく接続されています

✅ **接続先**: Merge All Data (Input 3)

✅ **データフロー**:
```
Get SERP Results → Extract SERP Data → Merge All Data (Input 3)
```

✅ **役割**:
- 上位10サイトのURLとドメインを抽出
- Merge All Dataで他のデータと統合
- 最終的にGoogle Sheetsの「Top 5 Domains」列に書き込まれる

---

### ワークフローの実行順序

1. Loop Over Itemsが1行分のデータを3つのブランチに送信
2. 3つのブランチが**並列実行**
3. **すべてのブランチが完了するまで待機**
4. Merge All Dataが3つの出力を統合
5. Prepare Final Update → Update Google Sheets
6. Loop Over Itemsにループバック → 次の行へ

---

**作成日**: 2025-10-29
**対応ワークフロー**: seo-keyword-research-advanced.json (v2.0)
