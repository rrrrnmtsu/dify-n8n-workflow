/**
 * CROSS ROPPONGI 月次売上データ転記システム
 * バッチ処理対応版（実行時間制限対策）
 *
 * @version 1.1.0
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

  // バッチ処理設定
  BATCH_SIZE: 10,  // 1回あたり処理するシート数

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
// メインメニュー
// ========================================

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📊 CROSS ROPPONGI')
    .addItem('🔄 Excelデータを転記（新規）', 'processExcelFilesNew')
    .addItem('▶️ 処理を続行', 'processExcelFilesContinue')
    .addItem('🗑️ 処理状態をリセット', 'resetProcessState')
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

    const fileNames = files.map(f => f.getName()).join('\\n');
    const response = ui.alert(
      'ファイル選択',
      `以下のファイルが見つかりました:\\n\\n${fileNames}\\n\\n最初のファイルを処理しますか？`,
      ui.ButtonSet.YES_NO
    );

    if (response !== ui.Button.YES) {
      return;
    }

    const file = files[0];

    // 新規スプレッドシート作成
    const spreadsheet = createDestinationSpreadsheet(file.getName());

    // 処理状態を初期化
    const state = {
      fileId: file.getId(),
      fileName: file.getName(),
      spreadsheetId: spreadsheet.getId(),
      spreadsheetUrl: spreadsheet.getUrl(),
      processedSheets: 0,
      totalSheets: 0,  // 後で更新
      currentBatch: 0
    };

    saveProcessState(state);

    // バッチ処理開始
    processExcelFilesContinue();

  } catch (error) {
    Logger.log(`エラー: ${error.message}`);
    ui.alert('エラー', `処理中にエラーが発生しました:\\n\\n${error.message}`, ui.ButtonSet.OK);
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
        `ファイル: ${state.fileName}\\n処理シート数: ${state.processedSheets}件\\n\\nスプレッドシート:\\n${state.spreadsheetUrl}`,
        ui.ButtonSet.OK
      );

      clearProcessState();
      Logger.log('全処理完了');

    } else {
      // 続行案内
      const remaining = sheets.length - endIndex;
      ui.alert(
        '処理中',
        `${endIndex}/${sheets.length}シート処理完了\\n\\n残り${remaining}シートあります。\\n「▶️ 処理を続行」を実行してください。`,
        ui.ButtonSet.OK
      );
    }

  } catch (error) {
    Logger.log(`エラー: ${error.message}`);
    Logger.log(error.stack);
    ui.alert('エラー', `処理中にエラーが発生しました:\\n\\n${error.message}\\n\\n処理状態は保存されています。`, ui.ButtonSet.OK);
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
// 以下、既存の関数（変更なし）
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

function createDestinationSpreadsheet(fileName) {
  const spreadsheetName = CONFIG.getSpreadsheetName(fileName);
  const spreadsheet = SpreadsheetApp.create(spreadsheetName);

  const defaultSheet = spreadsheet.getSheets()[0];
  defaultSheet.setName('Sheet1');

  setupSheet1Headers(defaultSheet);

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

function createSheet(spreadsheet, sheetName, headers) {
  const sheet = spreadsheet.insertSheet(sheetName);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#4285F4').setFontColor('#FFFFFF');
  sheet.setFrozenRows(1);
  return sheet;
}
