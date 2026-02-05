-- 讓 anon / authenticated 能讀寫 huadrink.internal_members（解決 403）
-- 前端與後台使用 anon 或 authenticated key 連線，需有表權限才能通過 RLS

GRANT USAGE ON SCHEMA huadrink TO anon;
GRANT USAGE ON SCHEMA huadrink TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON huadrink.internal_members TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON huadrink.internal_members TO authenticated;
