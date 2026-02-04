import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { usePaymentEligibleRegistrations } from '@/hooks/useRegistrations';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Hero } from '@/components/register/Hero';
import { FormCard } from '@/components/register/FormCard';
import { getMemberByContactName } from '@/lib/members';
import { sortByMemberId } from '@/lib/registrations';
import { Copy, Loader2, Upload, ArrowLeft, Camera } from 'lucide-react';
import type { Registration } from '@/types/registration';

export default function Payment() {
  const queryClient = useQueryClient();
  const { data: paymentEligible = [], isLoading: regLoading, isError: regError, refetch: refetchReg } = usePaymentEligibleRegistrations();
  const { data: settings, isLoading: settingsLoading, isError: settingsError } = useSystemSettings();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedId, setSelectedId] = useState<string>('');
  const [last5, setLast5] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingTooLong, setLoadingTooLong] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  useEffect(() => {
    if (!regLoading) {
      setLoadingTooLong(false);
      return;
    }
    const t = setTimeout(() => setLoadingTooLong(true), 25000); // 25 秒後顯示重試提示
    return () => clearTimeout(t);
  }, [regLoading]);

  const eligible = sortByMemberId(paymentEligible);

  const accountNumber = settings?.payment_account_number ?? '（請聯繫主辦取得帳號）';
  const bankName = settings?.payment_bank_name ?? '';
  const accountName = settings?.payment_account_name ?? '';
  const amount = settings?.payment_amount ?? '';

  const copyAccount = async () => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      toast({ title: '已複製帳號', duration: 2000 });
    } catch {
      toast({ title: '複製失敗', variant: 'destructive', duration: 2000 });
    }
  };

  /** 單張圖片建議不超過 8MB，避免上傳過久或卡住 */
  const MAX_FILE_BYTES = 8 * 1024 * 1024;
  /** 超過 100KB 就壓縮，確保幾百 KB 的 PNG 不會原檔上傳卡住 */
  const COMPRESS_THRESHOLD_BYTES = 100 * 1024;

  /** 使用 Canvas 壓縮圖片：最長邊不超過 maxWidth，輸出 JPEG quality */
  function compressImage(file: File, maxWidth = 1920, quality = 0.85): Promise<File> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const scale = w > h ? maxWidth / w : maxWidth / h;
        const width = scale >= 1 ? w : Math.round(w * scale);
        const height = scale >= 1 ? h : Math.round(h * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const name = file.name.replace(/\.[^.]+$/i, '.jpg');
            resolve(new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() }));
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    });
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.type.startsWith('image/')) {
      if (f.size > MAX_FILE_BYTES) {
        toast({
          title: '檔案過大',
          description: '請上傳 8MB 以內的圖片，或先壓縮後再上傳',
          variant: 'destructive',
        });
        setFile(null);
        setPreviewUrl(null);
        e.target.value = '';
        return;
      }
      const needCompress = f.size > COMPRESS_THRESHOLD_BYTES;
      if (needCompress) {
        setIsCompressing(true);
        toast({ title: '圖片壓縮中…', duration: 2000 });
      }
      try {
        const finalFile = needCompress ? await compressImage(f) : f;
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setFile(finalFile);
        setPreviewUrl(URL.createObjectURL(finalFile));
        if (needCompress) {
          toast({
            title: '已壓縮',
            description: `可送出（約 ${(finalFile.size / 1024).toFixed(0)} KB）`,
            duration: 2500,
          });
        }
      } catch {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setFile(f);
        setPreviewUrl(URL.createObjectURL(f));
        toast({ title: '壓縮略過，使用原圖', variant: 'destructive', duration: 2000 });
      } finally {
        setIsCompressing(false);
      }
    } else if (f) {
      toast({ title: '請上傳圖片檔（JPG、PNG 等）', variant: 'destructive' });
      setFile(null);
      setPreviewUrl(null);
    }
    e.target.value = '';
  };

  /** 為 Promise 加上逾時，避免 Supabase 無回應時一直卡住 */
  function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms)
    );
    return Promise.race([promise, timeout]);
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !last5.trim() || !file) {
      toast({
        title: '請填寫完整',
        description: '請選擇報名者、填寫末五碼並上傳付款憑證',
        variant: 'destructive',
      });
      return;
    }
    const trimmed = last5.trim().replace(/\D/g, '');
    if (trimmed.length !== 5) {
      toast({
        title: '末五碼格式錯誤',
        description: '請輸入 5 位數字',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // 送出前再壓縮一次：若檔案仍 > 200KB（例如選圖時未壓到），先壓縮再傳，避免 700KB PNG 等大檔卡住
      let fileToUpload = file;
      if (file.size > 200 * 1024) {
        fileToUpload = await compressImage(file);
      }

      const ext = fileToUpload.name.split('.').pop()?.toLowerCase() || 'jpg';
      const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg';
      const path = `${selectedId}/proof.${safeExt}`;

      const uploadPromise = supabase.storage
        .from('payment-proofs')
        .upload(path, fileToUpload, { upsert: true, contentType: fileToUpload.type });

      const { data: uploadData, error: uploadError } = await withTimeout(
        uploadPromise,
        90000,
        '上傳逾時（約 90 秒），請檢查網路後重試'
      );

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(uploadData.path);
      const payProofUrl = urlData.publicUrl;

      const rpcPromise = supabase.schema('huadrink').rpc('submit_payment_proof', {
        p_registration_id: selectedId,
        p_pay_proof_url: payProofUrl,
        p_pay_proof_last5: trimmed,
        p_pay_proof_base64: null,
      });

      const { error: rpcError } = await withTimeout(
        rpcPromise,
        20000,
        '寫入資料逾時，請稍後再試'
      );

      if (rpcError) throw rpcError;

      await queryClient.invalidateQueries({ queryKey: ['registrations'] });
      await queryClient.invalidateQueries({ queryKey: ['registrations', 'payment-eligible'] });
      toast({ title: '上傳成功', description: '付款憑證已送出，主辦單位審核後會與您聯繫。', duration: 4000 });
      setSelectedId('');
      setLast5('');
      setFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Payment submit error:', error);
      const message = error instanceof Error ? error.message : '請檢查網路後重試';
      toast({
        title: '上傳失敗',
        description: message,
        variant: 'destructive',
        duration: 6000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /** 漸進式載入：不擋整頁，立即顯示匯款資訊，僅報名名單區塊顯示載入／錯誤 */
  const hasFatalError = regError;

  return (
    <div className="min-h-screen marble-bg overflow-x-hidden">
      <Hero />

      <section className="py-8 sm:py-12 md:py-16 w-full min-w-0">
        <div className="container max-w-2xl mx-auto w-full min-w-0 px-3 sm:px-4">
          <div className="mb-6">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              返回首頁
            </Link>
          </div>

          <FormCard className="animate-fade-in-up">
            <h2 className="font-serif text-xl md:text-2xl font-semibold mb-6">內部夥伴付款</h2>

            {/* 匯款帳號區塊：立即顯示（有 fallback），不等設定載入 */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 mb-6">
              <Label className="text-muted-foreground">匯款帳號</Label>
              <div className="flex items-center gap-2 mt-1" style={{ backgroundClip: 'unset', WebkitBackgroundClip: 'unset' }}>
                <span className="font-mono text-lg font-semibold">{accountNumber}</span>
                <Button type="button" variant="outline" size="icon" onClick={copyAccount} title="複製帳號">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              {bankName && <p className="text-sm text-muted-foreground mt-1">銀行：{bankName}</p>}
              {accountName && <p className="text-sm text-muted-foreground">戶名：{accountName}</p>}
              {amount && <p className="text-base text-muted-foreground mt-1">金額：{amount}</p>}
            </div>

            {hasFatalError ? (
              <div className="py-6 text-center space-y-3">
                <p className="text-muted-foreground">無法載入報名名單，請檢查網路後重試。</p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  重新載入
                </Button>
              </div>
            ) : regLoading ? (
              <div className="py-6 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">載入報名名單中...</p>
                {loadingTooLong && (
                  <div className="flex flex-col items-center gap-2 mt-2">
                    <p className="text-xs text-amber-600">連線較慢</p>
                    <Button variant="outline" size="sm" onClick={() => refetchReg()}>
                      重試
                    </Button>
                  </div>
                )}
              </div>
            ) : eligible.length === 0 ? (
              <p className="text-muted-foreground py-8">
                目前沒有待付款的內部報名，或您已完成付款審核提交。若有疑問請聯繫主辦單位。
              </p>
            ) : (
              <form onSubmit={onSubmit} className="space-y-6">
                {/* 選擇報名者 */}
                <div>
                  <Label>選擇報名者</Label>
                  <Select value={selectedId} onValueChange={setSelectedId} required>
                    <SelectTrigger className="input-luxury mt-1">
                      <SelectValue placeholder="請選擇您的報名資料" />
                    </SelectTrigger>
                    <SelectContent>
                      {eligible.map((r) => {
                        const member = getMemberByContactName(r.contact_name);
                        const label = member
                          ? `${member.id}. ${r.contact_name}（${r.ref_code}）`
                          : `${r.contact_name}（${r.ref_code}）`;
                        return (
                          <SelectItem key={r.id} value={r.id}>
                            {label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* 末五碼 */}
                <div>
                  <Label>匯款帳號末五碼</Label>
                  <Input
                    value={last5}
                    onChange={(e) => setLast5(e.target.value.replace(/\D/g, '').slice(0, 5))}
                    placeholder="請輸入 5 位數字"
                    maxLength={5}
                    className="input-luxury mt-1 w-36 min-h-11 py-2.5 font-mono text-sm leading-normal"
                  />
                </div>

                {/* 拍照／上傳 */}
                <div>
                  <Label>付款憑證（截圖或拍照）</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="flex gap-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-2"
                      disabled={isCompressing}
                    >
                      {isCompressing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          壓縮中…
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4" />
                          拍照或選取圖片
                        </>
                      )}
                    </Button>
                  </div>
                  {previewUrl && (
                    <div className="mt-3">
                      <img src={previewUrl} alt="預覽" className="max-w-full max-h-48 rounded-lg border object-contain" />
                      <p className="text-xs text-muted-foreground mt-1">{file?.name}</p>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || isCompressing || !selectedId || last5.length !== 5 || !file}
                  className="w-full gap-2 bg-primary hover:bg-primary/90"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      上傳中...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      送出付款憑證
                    </>
                  )}
                </Button>
              </form>
            )}
          </FormCard>
        </div>
      </section>
    </div>
  );
}
