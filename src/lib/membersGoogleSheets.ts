// 從 Google Sheets 獲取成員電話的函數

const MEMBERS_SHEET_ID = '1cT3VJcDHyqHUEEdRfb7b9zMifBJk6f6upujGYV9dj4U';
const MEMBERS_SHEET_NAME = 'members';

/**
 * 從 Google Sheets 獲取成員電話
 * 注意：這需要 Google Sheets API 或 Google Apps Script
 */
export async function getMemberPhoneFromSheets(memberId: number): Promise<string | null> {
  try {
    // 使用 Google Apps Script 獲取電話
    const appsScriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;
    
    if (!appsScriptUrl) {
      console.warn('未設置 Google Apps Script URL，無法從 Google Sheets 獲取電話');
      return null;
    }

    // 創建一個獲取電話的請求
    const response = await fetch(`${appsScriptUrl}?action=getPhone&memberId=${memberId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    return result.phone || null;
  } catch (error) {
    console.error('獲取成員電話失敗:', error);
    return null;
  }
}

/**
 * 批量獲取所有成員的電話
 */
export async function getAllMemberPhonesFromSheets(): Promise<Record<number, string>> {
  try {
    const appsScriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;
    
    if (!appsScriptUrl) {
      return {};
    }

    const response = await fetch(`${appsScriptUrl}?action=getAllPhones`, {
      method: 'GET',
    });

    if (!response.ok) {
      return {};
    }

    const result = await response.json();
    return result.phones || {};
  } catch (error) {
    console.error('批量獲取成員電話失敗:', error);
    return {};
  }
}
