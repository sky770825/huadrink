# Google Sheets 同步功能設置指南

本應用支援將報名資料自動同步到 Google Sheets。有兩種設置方式：

## 方式一：使用 Supabase Edge Function（推薦）

這是最安全的方式，API Key 不會暴露在前端。

### 步驟 1: 獲取 Google Sheets API Key

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案或選擇現有專案
3. 啟用 **Google Sheets API**
   - 在「API 和服務」>「程式庫」中搜尋「Google Sheets API」
   - 點擊「啟用」
4. 建立 API 金鑰
   - 前往「API 和服務」>「憑證」
   - 點擊「建立憑證」>「API 金鑰」
   - 複製 API 金鑰

### 步驟 2: 設置 Google Sheets 權限

1. 開啟您的 Google Sheets 文件
2. 點擊右上角的「共用」按鈕
3. 在「取得連結」中選擇「知道連結的使用者」
4. 或者，將 API 金鑰對應的服務帳號加入為編輯者

### 步驟 3: 部署 Supabase Edge Function

1. 安裝 Supabase CLI（如果尚未安裝）：
   ```bash
   npm install -g supabase
   ```

2. 登入 Supabase：
   ```bash
   supabase login
   ```

3. 連結到您的專案：
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

4. 設置環境變數：
   ```bash
   supabase secrets set GOOGLE_SHEETS_API_KEY=your_api_key_here
   supabase secrets set GOOGLE_SHEETS_SPREADSHEET_ID=1cT3VJcDHyqHUEEdRfb7b9zMifBJk6f6upujGYV9dj4U
   ```

5. 部署 Edge Function：
   ```bash
   supabase functions deploy sync-google-sheets
   ```

### 步驟 4: 測試

在管理後台點擊「同步到 Google Sheets」按鈕，資料應該會自動同步。

## 方式二：使用 Google Apps Script（簡單但需要手動設置）

如果您不想使用 Supabase Edge Function，可以使用 Google Apps Script 作為中間層。

### 步驟 1: 建立 Google Apps Script

1. 開啟您的 Google Sheets 文件
2. 點擊「擴充功能」>「Apps Script」
3. 貼上以下程式碼：

```javascript
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    
    // 清空現有資料（保留標題）
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
    }
    
    // 寫入新資料
    if (data.values && data.values.length > 0) {
      sheet.getRange(1, 1, data.values.length, data.values[0].length)
        .setValues(data.values);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: '同步成功'
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

4. 點擊「部署」>「新增部署作業」
5. 選擇類型為「網頁應用程式」
6. 設定：
   - 執行身分：我
   - 具有存取權的使用者：任何人
7. 複製「網頁應用程式 URL」

### 步驟 2: 設置環境變數

在 `.env` 文件中添加：

```
VITE_GOOGLE_APPS_SCRIPT_URL=您的_Apps_Script_URL
```

### 步驟 3: 重新啟動應用

重新啟動開發伺服器，現在可以使用同步功能了。

## 方式三：手動匯出 CSV（最簡單）

如果以上方式都不適合，您可以：

1. 在管理後台點擊「匯出 CSV」
2. 下載 CSV 檔案
3. 在 Google Sheets 中匯入 CSV 檔案

## 疑難排解

### 錯誤：認證失敗
- 確認已正確設置 API Key 或 Apps Script URL
- 確認 Google Sheets 的權限設置正確

### 錯誤：權限不足
- 確認 API Key 有啟用 Google Sheets API
- 確認服務帳號或 API Key 有編輯 Google Sheets 的權限

### 資料沒有同步
- 檢查瀏覽器控制台是否有錯誤訊息
- 確認網路連線正常
- 確認 Google Sheets 文件 ID 正確

## 注意事項

- **安全性**：不建議在前端直接使用 API Key，應該使用 Supabase Edge Function
- **配額限制**：Google Sheets API 有每日配額限制（預設 100 次請求/100 秒/使用者）
- **資料格式**：同步時會覆蓋現有資料，請確保已備份重要資料
