/**
 * E2E 實測：內部成員流程
 * 1. 報名（內部成員：郭哲宇）
 * 2. 上傳付款憑證圖片
 * 3. 刪除圖片（恢復未付款狀態）
 * 4. 刪除測試訂單
 *
 * 使用：node scripts/e2e-test-internal-flow.js
 * 選用：--keep 保留測試資料不刪除
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
const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error('請在 .env 設定 VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAnon = createClient(url, anonKey, { auth: { persistSession: false } });
const supabaseAdmin = createClient(url, serviceKey, { auth: { persistSession: false } });

// 內部成員：郭哲宇（與 internal_members 一致）
const TEST_CONTACT_NAME = '郭哲宇';
const TEST_PHONE = '0912000001';
const TEST_LAST5 = '67890';
const TEST_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const TEST_IMAGE_BUFFER = Buffer.from(TEST_IMAGE_BASE64, 'base64');

let testRegistrationId = null;
const keepTestData = process.argv.includes('--keep');

async function main() {
  console.log('=== E2E 實測：內部成員（報名 → 上傳 → 刪除圖片 → 刪除訂單）===\n');

  try {
    // ── 1. 報名 ─────────────────────────────────────────────────
    console.log('1. 報名（內部成員：' + TEST_CONTACT_NAME + '）...');
    const refCode = 'E2E-' + Date.now();
    const { data: insertData, error: insertErr } = await supabaseAnon
      .schema('huadrink')
      .from('registrations')
      .insert({
        ref_code: refCode,
        type: 'internal',
        headcount: 1,
        attendee_list: [],
        company: 'E2E測試公司',
        contact_name: TEST_CONTACT_NAME,
        phone: TEST_PHONE,
        email: 'e2e@test.local',
        diet: 'normal',
        photo_consent: true,
        pay_method: 'transfer',
        pay_status: 'unpaid',
        pay_proof_url: null,
        status: 'open',
      })
      .select('id, ref_code, contact_name, pay_status')
      .single();

    if (insertErr) {
      throw new Error('報名失敗: ' + insertErr.message);
    }
    testRegistrationId = insertData.id;
    console.log('   報名 ID:', testRegistrationId);
    console.log('   報名編號:', insertData.ref_code);
    console.log('   聯絡人:', insertData.contact_name);
    console.log('   付款狀態:', insertData.pay_status);

    // ── 2. 上傳圖片 ─────────────────────────────────────────────
    console.log('\n2. 上傳付款憑證圖片...');
    const path = `${testRegistrationId}/proof.png`;
    const { data: uploadData, error: uploadErr } = await supabaseAnon.storage
      .from('payment-proofs')
      .upload(path, TEST_IMAGE_BUFFER, { upsert: true, contentType: 'image/png' });

    if (uploadErr) {
      throw new Error('Storage 上傳失敗: ' + uploadErr.message);
    }
    const { data: urlData } = supabaseAnon.storage.from('payment-proofs').getPublicUrl(uploadData.path);
    const payProofUrl = urlData.publicUrl;

    const { error: rpcErr } = await supabaseAnon.schema('huadrink').rpc('submit_payment_proof', {
      p_registration_id: testRegistrationId,
      p_pay_proof_url: payProofUrl,
      p_pay_proof_last5: TEST_LAST5,
      p_pay_proof_base64: null,
    });
    if (rpcErr) {
      throw new Error('submit_payment_proof 失敗: ' + rpcErr.message);
    }
    console.log('   上傳路徑:', uploadData.path);
    console.log('   已呼叫 submit_payment_proof，狀態應為 pending');

    const { data: afterUpload } = await supabaseAnon
      .schema('huadrink')
      .from('registrations')
      .select('pay_proof_url, pay_status')
      .eq('id', testRegistrationId)
      .single();
    if (afterUpload?.pay_status !== 'pending') {
      throw new Error('上傳後 pay_status 應為 pending，實際: ' + afterUpload?.pay_status);
    }
    console.log('   驗證: pay_status = pending ✓');

    // ── 3. 刪除圖片（恢復狀態）─────────────────────────────────
    console.log('\n3. 刪除圖片（恢復未付款狀態）...');
    const { error: delStorageErr } = await supabaseAdmin.storage
      .from('payment-proofs')
      .remove([path]);
    if (delStorageErr) {
      console.warn('   Storage 刪除檔案:', delStorageErr.message);
    } else {
      console.log('   已從 Storage 刪除檔案');
    }

    const { error: clearErr } = await supabaseAdmin
      .schema('huadrink')
      .from('registrations')
      .update({
        pay_proof_url: null,
        pay_proof_last5: null,
        pay_proof_base64: null,
        pay_status: 'unpaid',
      })
      .eq('id', testRegistrationId);

    if (clearErr) {
      throw new Error('清除付款憑證失敗: ' + clearErr.message);
    }
    console.log('   已清除 pay_proof_* 並將 pay_status 設為 unpaid');

    const { data: afterClear } = await supabaseAnon
      .schema('huadrink')
      .from('registrations')
      .select('pay_proof_url, pay_proof_last5, pay_status')
      .eq('id', testRegistrationId)
      .single();
    if (afterClear?.pay_status !== 'unpaid' || afterClear?.pay_proof_url != null) {
      throw new Error('恢復後應為 unpaid 且無憑證，實際 pay_status=' + afterClear?.pay_status + ' pay_proof_url=' + afterClear?.pay_proof_url);
    }
    console.log('   驗證: pay_status = unpaid, pay_proof_url = null ✓');

    // ── 4. 刪除測試訂單 ─────────────────────────────────────────
    if (keepTestData) {
      console.log('\n[--keep] 保留測試資料，報名 ID:', testRegistrationId);
      console.log('可於後台搜尋「' + TEST_CONTACT_NAME + '」或編號 ' + refCode);
      return;
    }

    console.log('\n4. 刪除測試訂單...');
    const { error: delRegErr } = await supabaseAdmin
      .schema('huadrink')
      .from('registrations')
      .delete()
      .eq('id', testRegistrationId);
    if (delRegErr) {
      throw new Error('刪除訂單失敗: ' + delRegErr.message);
    }
    console.log('   已刪除報名記錄');

    console.log('\n✅ E2E 實測完成：報名 → 上傳 → 刪除圖片恢復 → 刪除訂單 皆成功');
  } catch (err) {
    console.error('\n❌ 實測失敗:', err.message);
    if (testRegistrationId && !keepTestData) {
      console.log('清理測試資料...');
      await supabaseAdmin.storage.from('payment-proofs').remove([`${testRegistrationId}/proof.png`]);
      await supabaseAdmin.schema('huadrink').from('registrations').delete().eq('id', testRegistrationId);
    }
    process.exit(1);
  }
}

main();
