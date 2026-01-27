// Google Apps Script 代碼
// 請將此代碼複製到您的 Google Apps Script 編輯器中

const SPREADSHEET_ID = '1cT3VJcDHyqHUEEdRfb7b9zMifBJk6f6upujGYV9dj4U';

// 處理 CORS 預檢請求
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '3600'
    });
}

function doPost(e) {
  // 設置 CORS 頭（需要在所有返回前設置）
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  
  try {
    // 獲取當前工作表
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName('工作表1') || spreadsheet.getActiveSheet();
    
    // 解析 POST 數據
    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: '無法解析 JSON 數據: ' + parseError.toString(),
        message: '同步失敗：數據格式錯誤'
      }))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeaders(corsHeaders);
    }
    
    // 檢查是否有提供 spreadsheetId 和 sheetName
    let targetSheet = sheet;
    if (data.spreadsheetId) {
      try {
        const targetSpreadsheet = SpreadsheetApp.openById(data.spreadsheetId);
        targetSheet = data.sheetName 
          ? targetSpreadsheet.getSheetByName(data.sheetName) || targetSpreadsheet.getActiveSheet()
          : targetSpreadsheet.getActiveSheet();
      } catch (sheetError) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: '無法打開工作表: ' + sheetError.toString(),
          message: '同步失敗：工作表錯誤'
        }))
          .setMimeType(ContentService.MimeType.JSON)
          .setHeaders(corsHeaders);
      }
    }
    
    // 清空現有資料（保留標題行）
    try {
      const lastRow = targetSheet.getLastRow();
      if (lastRow > 1) {
        targetSheet.deleteRows(2, lastRow - 1);
      }
    } catch (clearError) {
      // 如果清空失敗，繼續執行（可能是空表）
      console.log('清空資料時發生錯誤（可忽略）:', clearError);
    }
    
    // 寫入新資料
    if (data.values && data.values.length > 0) {
      try {
        const numRows = data.values.length;
        const numCols = data.values[0].length;
        targetSheet.getRange(1, 1, numRows, numCols).setValues(data.values);
      } catch (writeError) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: '寫入資料失敗: ' + writeError.toString(),
          message: '同步失敗：寫入錯誤'
        }))
          .setMimeType(ContentService.MimeType.JSON)
          .setHeaders(corsHeaders);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: '同步成功',
      count: data.values ? data.values.length - 1 : 0
    }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders(corsHeaders);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      message: '同步失敗：' + error.toString()
    }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders(corsHeaders);
  }
}

// 獲取成員電話
function doGet(e) {
  try {
    const action = e.parameter.action;
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    if (action === 'getPhone') {
      // 獲取單個成員的電話
      const memberId = parseInt(e.parameter.memberId);
      const membersSheet = spreadsheet.getSheetByName('members');
      
      if (!membersSheet) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: '找不到 members 工作表'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      const data = membersSheet.getDataRange().getValues();
      // 假設第一行是標題，格式：編號,名字,專業別,電話
      for (let i = 1; i < data.length; i++) {
        if (parseInt(data[i][0]) === memberId) {
          return ContentService.createTextOutput(JSON.stringify({
            success: true,
            phone: data[i][3] || null, // 電話在第四欄（索引3）
            member: {
              id: data[i][0],
              name: data[i][1],
              specialty: data[i][2]
            }
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: '找不到該成員'
      })).setMimeType(ContentService.MimeType.JSON);
      
    } else if (action === 'getAllPhones') {
      // 獲取所有成員的電話
      const membersSheet = spreadsheet.getSheetByName('members');
      
      if (!membersSheet) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: '找不到 members 工作表'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      const data = membersSheet.getDataRange().getValues();
      const phones = {};
      
      // 假設第一行是標題，格式：編號,名字,專業別,電話
      for (let i = 1; i < data.length; i++) {
        const memberId = parseInt(data[i][0]);
        if (memberId) {
          phones[memberId] = data[i][3] || ''; // 電話在第四欄（索引3）
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        phones: phones
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Google Apps Script 已正確設置',
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
