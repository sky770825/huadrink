-- 新增 Base64 付款憑證欄位（不需 Storage bucket）
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS pay_proof_base64 TEXT;

-- 更新 RPC：支援 p_pay_proof_base64（與 p_pay_proof_url 二選一）
CREATE OR REPLACE FUNCTION public.submit_payment_proof(
  p_registration_id UUID,
  p_pay_proof_url TEXT,
  p_pay_proof_last5 TEXT,
  p_pay_proof_base64 TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.registrations
  SET pay_proof_url = CASE
        WHEN p_pay_proof_base64 IS NOT NULL THEN NULL
        ELSE p_pay_proof_url
      END,
      pay_proof_base64 = p_pay_proof_base64,
      pay_proof_last5 = p_pay_proof_last5,
      pay_status = 'pending',
      updated_at = now()
  WHERE id = p_registration_id
    AND type = 'internal'
    AND pay_status IN ('unpaid', 'pending');
END;
$$;
