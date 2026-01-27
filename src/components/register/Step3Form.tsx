import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { FormSection } from './FormCard';
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/constants';
import { Upload, FileImage, X } from 'lucide-react';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import type { RegistrationFormData } from '@/types/registration';

interface Step3FormProps {
  form: UseFormReturn<RegistrationFormData>;
}

export function Step3Form({ form }: Step3FormProps) {
  const watchPayStatus = form.watch('pay_status');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue('pay_proof_file', file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleRemoveFile = () => {
    form.setValue('pay_proof_file', undefined);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-8">
      {/* Payment Method */}
      <FormSection title="付款方式">
        <FormField
          control={form.control}
          name="pay_method"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="grid grid-cols-3 gap-3"
                >
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                    <label
                      key={value}
                      className="flex items-center justify-center gap-2 p-4 rounded-xl border border-border/50 bg-background/50 cursor-pointer transition-all hover:border-primary/30 hover:bg-primary/5 has-[:checked]:border-primary has-[:checked]:bg-primary/10 text-center"
                    >
                      <RadioGroupItem value={value} className="sr-only" />
                      <span className="text-sm font-medium">{label}</span>
                    </label>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormSection>

      {/* Payment Status */}
      <FormSection title="付款狀態">
        <FormField
          control={form.control}
          name="pay_status"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="grid grid-cols-2 gap-3"
                >
                  {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
                    <label
                      key={value}
                      className="flex items-center justify-center gap-2 p-4 rounded-xl border border-border/50 bg-background/50 cursor-pointer transition-all hover:border-primary/30 hover:bg-primary/5 has-[:checked]:border-primary has-[:checked]:bg-primary/10 text-center"
                    >
                      <RadioGroupItem value={value} className="sr-only" />
                      <span className="text-sm font-medium">{label}</span>
                    </label>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormSection>

      {/* Payment Proof Upload */}
      {watchPayStatus === 'paid' && (
        <FormSection title="付款憑證" description="請上傳轉帳截圖或收據照片">
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="pay-proof-upload"
            />
            
            {previewUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-border/50 bg-muted/30">
                <img
                  src={previewUrl}
                  alt="付款憑證預覽"
                  className="w-full h-48 object-contain bg-background"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={handleRemoveFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label
                htmlFor="pay-proof-upload"
                className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed border-border/50 bg-muted/20 cursor-pointer transition-all hover:border-primary/30 hover:bg-primary/5"
              >
                <div className="p-3 rounded-full bg-primary/10">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">點擊上傳付款憑證</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    支援 JPG、PNG 格式
                  </p>
                </div>
              </label>
            )}
          </div>
        </FormSection>
      )}

      {/* Important Notice */}
      <div className="p-6 rounded-xl bg-primary/5 border border-primary/20">
        <div className="flex items-start gap-3">
          <FileImage className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-foreground mb-1">付款提醒</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              請於 <span className="text-primary font-medium">1/31（含）</span> 前完成付款，
              逾期將視為候補報名。付款後請上傳憑證以加速確認流程。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
