/**
 * CROSS ROPPONGI 月次売上データ転記システム（完全版）
 * GAS設定済みスプレッドシートに直接転記
 *
 * @version 2.0.0
 * @date 2025-10-23
 */

// ========================================
// 設定値（ここだけ変更してください）
// ========================================

const CONFIG = {
  // Google DriveフォルダID（必須：ここを変更してください）
  DRIVE_FOLDER_ID: 'YOUR_FOLDER_ID_HERE',

  // 除外するシート名
  EXCLUDED_SHEETS: ['串計', '集計', 'マネーフォアード貼付用'],

  // ファイル名パターン
  FILE_PATTERN: /^\d{6}CROSSROPPONGI\.xlsx$/,

  // バッチ処理設定（1回あたり処理するシート数）
  BATCH_SIZE: 10
};

// ========================================
// メインメニュー
// ========================================

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📊 CROSS ROPPONGI')
    .addItem('🔄 Excelデータを転記（新規）', 'processExcelFilesNew')
    .addItem('▶️ 処理を続行', 'processExcelFilesContinue')
    .addItem('🗑️ 処理状態をリセット', 'resetProcessState')
    .addSeparator()
    .addItem('📊 月次集計を生成', 'generateMonthlySummary')
    .addItem('📅 週次集計を生成', 'generateWeeklySummary')
    .addSeparator()
    .addItem('🧹 一時ファイルを削除', 'cleanupTempFiles')
    .addItem('⚙️ 設定を表示', 'showConfig')
    .addToUi();
}

function showConfig() {
  const ui = SpreadsheetApp.getUi();
  const state = getProcessState();
  const stateInfo = state ? `進行中（${state.processedSheets}/${state.totalSheets}シート処理済み）` : 'なし';

  const message = `
【現在の設定】

📁 監視フォルダID: ${CONFIG.DRIVE_FOLDER_ID}
🚫 除外シート: ${CONFIG.EXCLUDED_SHEETS.join(', ')}
📄 ファイルパターン: yyyymmCROSSROPPONGI.xlsx
📦 バッチサイズ: ${CONFIG.BATCH_SIZE}シート/回
🔄 処理状態: ${stateInfo}

【使い方】
1. Google DriveフォルダにExcelファイルをアップロード
2. メニュー > 🔄 Excelデータを転記（新規）
3. 処理が途中で止まった場合は「▶️ 処理を続行」
  `;

  ui.alert('設定情報', message, ui.ButtonSet.OK);
}

function resetProcessState() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    '確認',
    '処理状態をリセットしますか？',
    ui.ButtonSet.YES_NO
  );

  if (response === ui.Button.YES) {
    clearProcessState();
    ui.alert('完了', '処理状態をリセットしました。', ui.ButtonSet.OK);
  }
}

/**
 * 一時ファイル（temp_）を一括削除
 */
function cleanupTempFiles() {
  const ui = SpreadsheetApp.getUi();

  try {
    // Google Driveから temp_ で始まるファイルを検索
    const files = DriveApp.searchFiles('title contains "temp_" and trashed = false');

    let count = 0;
    const fileList = [];

    // ファイルリストを収集
    while (files.hasNext()) {
      const file = files.next();
      fileList.push(file);
      count++;
    }

    if (count === 0) {
      ui.alert('情報', '削除対象の一時ファイルが見つかりませんでした。', ui.ButtonSet.OK);
      return;
    }

    // 確認ダイアログ
    const response = ui.alert(
      '確認',
      `${count}個の一時ファイルが見つかりました。\n削除しますか？`,
      ui.ButtonSet.YES_NO
    );

    if (response !== ui.Button.YES) {
      return;
    }

    // ファイルを削除
    fileList.forEach(file => {
      Drive.Files.remove(file.getId());
      Logger.log(`削除: ${file.getName()}`);
    });

    ui.alert('✅ 完了', `${count}個の一時ファイルを削除しました。`, ui.ButtonSet.OK);

  } catch (error) {
    Logger.log(`エラー: ${error.message}`);
    ui.alert('エラー', `一時ファイルの削除中にエラーが発生しました:\n\n${error.message}`, ui.ButtonSet.OK);
  }
}

// ========================================
// スクリプトプロパティ（処理状態の保存）
// ========================================

function getProcessState() {
  const props = PropertiesService.getScriptProperties();
  const state = props.getProperty('PROCESS_STATE');
  return state ? JSON.parse(state) : null;
}

function saveProcessState(state) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('PROCESS_STATE', JSON.stringify(state));
}

function clearProcessState() {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty('PROCESS_STATE');
}

// ========================================
// メイン処理
// ========================================

/**
 * 新規処理開始
 */
function processExcelFilesNew() {
  const ui = SpreadsheetApp.getUi();

  // 既存の処理状態をチェック
  const existingState = getProcessState();
  if (existingState) {
    const response = ui.alert(
      '確認',
      '進行中の処理があります。リセットして新規に開始しますか？',
      ui.ButtonSet.YES_NO
    );

    if (response !== ui.Button.YES) {
      return;
    }
    clearProcessState();
  }

  try {
    // ファイル選択
    const files = getExcelFilesFromFolder();
    if (files.length === 0) {
      ui.alert('エラー', '対象のExcelファイルが見つかりませんでした。', ui.ButtonSet.OK);
      return;
    }

    const fileNames = files.map(f => f.getName()).join('\n');
    const response = ui.alert(
      'ファイル選択',
      `以下のファイルが見つかりました:\n\n${fileNames}\n\n最初のファイルを処理しますか？`,
      ui.ButtonSet.YES_NO
    );

    if (response !== ui.Button.YES) {
      return;
    }

    const file = files[0];

    // このスプレッドシートに必要なシートを準備
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    setupDestinationSheets(spreadsheet);

    // 処理状態を初期化
    const state = {
      fileId: file.getId(),
      fileName: file.getName(),
      spreadsheetId: spreadsheet.getId(),
      spreadsheetUrl: spreadsheet.getUrl(),
      processedSheets: 0,
      totalSheets: 0,
      currentBatch: 0
    };

    saveProcessState(state);

    // バッチ処理開始
    processExcelFilesContinue();

  } catch (error) {
    Logger.log(`エラー: ${error.message}`);
    ui.alert('エラー', `処理中にエラーが発生しました:\n\n${error.message}`, ui.ButtonSet.OK);
  }
}

/**
 * 処理続行
 */
function processExcelFilesContinue() {
  const ui = SpreadsheetApp.getUi();

  try {
    const state = getProcessState();
    if (!state) {
      ui.alert('エラー', '処理状態が見つかりません。新規処理を開始してください。', ui.ButtonSet.OK);
      return;
    }

    Logger.log(`処理続行: バッチ${state.currentBatch + 1}`);

    // ファイルとスプレッドシートを取得
    const file = DriveApp.getFileById(state.fileId);
    const spreadsheet = SpreadsheetApp.openById(state.spreadsheetId);

    // Excelを一時変換（1回のみ）
    let tempFileId;
    if (!state.tempFileId) {
      tempFileId = convertExcelToSheets(file);
      state.tempFileId = tempFileId;
      saveProcessState(state);
    } else {
      tempFileId = state.tempFileId;
    }

    const tempSheet = SpreadsheetApp.openById(tempFileId);
    const sheets = tempSheet.getSheets();

    // 総シート数を更新
    if (state.totalSheets === 0) {
      state.totalSheets = sheets.length;
      saveProcessState(state);
    }

    // バッチ処理
    const startIndex = state.currentBatch * CONFIG.BATCH_SIZE;
    const endIndex = Math.min(startIndex + CONFIG.BATCH_SIZE, sheets.length);

    const batchData = [];

    for (let i = startIndex; i < endIndex; i++) {
      const sheet = sheets[i];
      const sheetName = sheet.getName();

      // 除外シートをスキップ
      if (CONFIG.EXCLUDED_SHEETS.includes(sheetName)) {
        Logger.log(`スキップ: ${sheetName}`);
        state.processedSheets++;
        continue;
      }

      Logger.log(`処理中: ${sheetName} (${i + 1}/${sheets.length})`);

      const sheetData = extractDataFromSheet(sheet, sheetName, state.fileName);
      batchData.push(sheetData);
      state.processedSheets++;
    }

    // データ書き込み
    if (batchData.length > 0) {
      writeToSpreadsheet(spreadsheet, batchData);
    }

    // 状態更新
    state.currentBatch++;
    saveProcessState(state);

    // 完了チェック
    if (endIndex >= sheets.length) {
      // 一時ファイル削除
      Drive.Files.remove(tempFileId);

      // 完了通知
      ui.alert(
        '✅ 処理完了',
        `ファイル: ${state.fileName}\n処理シート数: ${state.processedSheets}件\n\nスプレッドシート:\n${state.spreadsheetUrl}`,
        ui.ButtonSet.OK
      );

      clearProcessState();
      Logger.log('全処理完了');

    } else {
      // 続行案内
      const remaining = sheets.length - endIndex;
      ui.alert(
        '処理中',
        `${endIndex}/${sheets.length}シート処理完了\n\n残り${remaining}シートあります。\n「▶️ 処理を続行」を実行してください。`,
        ui.ButtonSet.OK
      );
    }

  } catch (error) {
    Logger.log(`エラー: ${error.message}`);
    Logger.log(error.stack);
    ui.alert('エラー', `処理中にエラーが発生しました:\n\n${error.message}\n\n処理状態は保存されています。`, ui.ButtonSet.OK);
  }
}

/**
 * ExcelをGoogle Sheetsに変換
 */
function convertExcelToSheets(file) {
  const blob = file.getBlob();

  const resource = {
    title: `temp_${Date.now()}_${file.getName()}`,
    mimeType: MimeType.GOOGLE_SHEETS
  };

  const options = {
    convert: true,
    ocr: false
  };

  const tempFile = Drive.Files.insert(resource, blob, options);
  Logger.log(`一時ファイル作成: ${tempFile.id}`);

  return tempFile.id;
}

// ========================================
// スプレッドシート準備
// ========================================

/**
 * このスプレッドシートに必要なシートを準備
 */
function setupDestinationSheets(spreadsheet) {
  const requiredSheets = [
    {
      name: 'Sheet1',
      headers: [
        '営業日', '総来客数', '男性', '女性', '総売上', '現金化不足',
        'FRONT売上', 'CLOAK/備品売上', 'LOCKER売上', 'BAR1売上', 'BAR2売上',
        'BAR3売上', 'BAR4売上', 'VIP1売上', 'VVIP売上', 'PARTY売上',
        '未収金', '未収回収', 'VIP詳細JSON'
      ]
    },
    {
      name: '決済別',
      headers: [
        'ユニークキー', '営業日', 'エリア', '現金', 'クレジット',
        'QUICPAY', 'AirPayQR', '全東進', 'JPpoint', '未収'
      ]
    },
    {
      name: 'VIPリスト',
      headers: ['ユニークキー', '営業日', '顧客名', '金額']
    },
    {
      name: 'VVIPリスト',
      headers: ['ユニークキー', '営業日', '顧客名', '金額']
    },
    {
      name: '未収リスト',
      headers: ['ユニークキー', '営業日', '顧客名', '金額', '担当者']
    },
    {
      name: '未収回収リスト',
      headers: ['ユニークキー', '営業日', '顧客名', '金額', '担当者']
    }
  ];

  requiredSheets.forEach(sheetConfig => {
    let sheet = spreadsheet.getSheetByName(sheetConfig.name);

    // シートが存在しない場合は作成
    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetConfig.name);
      Logger.log(`シート作成: ${sheetConfig.name}`);
    }

    // ヘッダー行をチェック
    const firstRow = sheet.getRange(1, 1, 1, sheetConfig.headers.length).getValues()[0];
    const isEmpty = firstRow.every(cell => cell === '' || cell === null);

    // ヘッダーが空の場合のみ設定
    if (isEmpty) {
      sheet.getRange(1, 1, 1, sheetConfig.headers.length).setValues([sheetConfig.headers]);
      sheet.getRange(1, 1, 1, sheetConfig.headers.length)
        .setFontWeight('bold')
        .setBackground('#4285F4')
        .setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);
      Logger.log(`ヘッダー設定: ${sheetConfig.name}`);
    }
  });
}

// ========================================
// ファイル取得
// ========================================

function getExcelFilesFromFolder() {
  try {
    const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
    const files = folder.getFilesByType(MimeType.MICROSOFT_EXCEL);
    const xlsxFiles = folder.getFilesByType(MimeType.MICROSOFT_EXCEL_LEGACY);

    const result = [];

    while (files.hasNext()) {
      const file = files.next();
      if (CONFIG.FILE_PATTERN.test(file.getName())) {
        result.push(file);
      }
    }

    while (xlsxFiles.hasNext()) {
      const file = xlsxFiles.next();
      if (CONFIG.FILE_PATTERN.test(file.getName())) {
        result.push(file);
      }
    }

    return result;
  } catch (error) {
    throw new Error(`フォルダID (${CONFIG.DRIVE_FOLDER_ID}) が正しくありません: ${error.message}`);
  }
}

// ========================================
// データ抽出関数
// ========================================

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

// ========================================
// スプレッドシート書き込み
// ========================================

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
