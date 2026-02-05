#!/usr/bin/env node
/**
 * 實測「自動分桌」與「重設桌次」是否真的寫入／清除資料庫
 * 使用與前端相同的 anon key + 管理員登入，呼叫 huadrink.registrations 的 update
 * 執行：ADMIN_EMAIL=你的信箱 ADMIN_PASSWORD=你的密碼 node scripts/test-seating-write.js
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

async function main() {
  console.log('\n=== 桌次寫入／重設 實測（與前端相同：anon + 管理員登入）===\n');

  if (!url || !anonKey) {
    console.log('❌ 缺少 VITE_SUPABASE_URL 或 VITE_SUPABASE_PUBLISHABLE_KEY');
    process.exit(1);
  }
  console.log('使用帳號:', adminEmail, '(可設 ADMIN_EMAIL / ADMIN_PASSWORD 覆寫)\n');

  const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
  const huadrink = supabase.schema('huadrink');

  // 登入
  console.log('--- 1. 管理員登入 ---');
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });
  if (authErr) {
    console.log('❌ 登入失敗:', authErr.message);
    process.exit(1);
  }
  console.log('✓ 登入成功:', authData.user?.email);

  // 取前幾筆目前無桌次的報名
  const { data: list, error: listErr } = await huadrink
    .from('registrations')
    .select('id, ref_code, type, table_no, seat_zone')
    .is('table_no', null)
    .neq('status', 'waitlist')
    .limit(5)
    .order('created_at', { ascending: false });
  if (listErr) {
    console.log('❌ 讀取報名失敗:', listErr.message);
    process.exit(1);
  }
  if (!list?.length) {
    console.log('⚠ 沒有可分配桌次的報名，跳過寫入測試');
    process.exit(0);
  }
  console.log('✓ 取得', list.length, '筆可分配報名');

  // 2. 模擬「自動分桌」：對這幾筆寫入 table_no + seat_zone
  console.log('\n--- 2. 模擬自動分桌（寫入 table_no / seat_zone）---');
  const updates = list.map((r, i) => ({
    id: r.id,
    table_no: i + 1,
    seat_zone: r.type === 'vip' ? 'vip' : r.type === 'internal' ? 'internal' : 'general',
  }));
  const results = await Promise.all(
    updates.map((u) =>
      huadrink
        .from('registrations')
        .update({ table_no: u.table_no, seat_zone: u.seat_zone })
        .eq('id', u.id)
        .select('id')
    )
  );
  const firstError = results.find((r) => r.error);
  if (firstError?.error) {
    console.log('❌ 自動分桌寫入失敗:', firstError.error.message);
    process.exit(1);
  }
  const notWritten = results.filter((r) => !Array.isArray(r.data) || r.data.length !== 1);
  if (notWritten.length > 0) {
    console.log('❌ 有', notWritten.length, '筆未寫入（RLS 可能阻擋，請確認此帳號在 huadrink.admins）');
    process.exit(1);
  }
  console.log('✓ 自動分桌：', updates.length, '筆已寫入');

  // 3. 從 DB 再讀一次確認
  const ids = updates.map((u) => u.id);
  const { data: afterAssign, error: afterErr } = await huadrink
    .from('registrations')
    .select('id, table_no, seat_zone')
    .in('id', ids);
  if (afterErr) {
    console.log('❌ 讀取驗證失敗:', afterErr.message);
    process.exit(1);
  }
  const withTable = afterAssign?.filter((r) => r.table_no != null)?.length ?? 0;
  console.log('✓ 資料庫確認：', withTable, '/', ids.length, '筆有桌次');

  // 4. 模擬「重設桌次」
  console.log('\n--- 3. 模擬重設桌次（清空 table_no / seat_zone）---');
  const { data: resetData, error: resetErr } = await huadrink
    .from('registrations')
    .update({ table_no: null, seat_zone: null })
    .in('id', ids)
    .select('id');
  if (resetErr) {
    console.log('❌ 重設失敗:', resetErr.message);
    process.exit(1);
  }
  const resetCount = Array.isArray(resetData) ? resetData.length : 0;
  if (resetCount !== ids.length) {
    console.log('❌ 重設僅更新', resetCount, '筆，預期', ids.length, '筆');
    process.exit(1);
  }
  console.log('✓ 重設桌次：', resetCount, '筆已清空');

  // 5. 再讀一次確認
  const { data: afterReset } = await huadrink
    .from('registrations')
    .select('id, table_no, seat_zone')
    .in('id', ids);
  const stillHasTable = afterReset?.filter((r) => r.table_no != null)?.length ?? 0;
  console.log('✓ 資料庫確認：', stillHasTable === 0 ? '全部已清空' : stillHasTable + ' 筆仍有桌次（異常）');

  console.log('\n=== 實測完成：寫入與重設皆成功 ===\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
