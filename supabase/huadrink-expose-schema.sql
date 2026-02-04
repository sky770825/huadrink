-- 若出現 Invalid schema 或 permission denied for schema huadrink，請在 SQL Editor 執行此腳本
-- https://supabase.com/dashboard/project/sqgrnowrcvspxhuudrqc/sql/new

ALTER ROLE authenticator SET pgrst.db_schemas = 'public, huadrink';
NOTIFY pgrst, 'reload schema';

-- 授權各角色（前端 anon、登入後 authenticated、腳本 service_role）
GRANT USAGE ON SCHEMA huadrink TO anon, authenticated, service_role;
GRANT SELECT, INSERT ON huadrink.registrations TO anon, authenticated;
GRANT UPDATE, DELETE ON huadrink.registrations TO authenticated;
GRANT SELECT ON huadrink.system_settings TO anon, authenticated;
GRANT UPDATE ON huadrink.system_settings TO authenticated;
GRANT SELECT ON huadrink.admins TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA huadrink TO service_role;
-- 明確授權（確保 export-db 等腳本可執行）
GRANT ALL ON huadrink.registrations TO service_role;
GRANT ALL ON huadrink.system_settings TO service_role;
GRANT ALL ON huadrink.admins TO service_role;
