# Google OAuth2認証情報の取得方法

## 概要
n8nでGoogle Sheetsを使用するには、Google Cloud ConsoleでOAuth2認証情報（Client ID & Client Secret）を取得する必要があります。

---

## 手順

### ステップ1: Google Cloud Consoleにアクセス

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. Googleアカウントでログイン

---

### ステップ2: プロジェクトの作成

#### 2-1. 新規プロジェクト作成
1. 画面上部の**プロジェクト選択**ドロップダウンをクリック
2. 「**新しいプロジェクト**」をクリック
3. プロジェクト情報を入力:
   - **プロジェクト名**: `n8n-automation`（任意）
   - **組織**: なし（個人の場合）
4. 「**作成**」をクリック

#### 2-2. プロジェクトを選択
- 作成したプロジェクトが自動的に選択されます
- 選択されていない場合は、ドロップダウンから選択

---

### ステップ3: Google Sheets APIの有効化

1. 左側メニューから「**APIとサービス**」→「**ライブラリ**」をクリック
2. 検索ボックスに「**Google Sheets API**」と入力
3. 「**Google Sheets API**」をクリック
4. 「**有効にする**」ボタンをクリック

---

### ステップ4: OAuth同意画面の設定

#### 4-1. 同意画面の作成
1. 左側メニューから「**APIとサービス**」→「**OAuth同意画面**」をクリック
2. **User Type**を選択:
   - **外部**を選択（個人利用の場合）
   - 「**作成**」をクリック

#### 4-2. アプリ情報の入力

**1. OAuth同意画面**
- **アプリ名**: `n8n Automation`（任意）
- **ユーザーサポートメール**: 自分のメールアドレス
- **デベロッパーの連絡先情報**: 自分のメールアドレス
- 「**保存して次へ**」をクリック

**2. スコープ**
- 「**保存して次へ**」をクリック（デフォルトのまま）

**3. テストユーザー**
- 「**+ ADD USERS**」をクリック
- 自分のGoogleアカウントのメールアドレスを追加
- 「**保存して次へ**」をクリック

**4. 概要**
- 「**ダッシュボードに戻る**」をクリック

---

### ステップ5: OAuth2認証情報の作成

#### 5-1. 認証情報の作成
1. 左側メニューから「**APIとサービス**」→「**認証情報**」をクリック
2. 上部の「**+ 認証情報を作成**」をクリック
3. 「**OAuth クライアント ID**」を選択

#### 5-2. アプリケーションの種類を選択
- **アプリケーションの種類**: 「**ウェブアプリケーション**」を選択
- **名前**: `n8n Google Sheets`（任意）

#### 5-3. リダイレクトURIの設定
**承認済みのリダイレクト URI**に以下を追加:

```
http://localhost:5678/rest/oauth2-credential/callback
```

**注意事項**:
- n8nのURLが異なる場合は適宜変更
- 例: `https://your-n8n-domain.com/rest/oauth2-credential/callback`
- 複数のURLを追加可能（ローカル + 本番等）

#### 5-4. 作成
- 「**作成**」をクリック

---

### ステップ6: Client IDとClient Secretの取得

#### 6-1. 認証情報の表示
作成が完了すると、ポップアップが表示されます:

```
OAuth クライアントを作成しました

クライアント ID:
123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com

クライアント シークレット:
GOCSPX-abcdefghijklmnopqrstuvwxyz
```

#### 6-2. 情報をコピー
- **クライアント ID**をコピー
- **クライアント シークレット**をコピー

**重要**:
- この情報は安全な場所に保存してください
- 後から確認することも可能です

#### 6-3. 後から確認する方法
1. 「**APIとサービス**」→「**認証情報**」
2. 「OAuth 2.0 クライアント ID」セクションから該当の認証情報をクリック
3. Client IDとClient Secretが表示されます

---

### ステップ7: n8nでの設定

#### 7-1. n8nで認証情報を追加
1. n8nを開く: `http://localhost:5678`
2. 右上の**歯車アイコン**（Settings）をクリック
3. 「**Credentials**」をクリック
4. 「**Add Credential**」をクリック

#### 7-2. Google Sheets OAuth2 APIを選択
1. 検索ボックスに「**Google Sheets**」と入力
2. 「**Google Sheets OAuth2 API**」を選択

#### 7-3. 認証情報を入力

| 項目 | 値 |
|------|-----|
| **Credential Name** | `My Google Sheets`（任意の名前） |
| **Client ID** | Google Cloud Consoleで取得したClient ID |
| **Client Secret** | Google Cloud Consoleで取得したClient Secret |

#### 7-4. OAuth接続
1. 「**Connect my account**」ボタンをクリック
2. Googleのログイン画面が開きます
3. アカウントを選択
4. 「**このアプリは確認されていません**」と表示された場合:
   - 「**詳細**」をクリック
   - 「**○○（安全ではないページ）に移動**」をクリック
5. 権限の許可:
   - 「**Googleドライブのすべてのファイルの表示、編集、作成、削除**」
   - 「**Googleスプレッドシートのすべてのスプレッドシートの参照、編集、作成、削除**」
   - 「**許可**」をクリック

#### 7-5. 接続完了
- n8nの画面に戻ります
- 「**Connected**」と表示されれば成功！
- 「**Save**」をクリック

---

## トラブルシューティング

### エラー1: リダイレクトURIの不一致
**エラーメッセージ**:
```
Error: redirect_uri_mismatch
```

**原因**: Google Cloud ConsoleのリダイレクトURIとn8nのURLが一致していない

**対処法**:
1. n8nの実際のURL（ブラウザのアドレスバー）を確認
2. Google Cloud Consoleの認証情報編集画面で、「承認済みのリダイレクトURI」に正確なURLを追加
3. 例: `http://localhost:5678/rest/oauth2-credential/callback`

### エラー2: アプリが確認されていません
**メッセージ**:
```
このアプリは確認されていません
このアプリはGoogleで確認されていません。よく知っている信頼できるデベロッパーのみに続行してください。
```

**対処法**:
- これは正常です（個人開発アプリのため）
- 「**詳細**」→「**○○（安全ではないページ）に移動**」をクリックして進む
- 本番環境で使用する場合は、Googleの確認プロセスを経ることを推奨

### エラー3: OAuth同意画面で「アクセスがブロックされました」
**原因**: テストユーザーに自分のアカウントが追加されていない

**対処法**:
1. Google Cloud Consoleの「OAuth同意画面」
2. 「テストユーザー」セクション
3. 「+ ADD USERS」で自分のメールアドレスを追加

### エラー4: API有効化エラー
**エラーメッセージ**:
```
Google Sheets API has not been used in project
```

**対処法**:
1. Google Cloud Consoleの「APIとサービス」→「ライブラリ」
2. 「Google Sheets API」を検索
3. 「有効にする」をクリック

---

## セキュリティのベストプラクティス

### 1. 認証情報の管理
- ❌ **Client SecretをGitにコミットしない**
- ✅ 環境変数または秘密管理ツールで管理
- ✅ 定期的にローテーション

### 2. OAuth同意画面
- ✅ 必要最小限のスコープのみを要求
- ✅ プライバシーポリシーURLを設定（本番環境）
- ✅ 利用規約URLを設定（本番環境）

### 3. アクセス制御
- ✅ テストユーザーを適切に管理
- ✅ 不要になった認証情報は削除
- ✅ APIキーの使用状況を定期的に監視

---

## よくある質問（FAQ）

### Q1: Client IDとClient Secretを忘れました
**A**: Google Cloud Consoleの「APIとサービス」→「認証情報」から確認できます。Client Secretは再発行も可能です。

### Q2: 複数のn8nインスタンスで同じ認証情報を使えますか？
**A**: はい、可能です。ただし、各インスタンスのリダイレクトURIをGoogle Cloud Consoleに追加する必要があります。

### Q3: 本番環境で使用する場合は？
**A**: OAuth同意画面を「公開」ステータスにし、Googleの確認プロセスを経ることを推奨します。

### Q4: 無料で使えますか？
**A**: Google Sheets APIは無料で使用できます。ただし、1日のリクエスト数に制限があります（通常利用では問題なし）。

---

## 参考リソース

### 公式ドキュメント
- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [n8n Google Sheets OAuth2](https://docs.n8n.io/integrations/builtin/credentials/google/)

### スコープの詳細
n8nが使用するスコープ:
```
https://www.googleapis.com/auth/spreadsheets
https://www.googleapis.com/auth/drive.file
```

---

## まとめ

✅ **完了チェックリスト**:
- [ ] Google Cloud Consoleでプロジェクト作成
- [ ] Google Sheets API有効化
- [ ] OAuth同意画面設定
- [ ] OAuth2認証情報作成
- [ ] Client IDとClient Secret取得
- [ ] リダイレクトURI設定
- [ ] n8nで認証情報追加
- [ ] OAuth接続完了

これで、n8nからGoogleスプレッドシートを操作する準備が整いました！

---

**作成日**: 2025-10-28
**最終更新**: 2025-10-28
