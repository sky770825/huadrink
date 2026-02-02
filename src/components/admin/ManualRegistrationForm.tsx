import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateRegistration } from '@/hooks/useRegistrations';
import { useToast } from '@/hooks/use-toast';
import { REGISTRATION_TYPE_LABELS, DIET_TYPE_LABELS } from '@/lib/constants';
import { MEMBERS } from '@/lib/members';
import { Loader2, Save, UserPlus } from 'lucide-react';
import type { RegistrationType, DietType } from '@/types/registration';

const phoneRegex = /^09\d{8}$/;

const manualRegistrationSchema = z.object({
  type: z.enum(['internal', 'external']),
  member_id: z.number().optional(),
  contact_name: z.string().min(1, '請填寫聯絡人姓名'),
  phone: z.string().regex(phoneRegex, '請輸入有效的台灣手機號碼（09xxxxxxxx）'),
  email: z.string().email('請輸入有效的 Email').optional().or(z.literal('')),
  line_id: z.string().optional(),
  company: z.string().optional(),
  title: z.string().optional(),
  headcount: z.number().min(1).max(10).default(1),
  diet: z.enum(['normal', 'vegetarian', 'no_beef', 'no_pork', 'other']),
  diet_other: z.string().optional(),
  allergy_note: z.string().optional(),
  photo_consent: z.boolean().default(true),
  inviter: z.string().optional(),
  admin_note: z.string().optional(),
}).refine((data) => {
  if (data.type === 'internal') {
    return data.member_id !== undefined && data.member_id !== null;
  }
  return true;
}, {
  message: '請選擇內部成員',
  path: ['member_id'],
});

type ManualRegistrationFormData = z.infer<typeof manualRegistrationSchema>;

export function ManualRegistrationForm() {
  const { toast } = useToast();
  const createRegistration = useCreateRegistration();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ManualRegistrationFormData>({
    resolver: zodResolver(manualRegistrationSchema),
    defaultValues: {
      type: 'internal',
      member_id: undefined,
      contact_name: '',
      phone: '',
      email: '',
      line_id: '',
      company: '',
      title: '',
      headcount: 1,
      diet: 'normal',
      diet_other: '',
      allergy_note: '',
      photo_consent: true,
      inviter: '',
      admin_note: '',
    },
  });

  const watchType = form.watch('type');

  const onSubmit = async (data: ManualRegistrationFormData) => {
    setIsSubmitting(true);
    try {
      // 如果是內部成員，自動填入姓名
      let contactName = data.contact_name;
      if (data.type === 'internal' && data.member_id) {
        const member = MEMBERS.find(m => m.id === data.member_id);
        if (member) {
          contactName = member.name;
        }
      }

      await createRegistration.mutateAsync({
        type: data.type,
        member_id: data.member_id,
        headcount: data.headcount,
        attendee_list: [],
        company: data.company || '未填寫',
        title: data.title,
        contact_name: contactName,
        phone: data.phone,
        email: data.email || null,
        line_id: data.line_id || null,
        diet: data.diet,
        diet_other: data.diet_other || null,
        allergy_note: data.allergy_note || null,
        photo_consent: data.photo_consent,
        inviter: data.inviter || null,
        vip_note: null,
        invoice_needed: false,
        invoice_title: null,
        invoice_tax_id: null,
        pay_method: 'transfer',
        pay_status: 'unpaid',
        pay_proof_url: null,
        status: 'open',
        admin_note: data.admin_note || null,
      });

      toast({
        title: '提交成功',
        description: '名單已成功提交',
      });

      // 重置表單
      form.reset();
    } catch (error) {
      console.error('提交失敗:', error);
      toast({
        title: '提交失敗',
        description: error instanceof Error ? error.message : '請稍後再試',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-card rounded-xl p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <UserPlus className="w-5 h-5 text-primary" />
        <h2 className="font-serif text-xl md:text-2xl font-semibold">手動提交名單</h2>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* 報名類型 */}
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>報名類型 *</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    if (value === 'external') {
                      form.setValue('member_id', undefined);
                    }
                  }}
                >
                  <FormControl>
                    <SelectTrigger className="input-luxury">
                      <SelectValue placeholder="選擇報名類型" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="external">外部來賓</SelectItem>
                    <SelectItem value="internal">內部夥伴</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 內部成員選擇 */}
          {watchType === 'internal' && (
            <FormField
              control={form.control}
              name="member_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>選擇內部成員 *</FormLabel>
                  <Select
                    value={
                      field.value !== undefined && field.value !== null
                        ? field.value.toString()
                        : ''
                    }
                    onValueChange={(value) => {
                      const memberId = parseInt(value);
                      field.onChange(memberId);
                      const member = MEMBERS.find((m) => m.id === memberId);
                      if (member) {
                        // 預設帶入成員姓名，但仍允許後續手動調整
                        form.setValue('contact_name', member.name);
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="input-luxury">
                        <SelectValue placeholder="選擇內部成員" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[300px]">
                      {MEMBERS.map((member) => (
                        <SelectItem key={member.id} value={member.id.toString()}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {member.id}. {member.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {member.specialty}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* 聯絡人姓名 */}
          <FormField
            control={form.control}
            name="contact_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>聯絡人姓名 *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="請輸入聯絡人姓名"
                    className="input-luxury"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 電話 */}
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>電話 *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="0912345678"
                    className="input-luxury"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email（選填）</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="example@email.com"
                    className="input-luxury"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 公司 */}
          {watchType === 'external' && (
            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>公司（選填）</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="請輸入公司名稱"
                      className="input-luxury"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* 職稱 */}
          {watchType === 'external' && (
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>職稱（選填）</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="請輸入職稱"
                      className="input-luxury"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* 人數 */}
          <FormField
            control={form.control}
            name="headcount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>人數 *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min={1}
                    max={10}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                    className="input-luxury"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 飲食需求 */}
          <FormField
            control={form.control}
            name="diet"
            render={({ field }) => (
              <FormItem>
                <FormLabel>飲食需求 *</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="input-luxury">
                      <SelectValue placeholder="選擇飲食需求" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(DIET_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 其他飲食需求 */}
          <FormField
            control={form.control}
            name="diet_other"
            render={({ field }) => (
              <FormItem>
                <FormLabel>其他飲食需求（選填）</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="請說明其他飲食需求"
                    className="input-luxury"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 過敏備註 */}
          <FormField
            control={form.control}
            name="allergy_note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>過敏備註（選填）</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="請說明過敏情況"
                    className="input-luxury"
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 照片同意 */}
          <FormField
            control={form.control}
            name="photo_consent"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>同意活動照片使用 *</FormLabel>
                </div>
              </FormItem>
            )}
          />

          {/* 邀請人 */}
          <FormField
            control={form.control}
            name="inviter"
            render={({ field }) => (
              <FormItem>
                <FormLabel>邀請人（選填）</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="請輸入邀請人姓名"
                    className="input-luxury"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 管理員備註 */}
          <FormField
            control={form.control}
            name="admin_note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>管理員備註（選填）</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="內部備註，僅管理員可見"
                    className="input-luxury"
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 提交按鈕 */}
          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  提交名單
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
              disabled={isSubmitting}
            >
              重置
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
