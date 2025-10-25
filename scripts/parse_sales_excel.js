/**
 * CROSS ROPPONGI売上日報Excel解析スクリプト
 *
 * 入力:
 * - file_name: ファイル名 (例: "20251018CROSSROPPONGI.xlsx")
 * - binary data: Excelファイル本体
 *
 * 出力:
 * - 構造化された売上データJSON
 */

// ==========================================
// ファイル名から日付とシート名を抽出
// ==========================================
const fileName = $input.first().json.file_name;

// ファイル名パターン: yyyymmddCROSSROPPONGI.xxx
const dateMatch = fileName.match(/(\d{4})(\d{2})(\d{2})/);

if (!dateMatch) {
  throw new Error(`ファイル名から日付を抽出できませんでした: ${fileName}`);
}

const year = dateMatch[1];
const month = dateMatch[2];
const day = dateMatch[3];

// シート名は日のみの数値 (例: 18日 → "18")
const targetSheetName = String(parseInt(day));

console.log(`処理対象: ${year}-${month}-${day}, シート名: "${targetSheetName}"`);

// ==========================================
// Excelファイルを読み込み
// ==========================================
const XLSX = require('xlsx');
const binaryData = $input.first().binary.data;
const workbook = XLSX.read(binaryData);

// 利用可能なシート名を確認
const availableSheets = workbook.SheetNames;
console.log('利用可能なシート:', availableSheets.join(', '));

// ターゲットシートが存在するか確認
if (!availableSheets.includes(targetSheetName)) {
  throw new Error(
    `シート "${targetSheetName}" が見つかりません。` +
    `利用可能なシート: ${availableSheets.join(', ')}`
  );
}

const worksheet = workbook.Sheets[targetSheetName];

// ==========================================
// ヘルパー関数: セル値取得
// ==========================================

/**
 * 単一セルの値を取得
 */
function getCellValue(cellAddress) {
  const cell = worksheet[cellAddress];
  if (!cell) return null;
  return cell.v; // セルの値
}

/**
 * 範囲セルの値を取得（結合セルまたは複数セル）
 * 例: P2:R2 → P2, Q2, R2の値を連結または最初の値を取得
 */
function getRangeValue(rangeAddress) {
  const range = XLSX.utils.decode_range(rangeAddress);
  const values = [];

  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const value = getCellValue(cellAddress);
      if (value !== null && value !== undefined && value !== '') {
        values.push(value);
      }
    }
  }

  // 値が1つだけの場合はそのまま返す
  if (values.length === 1) return values[0];

  // 複数の場合は連結（日付の場合は最初の値のみ）
  return values.length > 0 ? values[0] : null;
}

/**
 * 範囲セルから配列を取得（空白を除外）
 * 例: AA5:AA27 → VIP名前のリスト
 */
function getRangeArray(rangeAddress) {
  const range = XLSX.utils.decode_range(rangeAddress);
  const values = [];

  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const value = getCellValue(cellAddress);
      if (value !== null && value !== undefined && value !== '') {
        values.push(value);
      }
    }
  }

  return values;
}

/**
 * 通貨値を数値に変換
 */
function parseCurrency(value) {
  if (value === null || value === undefined) return null;

  // 既に数値の場合
  if (typeof value === 'number') return value;

  // 文字列の場合、カンマと¥を除去
  if (typeof value === 'string') {
    const cleaned = value.replace(/[¥,]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  return null;
}

// ==========================================
// データ抽出
// ==========================================

const extractedData = {
  // メタ情報
  source_file: fileName,
  sheet_name: targetSheetName,
  extracted_at: new Date().toISOString(),

  // 基本情報
  business_date: getRangeValue('P2:R2'), // 営業日
  total_customer_count: getCellValue('O2'), // 総来客数
  male_count: getCellValue('T2'), // 男性
  female_count: getCellValue('U2'), // 女性

  // 売上サマリー
  total_sales: parseCurrency(getRangeValue('K64:M65')), // 総売上
  cash_shortage: parseCurrency(getRangeValue('O64:O65')), // 現金化不足

  // セクション別売上
  section_sales: {
    front: parseCurrency(getCellValue('F5')), // FRONT
    cloak_supplies: parseCurrency(getCellValue('F10')), // CLOAK/備品
    locker: parseCurrency(getCellValue('F14')), // LOCKER
    bar1: parseCurrency(getCellValue('F15')), // BAR1
    bar2: parseCurrency(getCellValue('F16')), // BAR2
    bar3: parseCurrency(getCellValue('F17')), // BAR3
    bar4: parseCurrency(getCellValue('F18')), // BAR4
    vip1: parseCurrency(getCellValue('F32')), // VIP1
    vvip: parseCurrency(getCellValue('F33')), // VVIP
    party: parseCurrency(getCellValue('F48'))  // PARTY
  },

  // 未収金
  receivables: {
    uncollected: parseCurrency(getRangeValue('J61:K61')), // 未収
    collected: parseCurrency(getRangeValue('Q61:R61'))    // 未収回収
  },

  // VIP詳細
  vip_details: {
    vip_customers: [],   // VIP顧客リスト
    vvip_customers: []   // VVIP顧客リスト
  }
};

// VIP顧客データを構造化
const vipNames = getRangeArray('AA5:AA27');
const vipAmounts = getRangeArray('AB5:AB27');

for (let i = 0; i < Math.min(vipNames.length, vipAmounts.length); i++) {
  if (vipNames[i] && vipAmounts[i]) {
    extractedData.vip_details.vip_customers.push({
      name: vipNames[i],
      amount: parseCurrency(vipAmounts[i])
    });
  }
}

// VVIP顧客データを構造化
const vvipNames = getRangeArray('AA29:AA52');
const vvipAmounts = getRangeArray('AB29:AB52');

for (let i = 0; i < Math.min(vvipNames.length, vvipAmounts.length); i++) {
  if (vvipNames[i] && vvipAmounts[i]) {
    extractedData.vip_details.vvip_customers.push({
      name: vvipNames[i],
      amount: parseCurrency(vvipAmounts[i])
    });
  }
}

// ==========================================
// データ検証
// ==========================================

const validation = {
  warnings: [],
  errors: []
};

// 来客数の整合性チェック
if (extractedData.male_count && extractedData.female_count && extractedData.total_customer_count) {
  const expectedTotal = extractedData.male_count + extractedData.female_count;
  if (expectedTotal !== extractedData.total_customer_count) {
    validation.warnings.push(
      `来客数不一致: 男性(${extractedData.male_count}) + 女性(${extractedData.female_count}) = ${expectedTotal} ` +
      `≠ 総来客数(${extractedData.total_customer_count})`
    );
  }
}

// 必須フィールドチェック
if (!extractedData.business_date) {
  validation.errors.push('営業日が取得できませんでした (P2:R2)');
}
if (!extractedData.total_sales) {
  validation.warnings.push('総売上が取得できませんでした (K64:M65)');
}

extractedData.validation = validation;

// ==========================================
// 日付の正規化
// ==========================================

// business_dateをYYYY-MM-DD形式に変換
if (extractedData.business_date) {
  // Excelの日付シリアル値の場合
  if (typeof extractedData.business_date === 'number') {
    const date = XLSX.SSF.parse_date_code(extractedData.business_date);
    extractedData.business_date = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }
  // 文字列の場合はそのまま（後でパース）
}

// ファイル名から取得した日付をフォールバックとして使用
if (!extractedData.business_date) {
  extractedData.business_date = `${year}-${month}-${day}`;
  validation.warnings.push('営業日をファイル名から推測しました');
}

// ==========================================
// 出力
// ==========================================

console.log('データ抽出完了:', JSON.stringify(extractedData, null, 2));

return [{
  json: extractedData
}];
