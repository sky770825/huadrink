-- 修復 admins 表 RLS 政策（解決 500 錯誤）
-- 在 SQL Editor 執行：https://supabase.com/dashboard/project/sqgrnowrcvspxhuudrqc/sql/new

DROP POLICY IF EXISTS "huadrink_Admins can view admins" ON huadrink.admins;
CREATE POLICY "huadrink_Admins can view admins" ON huadrink.admins
  FOR SELECT USING (user_id = auth.uid());
