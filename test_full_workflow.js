// 完整工作流程測試腳本
// 在瀏覽器控制台運行，或使用 Node.js 執行

const SUPABASE_URL = 'https://kwxlxjfcdghpguypadvi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3eGx4amZjZGdocGd1eXBhZHZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3ODk5NTMsImV4cCI6MjA4NDM2NTk1M30.0KJIXhxlPOx-5tWQyX12DMNXcWCLc2NmMCyoJY4y024';

async function testFullWorkflow() {
  console.log('🚀 開始完整工作流程測試...\n');

  try {
    // 步驟 1: 檢查 Supabase 連接
    console.log('📊 步驟 1: 檢查 Supabase 連接和現有資料...');
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/registrations?select=*&order=created_at.desc&limit=10`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    });

    if (!checkResponse.ok) {
      throw new Error(`連接失敗: ${checkResponse.status} ${checkResponse.statusText}`);
    }

    const existingData = await checkResponse.json();
    console.log(`✅ Supabase 連接成功`);
    console.log(`📋 現有資料筆數: ${existingData.length}`);
    
    if (existingData.length > 0) {
      console.log('\n現有資料列表:');
      existingData.forEach((reg, index) => {
        console.log(`  ${index + 1}. ${reg.ref_code} - ${reg.contact_name} (${reg.type})`);
      });
    } else {
      console.log('  ℹ️ 目前沒有資料');
    }
    console.log('');

    // 步驟 2: 提交測試資料（模擬後台提交）
    console.log('✍️ 步驟 2: 模擬後台提交名單...');
    const testRefCode = 'ADMIN-' + Date.now().toString().slice(-6);
    const testData = {
      ref_code: testRefCode,
      type: 'external',
      headcount: 1,
      attendee_list: [],
      company: '測試公司',
      title: '測試職稱',
      contact_name: '後台測試用戶' + Date.now(),
      phone: '0912345678',
      email: `admin-test${Date.now()}@example.com`,
      line_id: null,
      diet: 'normal',
      diet_other: null,
      allergy_note: null,
      photo_consent: true,
      inviter: null,
      vip_note: null,
      invoice_needed: false,
      invoice_title: null,
      invoice_tax_id: null,
      pay_method: 'transfer',
      pay_status: 'paid',
      pay_proof_url: null,
      status: 'open',
      admin_note: '這是從後台提交的測試資料',
    };

    const submitResponse = await fetch(`${SUPABASE_URL}/rest/v1/registrations?select=*`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(testData),
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      throw new Error(`提交失敗: ${submitResponse.status} - ${errorText}`);
    }

    const submittedData = await submitResponse.json();
    console.log(`✅ 後台提交成功！`);
    console.log(`   報名編號: ${testRefCode}`);
    console.log(`   聯絡人: ${testData.contact_name}`);
    console.log(`   管理員備註: ${testData.admin_note}`);
    console.log('');

    // 步驟 3: 驗證資料是否寫入
    console.log('🔍 步驟 3: 驗證資料是否成功寫入...');
    const verifyResponse = await fetch(`${SUPABASE_URL}/rest/v1/registrations?select=*&ref_code=eq.${testRefCode}`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    });

    if (!verifyResponse.ok) {
      throw new Error(`驗證失敗: ${verifyResponse.status}`);
    }

    const verifiedData = await verifyResponse.json();
    if (verifiedData.length > 0) {
      console.log(`✅ 資料驗證成功！`);
      console.log(`   找到資料: ${verifiedData[0].ref_code}`);
      console.log(`   聯絡人: ${verifiedData[0].contact_name}`);
      console.log(`   電話: ${verifiedData[0].phone}`);
      console.log(`   狀態: ${verifiedData[0].status}`);
      console.log(`   付款狀態: ${verifiedData[0].pay_status}`);
    } else {
      throw new Error('資料未找到');
    }
    console.log('');

    // 步驟 4: 檢查所有資料（前後台整合驗證）
    console.log('📋 步驟 4: 檢查所有資料（前後台整合）...');
    const allDataResponse = await fetch(`${SUPABASE_URL}/rest/v1/registrations?select=*&order=created_at.desc&limit=20`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    });

    if (!allDataResponse.ok) {
      throw new Error(`查詢失敗: ${allDataResponse.status}`);
    }

    const allData = await allDataResponse.json();
    console.log(`✅ 總共找到 ${allData.length} 筆資料`);
    
    // 統計
    const stats = {
      total: allData.length,
      external: allData.filter(r => r.type === 'external').length,
      internal: allData.filter(r => r.type === 'internal').length,
      paid: allData.filter(r => r.pay_status === 'paid').length,
      unpaid: allData.filter(r => r.pay_status === 'unpaid').length,
    };

    console.log('\n📊 資料統計:');
    console.log(`   總筆數: ${stats.total}`);
    console.log(`   外部來賓: ${stats.external}`);
    console.log(`   內部夥伴: ${stats.internal}`);
    console.log(`   已付款: ${stats.paid}`);
    console.log(`   未付款: ${stats.unpaid}`);
    console.log('');

    // 步驟 5: 測試前端報名（模擬）
    console.log('🌐 步驟 5: 模擬前端報名提交...');
    const frontendRefCode = 'DINE-0303-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const frontendData = {
      ref_code: frontendRefCode,
      type: 'external',
      headcount: 1,
      attendee_list: [],
      company: '前端測試公司',
      title: null,
      contact_name: '前端測試用戶' + Date.now(),
      phone: '0987654321',
      email: `frontend-test${Date.now()}@example.com`,
      line_id: null,
      diet: 'normal',
      diet_other: null,
      allergy_note: null,
      photo_consent: true,
      inviter: null,
      vip_note: null,
      invoice_needed: false,
      invoice_title: null,
      invoice_tax_id: null,
      pay_method: 'transfer',
      pay_status: 'paid',
      pay_proof_url: null,
      status: 'open',
      admin_note: null,
    };

    const frontendResponse = await fetch(`${SUPABASE_URL}/rest/v1/registrations?select=*`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(frontendData),
    });

    if (!frontendResponse.ok) {
      const errorText = await frontendResponse.text();
      throw new Error(`前端提交失敗: ${frontendResponse.status} - ${errorText}`);
    }

    const frontendSubmitted = await frontendResponse.json();
    console.log(`✅ 前端報名成功！`);
    console.log(`   報名編號: ${frontendRefCode}`);
    console.log(`   聯絡人: ${frontendData.contact_name}`);
    console.log('');

    // 最終驗證
    console.log('🎯 最終驗證: 檢查前後台資料是否都在資料庫中...');
    const finalCheck = await fetch(`${SUPABASE_URL}/rest/v1/registrations?select=*&order=created_at.desc&limit=5`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    });

    const finalData = await finalCheck.json();
    console.log('\n📋 最新 5 筆資料:');
    finalData.forEach((reg, index) => {
      const source = reg.admin_note ? '後台' : '前端';
      console.log(`  ${index + 1}. [${source}] ${reg.ref_code} - ${reg.contact_name} (${reg.type})`);
    });

    console.log('\n✅ 測試完成！');
    console.log('\n📊 總結:');
    console.log('  ✅ Supabase 連接: 正常');
    console.log('  ✅ 資料庫寫入: 正常');
    console.log('  ✅ 後台提交: 成功');
    console.log('  ✅ 前端報名: 成功');
    console.log('  ✅ 前後台整合: 正常');
    console.log('\n🔗 查看資料:');
    console.log(`   https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi/editor`);

  } catch (error) {
    console.error('\n❌ 測試失敗:', error);
    console.error('錯誤詳情:', error.message);
    if (error.stack) {
      console.error('堆疊:', error.stack);
    }
  }
}

// 如果在瀏覽器中運行
if (typeof window !== 'undefined') {
  window.testFullWorkflow = testFullWorkflow;
  console.log('✅ 測試函數已載入，執行 testFullWorkflow() 開始測試');
}

// 如果在 Node.js 中運行
if (typeof module !== 'undefined' && module.exports) {
  module.exports = testFullWorkflow;
}
