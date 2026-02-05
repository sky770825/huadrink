-- 繳費付款支援外部成員：submit_payment_proof 允許 type = internal 或 external
CREATE OR REPLACE FUNCTION huadrink.submit_payment_proof(
  p_registration_id UUID, p_pay_proof_url TEXT, p_pay_proof_last5 TEXT, p_pay_proof_base64 TEXT DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = huadrink AS $$
BEGIN
  UPDATE huadrink.registrations
  SET pay_proof_url = CASE WHEN p_pay_proof_base64 IS NOT NULL THEN NULL ELSE p_pay_proof_url END,
      pay_proof_base64 = p_pay_proof_base64, pay_proof_last5 = p_pay_proof_last5,
      pay_status = 'pending', updated_at = now()
  WHERE id = p_registration_id AND type IN ('internal', 'external') AND pay_status IN ('unpaid', 'pending');
END; $$;
