/**
 * データ抽出関数
 * Excelシートから必要なデータを抽出
 */

/**
 * シートからデータを抽出
 */
function extractDataFromSheet(sheet, sheetName, fileName) {
  // ファイル名から年月を抽出
  const match = fileName.match(/^(\d{4})(\d{2})CROSSROPPONGI\.xlsx$/);
  const year = match ? match[1] : new Date().getFullYear();
  const month = match ? match[2] : String(new Date().getMonth() + 1).padStart(2, '0');
  const day = String(parseInt(sheetName)).padStart(2, '0');
  const businessDate = `${year}-${month}-${day}`;

  return {
    businessDate: businessDate,
    basicData: extractBasicData(sheet, businessDate),
    paymentMethods: extractPaymentMethods(sheet, businessDate),
    vipList: extractVIPList(sheet, businessDate),
    vvipList: extractVVIPList(sheet, businessDate),
    uncollectedList: extractUncollectedList(sheet, businessDate),
    collectedList: extractCollectedList(sheet, businessDate)
  };
}

/**
 * 基本データを抽出
 */
function extractBasicData(sheet, businessDate) {
  return {
    business_date: businessDate,
    total_customer_count: getCellValue(sheet, 'O2'),
    male_count: getCellValue(sheet, 'T2'),
    female_count: getCellValue(sheet, 'U2'),
    total_sales: parseCurrency(getRangeValue(sheet, 'K64:M65')),
    cash_shortage: parseCurrency(getRangeValue(sheet, 'O64:O65')),
    section_sales: {
      front: parseCurrency(getCellValue(sheet, 'F5')),
      cloak_supplies: parseCurrency(getCellValue(sheet, 'F10')),
      locker: parseCurrency(getCellValue(sheet, 'F14')),
      bar1: parseCurrency(getCellValue(sheet, 'F15')),
      bar2: parseCurrency(getCellValue(sheet, 'F16')),
      bar3: parseCurrency(getCellValue(sheet, 'F17')),
      bar4: parseCurrency(getCellValue(sheet, 'F18')),
      vip1: parseCurrency(getCellValue(sheet, 'F32')),
      vvip: parseCurrency(getCellValue(sheet, 'F33')),
      party: parseCurrency(getCellValue(sheet, 'F48'))
    },
    receivables: {
      uncollected: parseCurrency(getRangeValue(sheet, 'J61:K61')),
      collected: parseCurrency(getRangeValue(sheet, 'Q61:R61'))
    },
    vip_details: {
      vip_customers: [],
      vvip_customers: []
    }
  };
}

/**
 * 決済別データを抽出
 */
function extractPaymentMethods(sheet, businessDate) {
  const areas = [
    { name: 'FRONT', row: 5 },
    { name: 'CLOAK', row: 10 },
    { name: 'LOCKER', row: 14 },
    { name: 'BAR1', row: 15 },
    { name: 'BAR2', row: 16 },
    { name: 'BAR3', row: 17 },
    { name: 'BAR4', row: 18 },
    { name: 'VIP', row: 32 },
    { name: 'VVIP', row: 33 },
    { name: 'PARTY', row: 48 }
  ];

  const result = [];

  areas.forEach(area => {
    result.push({
      unique_key: `${businessDate}_${area.name}`,
      business_date: businessDate,
      area: area.name,
      cash: parseCurrency(getCellValue(sheet, `P${area.row}`)),
      credit: parseCurrency(getCellValue(sheet, `G${area.row}`)),
      quicpay: parseCurrency(getCellValue(sheet, `H${area.row}`)),
      airpay_qr: parseCurrency(getCellValue(sheet, `I${area.row}`)),
      zentoshin: parseCurrency(getCellValue(sheet, `J${area.row}`)),
      jppoint: parseCurrency(getCellValue(sheet, `M${area.row}`)),
      receivable: parseCurrency(getCellValue(sheet, `N${area.row}`))
    });
  });

  return result;
}

/**
 * VIPリストを抽出
 */
function extractVIPList(sheet, businessDate) {
  return extractCustomerList(sheet, businessDate, 'AA5:AA27', 'AB5:AB27');
}

/**
 * VVIPリストを抽出
 */
function extractVVIPList(sheet, businessDate) {
  return extractCustomerList(sheet, businessDate, 'AA29:AA52', 'AB29:AB52');
}

/**
 * 未収リストを抽出
 */
function extractUncollectedList(sheet, businessDate) {
  return extractCustomerListWithPerson(sheet, businessDate, 'H54:I60', 'J54:J60', 'K54:K60');
}

/**
 * 未収回収リストを抽出
 */
function extractCollectedList(sheet, businessDate) {
  return extractCustomerListWithPerson(sheet, businessDate, 'O54:P60', 'Q54:Q60', 'R54:R60');
}

/**
 * 顧客リストを抽出（VIP/VVIP用）
 */
function extractCustomerList(sheet, businessDate, nameRange, amountRange) {
  const names = getRangeValues(sheet, nameRange);
  const amounts = getRangeValues(sheet, amountRange);

  const result = [];

  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const amount = amounts[i];

    if (name && amount) {
      result.push({
        unique_key: `${businessDate}_${name}`,
        business_date: businessDate,
        customer_name: String(name),
        amount: parseCurrency(amount)
      });
    }
  }

  return result;
}

/**
 * 顧客リストを抽出（担当者付き・未収/回収用）
 */
function extractCustomerListWithPerson(sheet, businessDate, nameRange, amountRange, personRange) {
  const names = getRangeValues(sheet, nameRange);
  const amounts = getRangeValues(sheet, amountRange);
  const persons = getRangeValues(sheet, personRange);

  const result = [];

  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const amount = amounts[i];
    const person = persons[i] || '';

    if (name && amount) {
      result.push({
        unique_key: `${businessDate}_${name}`,
        business_date: businessDate,
        customer_name: String(name),
        amount: parseCurrency(amount),
        person_in_charge: String(person)
      });
    }
  }

  return result;
}

// ========================================
// ヘルパー関数
// ========================================

/**
 * 単一セルの値を取得
 */
function getCellValue(sheet, cellAddress) {
  try {
    return sheet.getRange(cellAddress).getValue();
  } catch (error) {
    Logger.log(`セル取得エラー (${cellAddress}): ${error.message}`);
    return null;
  }
}

/**
 * 範囲から最初の非空白値を取得
 */
function getRangeValue(sheet, rangeAddress) {
  try {
    const values = sheet.getRange(rangeAddress).getValues();
    for (let i = 0; i < values.length; i++) {
      for (let j = 0; j < values[i].length; j++) {
        if (values[i][j] !== null && values[i][j] !== '') {
          return values[i][j];
        }
      }
    }
    return null;
  } catch (error) {
    Logger.log(`範囲取得エラー (${rangeAddress}): ${error.message}`);
    return null;
  }
}

/**
 * 範囲から配列を取得
 */
function getRangeValues(sheet, rangeAddress) {
  try {
    const values = sheet.getRange(rangeAddress).getValues();
    const result = [];

    for (let i = 0; i < values.length; i++) {
      for (let j = 0; j < values[i].length; j++) {
        if (values[i][j] !== null && values[i][j] !== '') {
          result.push(values[i][j]);
        }
      }
    }

    return result;
  } catch (error) {
    Logger.log(`範囲配列取得エラー (${rangeAddress}): ${error.message}`);
    return [];
  }
}

/**
 * 通貨値を数値に変換
 */
function parseCurrency(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const cleaned = value.replace(/[¥,]/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  return null;
}
