-- 修復 admins 表 RLS 策略的 SQL 腳本
-- 問題：登入時查詢 admins 表會返回 500 錯誤
-- 原因：RLS 策略要求用戶必須是管理員才能查看 admins 表，形成循環依賴
-- 解決方案：允許用戶查看自己的 admin 記錄

-- 請在 Supabase SQL Editor 中執行此腳本
-- 訪問：https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi/sql/new

-- 1. 刪除舊的 RLS 策略
DROP POLICY IF EXISTS "Admins can view admins" ON public.admins;

-- 2. 創建新的 RLS 策略：允許用戶查看自己的 admin 記錄
CREATE POLICY "Users can view their own admin record"
  ON public.admins
  FOR SELECT
  USING (user_id = auth.uid());

-- 3. 驗證策略是否正確
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'admins';

-- 完成！
-- 現在登入時應該可以正常查詢 admins 表了
