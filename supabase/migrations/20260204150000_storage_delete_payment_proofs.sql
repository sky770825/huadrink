-- 允許已登入使用者（管理員）刪除 payment-proofs 內的檔案；改為未付款時後台會一併刪除 Storage 檔案，避免累積
DROP POLICY IF EXISTS "Authenticated can delete payment proofs" ON storage.objects;
CREATE POLICY "Authenticated can delete payment proofs"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'payment-proofs' AND auth.role() = 'authenticated');
