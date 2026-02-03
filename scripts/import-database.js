/**
 * 從備份 JSON 匯入資料到 Supabase（移轉用）
 * 使用方式：npm run import-db -- exports/db-backup-YYYYMMDD-HHmmss.json
 * 或：node scripts/import-database.js exports/db-backup-xxxxx.json
 *
 * 注意：
 * 1. 目標專案需先執行完所有 migration
 * 2. admins 表依賴 auth.users，新專案需先建立相同 user_id 的用戶
 * 3. 預設會清空目標表後再匯入，請確認 .env 指向正確專案
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
const url = process.env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('請在 .env 設定 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const backupPath = process.argv[2] || process.env.BACKUP_FILE;
if (!backupPath || !existsSync(backupPath)) {
  console.error('請指定備份檔案：npm run import-db -- exports/db-backup-xxxxx.json');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const huadrink = supabase.schema('huadrink');

async function main() {
  const backup = JSON.parse(readFileSync(backupPath, 'utf-8'));
  const { tables } = backup;

  // 1. system_settings（先處理，因為其他功能可能依賴）
  if (tables.system_settings?.length) {
    console.log('匯入 huadrink.system_settings...');
    const { error } = await huadrink.from('system_settings').upsert(
      tables.system_settings.map((r) => ({
        id: r.id,
        key: r.key,
        value: r.value,
        updated_at: r.updated_at,
      })),
      { onConflict: 'key' }
    );
    if (error) throw error;
    console.log(`  完成 ${tables.system_settings.length} 筆`);
  }

  // 2. registrations
  if (tables.registrations?.length) {
    console.log('匯入 huadrink.registrations...');
    const { error } = await huadrink.from('registrations').upsert(
      tables.registrations.map((r) => ({
        id: r.id,
        ref_code: r.ref_code,
        type: r.type,
        headcount: r.headcount,
        attendee_list: r.attendee_list,
        company: r.company,
        title: r.title,
        contact_name: r.contact_name,
        phone: r.phone,
        email: r.email,
        line_id: r.line_id,
        diet: r.diet,
        diet_other: r.diet_other,
        allergy_note: r.allergy_note,
        photo_consent: r.photo_consent,
        inviter: r.inviter,
        vip_note: r.vip_note,
        invoice_needed: r.invoice_needed,
        invoice_title: r.invoice_title,
        invoice_tax_id: r.invoice_tax_id,
        pay_method: r.pay_method,
        pay_status: r.pay_status,
        pay_proof_url: r.pay_proof_url ?? null,
        pay_proof_base64: r.pay_proof_base64 ?? null,
        pay_proof_last5: r.pay_proof_last5 ?? null,
        status: r.status,
        seat_zone: r.seat_zone,
        table_no: r.table_no,
        admin_note: r.admin_note,
        created_at: r.created_at,
        updated_at: r.updated_at,
      })),
      { onConflict: 'id' }
    );
    if (error) throw error;
    console.log(`  完成 ${tables.registrations.length} 筆`);
  }

  // 3. admins（需目標專案 auth.users 已有對應 user_id）
  if (tables.admins?.length) {
    console.log('匯入 huadrink.admins...');
    const { error } = await huadrink.from('admins').upsert(
      tables.admins.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        created_at: r.created_at,
      })),
      { onConflict: 'user_id' }
    );
    if (error) {
      console.warn('  admins 匯入失敗（可能目標專案 auth 用戶尚未建立）:', error.message);
    } else {
      console.log(`  完成 ${tables.admins.length} 筆`);
    }
  }

  console.log('\n匯入完成');
}

main().catch((err) => {
  console.error('匯入失敗:', err.message);
  process.exit(1);
});
