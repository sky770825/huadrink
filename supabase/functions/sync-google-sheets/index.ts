// Supabase Edge Function: 同步資料到 Google Sheets
// 使用方式: 在 Supabase Dashboard 中部署此函數

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GOOGLE_SHEETS_API_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
const SPREADSHEET_ID = Deno.env.get('GOOGLE_SHEETS_SPREADSHEET_ID') || '1cT3VJcDHyqHUEEdRfb7b9zMifBJk6f6upujGYV9dj4U';
const SHEET_NAME = '工作表1';

interface Registration {
  id: string;
  ref_code: string;
  type: string;
  headcount: number;
  attendee_list: Array<{ name: string; phone?: string }>;
  company: string;
  title?: string;
  contact_name: string;
  phone: string;
  email?: string;
  line_id?: string;
  diet: string;
  diet_other?: string;
  allergy_note?: string;
  photo_consent: boolean;
  inviter?: string;
  vip_note?: string;
  invoice_needed: boolean;
  invoice_title?: string;
  invoice_tax_id?: string;
  pay_method: string;
  pay_status: string;
  seat_zone?: string;
  table_no?: number;
  admin_note?: string;
  created_at: string;
  updated_at: string;
}

const LABELS = {
  type: { internal: '內部夥伴（分會夥伴）', external: '外部來賓', vip: 'VIP（大咖/特邀）' },
  diet: { normal: '一般', vegetarian: '素食', no_beef: '不吃牛', no_pork: '不吃豬', other: '其他' },
  pay_method: { transfer: '轉帳', cash: '現金', other: '其他' },
  pay_status: { paid: '已付款', unpaid: '尚未付款' },
  seat_zone: { vip: 'VIP區', general: '一般區', internal: '內部區' },
};

function formatRegistration(reg: Registration, index: number): string[] {
  const attendees = reg.attendee_list.map(a => 
    a.phone ? `${a.name} (${a.phone})` : a.name
  ).join('、');

  return [
    (index + 1).toString(),
    reg.ref_code,
    LABELS.type[reg.type as keyof typeof LABELS.type] || reg.type,
    reg.headcount.toString(),
    attendees,
    reg.company,
    reg.title || '',
    reg.contact_name,
    reg.phone,
    reg.email || '',
    reg.line_id || '',
    LABELS.diet[reg.diet as keyof typeof LABELS.diet] || reg.diet,
    reg.diet_other || '',
    reg.allergy_note || '',
    reg.photo_consent ? '是' : '否',
    reg.inviter || '',
    reg.vip_note || '',
    reg.invoice_needed ? '是' : '否',
    reg.invoice_title || '',
    reg.invoice_tax_id || '',
    LABELS.pay_method[reg.pay_method as keyof typeof LABELS.pay_method] || reg.pay_method,
    LABELS.pay_status[reg.pay_status as keyof typeof LABELS.pay_status] || reg.pay_status,
    reg.seat_zone ? (LABELS.seat_zone[reg.seat_zone as keyof typeof LABELS.seat_zone] || '') : '',
    reg.table_no?.toString() || '',
    reg.admin_note || '',
    new Date(reg.created_at).toLocaleString('zh-TW'),
    new Date(reg.updated_at).toLocaleString('zh-TW'),
  ];
}

function generateHeaders(): string[] {
  return [
    '序號', '報名編號', '報名類型', '人數', '參與者名單', '公司', '職稱',
    '聯絡人', '電話', 'Email', 'LINE ID', '飲食需求', '其他飲食需求',
    '過敏備註', '照片同意', '邀請人', 'VIP 備註', '需要發票', '發票抬頭',
    '統一編號', '付款方式', '付款狀態', '座位區域', '桌號', '管理員備註',
    '建立時間', '更新時間',
  ];
}

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // 驗證認證
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: '缺少認證標頭' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 初始化 Supabase 客戶端
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // 驗證用戶
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: '認證失敗' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 獲取所有註冊資料
    const { data: registrations, error: dbError } = await supabase
      .from('registrations')
      .select('*')
      .order('created_at', { ascending: false });

    if (dbError) throw dbError;
    if (!registrations || registrations.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: '沒有資料需要同步' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 準備資料
    const values = [
      generateHeaders(),
      ...registrations.map((reg, index) => formatRegistration(reg as Registration, index)),
    ];

    // 使用 Google Sheets API
    const apiKey = Deno.env.get('GOOGLE_SHEETS_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          error: '未設置 GOOGLE_SHEETS_API_KEY 環境變數',
          hint: '請在 Supabase Dashboard 的 Edge Functions 設定中添加此環境變數'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 先清空現有資料（可選）
    const clearRange = `${SHEET_NAME}!A2:Z1000`;
    const clearUrl = `${GOOGLE_SHEETS_API_URL}/${SPREADSHEET_ID}/values/${clearRange}?valueInputOption=RAW&key=${apiKey}`;
    
    await fetch(clearUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [] }),
    });

    // 寫入新資料
    const range = `${SHEET_NAME}!A1`;
    const appendUrl = `${GOOGLE_SHEETS_API_URL}/${SPREADSHEET_ID}/values/${range}?valueInputOption=RAW&insertDataOption=OVERWRITE&key=${apiKey}`;

    const response = await fetch(appendUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Google Sheets API 錯誤');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `成功同步 ${registrations.length} 筆資料到 Google Sheets`,
        count: registrations.length,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : '未知錯誤',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
