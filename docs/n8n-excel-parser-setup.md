# n8n Excel Parser 設定ガイド

## 概要

n8nのCode NodeではXLSXモジュールが利用できないため、専用のPython Flask APIサービス(excel-parser)を使用してExcelファイルを解析します。

## アーキテクチャ

```
Telegram Bot
    ↓ (Excelファイル)
n8n: Download Excel
    ↓ (バイナリデータ)
n8n: HTTP Request → excel-parser:5000/parse
    ↓ (JSON)
n8n: Sync to Google Sheets
```

---

## 1. Excel Parserサービスの起動確認

### サービスが起動しているか確認

```bash
docker ps | grep excel-parser
```

**期待される出力:**
```
excel-parser   Up 2 minutes   0.0.0.0:5000->5000/tcp
```

### ヘルスチェック

```bash
curl http://localhost:5000/health
```

**期待される出力:**
```json
{"status":"ok","service":"excel-parser"}
```

---

## 2. n8nワークフローの修正

### 削除するノード

- ❌ **Read Excel File** (存在しない場合はスキップ)
- ❌ **Parse Sales Data** (Code Node - Excel ParserがJSON返すため不要)

### 追加するノード

#### HTTP Request ノード

**Download Excel**の後に追加:

```
名前: Parse Excel via API
```

**設定:**

| 項目 | 値 |
|------|-----|
| **Method** | POST |
| **URL** | `http://excel-parser:5000/parse` |
| **Authentication** | None |
| **Send Body** | ✓ (チェック) |
| **Body Content Type** | Multipart Form Data |

**Body Parameters:**

| Name | Parameter Type | Value |
|------|----------------|-------|
| `file` | n8n Binary File | `data` |

**Options:**

| 項目 | 値 |
|------|-----|
| **Response Format** | JSON |

---

## 3. ノード接続の更新

### 修正前

```
Download Excel → Read Excel File → Parse Sales Data → Sync to Google Sheets
```

### 修正後

```
Download Excel → Parse Excel via API → Sync to Google Sheets
```

---

## 4. Sync to Google Sheetsノードの更新

Parse Sales Dataノードを削除したため、データ構造が変わります。

### 列マッピングの更新

以下のフィールドは**Parse Excel via API**が直接出力します:

| Google Sheetsカラム | n8nフィールド |
|-------------------|-------------|
| 営業日 | `{{ $json.business_date }}` |
| 総来客数 | `{{ $json.total_customer_count }}` |
| 男性 | `{{ $json.male_count }}` |
| 女性 | `{{ $json.female_count }}` |
| 総売上 | `{{ $json.total_sales }}` |
| 現金化不足 | `{{ $json.cash_shortage }}` |
| FRONT売上 | `{{ $json.section_sales.front }}` |
| CLOAK/備品売上 | `{{ $json.section_sales.cloak_supplies }}` |
| LOCKER売上 | `{{ $json.section_sales.locker }}` |
| BAR1売上 | `{{ $json.section_sales.bar1 }}` |
| BAR2売上 | `{{ $json.section_sales.bar2 }}` |
| BAR3売上 | `{{ $json.section_sales.bar3 }}` |
| BAR4売上 | `{{ $json.section_sales.bar4 }}` |
| VIP1売上 | `{{ $json.section_sales.vip1 }}` |
| VVIP売上 | `{{ $json.section_sales.vvip }}` |
| PARTY売上 | `{{ $json.section_sales.party }}` |
| 未収金 | `{{ $json.receivables.uncollected }}` |
| 未収回収 | `{{ $json.receivables.collected }}` |

### VIP顧客データ(配列)

VIP/VVIP顧客データは配列形式で返されます:

```json
{
  "vip_details": {
    "vip_customers": [
      {"name": "田中太郎", "amount": 50000},
      {"name": "佐藤花子", "amount": 30000}
    ],
    "vvip_customers": [
      {"name": "山田太郎", "amount": 100000}
    ]
  }
}
```

**Google Sheetsへの格納方法:**

- 別シート「VIP詳細」を作成
- 配列を展開して行ごとに格納

または

- JSON文字列として1セルに格納: `{{ JSON.stringify($json.vip_details) }}`

---

## 5. テスト手順

### 5.1. Excel Parserの単体テスト

サンプルExcelファイルで直接APIをテスト:

```bash
curl -X POST http://localhost:5000/parse \
  -F "file=@/path/to/20241018CROSSROPPONGI.xlsx" \
  | jq
```

**期待される出力:**
```json
{
  "source_file": "20241018CROSSROPPONGI.xlsx",
  "sheet_name": "18",
  "business_date": "2024-10-18",
  "total_customer_count": 150,
  "total_sales": 1234567,
  ...
}
```

### 5.2. n8nワークフローのテスト

1. **Telegramグループ**に実際のExcelファイルを送信
2. **n8nワークフロー**を手動実行 (Execute Workflow)
3. **Parse Excel via API**ノードの出力を確認
4. **Google Sheets**に正しくデータが同期されたか確認

---

## 6. トラブルシューティング

### エラー: "Connection refused" (excel-parserに接続できない)

**原因:** excel-parserサービスが起動していない

**解決策:**
```bash
cd /Users/remma/dify-n8n-workflow
docker compose up -d excel-parser
docker logs excel-parser
```

### エラー: "Sheet 'XX' not found"

**原因:** Excelファイルに該当する日付のシートが存在しない

**確認:**
```bash
# ファイル名: 20241018CROSSROPPONGI.xlsx
# 期待されるシート名: "18"
```

ファイル名の日付部分(YYYYMMDD)から日(DD)を抽出し、シート名として使用します。

### エラー: "Cannot extract date from filename"

**原因:** ファイル名がyyyymmddCROSSROPPONGI.xxxの形式ではない

**解決策:** ファイル名を正しい形式に修正

---

## 7. データ検証

Excel Parserは自動的にデータ検証を行います:

### 検証項目

1. **来客数の整合性**
   - 男性 + 女性 = 総来客数
   - 不一致の場合は`warnings`に記録

2. **必須フィールド**
   - 営業日が取得できない → `errors`
   - 総売上が取得できない → `warnings`

### 検証結果の確認

```json
{
  "validation": {
    "warnings": [
      "来客数不一致: 男性(80) + 女性(65) = 145 ≠ 総来客数(150)"
    ],
    "errors": []
  }
}
```

`errors`が空でない場合、データ不完全なのでGoogle Sheetsへの同期を停止する条件分岐を追加することを推奨。

---

## 8. パフォーマンス

- **処理時間**: 1ファイルあたり約1-3秒
- **同時処理**: gunicornワーカー2つで並列処理可能
- **メモリ使用量**: 約100-200MB

---

## 9. セキュリティ考慮事項

### 現在の設定(開発環境)

- ✅ 内部ネットワーク(workflow_network)のみアクセス可能
- ✅ 外部からのアクセス不可(docker-composeでポート5000は公開していない)
- ❌ 認証なし(n8nからの内部通信のみ想定)

### 本番環境での推奨事項

1. **APIキー認証**の追加
2. **ファイルサイズ制限** (現在制限なし)
3. **レート制限** (DDoS対策)

---

## 10. まとめ

この構成により:

- ✅ n8nのCode Node制約を回避
- ✅ Excelファイルを確実に解析
- ✅ 構造化されたJSONデータをGoogle Sheetsに同期
- ✅ データ検証を自動実行
- ✅ 保守性の高いマイクロサービスアーキテクチャ

次のステップ: n8nワークフローを更新して実際のExcelファイルでテストしてください。
