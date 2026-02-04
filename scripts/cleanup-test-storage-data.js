/**
 * 清理測試付款憑證資料（測試成員Storage）
 * 使用方式：node scripts/cleanup-test-storage-data.js
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
  console.error('請設定 .env 的 VITE_SUPABASE_URL 與 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  // 查詢測試成員
  const { data: regs, error: fetchErr } = await supabase
    .schema('huadrink')
    .from('registrations')
    .select('id, contact_name, pay_proof_url')
    .eq('contact_name', '測試成員Storage');

  if (fetchErr) {
    console.error('查詢失敗:', fetchErr.message);
    process.exit(1);
  }

  if (!regs?.length) {
    console.log('無測試成員資料需清理');
    return;
  }

  for (const reg of regs) {
    // 刪除 Storage 檔案（路徑從 pay_proof_url 解析或使用 id/proof.*）
    if (reg.pay_proof_url) {
      const match = reg.pay_proof_url.match(/payment-proofs\/([^/]+\/proof\.\w+)/);
      if (match) {
        const path = match[1];
        await supabase.storage.from('payment-proofs').remove([path]);
        console.log('已刪除 Storage:', path);
      }
    }
    await supabase.schema('huadrink').from('registrations').delete().eq('id', reg.id);
    console.log('已刪除報名:', reg.id);
  }
  console.log('清理完成');
}

main();
