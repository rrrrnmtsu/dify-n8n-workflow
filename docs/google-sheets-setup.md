# Google Sheets 認証設定ガイド

**目的**: n8nからGoogle Sheetsにデータを同期するためのOAuth認証設定

**所要時間**: 15分

---

## 📋 事前準備

### 必要なもの

1. Googleアカウント
2. Google Sheetsのスプレッドシート（または新規作成）
3. n8nが起動中 (http://localhost:5678)

---

## 🔧 ステップ1: Google Cloud Projectの作成

### 1.1 Google Cloud Consoleにアクセス

https://console.cloud.google.com/

### 1.2 新しいプロジェクトを作成

1. 画面上部の「プロジェクトを選択」→「新しいプロジェクト」
2. プロジェクト名: `n8n-sales-report`
3. 「作成」をクリック

---

## 🔑 ステップ2: Google Sheets APIを有効化

### 2.1 APIライブラリを開く

1. 左側メニュー →「APIとサービス」→「ライブラリ」
2. 検索ボックスに「Google Sheets API」と入力
3. 「Google Sheets API」をクリック
4. 「有効にする」をクリック

---

## 🎫 ステップ3: OAuth 2.0 認証情報の作成

### 3.1 認証情報を作成

1. 左側メニュー →「APIとサービス」→「認証情報」
2. 「+ 認証情報を作成」→「OAuth クライアント ID」をクリック

### 3.2 同意画面の設定（初回のみ）

**「OAuth同意画面」の設定が必要な場合**:

1. User Type: 「外部」を選択 →「作成」
2. アプリ情報:
   - アプリ名: `n8n Sales Report`
   - ユーザーサポートメール: あなたのGmail
   - デベロッパーの連絡先: あなたのGmail
3. 「保存して次へ」
4. スコープ: そのまま「保存して次へ」
5. テストユーザー: 「+ ADD USERS」→ あなたのGmail →「保存して次へ」
6. 「ダッシュボードに戻る」

### 3.3 OAuth クライアント ID作成

1. アプリケーションの種類: 「ウェブ アプリケーション」
2. 名前: `n8n`
3. 承認済みのリダイレクト URI:
   ```
   http://localhost:5678/rest/oauth2-credential/callback
   ```
4. 「作成」をクリック

### 3.4 クライアント情報を保存

**表示されるダイアログから以下をコピー**:
- **クライアント ID**: `xxxxx.apps.googleusercontent.com`
- **クライアント シークレット**: `GOCSPX-xxxxx`

⚠️ この情報は後で使うので、メモ帳に保存してください

---

## 🔗 ステップ4: n8nでGoogle Sheets認証設定

### 4.1 n8nにアクセス

http://localhost:5678

### 4.2 認証情報を追加

1. 左側メニュー →「Credentials」
2. 「+ Add Credential」をクリック
3. 検索: 「Google Sheets OAuth2 API」を選択

### 4.3 認証情報を入力

| 項目 | 値 |
|------|-----|
| **Credential Name** | `Google Sheets OAuth` |
| **Client ID** | 手順3.4でコピーしたクライアント ID |
| **Client Secret** | 手順3.4でコピーしたクライアント シークレット |

### 4.4 OAuth接続

1. 「Connect my account」をクリック
2. Googleアカウントでログイン
3. 「n8n Sales Reportが次の許可をリクエストしています」→「許可」
4. n8nに戻り、「Save」をクリック

✅ 認証完了！

---

## 📊 ステップ5: Google Sheetsの準備

### 5.1 スプレッドシートを作成

1. https://sheets.google.com/ にアクセス
2. 「空白」をクリックして新しいスプレッドシートを作成
3. シート名を「CROSS ROPPONGI 売上集計」に変更

### 5.2 シート構造を作成

**シート1: 日次売上** (Sheet1を名前変更)

1行目（ヘッダー行）に以下を入力:

| A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 営業日 | 総来客数 | 男性 | 女性 | 総売上 | 現金化不足 | FRONT | CLOAK備品 | LOCKER | BAR1 | BAR2 | BAR3 | BAR4 | VIP1 | VVIP | PARTY |

続き:

| Q | R |
|---|---|
| 未収 | 未収回収 |

### 5.3 スプレッドシートIDをコピー

URLから`spreadsheets/d/`の後の文字列をコピー:

```
https://docs.google.com/spreadsheets/d/1ABC...XYZ/edit
                                      ↑ この部分 ↑
```

例: `1ABCdefGHIjklMNOpqrSTUvwxYZ123456789`

---

## 🔧 ステップ6: 環境変数の設定

`.env`ファイルに以下を追加:

```bash
# Google Sheets設定
GOOGLE_SHEET_ID=1ABCdefGHIjklMNOpqrSTUvwxYZ123456789
GOOGLE_SHEET_URL=https://docs.google.com/spreadsheets/d/1ABCdefGHIjklMNOpqrSTUvwxYZ123456789/edit
```

**Dockerを再起動**:

```bash
cd /Users/remma/dify-n8n-workflow
docker compose down
docker compose up -d
```

---

## ✅ 完了チェックリスト

- [ ] Google Cloud Projectを作成
- [ ] Google Sheets APIを有効化
- [ ] OAuth 2.0 認証情報を作成
- [ ] n8nでGoogle Sheets OAuth認証を設定
- [ ] Google Sheetsでスプレッドシートを作成
- [ ] シート「日次売上」にヘッダー行を作成
- [ ] スプレッドシートIDを`.env`に追加
- [ ] Docker環境を再起動

---

## 🧪 テスト方法

### テスト1: n8nから手動実行

1. n8nでワークフローを開く
2. 「Google Sheets」ノードをクリック
3. 「Test step」をクリック
4. Google Sheetsに「Test」データが追加されればOK

### テスト2: 実ファイルでのテスト

1. Telegramグループに`20251018CROSSROPPONGI.xlsx`を送信
2. 30秒以内に自動処理
3. Google Sheetsに売上データが追加される
4. Telegramに完了メッセージが届く

---

## 🔍 トラブルシューティング

### エラー1: 「The caller does not have permission」

**原因**: Google Sheets APIが有効化されていない

**解決策**:
1. Google Cloud Console → 「APIとサービス」→「ライブラリ」
2. 「Google Sheets API」を検索
3. 「有効にする」をクリック

---

### エラー2: 「Invalid redirect_uri」

**原因**: リダイレクトURIが正しく設定されていない

**解決策**:
1. Google Cloud Console → 「認証情報」
2. 作成したOAuth クライアント IDを編集
3. 承認済みのリダイレクト URI:
   ```
   http://localhost:5678/rest/oauth2-credential/callback
   ```
4. 保存

---

### エラー3: 「Spreadsheet not found」

**原因**: スプレッドシートIDが間違っている

**解決策**:
1. Google SheetsのURLを再確認
2. `.env`ファイルの`GOOGLE_SHEET_ID`を修正
3. `docker compose down && docker compose up -d`で再起動

---

### エラー4: 「Sheet not found: 日次売上」

**原因**: シート名が一致していない

**解決策**:
1. Google Sheetsでシート名を確認
2. 必ず「日次売上」という名前にする（スペース・全角注意）
3. または、n8nワークフローの「Sync to Google Sheets」ノードでシート名を変更

---

## 📝 Google Sheetsの高度な使い方

### 集計用のシートを追加

**シート2: 月次集計**

```
=QUERY('日次売上'!A:E,
  "SELECT MONTH(A), SUM(E)
   WHERE A IS NOT NULL
   GROUP BY MONTH(A)")
```

### グラフの追加

1. データ範囲を選択
2. 「挿入」→「グラフ」
3. グラフの種類を選択（折れ線グラフ、棒グラフなど）

---

## 🔐 セキュリティのベストプラクティス

### 1. スプレッドシートの共有設定

- **推奨**: 「閲覧権限」を社内メンバーのみに制限
- **非推奨**: 「リンクを知っている全員」での共有

### 2. OAuth認証情報の管理

- クライアントシークレットは`.env`ファイルに保存
- `.env`ファイルを`.gitignore`に追加（Git管理外）

### 3. スコープの最小化

- Google Sheets APIのみを有効化
- 不要なAPIは有効化しない

---

## 📞 サポート

### Google関連のヘルプ

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Sheets API ドキュメント](https://developers.google.com/sheets/api)

### n8n関連のヘルプ

- [n8n Google Sheets Documentation](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlesheets/)

---

**設定完了**: Google Sheetsへの自動同期準備が整いました！
**次のステップ**: クイックスタートガイドに従ってワークフローをインポート
