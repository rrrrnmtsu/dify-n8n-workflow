/**
 * CROSS ROPPONGI 月次集計自動生成システム
 *
 * Sheet1の日次データを月次集計してダッシュボードシートに出力
 *
 * @version 1.0.0
 * @date 2025-10-24
 */

// ========================================
// メイン関数
// ========================================

/**
 * 月次集計を生成してダッシュボードシートに出力
 */
function generateMonthlySummary() {
  const ui = SpreadsheetApp.getUi();

  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet1 = spreadsheet.getSheetByName('Sheet1');
    const dashboardSheet = spreadsheet.getSheetByName('ダッシュボード');

    if (!sheet1) {
      ui.alert('エラー', 'Sheet1が見つかりません。', ui.ButtonSet.OK);
      return;
    }

    if (!dashboardSheet) {
      ui.alert('エラー', 'ダッシュボードシートが見つかりません。', ui.ButtonSet.OK);
      return;
    }

    // Sheet1のデータを取得
    const dataRange = sheet1.getDataRange();
    const allData = dataRange.getValues();

    // ヘッダー行を確認
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(5, allData.length); i++) {
      if (allData[i][0] && allData[i][0].toString().includes('営業日')) {
        headerRowIndex = i;
        break;
      }
    }

    const headers = allData[headerRowIndex];
    const dataRows = allData.slice(headerRowIndex + 1);

    // 営業日データのみを抽出
    const validData = dataRows.filter(row => {
      const dateValue = row[0];
      return dateValue && (dateValue instanceof Date || isDateString(dateValue));
    });

    if (validData.length === 0) {
      ui.alert('エラー', 'Sheet1に日次データが見つかりません。', ui.ButtonSet.OK);
      return;
    }

    // 年月ごとにデータをグループ化
    const monthlyGroups = groupByMonth(validData);

    // 月次集計データを生成
    const monthlySummaryData = generateMonthlySummaryData(monthlyGroups, headers);

    // ダッシュボードシートに書き込み
    writeMonthlySummaryToDashboard(dashboardSheet, monthlySummaryData, headers);

    ui.alert(
      '✅ 完了',
      `月次集計を生成しました。\n\n対象期間: ${monthlySummaryData.length}ヶ月分\nダッシュボードシートA9以降に出力`,
      ui.ButtonSet.OK
    );

  } catch (error) {
    Logger.log(`エラー: ${error.message}`);
    Logger.log(error.stack);
    ui.alert('エラー', `処理中にエラーが発生しました:\n\n${error.message}`, ui.ButtonSet.OK);
  }
}

// ========================================
// データ処理関数
// ========================================

/**
 * 日付文字列かどうかを判定
 */
function isDateString(value) {
  if (typeof value !== 'string') return false;

  const datePatterns = [
    /^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}$/,
    /^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/
  ];

  return datePatterns.some(pattern => pattern.test(value));
}

/**
 * データを年月ごとにグループ化
 */
function groupByMonth(dataRows) {
  const groups = {};

  dataRows.forEach(row => {
    const dateValue = row[0];
    let date;

    if (dateValue instanceof Date) {
      date = dateValue;
    } else {
      date = new Date(dateValue);
    }

    if (isNaN(date.getTime())) {
      return;
    }

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, '0')}`;

    if (!groups[key]) {
      groups[key] = {
        year: year,
        month: month,
        data: []
      };
    }

    groups[key].data.push({
      date: date,
      row: row
    });
  });

  // 年月順にソート
  const sortedKeys = Object.keys(groups).sort();
  const sortedGroups = [];

  sortedKeys.forEach(key => {
    sortedGroups.push(groups[key]);
  });

  return sortedGroups;
}

/**
 * 月次集計データを生成
 */
function generateMonthlySummaryData(monthlyGroups, headers) {
  const summaryData = [];

  monthlyGroups.forEach(monthGroup => {
    const { year, month, data } = monthGroup;

    // 月次データを集計
    const monthlyRow = aggregateMonthlyData(data, year, month, headers);

    summaryData.push(monthlyRow);
  });

  return summaryData;
}

/**
 * 月ごとにデータを集計
 *
 * @param {Array} monthData - その月の全データ
 * @param {number} year - 年
 * @param {number} month - 月
 * @param {Array} headers - ヘッダー行
 * @return {Array} 集計データ
 */
function aggregateMonthlyData(monthData, year, month, headers) {
  // A列: 年月ラベル
  const monthLabel = `${year}年${month}月`;
  const aggregatedRow = [monthLabel];

  // B列～R列（インデックス1～17）を集計
  for (let colIndex = 1; colIndex < headers.length && colIndex <= 17; colIndex++) {
    let sum = 0;

    monthData.forEach(item => {
      const value = item.row[colIndex];

      if (value !== null && value !== undefined && value !== '') {
        let numValue = 0;

        if (typeof value === 'number') {
          numValue = value;
        } else if (typeof value === 'string') {
          const cleaned = value.replace(/[¥,]/g, '').trim();
          numValue = parseFloat(cleaned);
        }

        if (!isNaN(numValue)) {
          sum += numValue;
        }
      }
    });

    aggregatedRow.push(sum);
  }

  return aggregatedRow;
}

// ========================================
// シート書き込み関数
// ========================================

/**
 * 月次集計データをダッシュボードシートに書き込み
 */
function writeMonthlySummaryToDashboard(dashboardSheet, summaryData, headers) {
  // A9以降のデータをクリア（既存の月次集計を削除）
  const startRow = 9;
  const maxRows = dashboardSheet.getMaxRows();

  // A9からA48の手前（週次集計の前）までクリア
  const clearEndRow = 47;
  if (maxRows >= startRow && clearEndRow >= startRow) {
    const clearRange = dashboardSheet.getRange(startRow, 1, clearEndRow - startRow + 1, 18);
    clearRange.clear();
  }

  // ヘッダー行を書き込み
  const monthHeaders = ['年月'];
  for (let i = 1; i < headers.length && i <= 17; i++) {
    monthHeaders.push(headers[i]);
  }

  dashboardSheet.getRange(startRow, 1, 1, monthHeaders.length).setValues([monthHeaders]);
  dashboardSheet.getRange(startRow, 1, 1, monthHeaders.length)
    .setFontWeight('bold')
    .setBackground('#4285F4')
    .setFontColor('#FFFFFF');

  // 月次データを書き込み
  if (summaryData.length > 0) {
    const dataStartRow = startRow + 1;

    dashboardSheet.getRange(dataStartRow, 1, summaryData.length, summaryData[0].length)
      .setValues(summaryData);

    // 数値列にカンマ区切り書式を適用
    for (let i = 0; i < summaryData.length; i++) {
      dashboardSheet.getRange(dataStartRow + i, 2, 1, summaryData[0].length - 1)
        .setNumberFormat('#,##0');
    }
  }

  Logger.log(`月次集計を${summaryData.length}ヶ月分出力しました。`);
}
