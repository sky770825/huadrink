-- 索引：避免全表掃描，報名筆數一多會嚴重延遲
-- 在 Supabase SQL Editor 執行，或透過 supabase db push

-- 內部付款頁：WHERE type='internal' AND pay_status='unpaid'
CREATE INDEX IF NOT EXISTS idx_registrations_type_pay_status
  ON huadrink.registrations (type, pay_status);

-- 管理後台列表：ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_registrations_created_at_desc
  ON huadrink.registrations (created_at DESC);
