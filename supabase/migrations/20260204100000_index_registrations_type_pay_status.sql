-- 內部付款頁與管理後台常用查詢：依 type + pay_status 篩選
-- 無索引時會做全表掃描，報名筆數一多就會嚴重延遲
-- 在 Supabase SQL Editor 執行，或透過 supabase db push

CREATE INDEX IF NOT EXISTS idx_registrations_type_pay_status
  ON huadrink.registrations (type, pay_status);
