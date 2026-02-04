-- 加速內部付款頁查詢（立即生效，無需重啟）
-- 在 Supabase Dashboard → SQL Editor 執行：https://supabase.com/dashboard
-- 查詢「內部＋未付款」若無此索引會全表掃描，造成嚴重延遲

CREATE INDEX IF NOT EXISTS idx_registrations_type_pay_status
  ON huadrink.registrations (type, pay_status);
