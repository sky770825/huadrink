-- 快速設置管理員帳號的 SQL 腳本
-- 請在 Supabase SQL Editor 中執行此腳本
-- 訪問：https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi/sql/new

-- ⚠️ 重要：請先確保已在 Supabase Dashboard 中創建用戶
-- 訪問：https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi/auth/users
-- 點擊 "Add user" → "Create new user"
-- Email: 123@admin.com
-- Password: 123
-- Auto Confirm User: ✅ 勾選

-- 然後執行以下 SQL 將用戶添加到 admins 表

-- 方法 1: 使用 Email 自動查找用戶 ID（推薦）
INSERT INTO public.admins (user_id)
SELECT id FROM auth.users WHERE email = '123@admin.com'
ON CONFLICT (user_id) DO NOTHING;

-- 驗證管理員是否創建成功
SELECT 
  a.id as admin_id,
  u.id as user_id,
  u.email,
  u.created_at as user_created_at,
  a.created_at as admin_created_at
FROM public.admins a
JOIN auth.users u ON a.user_id = u.id
WHERE u.email = '123@admin.com';

-- 如果查詢結果有資料，表示管理員帳號設置成功！
-- 現在可以使用以下帳號登入：
-- Email: 123@admin.com
-- 密碼: 123
