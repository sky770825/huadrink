/**
 * 匯出 Supabase 資料庫全部資料（供移轉用）
 * 使用方式：npm run export-db
 * 需在 .env 設定 SUPABASE_SERVICE_ROLE_KEY
 *
 * 輸出：exports/db-backup-YYYYMMDD-HHmmss.json
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
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

async function fetchAll(supabase, table, orderBy = 'created_at', ascending = false) {
  const rows = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(orderBy, { ascending })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    hasMore = (data?.length ?? 0) === pageSize;
    from += pageSize;
  }
  return rows;
}

const env = loadEnv();
const url = process.env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('請在 .env 設定 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const huadrink = supabase.schema('huadrink');

async function main() {
  const outDir = resolve(process.cwd(), 'exports');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
  const outPath = resolve(outDir, `huadrink-backup-${timestamp}.json`);

  console.log('正在匯出 huadrink.registrations...');
  const registrations = await fetchAll(huadrink, 'registrations');

  console.log('正在匯出 huadrink.system_settings...');
  const systemSettings = await fetchAll(huadrink, 'system_settings', 'key', true);

  console.log('正在匯出 huadrink.admins...');
  const admins = await fetchAll(huadrink, 'admins');

  const backup = {
    exportedAt: new Date().toISOString(),
    tables: {
      registrations,
      system_settings: systemSettings,
      admins,
    },
    counts: {
      registrations: registrations.length,
      system_settings: systemSettings.length,
      admins: admins.length,
    },
  };

  writeFileSync(outPath, JSON.stringify(backup, null, 2), 'utf-8');
  console.log(`\n匯出完成：${outPath}`);
  console.log(`  registrations: ${registrations.length} 筆`);
  console.log(`  system_settings: ${systemSettings.length} 筆`);
  console.log(`  admins: ${admins.length} 筆`);
}

main().catch((err) => {
  console.error('匯出失敗:', err.message);
  process.exit(1);
});
