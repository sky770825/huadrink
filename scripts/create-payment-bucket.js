/**
 * 自動建立 payment-proofs 儲存桶
 * 使用方式：npm run create-bucket
 * 需先在 .env 設定 SUPABASE_SERVICE_ROLE_KEY（從 Dashboard > Settings > API 取得 service_role key）
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
  console.error('從 Supabase Dashboard > Settings > API 複製 service_role key（注意保密）');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  try {
    const { data, error } = await supabase.storage.createBucket('payment-proofs', {
      public: true,
      fileSizeLimit: 5242880,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    });
    if (error) {
      if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
        console.log('payment-proofs bucket 已存在，略過');
        process.exit(0);
      }
      throw error;
    }
    console.log('payment-proofs bucket 建立成功');
  } catch (err) {
    console.error('建立失敗:', err.message);
    process.exit(1);
  }
}

main();
