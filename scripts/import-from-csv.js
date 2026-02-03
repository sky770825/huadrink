/**
 * 從報名名單 CSV 匯入資料到 Supabase
 * 使用方式：npm run import-csv -- exports/報名名單_20260203_0840.csv
 *
 * 需在 .env 設定 SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return {};
  const content = readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

/** 簡易 CSV 解析（支援雙引號欄位） */
function parseCSV(text) {
  const lines = [];
  const lineList = text.split(/\r?\n/).filter((l) => l.trim());
  for (const line of lineList) {
    const fields = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        let cell = '';
        i++;
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') {
            cell += '"';
            i += 2;
          } else if (line[i] === '"') {
            i++;
            break;
          } else {
            cell += line[i++];
          }
        }
        fields.push(cell);
        if (line[i] === ',') i++;
      } else {
        const end = line.indexOf(',', i);
        const cell = end >= 0 ? line.slice(i, end) : line.slice(i);
        fields.push(cell.trim());
        i = end >= 0 ? end + 1 : line.length;
      }
    }
    lines.push(fields);
  }
  return lines;
}

const LABELS_TO_TYPE = {
  '內部夥伴（分會夥伴）': 'internal',
  '外部來賓': 'external',
  'VIP（大咖/特邀）': 'vip',
};
const LABELS_TO_DIET = {
  '一般': 'normal',
  '素食': 'vegetarian',
  '不吃牛': 'no_beef',
  '不吃豬': 'no_pork',
  '其他': 'other',
};
const LABELS_TO_PAY_METHOD = { '轉帳': 'transfer', '現金': 'cash', '其他': 'other' };
const LABELS_TO_PAY_STATUS = { '已付款': 'paid', '尚未付款': 'unpaid', '審核付款': 'pending' };
const LABELS_TO_SEAT = { 'VIP區': 'vip', '一般區': 'general', '內部區': 'internal' };

function parseZhDate(s) {
  if (!s || !s.trim()) return new Date().toISOString();
  const m = s.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s*(上午|下午)?(\d{1,2}):(\d{1,2}):(\d{1,2})/);
  if (!m) return new Date().toISOString();
  let [, y, mo, d, ap, h, min, sec] = m;
  h = parseInt(h, 10);
  if (ap === '下午' && h < 12) h += 12;
  if (ap === '上午' && h === 12) h = 0;
  const dt = new Date(parseInt(y), parseInt(mo) - 1, parseInt(d), h, parseInt(min), parseInt(sec));
  return dt.toISOString();
}

const env = loadEnv();
const url = process.env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('請在 .env 設定 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const csvPath = process.argv[2] || process.env.CSV_FILE;
if (!csvPath || !existsSync(csvPath)) {
  console.error('請指定 CSV 檔案：npm run import-csv -- exports/報名名單_20260203_0840.csv');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  const text = readFileSync(csvPath, 'utf-8').replace(/\r\n/g, '\n');
  const rows = parseCSV(text);
  if (rows.length < 2) {
    console.error('CSV 無資料');
    process.exit(1);
  }
  const headers = rows[0];
  const dataRows = rows.slice(1);

  const insertData = dataRows.map((row) => {
    const get = (name) => {
      const i = headers.indexOf(name);
      return i >= 0 ? String(row[i] ?? '').trim() : '';
    };
    const refCode = get('報名編號') || `IMPORT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const typeLabel = get('報名類型');
    const type = LABELS_TO_TYPE[typeLabel] || 'external';
    const company = get('公司') || '未填寫';
    const status = company === '候補登記' ? 'waitlist' : 'open';

    return {
      id: randomUUID(),
      ref_code: refCode,
      type,
      headcount: parseInt(get('人數'), 10) || 1,
      attendee_list: [],
      company,
      title: get('職稱') || null,
      contact_name: get('聯絡人') || '未填寫',
      phone: get('電話') || '',
      email: get('Email') || null,
      line_id: get('LINE ID') || null,
      diet: LABELS_TO_DIET[get('飲食需求')] || 'normal',
      diet_other: get('其他飲食需求') || null,
      allergy_note: get('過敏備註') || null,
      photo_consent: get('照片同意') === '是',
      inviter: get('邀請人') || null,
      vip_note: get('VIP 備註') || null,
      invoice_needed: get('需要發票') === '是',
      invoice_title: get('發票抬頭') || null,
      invoice_tax_id: get('統一編號') || null,
      pay_method: LABELS_TO_PAY_METHOD[get('付款方式')] || 'transfer',
      pay_status: LABELS_TO_PAY_STATUS[get('付款狀態')] || 'unpaid',
      pay_proof_last5: get('匯款末五碼') || null,
      seat_zone: LABELS_TO_SEAT[get('座位區域')] || null,
      table_no: get('桌號') ? parseInt(get('桌號'), 10) : null,
      admin_note: get('管理員備註') || null,
      status,
      created_at: parseZhDate(get('建立時間')),
      updated_at: parseZhDate(get('更新時間')),
    };
  });

  console.log(`解析到 ${insertData.length} 筆資料，正在匯入...`);

  const batchSize = 50;
  for (let i = 0; i < insertData.length; i += batchSize) {
    const batch = insertData.slice(i, i + batchSize);
    const { error } = await supabase.from('registrations').upsert(batch, {
      onConflict: 'ref_code',
    });
    if (error) throw error;
    console.log(`  已匯入 ${Math.min(i + batchSize, insertData.length)} / ${insertData.length}`);
  }

  console.log('\n匯入完成');
}

main().catch((err) => {
  console.error('匯入失敗:', err.message);
  process.exit(1);
});
