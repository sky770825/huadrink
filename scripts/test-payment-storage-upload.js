/**
 * 測試付款憑證上傳至 Supabase Storage
 * 1. 建立測試報名（內部、未付款）
 * 2. 上傳測試圖片至 payment-proofs bucket
 * 3. 呼叫 submit_payment_proof RPC
 * 4. 驗證後端可讀取圖片、Storage 中存在
 * 5. 刪除測試資料
 * 使用方式：node scripts/test-payment-storage-upload.js
 * 選用：--keep 保留測試資料（不刪除），供手動檢查後台
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

// 前端使用 anon key，測試上傳流程
const supabaseAnon = createClient(url, anonKey, { auth: { persistSession: false } });
// 清理用 service_role
const supabaseAdmin = createClient(url, serviceKey, { auth: { persistSession: false } });

// 最小 1x1 PNG（約 68 bytes）
const TEST_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const TEST_IMAGE_BUFFER = Buffer.from(TEST_IMAGE_BASE64, 'base64');

const TEST_CONTACT_NAME = '測試成員Storage';
const TEST_PHONE = '0912345678';
const TEST_LAST5 = '12345';

let testRegistrationId = null;
const keepTestData = process.argv.includes('--keep');

async function main() {
  console.log('=== 付款憑證 Storage 上傳測試 ===\n');

  try {
    // 1. 建立測試報名（使用 schema huadrink）
    console.log('1. 建立測試報名...');
    const { data: insertData, error: insertErr } = await supabaseAnon
      .schema('huadrink')
      .from('registrations')
      .insert({
        ref_code: 'TEST-STORAGE-' + Date.now(),
        type: 'internal',
        headcount: 1,
        attendee_list: [],
        company: '測試公司',
        contact_name: TEST_CONTACT_NAME,
        phone: TEST_PHONE,
        email: 'test@storage.test',
        diet: 'normal',
        photo_consent: true,
        pay_method: 'transfer',
        pay_status: 'unpaid',
        pay_proof_url: null,
        status: 'open',
      })
      .select('id')
      .single();

    if (insertErr) {
      throw new Error('建立測試報名失敗: ' + insertErr.message);
    }
    testRegistrationId = insertData.id;
    console.log('   測試報名 ID:', testRegistrationId);

    // 2. 上傳圖片至 Storage（模擬前端流程）
    console.log('\n2. 上傳測試圖片至 payment-proofs...');
    const ext = 'png';
    const path = `${testRegistrationId}/proof.${ext}`;
    const { data: uploadData, error: uploadErr } = await supabaseAnon.storage
      .from('payment-proofs')
      .upload(path, TEST_IMAGE_BUFFER, { upsert: true, contentType: 'image/png' });

    if (uploadErr) {
      throw new Error('Storage 上傳失敗: ' + uploadErr.message);
    }
    console.log('   上傳路徑:', uploadData.path);

    // 取得公開 URL
    const { data: urlData } = supabaseAnon.storage.from('payment-proofs').getPublicUrl(uploadData.path);
    const payProofUrl = urlData.publicUrl;
    console.log('   公開 URL:', payProofUrl);

    // 3. 呼叫 submit_payment_proof RPC
    console.log('\n3. 呼叫 submit_payment_proof RPC...');
    const { error: rpcErr } = await supabaseAnon.schema('huadrink').rpc('submit_payment_proof', {
      p_registration_id: testRegistrationId,
      p_pay_proof_url: payProofUrl,
      p_pay_proof_last5: TEST_LAST5,
      p_pay_proof_base64: null,
    });

    if (rpcErr) {
      throw new Error('RPC 失敗: ' + rpcErr.message);
    }
    console.log('   RPC 成功');

    // 4. 驗證：後端是否正確儲存並可讀取
    console.log('\n4. 驗證後端資料...');
    const { data: reg, error: fetchErr } = await supabaseAnon
      .schema('huadrink')
      .from('registrations')
      .select('id, pay_proof_url, pay_proof_last5, pay_status')
      .eq('id', testRegistrationId)
      .single();

    if (fetchErr || !reg) {
      throw new Error('讀取報名失敗: ' + (fetchErr?.message || '無資料'));
    }
    if (!reg.pay_proof_url || reg.pay_proof_url !== payProofUrl) {
      throw new Error('pay_proof_url 未正確儲存');
    }
    if (reg.pay_status !== 'pending') {
      throw new Error('pay_status 應為 pending，實際: ' + reg.pay_status);
    }
    console.log('   pay_proof_url: 已儲存');
    console.log('   pay_status: pending');

    // 5. 驗證：圖片 URL 是否可存取
    console.log('\n5. 驗證圖片可存取...');
    const imgRes = await fetch(payProofUrl);
    if (!imgRes.ok) {
      throw new Error('圖片 URL 無法存取: HTTP ' + imgRes.status);
    }
    const contentType = imgRes.headers.get('content-type') || '';
    if (!contentType.includes('image')) {
      throw new Error('回應非圖片類型: ' + contentType);
    }
    console.log('   圖片可正常存取');

    // 6. 驗證：Storage bucket 中是否存在檔案
    console.log('\n6. 驗證 Storage bucket 中檔案存在...');
    const { data: listData, error: listErr } = await supabaseAdmin.storage
      .from('payment-proofs')
      .list(testRegistrationId);

    if (listErr) {
      throw new Error('列出 Storage 失敗: ' + listErr.message);
    }
    const hasProof = listData?.some((f) => f.name === 'proof.png');
    if (!hasProof) {
      throw new Error('Storage 中找不到 proof.png');
    }
    console.log('   檔案 proof.png 存在於 bucket');

    console.log('\n✅ 所有測試通過！');

    if (keepTestData) {
      console.log('\n[--keep] 保留測試資料，報名 ID:', testRegistrationId);
      console.log('可於後台 /admin 搜尋「' + TEST_CONTACT_NAME + '」查看憑證');
      return;
    }

    // 7. 清理測試資料
    console.log('\n7. 清理測試資料...');
    const { error: delStorageErr } = await supabaseAdmin.storage
      .from('payment-proofs')
      .remove([path]);
    if (delStorageErr) {
      console.warn('   刪除 Storage 檔案失敗:', delStorageErr.message);
    } else {
      console.log('   已刪除 Storage 檔案');
    }

    const { error: delRegErr } = await supabaseAdmin
      .schema('huadrink')
      .from('registrations')
      .delete()
      .eq('id', testRegistrationId);
    if (delRegErr) {
      console.warn('   刪除測試報名失敗:', delRegErr.message);
    } else {
      console.log('   已刪除測試報名');
    }

    console.log('\n=== 測試完成 ===');
  } catch (err) {
    console.error('\n❌ 測試失敗:', err.message);
    if (testRegistrationId) {
      console.log('\n嘗試清理測試資料...');
      await supabaseAdmin.storage.from('payment-proofs').remove([`${testRegistrationId}/proof.png`]);
      await supabaseAdmin.schema('huadrink').from('registrations').delete().eq('id', testRegistrationId);
    }
    process.exit(1);
  }
}

main();
