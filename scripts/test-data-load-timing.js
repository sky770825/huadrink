#!/usr/bin/env node
/**
 * 實測後台資料讀取耗時：報名名單 vs 內部成員（DB）
 * 模擬與前端相同的 anon + 管理員登入，量測 registrations 與 internal_members 的請求時間
 * 執行：node scripts/test-data-load-timing.js
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

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

const env = loadEnv();
const url = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
const adminEmail = process.env.ADMIN_EMAIL || env.ADMIN_EMAIL || '123@admin.com';
const adminPassword = process.env.ADMIN_PASSWORD || env.ADMIN_PASSWORD || '123456';

const LIST_SELECT = 'id, ref_code, type, headcount, attendee_list, company, title, contact_name, phone, email, line_id, diet, diet_other, allergy_note, photo_consent, inviter, vip_note, invoice_needed, invoice_title, invoice_tax_id, pay_method, pay_status, pay_proof_url, pay_proof_last5, status, seat_zone, table_no, admin_note, created_at, updated_at';

async function main() {
  console.log('\n========== 後台資料讀取耗時實測 ==========\n');

  if (!url || !anonKey) {
    console.log('❌ 缺少 VITE_SUPABASE_URL 或 VITE_SUPABASE_PUBLISHABLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
  const huadrink = supabase.schema('huadrink');

  console.log('--- 管理員登入（模擬與前端相同 session）---');
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });
  if (authErr) {
    console.log('❌ 登入失敗:', authErr.message);
    process.exit(1);
  }
  console.log('✓ 已登入\n');

  const run = async (name, fn) => {
    const start = Date.now();
    try {
      await fn();
      return { name, ms: Date.now() - start, ok: true };
    } catch (e) {
      return { name, ms: Date.now() - start, ok: false, error: e.message };
    }
  };

  // 單次請求耗時
  const fetchReg = () =>
    huadrink.from('registrations').select(LIST_SELECT).order('created_at', { ascending: false });
  const fetchMembers = () =>
    huadrink.from('internal_members').select('id, name, specialty, phone').order('id', { ascending: true });

  const rounds = 3;
  const regTimes = [];
  const memberTimes = [];
  const parallelTimes = [];

  console.log(`--- 共執行 ${rounds} 輪，取平均 ---\n`);

  for (let i = 0; i < rounds; i++) {
    const r1 = await run('registrations', fetchReg);
    const r2 = await run('internal_members', fetchMembers);
    if (!r1.ok) console.warn('registrations 失敗:', r1.error);
    if (!r2.ok) console.warn('internal_members 失敗:', r2.error);
    regTimes.push(r1.ok ? r1.ms : NaN);
    memberTimes.push(r2.ok ? r2.ms : NaN);

    const pStart = Date.now();
    await Promise.all([fetchReg(), fetchMembers()]);
    parallelTimes.push(Date.now() - pStart);
  }

  const avg = (arr) => {
    const valid = arr.filter((n) => !Number.isNaN(n));
    if (valid.length === 0) return NaN;
    return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
  };

  const avgReg = avg(regTimes);
  const avgMember = avg(memberTimes);
  const avgParallel = avg(parallelTimes);

  console.log('========== 實測結果（毫秒）==========\n');
  console.log('【單一請求】');
  console.log('  報名名單 (registrations):      ', avgReg, 'ms', '(平均)');
  console.log('  內部成員 (internal_members):  ', avgMember, 'ms', '(平均)');
  console.log('');
  console.log('【並行請求（模擬後台同時載入兩筆）】');
  console.log('  兩筆並行總耗時 (max 為準):   ', avgParallel, 'ms', '(平均)');
  console.log('');
  console.log('========== 情境比較 ==========\n');
  console.log('  情境 A（MEMBERS_SOURCE = database）：後台需等「報名 + 內部成員」都回來');
  console.log('    實際等待時間 ≈', avgParallel, 'ms（兩請求並行）');
  console.log('');
  console.log('  情境 B（MEMBERS_SOURCE = static）：後台只等「報名」');
  console.log('    實際等待時間 ≈', avgReg, 'ms');
  console.log('');
  console.log('  差異：', Math.max(0, avgParallel - avgReg), 'ms', '(約', (avgMember / 1000).toFixed(2), '秒 來自內部成員)');
  console.log('');
  console.log('========== 結論 ==========\n');
  if (avgMember > avgReg) {
    console.log('  內部成員請求比報名名單慢，是影響「總等待時間」的主要因素之一。');
  } else {
    console.log('  報名名單請求較慢，內部成員為次要。');
  }
  console.log('  若改用 static 名單，可省下約', avgMember, 'ms 的請求時間。');
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
