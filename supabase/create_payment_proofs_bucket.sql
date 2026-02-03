-- 建立付款憑證儲存桶（若出現 Bucket not found，請在 Supabase Dashboard -> SQL Editor 執行此腳本）
--
-- 方式一：用 Dashboard 建立（較簡單）
-- 1. 開啟 Supabase Dashboard -> Storage
-- 2. 點「New bucket」
-- 3. Name: payment-proofs
-- 4. 勾選 Public bucket
-- 5. Create bucket
--
-- 方式二：用 SQL 建立（若 bucket 已存在會報錯，可改用手動建立）
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true);

-- 付款憑證儲存政策
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
