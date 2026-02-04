#!/usr/bin/env node
/**
 * 檢查所有環境變數並執行自動化腳本，確保可通過
 * 執行：npm run check-all-env
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { spawn } from 'child_process';

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

const REQUIRED = {
  'VITE_SUPABASE_URL': '前端與腳本連線 Supabase',
  'VITE_SUPABASE_PUBLISHABLE_KEY': '前端 anon key（diagnose-supabase 用）',
  'SUPABASE_SERVICE_ROLE_KEY': 'setup-admin、export-db、import、create-bucket 用',
};

const OPTIONAL = {
  'VITE_GOOGLE_APPS_SCRIPT_URL': 'Google 表單整合',
  'ADMIN_EMAIL': 'setup-admin 預填',
  'ADMIN_PASSWORD': 'setup-admin 預填',
};

function check(name, envMap) {
  const val = process.env[name] || envMap[name];
  return !!val && String(val).trim().length > 0;
}

function runScript(scriptPath, args = [], extraEnv = {}) {
  return new Promise((resolve) => {
    const proc = spawn('node', [scriptPath, ...args], {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, ...env, ...extraEnv },
    });
    proc.on('close', (code) => resolve(code === 0));
  });
}

async function main() {
  console.log('\n=== 華地產春酒 環境變數與腳本檢查 ===\n');

  // 1. 必要變數
  let ok = true;
  for (const [key, desc] of Object.entries(REQUIRED)) {
    const has = check(key, env);
    console.log(has ? '✓' : '✗', key, has ? '' : ` (缺失：${desc})`);
    if (!has) ok = false;
  }
  for (const [key] of Object.entries(OPTIONAL)) {
    const has = check(key, env);
    if (has) console.log('✓', key, '(選填，已設定)');
  }

  if (!ok) {
    console.log('\n請在專案根目錄 .env 補齊上述變數後重新執行。\n');
    process.exit(1);
  }

  // 驗證 URL 格式
  const url = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (url && !url.includes('supabase.co')) {
    console.log('\n⚠ VITE_SUPABASE_URL 格式可能錯誤，應為 https://xxx.supabase.co\n');
  }
  const projectId = url?.replace(/^https:\/\//, '').split('.')[0] || '';
  console.log('\n專案 ID:', projectId || '(無法解析)');

  // 2. 執行 diagnose-supabase
  console.log('\n--- 1. diagnose-supabase ---');
  const diagOk = await runScript(resolve(process.cwd(), 'scripts/diagnose-supabase.js'));
  if (!diagOk) {
    console.log('❌ diagnose-supabase 未通過\n');
    process.exit(1);
  }
  console.log('✓ diagnose-supabase 通過\n');

  // 3. 執行 setup-admin（非互動，使用 env）
  console.log('--- 2. setup-admin（非互動驗證）---');
  const setupOk = await runScript(resolve(process.cwd(), 'scripts/setup-admin.js'), [], {
    ADMIN_EMAIL: env.ADMIN_EMAIL || '123@admin.com',
    ADMIN_PASSWORD: env.ADMIN_PASSWORD || '123456',
  });
  if (!setupOk) {
    console.log('❌ setup-admin 未通過\n');
    process.exit(1);
  }
  console.log('✓ setup-admin 通過\n');

  // 4. 執行 export-db
  console.log('--- 3. export-db ---');
  const exportOk = await runScript(resolve(process.cwd(), 'scripts/export-database.js'));
  if (!exportOk) {
    console.log('❌ export-db 未通過\n');
    process.exit(1);
  }
  console.log('✓ export-db 通過\n');

  // 5. 執行 create-payment-bucket
  console.log('--- 4. create-bucket ---');
  const bucketOk = await runScript(resolve(process.cwd(), 'scripts/create-payment-bucket.js'));
  if (!bucketOk) {
    console.log('❌ create-bucket 未通過\n');
    process.exit(1);
  }
  console.log('✓ create-bucket 通過\n');

  // import-csv、import-db 需要額外參數，跳過
  console.log('--- import-csv / import-db ---');
  console.log('   (需指定檔案，跳過自動檢查)');

  console.log('\n=== 全部檢查通過 ===\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
