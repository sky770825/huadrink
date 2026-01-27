// 創建管理員帳號的腳本
// 在瀏覽器控制台或 Node.js 中執行

const SUPABASE_URL = 'https://kwxlxjfcdghpguypadvi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3eGx4amZjZGdocGd1eXBhZHZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3ODk5NTMsImV4cCI6MjA4NDM2NTk1M30.0KJIXhxlPOx-5tWQyX12DMNXcWCLc2NmMCyoJY4y024';

// 注意：需要使用 Service Role Key 來創建用戶
// 此腳本僅供參考，實際創建需要在 Supabase Dashboard 中進行

async function createAdminAccount() {
  console.log('🔧 創建管理員帳號...');
  console.log('\n⚠️ 注意：此操作需要在 Supabase Dashboard 中手動完成');
  console.log('\n📋 步驟：');
  console.log('1. 訪問：https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi/auth/users');
  console.log('2. 點擊 "Add user" → "Create new user"');
  console.log('3. 填寫：');
  console.log('   Email: 123@admin.com');
  console.log('   Password: 123');
  console.log('4. 點擊 "Create user"');
  console.log('5. 複製創建的用戶 ID (UUID)');
  console.log('6. 在 SQL Editor 中執行以下 SQL：');
  console.log(`
INSERT INTO public.admins (user_id)
SELECT id FROM auth.users WHERE email = '123@admin.com'
ON CONFLICT (user_id) DO NOTHING;
  `);
  console.log('\n✅ 完成後，就可以使用以下帳號登入：');
  console.log('   Email: 123@admin.com');
  console.log('   密碼: 123');
}

// 如果在瀏覽器中運行
if (typeof window !== 'undefined') {
  window.createAdminAccount = createAdminAccount;
  createAdminAccount();
}

// 如果在 Node.js 中運行
if (typeof module !== 'undefined' && module.exports) {
  module.exports = createAdminAccount;
}
