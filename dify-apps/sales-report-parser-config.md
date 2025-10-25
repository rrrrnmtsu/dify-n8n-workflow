# Sales Report Parser - Dify アプリケーション設定

## 📋 アプリケーション概要

**目的**: 売上日報PDF/Excelファイルから構造化データを抽出

**タイプ**: Agent (エージェント型)

**入力**: PDFファイルまたはテキスト

**出力**: JSON形式の構造化データ

---

## 🎯 抽出すべきデータ

### 必須フィールド

1. **営業日** (`business_date`)
   - 形式: YYYY-MM-DD
   - 例: "2025-10-18"

2. **来客数** (`customer_count`)
   - 男性 (`male_count`): 数値
   - 女性 (`female_count`): 数値
   - 合計 (`total_count`): 数値

3. **売上金額** (`sales`)
   - セクションA/フロア (`section_a_sales`): 数値
   - セクションB/VIP (`section_b_sales`): 数値
   - セクションC/PARTY (`section_c_sales`): 数値
   - その他 (`other_sales`): 数値
   - 総売上 (`total_sales`): 数値

---

## 🤖 プロンプト設計

### システムプロンプト

```
あなたは売上日報から情報を抽出する専門AIです。

# 役割
PDFまたはExcelファイルから売上データを正確に抽出し、構造化されたJSONで返します。

# 抽出ルール

1. **営業日の抽出**
   - パターン: YYYY年MM月DD日、YYYYMMDD
   - 見つからない場合: ファイル名から推測
   - 形式: YYYY-MM-DD

2. **来客数の抽出**
   - キーワード: "男性", "女性", "人数"
   - 合計は自動計算を確認

3. **売上金額の抽出**
   - キーワード: "総売上", "営業合計", "フロア", "VIP", "PARTY"
   - カンマ区切りの数値を正規化
   - ¥マークを除去

4. **データ検証**
   - 日付の妥当性チェック
   - 金額の負数チェック
   - 必須フィールドの存在確認

# 出力形式

必ずJSON形式で出力してください：

```json
{
  "business_date": "YYYY-MM-DD",
  "male_count": 数値,
  "female_count": 数値,
  "total_customer_count": 数値,
  "section_a_sales": 数値,
  "section_b_sales": 数値,
  "section_c_sales": 数値,
  "other_sales": 数値,
  "total_sales": 数値,
  "confidence": "high|medium|low",
  "notes": "抽出時の注意事項"
}
```

# エラーハンドリング

- データが見つからない場合: null を返す
- 信頼度が低い場合: "confidence": "low" を設定
- 異常値を検出した場合: notes に記載
```

### ユーザープロンプト（例）

```
以下のテキストから売上データを抽出してください：

{input_text}

---

ファイル名: {file_name}
ファイル種類: {file_type}
```

---

## 🔧 Dify設定手順

### 1. アプリケーション作成

1. Dify コンソール (http://localhost:3000) にアクセス
2. 「アプリを作成」をクリック
3. 「Agent」を選択
4. アプリ名: `Sales Report Parser`
5. アイコン: 📊

### 2. プロンプト設定

1. 「プロンプト」タブを開く
2. 上記のシステムプロンプトを貼り付け
3. 入力変数を設定:
   - `input_text` (string, required)
   - `file_name` (string, optional)
   - `file_type` (string, optional)

### 3. モデル選択

**推奨モデル**: GPT-4o または Claude 3.5 Sonnet

**理由**:
- 高精度なデータ抽出
- JSON形式の出力が安定
- 複雑な表構造の理解

**設定**:
- Temperature: 0.1 (低い = より正確)
- Max Tokens: 1000
- Response Format: JSON

### 4. 出力設定

1. 「出力」タブを開く
2. Output Type: JSON
3. JSONスキーマを定義（上記の形式）

### 5. API公開

1. 「API」タブを開く
2. 「APIを公開」をクリック
3. API Key を生成
4. API Endpoint をコピー

---

## 🧪 テスト方法

### テストケース1: 正常系

**入力**:
```
CROSS ROPPONGI 2025年10月18日(土)
男性 75 女性 51
総売上 ¥1,854,200
フロア ¥1,246,600
VIP ¥989,400
PARTY ¥478,000
```

**期待される出力**:
```json
{
  "business_date": "2025-10-18",
  "male_count": 75,
  "female_count": 51,
  "total_customer_count": 126,
  "section_a_sales": 1246600,
  "section_b_sales": 989400,
  "section_c_sales": 478000,
  "other_sales": null,
  "total_sales": 1854200,
  "confidence": "high",
  "notes": null
}
```

### テストケース2: データ不足

**入力**:
```
営業日不明
売上データなし
```

**期待される出力**:
```json
{
  "business_date": null,
  "male_count": null,
  "female_count": null,
  "total_customer_count": null,
  "section_a_sales": null,
  "section_b_sales": null,
  "section_c_sales": null,
  "other_sales": null,
  "total_sales": null,
  "confidence": "low",
  "notes": "営業日と売上データが見つかりませんでした"
}
```

---

## 🔗 n8n統合

### HTTP Request Node設定

**Method**: POST

**URL**: `http://dify-api:5001/v1/chat-messages`

**Headers**:
```json
{
  "Authorization": "Bearer {DIFY_API_KEY}",
  "Content-Type": "application/json"
}
```

**Body**:
```json
{
  "inputs": {
    "input_text": "{{ $json.pdf_text }}",
    "file_name": "{{ $json.file_name }}",
    "file_type": "{{ $json.file_type }}"
  },
  "response_mode": "blocking",
  "user": "n8n-automation"
}
```

---

## 📊 精度向上のヒント

### 1. Few-Shot Learning

プロンプトに実例を追加：

```
例1:
入力: "2025年10月18日 男性75名 女性51名 総売上¥1,854,200"
出力: {"business_date": "2025-10-18", "male_count": 75, ...}

例2:
入力: "20251019 男性80 女性45 売上1,920,500"
出力: {"business_date": "2025-10-19", "male_count": 80, ...}
```

### 2. データ検証ルール

```
- 営業日は過去1年以内
- 来客数は0-500の範囲
- 売上金額は0-10,000,000の範囲
- 総売上 = セクション売上の合計
```

### 3. 信頼度スコア

```
high: 全ての必須フィールドが抽出され、検証をパス
medium: 一部フィールドが欠損または推測
low: 多くのフィールドが欠損またはエラー
```

---

## 🛠️ トラブルシューティング

### 問題1: JSON形式が不正

**原因**: モデルがMarkdown形式で返している

**解決策**:
- Response Format を JSON に設定
- プロンプトで「必ずJSON形式で」を強調

### 問題2: 数値が文字列で返される

**原因**: カンマ区切りが除去されていない

**解決策**:
- プロンプトに「カンマを除去して数値で返す」を追加

### 問題3: 抽出精度が低い

**原因**: モデルの選択ミス

**解決策**:
- GPT-3.5 → GPT-4o にアップグレード
- Temperature を 0 に近づける

---

## 📝 次のステップ

1. ✅ このドキュメントを参照してDifyアプリ作成
2. ⏳ API Key を `.env` に追加
3. ⏳ n8n ワークフローに統合
4. ⏳ 実ファイルでテスト
5. ⏳ エラーハンドリング実装
