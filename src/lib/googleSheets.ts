import type { Registration } from '@/types/registration';
import { 
  REGISTRATION_TYPE_LABELS, 
  DIET_TYPE_LABELS, 
  PAYMENT_METHOD_LABELS, 
  PAYMENT_STATUS_LABELS,
  SEAT_ZONE_LABELS 
} from '@/lib/constants';
import { getMemberByContactName } from '@/lib/members';

// Google Sheets API 配置
const GOOGLE_SHEETS_API_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
const SPREADSHEET_ID = '1cT3VJcDHyqHUEEdRfb7b9zMifBJk6f6upujGYV9dj4U';
const SHEET_NAME = '工作表1'; // 或使用 gid=0

/**
 * 將註冊資料格式化為 Google Sheets 行格式
 */
function formatRegistrationForSheet(reg: Registration, index: number): string[] {
  // 格式化參與者名單
  const attendees = reg.attendee_list.map(a => {
    if (a.phone) {
      return `${a.name} (${a.phone})`;
    }
    return a.name;
  }).join('、');

  const internalMember = reg.type === 'internal' ? getMemberByContactName(reg.contact_name) : undefined;

  return [
    (index + 1).toString(), // 序號
    reg.ref_code, // 報名編號
    REGISTRATION_TYPE_LABELS[reg.type] || reg.type, // 報名類型
    reg.headcount.toString(), // 人數
    attendees, // 參與者名單
    reg.company, // 公司
    reg.title || '', // 職稱
    reg.contact_name, // 聯絡人
    reg.type === 'internal' && internalMember ? internalMember.id.toString() : '', // 內部編號
    reg.phone, // 電話
    reg.email || '', // Email
    reg.line_id || '', // LINE ID
    DIET_TYPE_LABELS[reg.diet] || reg.diet, // 飲食需求
    reg.diet_other || '', // 其他飲食需求
    reg.allergy_note || '', // 過敏備註
    reg.photo_consent ? '是' : '否', // 照片同意
    reg.inviter || '', // 邀請人
    reg.vip_note || '', // VIP 備註
    reg.invoice_needed ? '是' : '否', // 需要發票
    reg.invoice_title || '', // 發票抬頭
    reg.invoice_tax_id || '', // 統一編號
    PAYMENT_METHOD_LABELS[reg.pay_method] || reg.pay_method, // 付款方式
    PAYMENT_STATUS_LABELS[reg.pay_status] || reg.pay_status, // 付款狀態
    reg.pay_proof_last5 || '', // 匯款末五碼
    reg.seat_zone ? SEAT_ZONE_LABELS[reg.seat_zone] : '', // 座位區域
    reg.table_no?.toString() || '', // 桌號
    reg.admin_note || '', // 管理員備註
    new Date(reg.created_at).toLocaleString('zh-TW'), // 建立時間
    new Date(reg.updated_at).toLocaleString('zh-TW'), // 更新時間
  ];
}

/**
 * 生成表頭
 */
function generateHeaders(): string[] {
  return [
    '序號',
    '報名編號',
    '報名類型',
    '人數',
    '參與者名單',
    '公司',
    '職稱',
    '聯絡人',
    '內部編號',
    '電話',
    'Email',
    'LINE ID',
    '飲食需求',
    '其他飲食需求',
    '過敏備註',
    '照片同意',
    '邀請人',
    'VIP 備註',
    '需要發票',
    '發票抬頭',
    '統一編號',
    '付款方式',
    '付款狀態',
    '匯款末五碼',
    '座位區域',
    '桌號',
    '管理員備註',
    '建立時間',
    '更新時間',
  ];
}

/**
 * 使用 Supabase Edge Function 同步資料到 Google Sheets
 * 這是推薦的方式，因為可以安全地處理 API Key
 */
export async function syncToGoogleSheets(
  registrations: Registration[],
  apiKey?: string,
  useAppsScript?: boolean
): Promise<{ success: boolean; message: string }> {
  try {
    // 如果明確指定使用 Apps Script，或沒有提供 API Key，優先使用 Google Apps Script
    if (useAppsScript || !apiKey) {
      const result = await syncViaAppsScript(registrations);
      if (result.success) {
        return result;
      }
      // 如果 Apps Script 失敗且沒有提供 API Key，返回錯誤
      if (!apiKey) {
        return result;
      }
    }

    // 優先使用 Supabase Edge Function（需要登入）
    const edgeFunctionUrl = import.meta.env.VITE_SUPABASE_URL 
      ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-google-sheets`
      : null;

    if (edgeFunctionUrl && !useAppsScript) {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
          },
        });

        if (response.ok) {
          const result = await response.json();
          return {
            success: result.success,
            message: result.message || `成功同步 ${result.count || registrations.length} 筆資料`,
          };
        }
      }
    }

    // 如果 Edge Function 不可用，使用 Google Apps Script
    if (!apiKey) {
      return await syncViaAppsScript(registrations);
    }

    // 直接使用 Google Sheets API（不推薦，因為會暴露 API Key）
    const values: string[][] = [
      generateHeaders(),
      ...registrations.map((reg, index) => formatRegistrationForSheet(reg, index)),
    ];

    const range = `${SHEET_NAME}!A1`;
    const url = `${GOOGLE_SHEETS_API_URL}/${SPREADSHEET_ID}/values/${range}?valueInputOption=RAW&insertDataOption=OVERWRITE&key=${apiKey}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || '同步失敗');
    }

    return {
      success: true,
      message: `成功同步 ${registrations.length} 筆資料到 Google Sheets`,
    };
  } catch (error) {
    console.error('Google Sheets 同步錯誤:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '同步失敗，請稍後再試',
    };
  }
}

/**
 * 透過 Google Apps Script Web App 同步資料
 * 這是一個替代方案，不需要 API Key，但需要設置 Google Apps Script
 */
async function syncViaAppsScript(registrations: Registration[]): Promise<{ success: boolean; message: string }> {
  try {
    // 準備資料
    const values: string[][] = [
      generateHeaders(),
      ...registrations.map((reg, index) => formatRegistrationForSheet(reg, index)),
    ];

    // 這裡需要一個 Google Apps Script Web App URL
    // 用戶需要先設置 Google Apps Script
    const appsScriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;

    if (!appsScriptUrl) {
      // 如果沒有設置 Apps Script URL，返回 CSV 格式供手動匯入
      return {
        success: false,
        message: '請設置 Google Apps Script URL 或使用 API Key。已生成 CSV 格式資料。',
      };
    }

    console.log('開始同步到 Google Sheets，資料筆數:', registrations.length);
    console.log('Google Apps Script URL:', appsScriptUrl);
    console.log('Spreadsheet ID:', SPREADSHEET_ID);
    console.log('Sheet Name:', SHEET_NAME);
    console.log('資料行數:', values.length);

    const requestBody = {
      spreadsheetId: SPREADSHEET_ID,
      sheetName: SHEET_NAME,
      values,
    };
    
    console.log('請求資料大小:', JSON.stringify(requestBody).length, 'bytes');

    // 使用 fetch 發送請求
    // 注意：Google Apps Script Web App 需要正確部署才能處理 CORS
    // 如果遇到 CORS 錯誤，請確認「具有存取權的使用者」設為「任何人」
    const response = await fetch(appsScriptUrl, {
      method: 'POST',
      mode: 'cors', // 明確指定 CORS 模式
      headers: {
        'Content-Type': 'application/json',
      },
      redirect: 'follow',
      body: JSON.stringify(requestBody),
    });

    console.log('Google Apps Script 響應狀態:', response.status, response.statusText);

    // Google Apps Script 可能會返回重定向，需要處理
    const responseText = await response.text();
    console.log('Google Apps Script 響應內容:', responseText.substring(0, 500));
    
    let result;
    
    try {
      result = JSON.parse(responseText);
      console.log('解析後的結果:', result);
    } catch (parseError) {
      console.error('解析 JSON 失敗:', parseError);
      console.error('原始響應:', responseText);
      
      // 如果不是 JSON，可能是 HTML 錯誤頁面
      if (responseText.includes('doGet') || responseText.includes('doPost')) {
        throw new Error('Google Apps Script 函數未正確設置。請確認已部署 doPost 函數。');
      }
      if (responseText.includes('Moved Temporarily') || responseText.includes('302')) {
        // 嘗試從 HTML 中提取重定向 URL
        const redirectMatch = responseText.match(/HREF="([^"]+)"/);
        if (redirectMatch) {
          throw new Error(`Google Apps Script 返回重定向。請更新 .env 文件中的 VITE_GOOGLE_APPS_SCRIPT_URL 為: ${redirectMatch[1]}`);
        }
        throw new Error('Google Apps Script URL 可能需要更新。請重新部署並獲取新的 URL。');
      }
      if (responseText.includes('Error') || responseText.includes('error')) {
        throw new Error(`Google Apps Script 錯誤: ${responseText.substring(0, 300)}`);
      }
      throw new Error(`Google Apps Script 返回了無效的響應: ${responseText.substring(0, 200)}`);
    }

    // 檢查響應狀態
    if (response.status === 404 || responseText.includes('找不到網頁') || responseText.includes('無法開啟這個檔案')) {
      throw new Error('Google Apps Script 未找到或未正確部署。請確認：\n1. 已將代碼部署為「網頁應用程式」\n2. 執行身分設為「我」\n3. 具有存取權的使用者設為「任何人」\n4. 已複製最新的部署 URL');
    }

    if (!response.ok) {
      throw new Error(`HTTP 錯誤 ${response.status}: ${result?.error || result?.message || responseText.substring(0, 200)}`);
    }

    if (!result || !result.success) {
      throw new Error(result?.error || result?.message || '同步失敗：未收到成功響應');
    }

    return {
      success: true,
      message: result.message || `成功同步 ${registrations.length} 筆資料到 Google Sheets`,
    };
  } catch (error) {
    console.error('Google Apps Script 同步錯誤:', error);
    
    // 檢查是否為 CORS 錯誤
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      return {
        success: false,
        message: 'CORS 錯誤：請確認 Google Apps Script 已正確部署。\n1. 點擊「部署」>「新增部署作業」\n2. 選擇「網頁應用程式」\n3. 「具有存取權的使用者」設為「任何人」\n4. 重新部署並更新 URL',
      };
    }
    
    return {
      success: false,
      message: error instanceof Error ? error.message : '同步失敗，請稍後再試',
    };
  }
}

/**
 * 生成 CSV 格式的資料（作為備用方案）
 */
export function generateCSV(registrations: Registration[]): string {
  const headers = generateHeaders();
  const rows = registrations.map((reg, index) => formatRegistrationForSheet(reg, index));
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * 下載 CSV 檔案
 */
export function downloadCSV(registrations: Registration[], filename = '春酒報名名單.csv'): void {
  const csv = generateCSV(registrations);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // 添加 BOM 以支持中文
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
