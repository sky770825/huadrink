-- Storage Bucket 設定（如果尚未建立）
-- 在 Supabase Dashboard > SQL Editor 執行

-- 建立 payment-proofs bucket（如果不存在）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 設定 RLS 政策：允許匿名使用者上傳檔案
CREATE POLICY "Allow anonymous uploads" ON storage.objects
  FOR INSERT TO anon WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "Allow anonymous read" ON storage.objects
  FOR SELECT TO anon USING (bucket_id = 'payment-proofs');

CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "Allow authenticated read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'payment-proofs');

CREATE POLICY "Allow authenticated delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'payment-proofs');

SELECT 'Storage bucket payment-proofs 設定完成' as status;
