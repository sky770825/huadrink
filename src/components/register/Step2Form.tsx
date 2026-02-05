import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormSection } from './FormCard';
import { DIET_TYPE_LABELS } from '@/lib/constants';
import { useMembers } from '@/hooks/useMembers';
import type { RegistrationFormData } from '@/types/registration';

interface Step2FormProps {
  form: UseFormReturn<RegistrationFormData>;
}

export function Step2Form({ form }: Step2FormProps) {
  const { members } = useMembers();
  const watchDiet = form.watch('diet');
  const watchType = form.watch('type');
  const watchMemberId = form.watch('member_id');
  const watchContactName = form.watch('contact_name');


  return (
    <div className="space-y-8">
      {/* Contact Info */}
      <FormSection title="聯絡資訊" description="我們會透過此資訊與您聯繫">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="contact_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  聯絡人姓名
                  <span className="text-destructive ml-1">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="請輸入姓名"
                    className="input-luxury"
                    disabled={watchType === 'internal' && watchMemberId !== undefined}
                    readOnly={watchType === 'internal' && watchMemberId !== undefined}
                  />
                </FormControl>
                {watchType === 'internal' && watchMemberId && (
                  <p className="text-xs text-muted-foreground">
                    已自動填入選擇的成員姓名
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  手機號碼
                  <span className="text-destructive ml-1">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="0912-345-678"
                    className="input-luxury"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {/* 移除聯絡信箱欄位：目前不需要填寫 Email */}
        <FormField
          control={form.control}
          name="line_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>LINE ID（選填）</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="your_line_id"
                  className="input-luxury"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormSection>

      {/* Diet */}
      <FormSection title="飲食需求">
        <FormField
          control={form.control}
          name="diet"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                >
                  {Object.entries(DIET_TYPE_LABELS).map(([value, label]) => (
                    <label
                      key={value}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl border border-border/50 bg-background/50 cursor-pointer transition-all hover:border-primary/30 hover:bg-primary/5 has-[:checked]:border-primary has-[:checked]:bg-primary/10 text-center"
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

        {watchDiet === 'other' && (
          <FormField
            control={form.control}
            name="diet_other"
            render={({ field }) => (
              <FormItem>
                <FormLabel>請說明飲食需求</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="如：不吃海鮮、對堅果過敏等"
                    className="input-luxury"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </FormSection>

      {/* Allergy Note */}
      <FormSection title="過敏或其他備註（選填）">
        <FormField
          control={form.control}
          name="allergy_note"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="如有食物過敏或其他需要特別注意的事項，請在此說明"
                  className="input-luxury min-h-[100px] resize-none"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormSection>

      {/* Photo Consent */}
      <FormSection title="拍攝同意">
        <FormField
          control={form.control}
          name="photo_consent"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
              <div>
                <FormLabel className="text-base">同意活動拍照錄影</FormLabel>
                <p className="text-sm text-muted-foreground">
                  活動期間可能會拍攝照片或影片供後續宣傳使用
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </FormSection>

      {/* Inviter：僅外部／VIP 顯示，從內部成員名單選擇 */}
      {(watchType === 'external' || watchType === 'vip') && (
        <FormSection title="來賓來源（選填）" description="誰邀請您參加？可選擇對應的內部成員">
          <FormField
            control={form.control}
            name="inviter"
            render={({ field }) => (
              <FormItem>
                <FormLabel>邀請人</FormLabel>
                <Select
                  value={field.value || '__none__'}
                  onValueChange={(v) => field.onChange(v === '__none__' ? undefined : v)}
                >
                  <FormControl>
                    <SelectTrigger className="input-luxury">
                      <SelectValue placeholder="請選擇（選填）" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">請選擇（選填）</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.name}>
                        {m.id}. {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>
      )}
    </div>
  );
}
