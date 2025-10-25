/**
 * Google Sheets書き込み関数
 * 抽出したデータをスプレッドシートに転記
 */

/**
 * スプレッドシートにデータを書き込むメイン関数
 */
function writeToSpreadsheet(spreadsheet, allSheetsData) {
  const sheet1 = spreadsheet.getSheetByName('Sheet1');
  const paymentSheet = spreadsheet.getSheetByName('決済別');
  const vipSheet = spreadsheet.getSheetByName('VIPリスト');
  const vvipSheet = spreadsheet.getSheetByName('VVIPリスト');
  const uncollectedSheet = spreadsheet.getSheetByName('未収リスト');
  const collectedSheet = spreadsheet.getSheetByName('未収回収リスト');

  // 各シートのデータ配列
  const sheet1Data = [];
  const paymentData = [];
  const vipData = [];
  const vvipData = [];
  const uncollectedData = [];
  const collectedData = [];

  // 全シートのデータを処理
  allSheetsData.forEach(sheetData => {
    // Sheet1用データ
    sheet1Data.push(formatBasicDataRow(sheetData.basicData));

    // 決済別データ
    sheetData.paymentMethods.forEach(payment => {
      paymentData.push(formatPaymentRow(payment));
    });

    // VIPリスト
    sheetData.vipList.forEach(vip => {
      vipData.push(formatCustomerRow(vip));
    });

    // VVIPリスト
    sheetData.vvipList.forEach(vvip => {
      vvipData.push(formatCustomerRow(vvip));
    });

    // 未収リスト
    sheetData.uncollectedList.forEach(item => {
      uncollectedData.push(formatCustomerWithPersonRow(item));
    });

    // 未収回収リスト
    sheetData.collectedList.forEach(item => {
      collectedData.push(formatCustomerWithPersonRow(item));
    });
  });

  // データ書き込み
  if (sheet1Data.length > 0) {
    writeDataToSheet(sheet1, sheet1Data);
  }

  if (paymentData.length > 0) {
    writeDataToSheet(paymentSheet, paymentData);
  }

  if (vipData.length > 0) {
    writeDataToSheet(vipSheet, vipData);
  }

  if (vvipData.length > 0) {
    writeDataToSheet(vvipSheet, vvipData);
  }

  if (uncollectedData.length > 0) {
    writeDataToSheet(uncollectedSheet, uncollectedData);
  }

  if (collectedData.length > 0) {
    writeDataToSheet(collectedSheet, collectedData);
  }

  // オートリサイズ
  autoResizeAllSheets(spreadsheet);

  Logger.log(`書き込み完了: Sheet1=${sheet1Data.length}行, 決済別=${paymentData.length}行, VIP=${vipData.length}行, VVIP=${vvipData.length}行, 未収=${uncollectedData.length}行, 回収=${collectedData.length}行`);
}

/**
 * シートにデータを書き込み
 */
function writeDataToSheet(sheet, dataRows) {
  if (dataRows.length === 0) {
    return;
  }

  const startRow = sheet.getLastRow() + 1;
  const numRows = dataRows.length;
  const numCols = dataRows[0].length;

  sheet.getRange(startRow, 1, numRows, numCols).setValues(dataRows);
}

/**
 * 全シートをオートリサイズ
 */
function autoResizeAllSheets(spreadsheet) {
  const sheets = spreadsheet.getSheets();
  sheets.forEach(sheet => {
    const maxColumns = sheet.getLastColumn();
    if (maxColumns > 0) {
      for (let i = 1; i <= maxColumns; i++) {
        sheet.autoResizeColumn(i);
      }
    }
  });
}

// ========================================
// データフォーマット関数
// ========================================

/**
 * Sheet1用の行データを作成
 */
function formatBasicDataRow(basicData) {
  return [
    basicData.business_date,
    basicData.total_customer_count,
    basicData.male_count,
    basicData.female_count,
    basicData.total_sales,
    basicData.cash_shortage,
    basicData.section_sales.front,
    basicData.section_sales.cloak_supplies,
    basicData.section_sales.locker,
    basicData.section_sales.bar1,
    basicData.section_sales.bar2,
    basicData.section_sales.bar3,
    basicData.section_sales.bar4,
    basicData.section_sales.vip1,
    basicData.section_sales.vvip,
    basicData.section_sales.party,
    basicData.receivables.uncollected,
    basicData.receivables.collected,
    JSON.stringify(basicData.vip_details)
  ];
}

/**
 * 決済別用の行データを作成
 */
function formatPaymentRow(payment) {
  return [
    payment.unique_key,
    payment.business_date,
    payment.area,
    payment.cash,
    payment.credit,
    payment.quicpay,
    payment.airpay_qr,
    payment.zentoshin,
    payment.jppoint,
    payment.receivable
  ];
}

/**
 * 顧客リスト用の行データを作成（VIP/VVIP）
 */
function formatCustomerRow(customer) {
  return [
    customer.unique_key,
    customer.business_date,
    customer.customer_name,
    customer.amount
  ];
}

/**
 * 顧客リスト用の行データを作成（担当者付き）
 */
function formatCustomerWithPersonRow(customer) {
  return [
    customer.unique_key,
    customer.business_date,
    customer.customer_name,
    customer.amount,
    customer.person_in_charge
  ];
}
