-- 索引：加速內部付款頁與管理後台（立即生效，無需重啟）
-- 在 Supabase Dashboard → SQL Editor 執行：https://supabase.com/dashboard

-- 內部付款頁：WHERE type='internal' AND pay_status='unpaid'
CREATE INDEX IF NOT EXISTS idx_registrations_type_pay_status
  ON huadrink.registrations (type, pay_status);

-- 管理後台列表：ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_registrations_created_at_desc
  ON huadrink.registrations (created_at DESC);
