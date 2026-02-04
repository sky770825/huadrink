-- 確保 service_role 可讀寫 huadrink 表（export-db、import 等腳本需）
GRANT ALL ON huadrink.registrations TO service_role;
GRANT ALL ON huadrink.system_settings TO service_role;
GRANT ALL ON huadrink.admins TO service_role;
