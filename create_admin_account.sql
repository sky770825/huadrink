-- 創建管理員帳號的 SQL 腳本
-- 請在 Supabase SQL Editor 中執行此腳本
-- 訪問：https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi/sql/new

-- 注意：Supabase Auth 用戶需要通過 Supabase Dashboard 或 API 創建
-- 此腳本僅用於在 admins 表中添加管理員記錄

-- 步驟 1: 首先需要在 Supabase Dashboard 中創建用戶
-- 訪問：https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi/auth/users
-- 點擊 "Add user" → "Create new user"
-- Email: 123@admin.com
-- Password: 123
-- 複製創建的用戶 ID (UUID)

-- 步驟 2: 將用戶 ID 替換到下面的 SQL 中，然後執行

-- 假設用戶 ID 為 'YOUR_USER_ID_HERE'，請替換為實際的用戶 ID
-- INSERT INTO public.admins (user_id)
-- VALUES ('YOUR_USER_ID_HERE')
-- ON CONFLICT (user_id) DO NOTHING;

-- 或者，如果您已經知道用戶 ID，可以直接執行：
-- INSERT INTO public.admins (user_id)
-- SELECT id FROM auth.users WHERE email = '123@admin.com'
-- ON CONFLICT (user_id) DO NOTHING;

-- 驗證管理員是否創建成功
-- SELECT a.id, a.user_id, u.email, a.created_at
-- FROM public.admins a
-- JOIN auth.users u ON a.user_id = u.id
-- WHERE u.email = '123@admin.com';
