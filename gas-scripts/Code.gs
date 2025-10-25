/**
 * CROSS ROPPONGI 月次売上データ転記システム
 * Google DriveのExcelファイルから全シートのデータを抽出し、
 * 新規Google Spreadsheetsに転記
 *
 * @version 1.0.0
 * @date 2025-10-23
 */

// ========================================
// 設定値
// ========================================

const CONFIG = {
  // Google DriveフォルダID（ここを変更してください）
  DRIVE_FOLDER_ID: 'YOUR_FOLDER_ID_HERE',

  // 除外するシート名
  EXCLUDED_SHEETS: ['串計', '集計', 'マネーフォアード貼付用'],

  // ファイル名パターン
  FILE_PATTERN: /^\d{6}CROSSROPPONGI\.xlsx$/,

  // 新規スプレッドシート名（動的に生成）
  getSpreadsheetName: function(fileName) {
    const match = fileName.match(/^(\d{4})(\d{2})CROSSROPPONGI\.xlsx$/);
    if (match) {
      return `CROSS ROPPONGI 売上データ ${match[1]}年${match[2]}月`;
    }
    return `CROSS ROPPONGI 売上データ ${fileName}`;
  }
};

// ========================================
// メインメニュー
// ========================================

/**
 * スプレッドシート起動時にカスタムメニューを追加
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📊 CROSS ROPPONGI')
    .addItem('🔄 Excelデータを転記', 'processExcelFiles')
    .addItem('⚙️ 設定を表示', 'showConfig')
    .addToUi();
}

/**
 * 設定情報を表示
 */
function showConfig() {
  const ui = SpreadsheetApp.getUi();
  const message = `
【現在の設定】

📁 監視フォルダID: ${CONFIG.DRIVE_FOLDER_ID}
🚫 除外シート: ${CONFIG.EXCLUDED_SHEETS.join(', ')}
📄 ファイルパターン: yyyymmCROSSROPPONGI.xlsx

【使い方】
1. Google DriveフォルダにExcelファイルをアップロード
2. メニュー > 📊 CROSS ROPPONGI > 🔄 Excelデータを転記
3. ファイルを選択
4. 処理完了まで待機（数分かかる場合があります）
  `;

  ui.alert('設定情報', message, ui.ButtonSet.OK);
}

// ========================================
// メイン処理
// ========================================

/**
 * Excelファイルを処理するメイン関数
 */
function processExcelFiles() {
  const ui = SpreadsheetApp.getUi();

  try {
    // 1. フォルダ内のExcelファイル一覧を取得
    const files = getExcelFilesFromFolder();

    if (files.length === 0) {
      ui.alert('エラー', '対象のExcelファイルが見つかりませんでした。', ui.ButtonSet.OK);
      return;
    }

    // 2. ファイル選択ダイアログ
    const fileNames = files.map(f => f.getName()).join('\\n');
    const response = ui.alert(
      'ファイル選択',
      `以下のファイルが見つかりました:\\n\\n${fileNames}\\n\\n最初のファイルを処理しますか？`,
      ui.ButtonSet.YES_NO
    );

    if (response !== ui.Button.YES) {
      return;
    }

    // 3. 最初のファイルを処理
    const file = files[0];
    Logger.log(`処理開始: ${file.getName()}`);

    // 4. 新規スプレッドシート作成
    const spreadsheet = createDestinationSpreadsheet(file.getName());
    Logger.log(`スプレッドシート作成: ${spreadsheet.getName()}`);

    // 5. Excelファイルを解析
    const excelData = parseExcelFile(file);
    Logger.log(`シート数: ${excelData.length}`);

    // 6. データ転記
    writeToSpreadsheet(spreadsheet, excelData);

    // 7. 完了通知
    ui.alert(
      '✅ 処理完了',
      `ファイル: ${file.getName()}\\nシート数: ${excelData.length}件\\n\\nスプレッドシート:\\n${spreadsheet.getUrl()}`,
      ui.ButtonSet.OK
    );

    Logger.log('処理完了');

  } catch (error) {
    Logger.log(`エラー: ${error.message}`);
    Logger.log(error.stack);
    ui.alert('エラー', `処理中にエラーが発生しました:\\n\\n${error.message}`, ui.ButtonSet.OK);
  }
}

/**
 * Google DriveフォルダからExcelファイルを取得
 */
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

/**
 * 転記先の新規スプレッドシートを作成
 */
function createDestinationSpreadsheet(fileName) {
  const spreadsheetName = CONFIG.getSpreadsheetName(fileName);
  const spreadsheet = SpreadsheetApp.create(spreadsheetName);

  // デフォルトの「シート1」を「Sheet1」にリネーム
  const defaultSheet = spreadsheet.getSheets()[0];
  defaultSheet.setName('Sheet1');

  // ヘッダー行を設定
  setupSheet1Headers(defaultSheet);

  // 残り5シートを作成
  createSheet(spreadsheet, '決済別', [
    'ユニークキー', '営業日', 'エリア', '現金', 'クレジット',
    'QUICPAY', 'AirPayQR', '全東進', 'JPpoint', '未収'
  ]);

  createSheet(spreadsheet, 'VIPリスト', [
    'ユニークキー', '営業日', '顧客名', '金額'
  ]);

  createSheet(spreadsheet, 'VVIPリスト', [
    'ユニークキー', '営業日', '顧客名', '金額'
  ]);

  createSheet(spreadsheet, '未収リスト', [
    'ユニークキー', '営業日', '顧客名', '金額', '担当者'
  ]);

  createSheet(spreadsheet, '未収回収リスト', [
    'ユニークキー', '営業日', '顧客名', '金額', '担当者'
  ]);

  return spreadsheet;
}

/**
 * Sheet1のヘッダー行を設定
 */
function setupSheet1Headers(sheet) {
  const headers = [
    '営業日', '総来客数', '男性', '女性', '総売上', '現金化不足',
    'FRONT売上', 'CLOAK/備品売上', 'LOCKER売上', 'BAR1売上', 'BAR2売上',
    'BAR3売上', 'BAR4売上', 'VIP1売上', 'VVIP売上', 'PARTY売上',
    '未収金', '未収回収', 'VIP詳細JSON'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#4285F4').setFontColor('#FFFFFF');
  sheet.setFrozenRows(1);
}

/**
 * シートを作成してヘッダーを設定
 */
function createSheet(spreadsheet, sheetName, headers) {
  const sheet = spreadsheet.insertSheet(sheetName);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#4285F4').setFontColor('#FFFFFF');
  sheet.setFrozenRows(1);
  return sheet;
}

/**
 * ExcelファイルをGoogle Sheetsに変換
 */
function convertExcelToSheets(excelFile) {
  const blob = excelFile.getBlob();
  const config = {
    title: excelFile.getName(),
    parents: [{id: CONFIG.DRIVE_FOLDER_ID}],
    mimeType: MimeType.GOOGLE_SHEETS
  };

  const file = {
    title: config.title,
    mimeType: config.mimeType,
    parents: config.parents
  };

  const convertedFile = Drive.Files.insert(file, blob, {
    convert: true
  });

  // 元のExcelファイルを削除
  excelFile.setTrashed(true);

  return convertedFile.id;
}

/**
 * Excelファイルを解析
 */
function parseExcelFile(file) {
  // ExcelファイルをGoogle Sheetsに一時変換
  const tempFolder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);

  // DriveAppを使ってファイルをコピーし、Google Sheetsに変換
  const blob = file.getBlob();
  blob.setName(`temp_${file.getName()}`);

  // 一時ファイルとしてGoogle Sheetsを作成
  const tempFileId = DriveApp.createFile(blob).getId();
  const copiedFile = DriveApp.getFileById(tempFileId);

  // MIMEタイプをGoogle Sheetsに変更
  const convertedId = convertExcelToSheets(copiedFile);

  const tempSheet = SpreadsheetApp.openById(convertedId);
  const sheets = tempSheet.getSheets();

  const result = [];

  // 各シートを処理
  for (let i = 0; i < sheets.length; i++) {
    const sheet = sheets[i];
    const sheetName = sheet.getName();

    // 除外シートをスキップ
    if (CONFIG.EXCLUDED_SHEETS.includes(sheetName)) {
      Logger.log(`スキップ: ${sheetName}`);
      continue;
    }

    Logger.log(`処理中: ${sheetName}`);

    // シートからデータ抽出
    const sheetData = extractDataFromSheet(sheet, sheetName, file.getName());
    result.push(sheetData);
  }

  // 一時ファイルを削除
  DriveApp.getFileById(tempSpreadsheet.id).setTrashed(true);

  return result;
}

// 次のメッセージに続きます...
