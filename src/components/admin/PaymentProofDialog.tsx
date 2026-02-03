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

interface PaymentProofDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
  isLoading?: boolean;
}

/** 點擊可開啟付款憑證的按鈕（用於 RegistrationDetailModal） */
export function PaymentProofButton({ imageUrl }: { imageUrl: string }) {
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
      <PaymentProofDialog open={open} onOpenChange={setOpen} imageUrl={imageUrl} />
    </>
  );
}

export function PaymentProofDialog({ open, onOpenChange, imageUrl, isLoading }: PaymentProofDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>付款憑證</DialogTitle>
          <DialogDescription>上傳的付款憑證圖片</DialogDescription>
        </DialogHeader>
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
