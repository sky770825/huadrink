/**
 * 一鍵設定 huadrink 新資料庫
 * 1. 建立管理員
 * 2. 匯入報名名單 CSV
 *
 * 使用前請：
 * 1. 在 .env 填入 VITE_SUPABASE_PUBLISHABLE_KEY 和 SUPABASE_SERVICE_ROLE_KEY
 *    從 https://supabase.com/dashboard/project/sqgrnowrcvspxhuudrqc/settings/api
 * 2. 在 Supabase SQL Editor 執行 supabase/huadrink-setup.sql
 * 3. 執行：ADMIN_EMAIL=xxx ADMIN_PASSWORD=xxx npm run setup-new-db
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';
import { createInterface } from 'readline';

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

function prompt(q) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((r) => rl.question(q, (a) => { rl.close(); r(a.trim()); }));
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
let email = process.env.ADMIN_EMAIL || env.ADMIN_EMAIL;
let password = process.env.ADMIN_PASSWORD || env.ADMIN_PASSWORD;

if (!url || !serviceKey) {
  console.error('請在 .env 設定 VITE_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY');
  console.error('從 https://supabase.com/dashboard/project/sqgrnowrcvspxhuudrqc/settings/api 複製');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

function parseCSV(text) {
  const lines = [];
  for (const line of text.split(/\r?\n/).filter((l) => l.trim())) {
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
        fields.push((end >= 0 ? line.slice(i, end) : line.slice(i)).trim());
        i = end >= 0 ? end + 1 : line.length;
      }
    }
    lines.push(fields);
  }
  return lines;
}

const T = { '內部夥伴（分會夥伴）': 'internal', '外部來賓': 'external', 'VIP（大咖/特邀）': 'vip' };
const D = { '一般': 'normal', '素食': 'vegetarian', '不吃牛': 'no_beef', '不吃豬': 'no_pork', '其他': 'other' };
const PM = { '轉帳': 'transfer', '現金': 'cash', '其他': 'other' };
const PS = { '已付款': 'paid', '尚未付款': 'unpaid', '審核付款': 'pending' };
const SZ = { 'VIP區': 'vip', '一般區': 'general', '內部區': 'internal' };

function parseZhDate(s) {
  if (!s?.trim()) return new Date().toISOString();
  const m = s.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s*(上午|下午)?(\d{1,2}):(\d{1,2}):(\d{1,2})/);
  if (!m) return new Date().toISOString();
  let [, y, mo, d, ap, h, min, sec] = m;
  h = parseInt(h, 10);
  if (ap === '下午' && h < 12) h += 12;
  if (ap === '上午' && h === 12) h = 0;
  return new Date(parseInt(y), parseInt(mo) - 1, parseInt(d), h, parseInt(min), parseInt(sec)).toISOString();
}

async function setupAdmin() {
  if (!email) email = await prompt('管理員 Email: ');
  if (!password) password = await prompt('管理員密碼: ');
  if (!email || !password) {
    console.error('需要 email 和 password');
    process.exit(1);
  }
  console.log('建立管理員帳號...');
  const { data: user, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError) {
    if (authError.message?.includes('already been registered')) {
      const { data: list } = await supabase.auth.admin.listUsers();
      const existing = list?.users?.find((u) => u.email === email);
      if (!existing) throw new Error('找不到該用戶');
      await supabase.schema('huadrink').from('admins').upsert({ user_id: existing.id }, { onConflict: 'user_id' });
      console.log('已將現有用戶加入 admins');
    } else throw authError;
  } else {
    await supabase.schema('huadrink').from('admins').insert({ user_id: user.user.id });
    console.log('管理員建立成功');
  }
}

async function importCSV() {
  const csvPath = resolve(process.cwd(), 'exports/報名名單_20260203_0840.csv');
  if (!existsSync(csvPath)) {
    console.error('找不到 exports/報名名單_20260203_0840.csv');
    process.exit(1);
  }
  const text = readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(text);
  if (rows.length < 2) throw new Error('CSV 無資料');
  const headers = rows[0];
  const get = (row, name) => {
    const i = headers.indexOf(name);
    return i >= 0 ? String(row[i] ?? '').trim() : '';
  };
  const data = rows.slice(1).map((row) => {
    const refCode = get(row, '報名編號') || `HUADRINK-IMPORT-${Date.now().toString(36)}`;
    const company = get(row, '公司') || '未填寫';
    const status = company === '候補登記' ? 'waitlist' : 'open';
    return {
      id: randomUUID(),
      ref_code: refCode,
      type: T[get(row, '報名類型')] || 'external',
      headcount: parseInt(get(row, '人數'), 10) || 1,
      attendee_list: [],
      company,
      title: get(row, '職稱') || null,
      contact_name: get(row, '聯絡人') || '未填寫',
      phone: get(row, '電話') || '',
      email: get(row, 'Email') || null,
      line_id: get(row, 'LINE ID') || null,
      diet: D[get(row, '飲食需求')] || 'normal',
      diet_other: get(row, '其他飲食需求') || null,
      allergy_note: get(row, '過敏備註') || null,
      photo_consent: get(row, '照片同意') === '是',
      inviter: get(row, '邀請人') || null,
      vip_note: get(row, 'VIP 備註') || null,
      invoice_needed: get(row, '需要發票') === '是',
      invoice_title: get(row, '發票抬頭') || null,
      invoice_tax_id: get(row, '統一編號') || null,
      pay_method: PM[get(row, '付款方式')] || 'transfer',
      pay_status: PS[get(row, '付款狀態')] || 'unpaid',
      pay_proof_last5: get(row, '匯款末五碼') || null,
      seat_zone: SZ[get(row, '座位區域')] || null,
      table_no: get(row, '桌號') ? parseInt(get(row, '桌號'), 10) : null,
      admin_note: get(row, '管理員備註') || null,
      status,
      created_at: parseZhDate(get(row, '建立時間')),
      updated_at: parseZhDate(get(row, '更新時間')),
    };
  });
  console.log('匯入報名名單...');
  for (let i = 0; i < data.length; i += 50) {
    const batch = data.slice(i, i + 50);
    const { error } = await supabase.schema('huadrink').from('registrations').upsert(batch, { onConflict: 'ref_code' });
    if (error) throw error;
    console.log(`  已匯入 ${Math.min(i + 50, data.length)} / ${data.length}`);
  }
  console.log('報名名單匯入完成');
}

async function main() {
  const importOnly = process.argv.includes('--import-only');
  if (!importOnly) await setupAdmin();
  await importCSV();
  console.log('\n全部完成！請用設定的帳密登入後台。');
}

main().catch((e) => {
  console.error('失敗:', e.message);
  process.exit(1);
});
