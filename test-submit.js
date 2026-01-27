// 測試腳本：自動提交表單並檢查 Google Sheets 同步
// 使用方法：在瀏覽器控制台運行此腳本

(async function testFormSubmission() {
  console.log('開始測試表單提交...');
  
  // 測試資料
  const testData = {
    type: 'external',
    headcount: 1,
    attendee_list: [],
    company: '測試公司',
    title: '測試職稱',
    contact_name: '測試用戶' + Date.now(),
    phone: '0912345678',
    email: `test${Date.now()}@example.com`,
    line_id: '',
    diet: 'normal',
    diet_other: '',
    allergy_note: '',
    photo_consent: true,
    invoice_needed: false,
    invoice_title: '',
    invoice_tax_id: '',
    inviter: '',
    vip_note: '',
  };

  try {
    // 1. 提交到 Supabase
    console.log('步驟 1: 提交到 Supabase...');
    const supabaseUrl = 'https://dhscdqpphloxzoyzytfz.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoc2NkcXBwaGxveHpveXp5dGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NzkxMzYsImV4cCI6MjA4NTA1NTEzNn0._YoLc5YweOMg2RfoZrYCBbgVXux-mfRRVeRbhUK01PA';
    
    // 生成 ref_code
    const refCode = 'TEST-' + Date.now().toString().slice(-6);
    
    const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/registrations?select=*`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        ref_code: refCode,
        type: testData.type,
        headcount: testData.headcount,
        attendee_list: testData.attendee_list,
        company: testData.company || '未填寫',
        title: testData.title,
        contact_name: testData.contact_name,
        phone: testData.phone,
        email: testData.email,
        line_id: testData.line_id,
        diet: testData.diet,
        diet_other: testData.diet_other,
        allergy_note: testData.allergy_note,
        photo_consent: testData.photo_consent,
        invoice_needed: testData.invoice_needed,
        invoice_title: testData.invoice_title,
        invoice_tax_id: testData.invoice_tax_id,
        inviter: testData.inviter,
        vip_note: testData.vip_note,
        pay_method: 'transfer',
        pay_status: 'paid',
        pay_proof_url: null,
        status: 'confirmed',
      }),
    });

    if (!supabaseResponse.ok) {
      const error = await supabaseResponse.text();
      throw new Error(`Supabase 提交失敗: ${supabaseResponse.status} - ${error}`);
    }

    const registration = await supabaseResponse.json();
    console.log('✅ Supabase 提交成功:', registration);

    // 2. 同步到 Google Sheets
    console.log('步驟 2: 同步到 Google Sheets...');
    const appsScriptUrl = 'https://script.google.com/macros/s/AKfycbzIbMWSSwXtGJfQHDxGYj0SLVXQdVa3KW5IwGnFhUvsGnjtBNEduT7zI9SiHZARGmxCXg/exec';
    
    // 格式化資料
    const formatRegistration = (reg) => {
      return [
        '1', // 序號
        reg.ref_code,
        '外部報名',
        reg.headcount.toString(),
        '', // 參與者名單
        reg.company || '未填寫',
        reg.title || '',
        reg.contact_name,
        reg.phone,
        reg.email || '',
        reg.line_id || '',
        '一般',
        reg.diet_other || '',
        reg.allergy_note || '',
        reg.photo_consent ? '是' : '否',
        reg.inviter || '',
        reg.vip_note || '',
        reg.invoice_needed ? '是' : '否',
        reg.invoice_title || '',
        reg.invoice_tax_id || '',
        '轉帳',
        '已付款',
        '', // 座位區域
        '', // 桌號
        '', // 管理員備註
        new Date(reg.created_at).toLocaleString('zh-TW'),
        new Date(reg.updated_at).toLocaleString('zh-TW'),
      ];
    };

    const headers = [
      '序號', '報名編號', '報名類型', '人數', '參與者名單', '公司', '職稱',
      '聯絡人', '電話', 'Email', 'LINE ID', '飲食需求', '其他飲食需求',
      '過敏備註', '照片同意', '邀請人', 'VIP 備註', '需要發票', '發票抬頭',
      '統一編號', '付款方式', '付款狀態', '座位區域', '桌號', '管理員備註',
      '建立時間', '更新時間',
    ];

    const requestBody = {
      spreadsheetId: '1cT3VJcDHyqHUEEdRfb7b9zMifBJk6f6upujGYV9dj4U',
      sheetName: '工作表1',
      values: [headers, formatRegistration(registration[0])],
    };

    console.log('發送請求到 Google Apps Script...');
    console.log('請求資料:', JSON.stringify(requestBody).substring(0, 200) + '...');

    const sheetsResponse = await fetch(appsScriptUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
      redirect: 'follow',
      body: JSON.stringify(requestBody),
    });

    console.log('Google Apps Script 響應狀態:', sheetsResponse.status, sheetsResponse.statusText);
    
    const responseText = await sheetsResponse.text();
    console.log('Google Apps Script 響應內容:', responseText.substring(0, 500));

    if (sheetsResponse.ok) {
      try {
        const result = JSON.parse(responseText);
        if (result.success) {
          console.log('✅ Google Sheets 同步成功:', result.message);
          console.log('\n📊 測試結果總結:');
          console.log('  ✅ Supabase 提交: 成功');
          console.log('  ✅ Google Sheets 同步: 成功');
          console.log('  📝 報名編號:', refCode);
          console.log('  👤 聯絡人:', testData.contact_name);
          console.log('\n請檢查 Google Sheets 確認資料是否已寫入:');
          console.log('https://docs.google.com/spreadsheets/d/1cT3VJcDHyqHUEEdRfb7b9zMifBJk6f6upujGYV9dj4U/edit');
        } else {
          console.error('❌ Google Sheets 同步失敗:', result.error || result.message);
        }
      } catch (parseError) {
        console.error('❌ 解析響應失敗:', parseError);
        console.error('原始響應:', responseText);
      }
    } else {
      console.error('❌ Google Sheets 同步失敗:', sheetsResponse.status, responseText.substring(0, 200));
    }

  } catch (error) {
    console.error('❌ 測試失敗:', error);
    console.error('錯誤詳情:', error.message);
  }
})();
