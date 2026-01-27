-- 驗證資料庫設置的 SQL 查詢
-- 在 Supabase SQL Editor 中執行這些查詢來驗證設置

-- 1. 檢查表是否存在
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('registrations', 'system_settings', 'admins') THEN '✅'
    ELSE '❌'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('registrations', 'system_settings', 'admins')
ORDER BY table_name;

-- 2. 檢查枚舉類型
SELECT 
  typname as enum_name,
  CASE 
    WHEN typname IN ('registration_type', 'registration_status', 'payment_method', 'payment_status', 'diet_type', 'seat_zone') THEN '✅'
    ELSE '❌'
  END as status
FROM pg_type 
WHERE typname IN ('registration_type', 'registration_status', 'payment_method', 'payment_status', 'diet_type', 'seat_zone')
ORDER BY typname;

-- 3. 檢查 registrations 表的欄位
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'registrations'
ORDER BY ordinal_position;

-- 4. 檢查 RLS 是否啟用
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '✅ 已啟用' ELSE '❌ 未啟用' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('registrations', 'system_settings', 'admins');

-- 5. 檢查 RLS 策略
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as command,
  CASE WHEN permissive = 'PERMISSIVE' THEN '允許' ELSE '限制' END as permissive
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('registrations', 'system_settings', 'admins')
ORDER BY tablename, policyname;

-- 6. 檢查函數是否存在
SELECT 
  routine_name,
  routine_type,
  CASE 
    WHEN routine_name IN ('update_updated_at_column', 'generate_ref_code') THEN '✅'
    ELSE '❌'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('update_updated_at_column', 'generate_ref_code');

-- 7. 檢查觸發器
SELECT 
  trigger_name,
  event_object_table as table_name,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('registrations', 'system_settings')
ORDER BY event_object_table, trigger_name;

-- 8. 檢查預設設定
SELECT 
  key,
  value,
  updated_at
FROM public.system_settings
ORDER BY key;
