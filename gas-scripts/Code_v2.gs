/**
 * CROSS ROPPONGI 月次売上データ転記システム v2
 * Drive API不要バージョン
 */

// 既存のCode.gsの230行目以降を以下に置き換えてください

/**
 * Excelファイルを解析（Drive API不要版）
 */
function parseExcelFile(file) {
  Logger.log(`Excel解析開始: ${file.getName()}`);

  // Excelファイルを直接Google Sheetsとしてインポート
  const tempSpreadsheet = importExcelAsSheets(file);
  const sheets = tempSpreadsheet.getSheets();

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

  // 一時スプレッドシートを削除
  DriveApp.getFileById(tempSpreadsheet.getId()).setTrashed(true);

  return result;
}

/**
 * ExcelファイルをGoogle Sheetsとしてインポート（Drive API不要）
 */
function importExcelAsSheets(excelFile) {
  // 1. Excelファイルのコピーを作成
  const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  const copiedFile = excelFile.makeCopy(`temp_import_${excelFile.getName()}`, folder);

  // 2. URL Fetch Serviceを使ってGoogle Sheetsに変換
  const fileId = copiedFile.getId();
  const url = `https://docs.google.com/feeds/upload/file/application/vnd.google-apps.spreadsheet?convert=true&id=${fileId}`;

  try {
    // Google Sheets APIを使って変換
    const blob = copiedFile.getBlob();
    const resource = {
      title: `temp_${excelFile.getName()}`,
      mimeType: 'application/vnd.google-apps.spreadsheet'
    };

    // SpreadsheetApp.openByUrlを使う別の方法
    // まず、コピーしたファイルをGoogle Sheetsで開く
    const convertUrl = `https://docs.google.com/spreadsheets/d/${fileId}/edit`;

    // ファイルを直接開いて変換
    const spreadsheet = convertExcelFileToSheets(copiedFile);

    // コピー元のExcelを削除
    copiedFile.setTrashed(true);

    return spreadsheet;

  } catch (error) {
    Logger.log(`変換エラー: ${error.message}`);
    copiedFile.setTrashed(true);
    throw error;
  }
}

/**
 * ExcelファイルをGoogle Sheetsに変換する別の方法
 */
function convertExcelFileToSheets(excelFile) {
  const blob = excelFile.getBlob();
  const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);

  // Blobの内容を読み取り、新しいGoogle Sheetsとして作成
  // この方法ではDrive APIは不要

  try {
    // Google Sheetsとして新規作成
    const newSpreadsheet = SpreadsheetApp.create(`temp_converted_${excelFile.getName()}`);
    const newSpreadsheetId = newSpreadsheet.getId();

    // Excelの内容を手動で読み込む必要がある
    // GASではExcelを直接読み込む機能が限定的なため、
    // AdvancedサービスのDrive APIを使う必要があります

    // この部分は次のメッセージで代替案を提示します
    throw new Error('Excel変換にはDrive APIが必要です');

  } catch (error) {
    throw error;
  }
}
