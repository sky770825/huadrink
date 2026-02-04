#!/usr/bin/env node
/**
 * 檢查「管理登錄」與「前端內部付款」能否正常讀取名單
 * 執行：npm run verify-login-payment
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
  console.log('\n=== 管理登錄 & 內部付款 驗證 ===\n');

  if (!url || !anonKey) {
    console.log('❌ 缺少 VITE_SUPABASE_URL 或 VITE_SUPABASE_PUBLISHABLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
  const huadrink = supabase.schema('huadrink');

  // 1. 管理登錄
  console.log('--- 1. 管理登錄 ---');
  try {
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });
    if (authErr) {
      console.log('❌ 登入失敗:', authErr.message);
      process.exit(1);
    }
    const user = authData?.user;
    if (!user) {
      console.log('❌ 無法取得使用者');
      process.exit(1);
    }
    console.log('✓ Auth 登入成功:', user.email);

    const { data: adminData, error: adminErr } = await huadrink
      .from('admins')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (adminErr || !adminData) {
      console.log('❌ 讀取 admins 失敗:', adminErr?.message || '此帳號不在管理員名單');
      await supabase.auth.signOut();
      process.exit(1);
    }
    console.log('✓ 管理員權限驗證通過\n');
    await supabase.auth.signOut();
  } catch (e) {
    console.log('❌ 管理登錄檢查失敗:', e.message);
    process.exit(1);
  }

  // 2. 前端內部付款（報名名單）
  console.log('--- 2. 前端內部付款 - 讀取報名名單 ---');
  try {
    const start = Date.now();
    const { data, error } = await huadrink
      .from('registrations')
      .select('id, ref_code, contact_name, type, pay_status')
      .eq('type', 'internal')
      .eq('pay_status', 'unpaid')
      .order('contact_name', { ascending: true });
    const ms = Date.now() - start;

    if (error) {
      console.log('❌ 讀取失敗:', error.message);
      process.exit(1);
    }
    const count = data?.length ?? 0;
    console.log(`✓ 成功讀取 (${ms}ms)，筆數: ${count}`);
    if (count > 0) {
      console.log(`  範例: ${data.slice(0, 3).map((r) => `${r.contact_name} (${r.ref_code})`).join(', ')}`);
    }
    console.log('');
  } catch (e) {
    console.log('❌ 內部付款名單檢查失敗:', e.message);
    process.exit(1);
  }

  console.log('=== 全部通過 ===\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
