# 測試 Google Apps Script

## 快速測試

請在瀏覽器控制台（F12）中運行以下代碼來測試 Google Apps Script：

```javascript
// 測試 Google Apps Script
const url = 'https://script.google.com/macros/s/AKfycbzIbMWSSwXtGJfQHDxGYj0SLVXQdVa3KW5IwGnFhUvsGnjtBNEduT7zI9SiHZARGmxCXg/exec';
const testData = {
  spreadsheetId: '1cT3VJcDHyqHUEEdRfb7b9zMifBJk6f6upujGYV9dj4U',
  sheetName: '工作表1',
  values: [['測試標題'], ['測試資料']]
};

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testData),
})
.then(response => response.text())
.then(text => {
  console.log('響應:', text);
  try {
    const json = JSON.parse(text);
    console.log('解析成功:', json);
  } catch (e) {
    console.error('解析失敗:', e);
  }
})
.catch(error => console.error('錯誤:', error));
```

## 如果仍然有 CORS 錯誤

請確認：

1. **Google Apps Script 部署設置**
   - 打開：https://script.google.com/home/projects
   - 找到您的專案
   - 點擊「部署」>「管理部署作業」
   - 編輯部署
   - 確認「具有存取權的使用者」設為「任何人」
   - 點擊「更新」

2. **重新部署**
   - 如果修改了代碼，需要創建新版本
   - 點擊「部署」>「新增部署作業」
   - 選擇「新增版本」
   - 重新部署並複製新的 URL

3. **檢查權限**
   - 確認已授權 Apps Script 訪問 Google Sheets
   - 在 Apps Script 編輯器中，點擊「執行」測試 `doPost` 函數
