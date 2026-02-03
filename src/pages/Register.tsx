import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Hero } from '@/components/register/Hero';
import { Stepper } from '@/components/register/Stepper';
import { FormCard } from '@/components/register/FormCard';
import { Step1Form } from '@/components/register/Step1Form';
import { Step2Form } from '@/components/register/Step2Form';
import { SuccessPage } from '@/components/register/SuccessPage';
import { useSystemSettings, isDeadlinePassed } from '@/hooks/useSystemSettings';
import { supabase } from '@/integrations/supabase/client';
import { huadrink } from '@/lib/supabase-huadrink';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { REGISTRATION_TYPE_LABELS } from '@/lib/constants';
import { formatDeadlineDisplay } from '@/lib/utils';
import type { Registration, RegistrationFormData, Attendee, RegistrationType } from '@/types/registration';
import type { Json } from '@/integrations/supabase/types';

const phoneRegex = /^09\d{8}$/;

const step1Schema = z.object({
  type: z.enum(['internal', 'external']),
  member_id: z.number().optional(),
  headcount: z.number().min(1).max(10).default(1),
  attendee_list: z.array(z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
  })).default([]),
  company: z.string().optional(),
  title: z.string().optional(),
  invoice_needed: z.boolean().optional(),
  invoice_title: z.string().optional(),
  invoice_tax_id: z.string().optional(),
  inviter: z.string().optional(),
  vip_note: z.string().optional(),
}).refine((data) => {
  if (data.type === 'internal') {
    return data.member_id !== undefined && data.member_id !== null;
  }
  return true;
}, {
  message: '請選擇內部成員',
  path: ['member_id'],
});

const step2Schema = z.object({
  contact_name: z.string().min(1, '請填寫聯絡人姓名'),
  phone: z.string().regex(phoneRegex, '請輸入有效的台灣手機號碼（09xxxxxxxx）'),
  // Email 目前不需要填寫，改為完全選填
  email: z.string().email('請輸入有效的 Email').optional().or(z.literal('')),
  line_id: z.string().optional(),
  diet: z.enum(['normal', 'vegetarian', 'no_beef', 'no_pork', 'other']),
  diet_other: z.string().optional(),
  allergy_note: z.string().optional(),
  photo_consent: z.boolean(),
  inviter: z.string().optional(),
});

const fullSchema = step1Schema.and(step2Schema);

const waitlistSchema = z.object({
  contact_name: z.string().min(1, '請填寫姓名'),
  phone: z.string().regex(phoneRegex, '請輸入有效的台灣手機號碼'),
  headcount: z.number().min(1).max(10).default(1),
  type: z.enum(['internal', 'external']),
  note: z.string().optional(),
});

type WaitlistFormData = z.infer<typeof waitlistSchema>;

function parseAttendeeList(data: Json | null): Attendee[] {
  if (!data || !Array.isArray(data)) return [];
  return data.map((item) => {
    if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
      return {
        name: typeof item.name === 'string' ? item.name : '',
        phone: typeof item.phone === 'string' ? item.phone : undefined,
      };
    }
    return { name: '', phone: undefined };
  });
}

export default function Register() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRegistration, setSubmittedRegistration] = useState<Registration | null>(null);
  const { data: settings, isLoading: settingsLoading } = useSystemSettings();
  const { toast } = useToast();

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(fullSchema),
    defaultValues: {
      type: 'internal',
      member_id: undefined,
      headcount: 1,
      attendee_list: [],
      company: '',
      title: '',
      invoice_needed: false,
      invoice_title: '',
      invoice_tax_id: '',
      inviter: '',
      vip_note: '',
      contact_name: '',
      phone: '',
      email: '',
      line_id: '',
      diet: 'normal',
      diet_other: '',
      allergy_note: '',
      photo_consent: true,
      pay_method: 'transfer',
      pay_status: 'unpaid',
    },
    mode: 'onChange',
  });

  const waitlistForm = useForm<WaitlistFormData>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: {
      contact_name: '',
      phone: '',
      headcount: 1,
      type: 'internal',
      note: '',
    },
  });

  const isWaitlistMode = settings && (
    settings.registration_mode === 'waitlist' || 
    settings.registration_mode === 'closed' ||
    isDeadlinePassed(settings.deadline)
  );

  const validateCurrentStep = async () => {
    let fieldsToValidate: (keyof RegistrationFormData)[] = [];
    
    if (currentStep === 1) {
      fieldsToValidate = ['type', 'member_id'];
    } else if (currentStep === 2) {
      fieldsToValidate = ['contact_name', 'phone', 'diet', 'photo_consent'];
    }

    const result = await form.trigger(fieldsToValidate);
    return result;
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, 2));
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const generateRefCode = () => {
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `HUADRINK-${random}`;
  };


  const onSubmit = async (data: RegistrationFormData) => {
    // 送出前再次檢查報名截止日（與後台同步，避免表單開著過期仍送出）
    const deadlineToCheck = settings?.deadline;
    if (deadlineToCheck && isDeadlinePassed(deadlineToCheck)) {
      toast({
        title: '報名已截止',
        description: '目前僅開放候補登記，請使用下方表單或聯繫主辦單位。',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const refCode = generateRefCode();

      // Convert attendee_list to JSON-compatible format
      const attendeeListJson = (data.attendee_list || []).map((a) => ({
        name: a.name || '',
        phone: a.phone || null,
      })) as Json;

      const insertData = {
        ref_code: refCode,
        type: data.type,
        headcount: data.headcount || 1,
        attendee_list: attendeeListJson || [],
        company: data.company || '未填寫',
        title: data.title || null,
        contact_name: data.contact_name,
        phone: data.phone,
        email: data.email || null,
        line_id: data.line_id || null,
        diet: data.diet,
        diet_other: data.diet_other || null,
        allergy_note: data.allergy_note || null,
        photo_consent: data.photo_consent,
        inviter: data.inviter || null,
        vip_note: data.vip_note || null,
        invoice_needed: data.invoice_needed || false,
        invoice_title: data.invoice_title || null,
        invoice_tax_id: data.invoice_tax_id || null,
        pay_method: 'transfer' as const,
        pay_status: 'unpaid' as const,
        pay_proof_url: null,
        status: 'open' as const,
      };

      const insertPromise = Promise.resolve(
        huadrink.from('registrations').insert(insertData).select().single()
      );
      insertPromise.catch(() => {}); // 避免 AbortError 被當成 Uncaught (in promise)
      const { data: result, error } = await insertPromise;
      if (error) throw error;

      // Convert database result to Registration type
      const registration: Registration = {
        id: result.id,
        ref_code: result.ref_code,
        type: result.type as Registration['type'],
        headcount: result.headcount,
        attendee_list: parseAttendeeList(result.attendee_list),
        company: result.company,
        title: result.title,
        contact_name: result.contact_name,
        phone: result.phone,
        email: result.email,
        line_id: result.line_id,
        diet: result.diet as Registration['diet'],
        diet_other: result.diet_other,
        allergy_note: result.allergy_note,
        photo_consent: result.photo_consent,
        inviter: result.inviter,
        vip_note: result.vip_note,
        invoice_needed: result.invoice_needed,
        invoice_title: result.invoice_title,
        invoice_tax_id: result.invoice_tax_id,
        pay_method: result.pay_method as Registration['pay_method'],
        pay_status: result.pay_status as Registration['pay_status'],
        pay_proof_url: result.pay_proof_url,
        status: result.status as Registration['status'],
        seat_zone: result.seat_zone as Registration['seat_zone'],
        table_no: result.table_no,
        admin_note: result.admin_note,
        created_at: result.created_at,
        updated_at: result.updated_at,
      };

      setSubmittedRegistration(registration);

    } catch (error) {
      console.error('Submit error:', error);
      const err = error as { name?: string; message?: string } | undefined;
      const isAborted = err && (
        err.name === 'AbortError' ||
        (typeof err.message === 'string' && /abort|signal is aborted/i.test(err.message))
      );
      const message = isAborted
        ? '連線已中斷或請求已取消，請再試一次。'
        : (error && typeof error === 'object' && 'message' in error
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (error as any).message
            : '請稍後再試或聯繫主辦單位');

      toast({
        title: isAborted ? '請求已取消' : '報名失敗',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onWaitlistSubmit = async (data: WaitlistFormData) => {
    setIsSubmitting(true);
    
    try {
      const refCode = generateRefCode();

      const insertData = {
        ref_code: refCode,
        type: data.type,
        headcount: data.headcount,
        attendee_list: [],
        company: '候補登記',
        contact_name: data.contact_name,
        phone: data.phone,
        diet: 'normal' as const,
        photo_consent: true,
        invoice_needed: false,
        pay_method: 'transfer' as const,
        pay_status: 'unpaid' as const,
        status: 'waitlist' as const,
        admin_note: data.note || null,
      };

      const waitlistPromise = Promise.resolve(
        huadrink.from('registrations').insert(insertData).select().single()
      );
      waitlistPromise.catch(() => {}); // 避免 AbortError 被當成 Uncaught (in promise)
      const { data: result, error } = await waitlistPromise;

      if (error) throw error;

      const registration: Registration = {
        id: result.id,
        ref_code: result.ref_code,
        type: result.type as Registration['type'],
        headcount: result.headcount,
        attendee_list: [],
        company: result.company,
        title: result.title,
        contact_name: result.contact_name,
        phone: result.phone,
        email: result.email,
        line_id: result.line_id,
        diet: result.diet as Registration['diet'],
        diet_other: result.diet_other,
        allergy_note: result.allergy_note,
        photo_consent: result.photo_consent,
        inviter: result.inviter,
        vip_note: result.vip_note,
        invoice_needed: result.invoice_needed,
        invoice_title: result.invoice_title,
        invoice_tax_id: result.invoice_tax_id,
        pay_method: result.pay_method as Registration['pay_method'],
        pay_status: result.pay_status as Registration['pay_status'],
        pay_proof_url: result.pay_proof_url,
        status: result.status as Registration['status'],
        seat_zone: result.seat_zone as Registration['seat_zone'],
        table_no: result.table_no,
        admin_note: result.admin_note,
        created_at: result.created_at,
        updated_at: result.updated_at,
      };

      setSubmittedRegistration(registration);

    } catch (error) {
      console.error('Submit error:', error);
      const err = error as { name?: string; message?: string } | undefined;
      const isAborted = err && (
        err.name === 'AbortError' ||
        (typeof err.message === 'string' && /abort|signal is aborted/i.test(err.message))
      );
      const message = isAborted
        ? '連線已中斷或請求已取消，請再試一次。'
        : (error && typeof error === 'object' && 'message' in error
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (error as any).message
            : '請稍後再試或聯繫主辦單位');

      toast({
        title: isAborted ? '請求已取消' : '登記失敗',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (settingsLoading) {
    return (
      <div className="min-h-screen marble-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (submittedRegistration) {
    return <SuccessPage registration={submittedRegistration} />;
  }

  return (
    <div className="min-h-screen marble-bg overflow-x-hidden">
      <Hero />
      
      <section className="py-8 sm:py-12 md:py-16 w-full min-w-0">
        <div className="container max-w-2xl mx-auto w-full min-w-0 px-3 sm:px-4">
          {isWaitlistMode ? (
            <Form {...waitlistForm}>
              <form onSubmit={waitlistForm.handleSubmit(onWaitlistSubmit)}>
                <FormCard>
                  {/* Waitlist Notice */}
                  <div className="p-6 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-8">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-foreground mb-1">候補登記</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          報名人數已於 {settings?.deadline ? formatDeadlineDisplay(settings.deadline) : '報名截止日'} 鎖定。您的登記將進入候補名單，若有名額釋出，我們會主動與您聯繫。
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Basic Info */}
                  <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={waitlistForm.control}
                        name="contact_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              姓名
                              <span className="text-destructive ml-1">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="請輸入姓名"
                                className="input-luxury"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={waitlistForm.control}
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
                                placeholder="0912345678"
                                className="input-luxury"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={waitlistForm.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>報名類型</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="grid gap-3"
                            >
                              {Object.entries(REGISTRATION_TYPE_LABELS).map(([value, label]) => (
                                <label
                                  key={value}
                                  className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-background/50 cursor-pointer transition-all hover:border-primary/30 hover:bg-primary/5 has-[:checked]:border-primary has-[:checked]:bg-primary/10"
                                >
                                  <RadioGroupItem value={value} className="text-primary" />
                                  <span className="text-sm font-medium">{label}</span>
                                </label>
                              ))}
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={waitlistForm.control}
                      name="headcount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>預計人數</FormLabel>
                          <Select
                            value={field.value?.toString()}
                            onValueChange={(v) => field.onChange(parseInt(v))}
                          >
                            <FormControl>
                              <SelectTrigger className="input-luxury">
                                <SelectValue placeholder="選擇人數" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                <SelectItem key={num} value={num.toString()}>
                                  {num} 人
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={waitlistForm.control}
                      name="note"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>備註（選填）</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="如有其他需要說明的事項，請在此填寫"
                              className="input-luxury min-h-[100px] resize-none"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="mt-8 flex justify-center">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="min-w-[200px] bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          處理中...
                        </>
                      ) : (
                        '送出候補登記'
                      )}
                    </Button>
                  </div>
                </FormCard>
              </form>
            </Form>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <Stepper currentStep={currentStep} />
                
                <FormCard>
                  {currentStep === 1 && <Step1Form form={form} />}
                  {currentStep === 2 && <Step2Form form={form} />}
                  
                  {/* Navigation */}
                  <div className="mt-8 flex justify-between gap-4">
                    {currentStep > 1 ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePrev}
                        className="gap-2"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        上一步
                      </Button>
                    ) : (
                      <div />
                    )}
                    
                    {currentStep < 2 ? (
                      <Button
                        type="button"
                        onClick={handleNext}
                        className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        下一步
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            處理中...
                          </>
                        ) : (
                          '送出報名'
                        )}
                      </Button>
                    )}
                  </div>
                </FormCard>
              </form>
            </Form>
          )}
        </div>
      </section>
    </div>
  );
}
