-- 新增付款狀態「審核付款」（若已存在則略過）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'payment_status' AND e.enumlabel = 'pending'
  ) THEN
    ALTER TYPE public.payment_status ADD VALUE 'pending';
  END IF;
END $$;

-- 新增匯款末五碼欄位
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS pay_proof_last5 TEXT;

-- 前台提交付款憑證專用 RPC（僅允許 internal、unpaid/pending 更新）
CREATE OR REPLACE FUNCTION public.submit_payment_proof(
  p_registration_id UUID,
  p_pay_proof_url TEXT,
  p_pay_proof_last5 TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.registrations
  SET pay_proof_url = p_pay_proof_url,
      pay_proof_last5 = p_pay_proof_last5,
      pay_status = 'pending',
      updated_at = now()
  WHERE id = p_registration_id
    AND type = 'internal'
    AND pay_status IN ('unpaid', 'pending');
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_payment_proof TO anon;
GRANT EXECUTE ON FUNCTION public.submit_payment_proof TO authenticated;

-- 新增匯款帳號相關系統設定（供後台編輯，前台付款頁顯示）
INSERT INTO public.system_settings (key, value) VALUES
  ('payment_bank_name', '（請填入銀行名稱，例如：中國信託）'),
  ('payment_account_number', '（請填入帳號）'),
  ('payment_account_name', '（請填入戶名）'),
  ('payment_amount', '（請填入每人金額或「另洽主辦」）')
ON CONFLICT (key) DO NOTHING;
