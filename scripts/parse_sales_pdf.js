/**
 * Sales Report PDF Parser - n8n Code Node実装
 *
 * OpenAI APIまたはAnthropic APIを使用してPDF/Excelから売上データを抽出
 *
 * 必要な環境変数:
 * - OPENAI_API_KEY または ANTHROPIC_API_KEY
 *
 * 入力データ (items[0].json):
 * - pdf_text: 抽出されたテキスト
 * - file_name: ファイル名
 * - file_type: ファイルタイプ (pdf/excel)
 */

// ==========================================
// システムプロンプト
// ==========================================
const SYSTEM_PROMPT = `あなたは売上日報から情報を抽出する専門AIです。

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

必ずJSON形式のみで出力してください（マークダウンやコードブロックは不要）：

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

# エラーハンドリング

- データが見つからない場合: null を返す
- 信頼度が低い場合: "confidence": "low" を設定
- 異常値を検出した場合: notes に記載`;

// ==========================================
// メイン処理
// ==========================================

// 入力データ取得
const inputData = items[0].json;
const pdfText = inputData.pdf_text || inputData.text || '';
const fileName = inputData.file_name || 'unknown';
const fileType = inputData.file_type || 'pdf';

// ユーザープロンプト作成
const userPrompt = `以下のテキストから売上データを抽出してください：

${pdfText}

---

ファイル名: ${fileName}
ファイル種類: ${fileType}`;

// ==========================================
// API選択 (OpenAI優先、なければAnthropic)
// ==========================================

const openaiKey = process.env.OPENAI_API_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;

let result;

if (openaiKey) {
  // OpenAI API使用
  console.log('Using OpenAI API...');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API Error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  // JSON解析
  result = JSON.parse(content);

} else if (anthropicKey) {
  // Anthropic API使用
  console.log('Using Anthropic API...');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      temperature: 0.1,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: userPrompt }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Anthropic API Error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const content = data.content[0].text;

  // JSON解析（マークダウンブロックを除去）
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }
  result = JSON.parse(jsonMatch[0]);

} else {
  throw new Error('No API key found. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY');
}

// ==========================================
// データ検証
// ==========================================

// 日付の妥当性チェック
if (result.business_date) {
  const date = new Date(result.business_date);
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  if (date < oneYearAgo || date > now) {
    result.notes = (result.notes || '') + ' 営業日が通常の範囲外です。';
    result.confidence = 'low';
  }
}

// 来客数の合計チェック
if (result.male_count !== null && result.female_count !== null) {
  const expectedTotal = (result.male_count || 0) + (result.female_count || 0);
  if (result.total_customer_count !== expectedTotal) {
    result.total_customer_count = expectedTotal; // 自動修正
  }
}

// 売上合計チェック
const sectionTotal =
  (result.section_a_sales || 0) +
  (result.section_b_sales || 0) +
  (result.section_c_sales || 0) +
  (result.other_sales || 0);

if (result.total_sales && Math.abs(result.total_sales - sectionTotal) > 100) {
  result.notes = (result.notes || '') + ` 総売上(¥${result.total_sales})とセクション合計(¥${sectionTotal})に差異があります。`;
}

// ==========================================
// 出力
// ==========================================

// 元のデータに抽出結果を追加
return [{
  json: {
    ...inputData,
    parsed_data: result,
    api_used: openaiKey ? 'openai' : 'anthropic',
    parsed_at: new Date().toISOString()
  }
}];
