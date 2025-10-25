/**
 * CROSS ROPPONGI 週次集計自動生成システム
 *
 * Sheet1の日次データを週次集計してダッシュボードシートに出力
 *
 * @version 1.0.0
 * @date 2025-10-24
 */

// ========================================
// メイン関数
// ========================================

/**
 * 週次集計を生成してダッシュボードシートに出力
 */
function generateWeeklySummary() {
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

    // Sheet1のデータを取得（ヘッダー行を除く）
    const dataRange = sheet1.getDataRange();
    const allData = dataRange.getValues();

    // ヘッダー行を確認（3行目がヘッダーの想定）
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(5, allData.length); i++) {
      if (allData[i][0] && allData[i][0].toString().includes('営業日')) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === 0) {
      // ヘッダーが見つからない場合、1行目をヘッダーと仮定
      headerRowIndex = 0;
    }

    const headers = allData[headerRowIndex];
    const dataRows = allData.slice(headerRowIndex + 1);

    // 営業日データのみを抽出（A列がDate型または日付文字列）
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

    // 週次集計を生成
    const weeklySummaryData = generateWeeklySummaryData(monthlyGroups, headers);

    // ダッシュボードシートに書き込み
    writeWeeklySummaryToDashboard(dashboardSheet, weeklySummaryData, headers);

    ui.alert(
      '✅ 完了',
      `週次集計を生成しました。\n\n対象期間: ${weeklySummaryData.length}ヶ月分\nダッシュボードシートA48以降に出力`,
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

  // YYYY-MM-DD, YYYY/MM/DD, MM/DD/YYYY などの形式をチェック
  const datePatterns = [
    /^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}$/,  // YYYY-MM-DD or YYYY/MM/DD
    /^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/   // MM/DD/YYYY or DD/MM/YYYY
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
      return; // 無効な日付はスキップ
    }

    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1-12
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
 * 週次集計データを生成
 */
function generateWeeklySummaryData(monthlyGroups, headers) {
  const summaryData = [];

  monthlyGroups.forEach(monthGroup => {
    const { year, month, data } = monthGroup;

    // その月の週範囲を取得
    const weekRanges = getWeekRangesInMonth(year, month);

    // 週ごとにデータを集計
    const weeklyData = weekRanges.map(weekRange => {
      return aggregateWeeklyData(data, weekRange, headers);
    });

    summaryData.push({
      year: year,
      month: month,
      weeklyData: weeklyData
    });
  });

  return summaryData;
}

/**
 * 指定年月の週範囲を取得
 *
 * @param {number} year - 年
 * @param {number} month - 月（1-12）
 * @return {Array} 週範囲の配列
 */
function getWeekRangesInMonth(year, month) {
  const weeks = [];
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  let currentWeekStart = new Date(firstDay);
  let weekNum = 1;

  while (currentWeekStart <= lastDay) {
    // 週の終了日を計算（次の土曜日または月末）
    const dayOfWeek = currentWeekStart.getDay(); // 0=日曜
    const daysUntilSaturday = dayOfWeek === 0 ? 6 : (6 - dayOfWeek);

    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(currentWeekStart.getDate() + daysUntilSaturday);

    // 月末を超える場合は月末を終了日とする
    const finalWeekEnd = weekEnd > lastDay ? new Date(lastDay) : new Date(weekEnd);

    const startLabel = `${currentWeekStart.getMonth() + 1}/${currentWeekStart.getDate()}`;
    const endLabel = `${finalWeekEnd.getMonth() + 1}/${finalWeekEnd.getDate()}`;

    weeks.push({
      weekNum: weekNum,
      startDate: new Date(currentWeekStart),
      endDate: new Date(finalWeekEnd),
      label: `${weekNum}週目(${startLabel}-${endLabel})`
    });

    // 次の週（日曜日）へ
    currentWeekStart = new Date(finalWeekEnd);
    currentWeekStart.setDate(currentWeekStart.getDate() + 1);
    weekNum++;
  }

  return weeks;
}

/**
 * 週ごとにデータを集計
 *
 * @param {Array} monthData - その月の全データ
 * @param {Object} weekRange - 週の範囲情報
 * @param {Array} headers - ヘッダー行
 * @return {Object} 集計データ
 */
function aggregateWeeklyData(monthData, weekRange, headers) {
  const { weekNum, startDate, endDate, label } = weekRange;

  // この週に含まれるデータをフィルタリング
  const weekData = monthData.filter(item => {
    return item.date >= startDate && item.date <= endDate;
  });

  if (weekData.length === 0) {
    // データがない週は0で埋める
    const emptyRow = [label];
    for (let i = 1; i < headers.length; i++) {
      emptyRow.push(0);
    }
    return emptyRow;
  }

  // B列～R列（インデックス1～17）を集計
  const aggregatedRow = [label];

  for (let colIndex = 1; colIndex < headers.length && colIndex <= 17; colIndex++) {
    let sum = 0;

    weekData.forEach(item => {
      const value = item.row[colIndex];

      if (value !== null && value !== undefined && value !== '') {
        // 数値に変換
        let numValue = 0;

        if (typeof value === 'number') {
          numValue = value;
        } else if (typeof value === 'string') {
          // 通貨記号やカンマを除去
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
 * 週次集計データをダッシュボードシートに書き込み
 */
function writeWeeklySummaryToDashboard(dashboardSheet, summaryData, headers) {
  // A48以降のデータをクリア
  const startRow = 48;
  const maxRows = dashboardSheet.getMaxRows();

  if (maxRows >= startRow) {
    const clearRange = dashboardSheet.getRange(startRow, 1, maxRows - startRow + 1, 18);
    clearRange.clear();
  }

  let currentRow = startRow;

  summaryData.forEach(monthSummary => {
    const { year, month, weeklyData } = monthSummary;

    // 月別セクションタイトル
    const monthTitle = `【${year}年${month}月】週次集計`;
    dashboardSheet.getRange(currentRow, 1).setValue(monthTitle);
    dashboardSheet.getRange(currentRow, 1)
      .setFontWeight('bold')
      .setFontSize(12)
      .setBackground('#E8F0FE');
    currentRow++;

    // ヘッダー行
    const weekHeaders = ['週'];
    for (let i = 1; i < headers.length && i <= 17; i++) {
      weekHeaders.push(headers[i]);
    }

    dashboardSheet.getRange(currentRow, 1, 1, weekHeaders.length).setValues([weekHeaders]);
    dashboardSheet.getRange(currentRow, 1, 1, weekHeaders.length)
      .setFontWeight('bold')
      .setBackground('#4285F4')
      .setFontColor('#FFFFFF');
    currentRow++;

    // 週次データ
    if (weeklyData.length > 0) {
      dashboardSheet.getRange(currentRow, 1, weeklyData.length, weeklyData[0].length)
        .setValues(weeklyData);

      // 数値列にカンマ区切り書式を適用
      for (let i = 0; i < weeklyData.length; i++) {
        dashboardSheet.getRange(currentRow + i, 2, 1, weeklyData[0].length - 1)
          .setNumberFormat('#,##0');
      }

      currentRow += weeklyData.length;
    }

    // 空行
    currentRow++;
  });

  Logger.log(`週次集計を${summaryData.length}ヶ月分出力しました。`);
}
