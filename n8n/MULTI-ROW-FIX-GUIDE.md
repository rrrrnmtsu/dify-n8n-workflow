# 複数行処理の修正ガイド

## 問題の原因

### 現在のワークフローの問題点

```
Read Keywords (5行読み込み)
  ↓
Limit (10件制限)
  ↓
Autogenerate Keywords
  ↓
...
  ↓
Aggregate ← ここで全部を1つにまとめてしまう
  ↓
Update Google Sheets ← 1行分しか更新できない！
```

**なぜ1行しか更新されないのか？**
- Aggregateノードで全てのデータを1つにまとめている
- Update Google Sheetsは1つのアイテムしか受け取れない
- 結果として最初の行しか更新されない

---

## 解決方法: Loop Over Items（ループ処理）

### 新しいワークフローの構造

```
Read Keywords (5行読み込み)
  ↓
Loop Over Items ← ここでループ開始
  ↓ [1行ずつ処理]
Autogenerate Keywords (1行目)
  ↓
Format Keywords
  ↓
Split Out
  ↓
Extract Keyword
  ↓
Aggregate Keywords
  ↓
Prepare Update
  ↓
Update Google Sheets (1行目を更新)
  ↓
Loop Over Items ← ループして次の行へ
  ↓ [2行目処理]
  ↓ [3行目処理]
  ↓ ...全ての行が完了するまで繰り返し
```

---

## 実装方法（2つの選択肢）

### 🎯 方法1: 新しいワークフローをインポート（推奨・簡単）

#### ステップ1: 新しいワークフローファイルをインポート

1. n8nを開く: `http://localhost:5678`
2. 「Import from File」をクリック
3. 以下のファイルを選択:
   ```
   seo-keyword-research-workflow-multi-row.json
   ```

#### ステップ2: スプレッドシートIDを設定

以下の2つのノードでスプレッドシートIDを設定:

**A. Read Keywordsノード**
- `documentId` に自分のスプレッドシートIDを入力

**B. Update Google Sheetsノード**
- `documentId` に自分のスプレッドシートIDを入力

#### ステップ3: 認証情報を設定

両ノードで：
- 「Credential to connect with」を選択
- Google Sheets OAuth2認証を選択

#### ステップ4: 保存して実行

1. 「Save」をクリック
2. 「Execute Workflow」をクリック
3. 全ての行が順番に処理されることを確認！

---

### 🔧 方法2: 既存のワークフローを修正（手動）

既存のワークフローに手を加えて修正する方法です。

#### 変更点の概要

1. **Limitノードを削除** → **Loop Over Itemsノードに置き換え**
2. **Aggregateノードの後に** → **Prepare Updateノードを追加**
3. **Update Google Sheetsの接続を変更** → **Loop Over Itemsに戻す**

---

#### 詳細な修正手順

##### ステップ1: Limitノードを削除してLoop Over Itemsを追加

1. **Limitノード**を削除
2. 「Add Node」をクリック
3. 「Split In Batches」を検索して追加
4. ノード名を「Loop Over Items」に変更
5. 設定:
   - Batch Size: `1`（1件ずつ処理）
   - Options: デフォルトのまま

##### ステップ2: 接続を変更

**変更前**:
```
Read Keywords → Limit → Autogenerate Keywords
```

**変更後**:
```
Read Keywords → Loop Over Items → Autogenerate Keywords
```

**接続方法**:
- Read Keywordsの出力を Loop Over Itemsの入力に接続
- Loop Over Itemsの**下側の出力**（Loop output）を Autogenerate Keywordsの入力に接続

---

##### ステップ3: Prepare Updateノードを追加

1. Aggregate Keywordsの後に「Set」ノードを追加
2. ノード名を「Prepare Update」に変更
3. 設定:

**Assignments**:

**Assignment 1**:
```javascript
Name: row_number
Type: String
Value: ={{ $('Loop Over Items').item.json.row_number }}
```

**Assignment 2**:
```javascript
Name: keywords_list
Type: String
Value: ={{ $json.keyword.join(', ') }}
```

---

##### ステップ4: Update Google Sheetsノードを修正

**Columns → Value Mappings**:

**修正前**:
```javascript
row_number: ={{ $('Limit').first().json.row_number }}
List of keywords: ={{ $json.Keywords.join(', ') }}
```

**修正後**:
```javascript
row_number: ={{ $json.row_number }}
List of keywords: ={{ $json.keywords_list }}
```

---

##### ステップ5: ループバック接続を追加

1. Update Google Sheetsの出力を Loop Over Itemsの入力に接続
2. これにより、次の行の処理が自動的に開始される

**最終的な接続**:
```
Read Keywords → Loop Over Items
                    ↓ (Loop output)
                Autogenerate Keywords
                    ↓
                ... (中間ノード)
                    ↓
                Update Google Sheets
                    ↓
                Loop Over Items (ループバック)
```

---

## 動作確認

### テスト用サンプルデータ

Googleスプレッドシートに以下のデータを入力:

| Keywords | List of keywords | Region |
|----------|------------------|--------|
| SEO対策 | | JP |
| ウェブデザイン | | JP |
| web design | | US |
| marketing | | US |
| コンテンツ制作 | | JP |

### 実行手順

1. ワークフローを保存
2. 「Execute Workflow」をクリック
3. 各ノードが順番に緑色になることを確認
4. **Loop Over Itemsが5回繰り返されることを確認**

### 期待される結果

全ての行が更新される:

| Keywords | List of keywords | Region |
|----------|------------------|--------|
| SEO対策 | SEO対策 ツール, SEO対策 やり方, SEO対策 費用... | JP |
| ウェブデザイン | ウェブデザイン 会社, ウェブデザイン 学校... | JP |
| web design | web design inspiration, web design tools... | US |
| marketing | marketing strategy, marketing automation... | US |
| コンテンツ制作 | コンテンツ制作 会社, コンテンツ制作 相場... | JP |

---

## トラブルシューティング

### 問題1: ループが終わらない

**症状**: ワークフローが永遠に実行され続ける

**原因**: Loop Over Itemsの設定が間違っている

**対処法**:
1. Loop Over Itemsノードを開く
2. Optionsを確認
3. 「Reset」をクリックしてデフォルトに戻す

---

### 問題2: 最初の行しか更新されない

**症状**: 1行目だけ更新されて終了

**原因**: ループバック接続が正しくない

**対処法**:
1. Update Google Sheetsの出力が Loop Over Itemsの入力に接続されているか確認
2. Loop Over Itemsの**上側の入力**に接続されていることを確認

---

### 問題3: row_numberが見つからない

**症状**: `Cannot read property 'row_number'`

**原因**: 式の参照先が間違っている

**対処法**:
```javascript
// Prepare Updateノードで以下を使用
={{ $('Loop Over Items').item.json.row_number }}
```

---

### 問題4: 途中でエラーが出る

**症状**: 2行目の途中で停止

**原因**: エラーハンドリングが設定されていない

**対処法**:
1. Autogenerate Keywordsノードを開く
2. 「Settings」タブ
3. 「Continue On Fail」を有効化
4. これでエラーが出ても次の行に進む

---

## パフォーマンス最適化

### 処理速度の改善

#### 1. バッチサイズの調整

Loop Over Itemsで複数行を同時処理:

```
Batch Size: 3
```
- 3行ずつまとめて処理
- 速度は上がるが、エラー時の影響範囲が大きい

#### 2. 待機時間の追加

Google APIのレート制限対策:

1. Autogenerate Keywordsの後に「Wait」ノードを追加
2. 設定:
   ```
   Amount: 1
   Unit: Seconds
   ```
3. これでAPI制限を回避

---

## まとめ

### 変更点の要約

| 変更箇所 | 変更前 | 変更後 |
|---------|--------|--------|
| **Limitノード** | あり | **削除** |
| **Loop Over Items** | なし | **追加**（1件ずつ処理） |
| **Prepare Update** | なし | **追加**（データ整形） |
| **Update Sheets** | 式が複雑 | **シンプル化** |
| **ループバック** | なし | **追加**（次の行へ） |

### 修正後のメリット

✅ **全ての行が処理される**
✅ エラーが出ても次の行に進める
✅ 処理状況が可視化される
✅ デバッグがしやすい

---

## 次のステップ

- [ ] 新しいワークフローをインポート
- [ ] スプレッドシートIDを設定
- [ ] 認証情報を設定
- [ ] テストデータで動作確認
- [ ] 実際のキーワードで運用開始

---

**ファイルパス**:
- 複数行対応版JSON: `seo-keyword-research-workflow-multi-row.json`
- このガイド: `MULTI-ROW-FIX-GUIDE.md`

---

**作成日**: 2025-10-28
**最終更新**: 2025-10-28
