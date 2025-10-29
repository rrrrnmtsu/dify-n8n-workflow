# SEOキーワードリサーチ - クイックスタート

## 5分で始める！

### ステップ1: Googleスプレッドシート作成（2分）

1. **新規スプレッドシート作成**
   - [Google Sheets](https://sheets.google.com) → 「空白のスプレッドシート」
   - シート名を「SEO Keywords Research」に変更

2. **列を作成**

   | A列: Keywords | B列: List of keywords | C列: Region |
   |---------------|----------------------|-------------|
   | SEO対策       | （空欄）             | JP          |
   | web design    | （空欄）             | US          |

3. **スプレッドシートIDをコピー**
   - URLから以下の部分をコピー:
   ```
   https://docs.google.com/spreadsheets/d/【このID】/edit
   ```

---

### ステップ2: n8nにインポート（2分）

1. **n8nを開く**
   ```bash
   http://localhost:5678
   ```

2. **ワークフローをインポート**
   - 「Import from File」をクリック
   - ファイル選択: `seo-keyword-research-workflow.json`

3. **スプレッドシートIDを設定**
   - 「Read Keywords」ノードを開く
   - `documentId` に先ほどコピーしたIDを貼り付け
   - 「Update Google Sheets」ノードでも同様に設定

4. **認証設定**
   - 両ノードで「Google Sheets OAuth2 API」認証を選択
   - 未設定の場合は新規作成

5. **保存**
   - 右上「Save」をクリック

---

### ステップ3: 実行（1分）

1. **Manual Trigger**ノードを選択
2. 「Execute Workflow」をクリック
3. 全ノードが緑色になるのを待つ
4. Googleスプレッドシートを確認！

**期待される結果**:
```
Keywords: SEO対策
→ List of keywords: SEO対策 ツール, SEO対策 やり方, SEO対策 費用...
```

---

## トラブル時は

- 認証エラー → Google Sheets認証を再設定
- データが表示されない → シート名が「SEO Keywords Research」と完全一致するか確認
- 詳細は `SEO-KEYWORD-RESEARCH-SETUP.md` を参照

---

## 次のステップ

- [x] 基本動作確認完了
- [ ] 自分のキーワードで試す
- [ ] 地域設定（JP/US）を使い分ける
- [ ] 詳細ドキュメント参照: [SEO-KEYWORD-RESEARCH-SETUP.md](./SEO-KEYWORD-RESEARCH-SETUP.md)
