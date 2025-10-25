# 🚀 クイックスタート: Excel → Google Sheets 自動同期

**最終更新**: 2025-10-21
**対象**: CROSS ROPPONGI 売上日報の自動集計システム
**AI API**: 不要（Excelから直接データ取得）

---

## ⚡ 30分セットアップ

### ステップ1: Google Sheets認証設定（15分）

**📚 詳細ガイド**: [docs/google-sheets-setup.md](docs/google-sheets-setup.md)

**クイック手順**:

1. **Google Cloud Project作成**
   - https://console.cloud.google.com/
   - 新しいプロジェクト → `n8n-sales-report`

2. **Google Sheets API有効化**
   - APIとサービス → ライブラリ → 「Google Sheets API」→ 有効化

3. **OAuth認証情報作成**
   - 認証情報 → OAuth クライアント ID → ウェブアプリケーション
   - リダイレクトURI: `http://localhost:5678/rest/oauth2-credential/callback`
   - **クライアントID**と**クライアントシークレット**をコピー

4. **n8nで認証**
   - http://localhost:5678 → Credentials → Google Sheets OAuth2 API
   - クライアント情報を入力 → Connect my account

5. **スプレッドシート作成**
   - https://sheets.google.com/ → 新規作成
   - シート名: 「日次売上」
   - ヘッダー行: 営業日 | 総来客数 | 男性 | 女性 | 総売上 | ...
   - スプレッドシートIDをコピー

---

### ステップ2: 環境変数設定（2分）

`.env`ファイルを編集:

```bash
cd /Users/remma/dify-n8n-workflow
nano .env
```

以下を追加:

```bash
# Google Sheets設定
GOOGLE_SHEET_ID=1ABCdefGHIjklMNOpqrSTUvwxYZ123456789
GOOGLE_SHEET_URL=https://docs.google.com/spreadsheets/d/1ABCdefGHIjklMNOpqrSTUvwxYZ123456789/edit
```

保存: `Ctrl+O` → `Enter` → `Ctrl+X`

**Docker再起動**:

```bash
docker compose down
docker compose up -d
```

---

### ステップ3: n8nワークフローインポート（3分）

1. **n8nにアクセス**: http://localhost:5678

2. **ワークフローをインポート**:
   - 左上「☰」→ 「Workflows」→ 「Import from File」
   - ファイル選択:
     ```
     /Users/remma/dify-n8n-workflow/examples/sales-report-workflows/04-excel-to-sheets-sync.json
     ```
   - 「Import」をクリック

3. **認証情報設定**:

   **Telegram Bot**:
   - 「Send Success Message」ノード → Credentials → Create New
   - Access Token: `8401202439:AAHwPAMl26dYPi7J6N2LV_o32VKb2T0BtbI`
   - Save

   **Google Sheets**:
   - 「Sync to Google Sheets」ノード → Credentials
   - 先ほど作成した「Google Sheets OAuth」を選択

4. **Document ID設定**:
   - 「Sync to Google Sheets」ノード
   - Document ID: `{{ $env.GOOGLE_SHEET_ID }}` (既に設定済み)
   - Sheet Name: `日次売上`

5. **保存・有効化**:
   - 右上「Save」
   - 右上トグルスイッチをON（Active）

---

### ステップ4: テスト（10分）

#### テストA: 実Excelファイルでのテスト

1. **Telegramグループに移動**: 「CROSS ROPPONNGI 経理 日報」

2. **Excelファイルを送信**:
   - ファイル名: `20251018CROSSROPPONGI.xlsx` 形式
   - 月次Excelファイルを送信

3. **30秒以内に自動処理**:
   - n8nがファイルを検出
   - 該当日のシートからデータ抽出
   - Google Sheetsに同期
   - Telegram通知

4. **結果確認**:

   **Telegram通知**:
   ```
   ✅ Google Sheetsに同期完了！

   📊 売上データ
   📅 営業日: 2025-10-18
   👥 来客数: 126名
   　└ 男性: 75名
   　└ 女性: 51名
   💰 総売上: ¥1,854,200

   📋 Google Sheets: https://docs.google.com/...
   ```

   **Google Sheets確認**:
   - スプレッドシートを開く
   - 「日次売上」シートに新しい行が追加
   - データが正しく入力されているか確認

---

## ✅ 完了チェックリスト

- [ ] Google Cloud Projectを作成
- [ ] Google Sheets APIを有効化
- [ ] OAuth認証情報を作成
- [ ] n8nでGoogle Sheets認証を設定
- [ ] Google Sheetsでスプレッドシート作成
- [ ] `.env`にスプレッドシートIDを追加
- [ ] Docker環境を再起動
- [ ] n8nでワークフローをインポート
- [ ] Telegram/Google Sheets認証情報を設定
- [ ] ワークフローを保存・有効化
- [ ] テストExcelファイルを送信
- [ ] Google Sheetsにデータが追加されたか確認

---

## 📊 処理フロー（自動実行）

```
1. 30秒ごとにTelegramをチェック
   ↓
2. Excelファイル（yyyymmddCROSSROPPONGI.xlsx）を検出
   ↓
3. ファイルをダウンロード
   ↓
4. ファイル名から日付を抽出（例: 20251018 → "18"）
   ↓
5. シート"18"からデータを取得
   - P2:R2 = 営業日
   - O2 = 総来客数
   - T2 = 男性、U2 = 女性
   - K64:M65 = 総売上
   - その他20項目のセル
   ↓
6. Google Sheetsに同期
   - 営業日が一致する行があれば更新
   - なければ新規行として追加
   ↓
7. Telegramに完了通知
```

**処理時間**: 1ファイルあたり **5〜10秒**

---

## 🎯 データ取得セル一覧

| データ項目 | セル位置 | 例 |
|-----------|---------|-----|
| 営業日 | P2:R2 | 2025-10-18 |
| 総来客数 | O2 | 126 |
| 男性客数 | T2 | 75 |
| 女性客数 | U2 | 51 |
| 総売上 | K64:M65 | 1,854,200 |
| 現金化不足 | O64:O65 | 0 |
| FRONT | F5 | 500,000 |
| CLOAK/備品 | F10 | 50,000 |
| LOCKER | F14 | 30,000 |
| BAR1 | F15 | 200,000 |
| BAR2 | F16 | 150,000 |
| BAR3 | F17 | 180,000 |
| BAR4 | F18 | 140,000 |
| VIP1 | F32 | 300,000 |
| VVIP | F33 | 200,000 |
| PARTY | F48 | 100,000 |
| 未収 | J61:K61 | 50,000 |
| 未収回収 | Q61:R61 | 30,000 |

**VIP詳細** (オプション):
- VIP名前: AA5:AA27
- VIP金額: AB5:AB27
- VVIP名前: AA29:AA52
- VVIP金額: AB29:AB52

---

## 🔍 トラブルシューティング

### エラー1: シートが見つからない

**メッセージ**:
```
シート "18" が見つかりません
利用可能なシート: 1, 2, 3, ...
```

**原因**: Excelファイルのシート名が数値ではない

**解決策**:
1. Excelファイルを開く
2. シート名を確認（例: "10月18日" → "18"に変更）
3. または、ファイル名のパターンを確認

---

### エラー2: Google Sheets認証エラー

**メッセージ**:
```
The caller does not have permission
```

**原因**: Google Sheets APIが有効化されていない

**解決策**:
1. Google Cloud Console → 「APIとサービス」→「ライブラリ」
2. 「Google Sheets API」を検索 → 「有効にする」

---

### エラー3: セル値がnull

**症状**: Google Sheetsに一部のデータが空白

**原因**: Excelのセル位置が異なる

**解決策**:
1. 実際のExcelファイルでセル位置を確認
2. `scripts/parse_sales_excel.js`のセル位置を修正
3. または、`config/excel-cell-mapping.json`を参照

---

### エラー4: 日付形式エラー

**症状**: 営業日が正しく表示されない

**原因**: Excelの日付がシリアル値

**解決策**:
- スクリプトが自動的にYYYY-MM-DD形式に変換
- 変換されない場合は手動で確認

---

## 💰 コスト

### 月間運用コスト

**完全無料**:
- ❌ AI API料金: **$0**（AI不使用）
- ❌ Google Sheets API: **無料枠内**（1日数回のアクセス）
- ❌ Docker インフラ: **$0**（ローカル環境）

**合計**: **$0/月**

---

## 📈 Google Sheetsでの分析例

### 月次合計の計算

**シート2: 月次集計**を作成:

```
A列: 月
B列: 総売上
C列: 来客数平均

=QUERY('日次売上'!A:E,
  "SELECT MONTH(A), SUM(E), AVG(B)
   WHERE A IS NOT NULL
   GROUP BY MONTH(A)
   ORDER BY MONTH(A)")
```

### グラフ作成

1. データ範囲を選択
2. 「挿入」→「グラフ」
3. グラフの種類: 折れ線グラフ

### ピボットテーブル

1. データ範囲を選択
2. 「挿入」→「ピボットテーブル」
3. 行: 営業日
4. 値: 総売上（合計）

---

## 📚 ドキュメント

### セットアップガイド

- **[docs/google-sheets-setup.md](docs/google-sheets-setup.md)** - Google Sheets認証詳細
- **[config/excel-cell-mapping.json](config/excel-cell-mapping.json)** - セル位置定義

### 技術ドキュメント

- **[scripts/parse_sales_excel.js](scripts/parse_sales_excel.js)** - Excel解析ロジック
- **[SESSION_LOG.md](SESSION_LOG.md)** - セッション履歴

---

## 🎓 次のステップ

### 完了したら

1. **実運用開始**
   - 毎日のExcelファイルを自動処理
   - Google Sheetsにデータ蓄積

2. **分析ダッシュボード構築**
   - Google SheetsでグラフとピボットテーブルPHOT作成
   - Looker Studio（旧Data Studio）での可視化

3. **アラート設定**
   - 売上が一定額以下の場合に通知
   - 来客数の異常値検出

---

## 🆘 サポート

### 問題が解決しない場合

1. **Docker全サービスの状態確認**:
   ```bash
   docker compose ps
   ```

2. **ログ確認**:
   ```bash
   docker compose logs n8n --tail 50
   ```

3. **環境変数確認**:
   ```bash
   docker compose exec n8n env | grep GOOGLE
   ```

---

**セットアップ完了**: これで自動売上報告システムが稼働中です！
**所要時間**: 30分
**月額コスト**: **$0**
