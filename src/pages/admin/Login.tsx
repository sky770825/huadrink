import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { prefetchRegistrations } from '@/hooks/useRegistrations';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase, REMEMBER_KEY } from '@/integrations/supabase/client';
import { setAdminVerifiedCache } from '@/hooks/useAuth';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Diamond, Loader2, Lock } from 'lucide-react';

const SAVED_EMAIL_KEY = 'huadrink_saved_email';

const loginSchema = z.object({
  email: z.string().email('請輸入有效的 Email'),
  password: z.string().min(6, '密碼至少 6 個字元'),
  remember: z.boolean().default(true),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function AdminLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: typeof window !== 'undefined' ? (localStorage.getItem(SAVED_EMAIL_KEY) || '') : '',
      password: '',
      remember: typeof window !== 'undefined' ? localStorage.getItem(REMEMBER_KEY) !== 'false' : true,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      localStorage.setItem(REMEMBER_KEY, data.remember ? 'true' : 'false');
      if (data.remember) {
        localStorage.setItem(SAVED_EMAIL_KEY, data.email);
      } else {
        localStorage.removeItem(SAVED_EMAIL_KEY);
      }

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;

      // signInWithPassword 已回傳 user，不需再呼叫 getUser()，少一次請求以減少延遲
      const user = authData?.user;
      if (!user) {
        throw new Error('無法獲取用戶資訊');
      }

      const adminsPromise = supabase
        .schema('huadrink')
        .from('admins')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const timeoutResult = { data: null, error: { message: '逾時' } };
      const timeoutPromise = new Promise<typeof timeoutResult>((resolve) => {
        setTimeout(() => resolve(timeoutResult), 12_000);
      });

      const { data: adminData, error: adminError } = await Promise.race([
        adminsPromise,
        timeoutPromise,
      ]);

      if (adminError || !adminData) {
        await supabase.auth.signOut();
        throw new Error(adminError?.message === '逾時' ? '查詢管理員權限逾時，請檢查網路後重試' : '您沒有管理員權限');
      }

      setAdminVerifiedCache(user.id);

      toast({
        title: '登入成功',
        description: '歡迎回來',
      });

      void prefetchRegistrations(queryClient);
      navigate('/admin');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const isAbort = error != null && typeof error === 'object' && ((error as { name?: string }).name === 'AbortError' || /abort|signal is aborted/i.test(msg));
      if (isAbort) {
        toast({ title: '連線被中斷', description: '請再試一次', variant: 'destructive' });
        try { await supabase.auth.signOut(); } catch {}
      } else {
        console.error('[Login]', error);
        const isInvalidCreds = /invalid|credentials|wrong|錯誤/i.test(msg);
        const isNoAdmin = /管理員權限|admin/i.test(msg);
        let description = msg;
        if (isInvalidCreds) description = 'Email 或密碼不正確，請再確認後重試。';
        else if (isNoAdmin) description = '此帳號未列入管理員名單，請聯繫主辦單位或執行 setup-admin 加入。';
        toast({ title: '登入失敗', description, variant: 'destructive' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen marble-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="glass-card rounded-2xl p-8 md:p-10 animate-fade-in-up">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Diamond className="w-8 h-8 text-primary" strokeWidth={1.5} />
              </div>
            </div>
            <h1 className="font-serif text-2xl md:text-3xl font-semibold text-foreground mb-2">
              管理員登入
            </h1>
            <p className="text-sm text-muted-foreground">
              華地產鑽石分會 春酒報名管理
            </p>
          </div>

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="admin@example.com"
                        className="input-luxury"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>密碼</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="••••••••"
                        className="input-luxury"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="remember"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal cursor-pointer">
                      記住登入狀態（關閉分頁後仍保持登入）
                    </FormLabel>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    登入中...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    登入
                  </>
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
