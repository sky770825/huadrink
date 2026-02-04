/**
 * 在新資料庫建立管理員帳號
 * 使用方式：
 *   ADMIN_EMAIL=你的信箱 ADMIN_PASSWORD=你的密碼 npm run setup-admin
 * 或：
 *   npm run setup-admin
 *   （會提示輸入，或從 .env 讀取 ADMIN_EMAIL、ADMIN_PASSWORD）
 *
 * 需在 .env 設定：
 *   - VITE_SUPABASE_URL（或 SUPABASE_URL）指向新專案
 *   - SUPABASE_SERVICE_ROLE_KEY 為新專案的 service_role key
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
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

function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

const env = loadEnv();
const url = process.env.SUPABASE_URL || env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
let email = process.env.ADMIN_EMAIL || env.ADMIN_EMAIL;
let password = process.env.ADMIN_PASSWORD || env.ADMIN_PASSWORD;

if (!url || !serviceKey) {
  console.error('請在 .env 設定 VITE_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY（新專案）');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  if (!email) email = await prompt('管理員 Email: ');
  if (!password) password = await prompt('管理員密碼: ');
  if (!email || !password) {
    console.error('請提供 email 和 password');
    process.exit(1);
  }

  console.log('正在建立管理員帳號...');
  const { data: user, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    if (authError.message?.includes('already been registered')) {
      console.log('此信箱已存在，改為更新密碼並加入 admins...');
      const { data: list } = await supabase.auth.admin.listUsers();
      const existing = list?.users?.find((u) => u.email === email);
      if (!existing) {
        console.error('找不到該用戶');
        process.exit(1);
      }
      const userId = existing.id;
      // 重設密碼（確保可登入）
      const { error: pwdError } = await supabase.auth.admin.updateUserById(userId, { password });
      if (pwdError) {
        console.warn('密碼更新失敗（可能密碼相同）:', pwdError.message);
      } else {
        console.log('已重設密碼');
      }
      const { error: insertError } = await supabase.schema('huadrink').from('admins').upsert(
        { user_id: userId },
        { onConflict: 'user_id' }
      );
      if (insertError) throw insertError;
      console.log('已確認 admins 表');
    } else {
      throw authError;
    }
  } else {
    const userId = user.user.id;
    const { error: insertError } = await supabase.schema('huadrink').from('admins').insert({ user_id: userId });
    if (insertError) throw insertError;
    console.log('管理員帳號建立成功');
  }
  console.log(`Email: ${email}`);
  console.log('請用此帳密登入後台');
}

main().catch((err) => {
  console.error('失敗:', err.message);
  process.exit(1);
});
