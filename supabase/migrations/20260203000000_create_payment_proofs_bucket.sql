-- 建立付款憑證儲存桶（若已存在則略過）
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- 付款憑證儲存政策（若已存在則先刪除再建立）
DROP POLICY IF EXISTS "Anyone can upload payment proofs" ON storage.objects;
CREATE POLICY "Anyone can upload payment proofs"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS "Anyone can view payment proofs" ON storage.objects;
CREATE POLICY "Anyone can view payment proofs"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'payment-proofs');
