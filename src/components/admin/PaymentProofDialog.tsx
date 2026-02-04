import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, Loader2 } from 'lucide-react';

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
}

/** 點擊可開啟付款憑證的按鈕（用於 RegistrationDetailModal） */
export function PaymentProofButton({ imageUrl, context }: { imageUrl: string; context?: PaymentProofContext }) {
  const [open, setOpen] = useState(false);
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
      <PaymentProofDialog open={open} onOpenChange={setOpen} imageUrl={imageUrl} context={context} />
    </>
  );
}

export function PaymentProofDialog({ open, onOpenChange, imageUrl, isLoading, context }: PaymentProofDialogProps) {
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
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : imageUrl ? (
          <div className="flex justify-center">
            <img
              src={imageUrl}
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
