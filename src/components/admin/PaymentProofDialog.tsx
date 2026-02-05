import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, Loader2, Upload } from 'lucide-react';
import { useRegistration, useUpdateRegistration } from '@/hooks/useRegistrations';
import { getPaymentProofUrl } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/** 顯示於憑證旁，供審核時核對是否為正確報名者 */
export interface PaymentProofContext {
  contact_name: string;
  ref_code: string;
  pay_proof_last5?: string;
}

interface PaymentProofDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
  isLoading?: boolean;
  /** 報名者資訊，供審核時核對憑證是否對應正確 */
  context?: PaymentProofContext | null;
  /** 載入逾時時可呼叫重試 */
  onRetry?: () => void;
  /** 該筆報名 id，有值時顯示「上傳／更換憑證」按鈕 */
  registrationId?: string | null;
  /** 更換憑證成功後回調（可傳新 URL 讓父層更新顯示，或僅觸發 refetch） */
  onReplaceSuccess?: (newUrl?: string) => void;
}

/** 點擊可開啟付款憑證的按鈕（用於 RegistrationDetailModal） */
export function PaymentProofButton({
  imageUrl,
  registrationId,
  context,
}: {
  imageUrl?: string | null;
  /** 當無 imageUrl 時，以 registrationId 按需載入憑證（用於 base64 儲存） */
  registrationId?: string | null;
  context?: PaymentProofContext;
}) {
  const [open, setOpen] = useState(false);
  const needFetch = !!registrationId && open;
  const { data: regWithProof, isLoading, refetch } = useRegistration(registrationId || '', {
    includePayProofBase64: true,
    enabled: needFetch,
  });
  const resolvedUrl = (regWithProof ? getPaymentProofUrl(regWithProof) : null) ?? imageUrl;
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Eye className="w-4 h-4" />
        查看憑證
      </Button>
      <PaymentProofDialog
        open={open}
        onOpenChange={setOpen}
        imageUrl={resolvedUrl}
        isLoading={needFetch && isLoading}
        context={context}
        onRetry={needFetch ? () => refetch() : undefined}
        registrationId={registrationId}
        onReplaceSuccess={() => refetch()}
      />
    </>
  );
}

const LOADING_TIMEOUT_MS = 25000; // 25 秒後顯示逾時提示
const MAX_REPLACE_FILE_BYTES = 10 * 1024 * 1024; // 10MB

export function PaymentProofDialog({
  open,
  onOpenChange,
  imageUrl,
  isLoading,
  context,
  onRetry,
  registrationId,
  onReplaceSuccess,
}: PaymentProofDialogProps) {
  const [loadingTooLong, setLoadingTooLong] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [displayUrl, setDisplayUrl] = useState<string | null>(null); // 更換後立即顯示新圖
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateRegistration = useUpdateRegistration();
  const { toast } = useToast();

  const currentImageUrl = displayUrl ?? imageUrl;

  useEffect(() => {
    if (!isLoading) {
      setLoadingTooLong(false);
      return;
    }
    const t = setTimeout(() => setLoadingTooLong(true), LOADING_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [isLoading]);

  useEffect(() => {
    if (!open) setDisplayUrl(null);
    else setDisplayUrl(null);
  }, [open]);

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !registrationId) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: '請選擇圖片檔（JPG、PNG 等）', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_REPLACE_FILE_BYTES) {
      toast({ title: '檔案請在 10MB 以內', variant: 'destructive' });
      return;
    }
    setIsReplacing(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg';
      const path = `${registrationId}/proof.${safeExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(uploadData.path);
      const newUrl = urlData.publicUrl;
      await updateRegistration.mutateAsync({
        id: registrationId,
        updates: { pay_proof_url: newUrl, pay_proof_base64: null },
      });
      setDisplayUrl(newUrl);
      onReplaceSuccess?.(newUrl);
      toast({ title: '已更換憑證圖片', duration: 3000 });
    } catch (err) {
      console.error('Replace proof error:', err);
      toast({
        title: '更換失敗',
        description: err instanceof Error ? err.message : '請稍後再試',
        variant: 'destructive',
      });
    } finally {
      setIsReplacing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>付款憑證</DialogTitle>
          <DialogDescription>上傳的付款憑證圖片</DialogDescription>
        </DialogHeader>
        {context && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">請確認：此憑證是否對應以下報名者？</p>
            <p className="text-muted-foreground">
              聯絡人：<span className="font-medium text-foreground">{context.contact_name}</span>
              {'　'}報名編號：<span className="font-mono font-medium">{context.ref_code}</span>
              {context.pay_proof_last5 && (
                <>　末五碼：<span className="font-mono font-medium">{context.pay_proof_last5}</span></>
              )}
            </p>
          </div>
        )}
        {registrationId && !isLoading && (
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleReplaceFile}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={isReplacing}
              onClick={() => fileInputRef.current?.click()}
            >
              {isReplacing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              上傳／更換憑證
            </Button>
          </div>
        )}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">正在載入付款憑證圖片，圖片較大請稍候…</p>
            {loadingTooLong && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs text-amber-600">載入較久，若持續無回應請重試</p>
                {onRetry && (
                  <Button variant="outline" size="sm" onClick={() => onRetry()}>
                    重試
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : currentImageUrl ? (
          <div className="flex justify-center">
            <img
              src={currentImageUrl}
              alt="付款憑證"
              className="max-w-full max-h-[70vh] object-contain rounded-lg border"
            />
          </div>
        ) : (
          <p className="text-muted-foreground text-sm py-4">無付款憑證</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
