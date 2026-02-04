#!/usr/bin/env node
/**
 * 自動檢測華地產春酒 Supabase 連線與資料庫狀態
 * 使用 .env 的 VITE_SUPABASE_URL、VITE_SUPABASE_PUBLISHABLE_KEY
 * 執行：node scripts/diagnose-supabase.js
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
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function run() {
  console.log('\n=== 華地產春酒 Supabase 診斷 ===\n');

  // 1. 環境變數
  if (!url || !key) {
    console.log('❌ 環境變數缺失');
    console.log('   請確認 .env 有 VITE_SUPABASE_URL、VITE_SUPABASE_PUBLISHABLE_KEY');
    return;
  }
  const projectId = url.replace(/^https:\/\//, '').split('.')[0];
  console.log(`✓ 專案：${projectId}`);
  console.log(`  URL: ${url}\n`);

  const supabase = createClient(url, key);
  const huadrink = supabase.schema('huadrink');

  // 2. 查詢 system_settings
  console.log('2. 查詢 system_settings...');
  const startSettings = Date.now();
  try {
    const { data: settingsData, error: settingsErr } = await huadrink
      .from('system_settings')
      .select('key, value');
    const ms = Date.now() - startSettings;
    if (settingsErr) {
      console.log(`   ❌ 失敗: ${settingsErr.message}`);
      console.log(`   code: ${settingsErr.code}`);
    } else {
      console.log(`   ✓ 成功 (${ms}ms)，筆數: ${settingsData?.length ?? 0}`);
      if (settingsData?.length) {
        const keys = settingsData.slice(0, 5).map((r) => r.key).join(', ');
        console.log(`   範例 key: ${keys}${settingsData.length > 5 ? '...' : ''}`);
      }
    }
  } catch (e) {
    console.log(`   ❌ 例外: ${e.message}`);
  }

  // 3. 查詢 registrations（內部＋未付款，即內部付款頁用）
  console.log('\n3. 查詢 registrations (type=internal, pay_status=unpaid)...');
  const startReg = Date.now();
  try {
    const { data: regData, error: regErr } = await huadrink
      .from('registrations')
      .select('id, ref_code, contact_name, type, pay_status')
      .eq('type', 'internal')
      .eq('pay_status', 'unpaid')
      .order('contact_name', { ascending: true });
    const ms = Date.now() - startReg;
    if (regErr) {
      console.log(`   ❌ 失敗: ${regErr.message}`);
      console.log(`   code: ${regErr.code}`);
    } else {
      console.log(`   ✓ 成功 (${ms}ms)，筆數: ${regData?.length ?? 0}`);
      if (ms > 3000) {
        console.log(`   ⚠ 耗時較長，建議執行 supabase/add_registrations_index.sql 建立索引`);
      }
    }
  } catch (e) {
    console.log(`   ❌ 例外: ${e.message}`);
  }

  // 4. 總筆數
  console.log('\n4. 查詢 registrations 總筆數...');
  try {
    const { count, error } = await huadrink.from('registrations').select('*', { count: 'exact', head: true });
    if (error) console.log(`   ❌ ${error.message}`);
    else console.log(`   ✓ 總筆數: ${count}`);
  } catch (e) {
    console.log(`   ❌ 例外: ${e.message}`);
  }

  // 5. 檢查索引
  console.log('\n5. 索引檢查（需 service_role）...');
  console.log('   跳過（本腳本用 anon key，無法查 pg_indexes）');
  console.log('   若內部付款查詢慢，請在 Supabase SQL Editor 執行 add_registrations_index.sql\n');

  console.log('=== 診斷結束 ===\n');
}

run().catch((e) => {
  console.error('執行失敗:', e);
  process.exit(1);
});
