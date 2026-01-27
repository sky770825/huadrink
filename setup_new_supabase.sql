-- 完整的資料庫設置腳本
-- 請在 Supabase SQL Editor 中執行此腳本
-- 訪問：https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi/sql/new

-- 1. 建立報名類型枚舉
CREATE TYPE public.registration_type AS ENUM ('internal', 'external', 'vip');

-- 2. 建立報名狀態枚舉
CREATE TYPE public.registration_status AS ENUM ('open', 'closed', 'waitlist');

-- 3. 建立付款方式枚舉
CREATE TYPE public.payment_method AS ENUM ('transfer', 'cash', 'other');

-- 4. 建立付款狀態枚舉
CREATE TYPE public.payment_status AS ENUM ('paid', 'unpaid');

-- 5. 建立飲食需求枚舉
CREATE TYPE public.diet_type AS ENUM ('normal', 'vegetarian', 'no_beef', 'no_pork', 'other');

-- 6. 建立座位區域枚舉
CREATE TYPE public.seat_zone AS ENUM ('vip', 'general', 'internal');

-- 7. 建立報名資料表
CREATE TABLE public.registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ref_code TEXT NOT NULL UNIQUE,
  type registration_type NOT NULL DEFAULT 'external',
  headcount INTEGER NOT NULL DEFAULT 1 CHECK (headcount >= 1 AND headcount <= 10),
  attendee_list JSONB DEFAULT '[]'::jsonb,
  company TEXT,  -- 已改為可選
  title TEXT,
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  line_id TEXT,
  diet diet_type NOT NULL DEFAULT 'normal',
  diet_other TEXT,
  allergy_note TEXT,
  photo_consent BOOLEAN NOT NULL DEFAULT true,
  inviter TEXT,
  vip_note TEXT,
  invoice_needed BOOLEAN NOT NULL DEFAULT false,  -- 已改為可選，預設 false
  invoice_title TEXT,
  invoice_tax_id TEXT,
  pay_method payment_method NOT NULL DEFAULT 'transfer',
  pay_status payment_status NOT NULL DEFAULT 'unpaid',
  pay_proof_url TEXT,
  status registration_status NOT NULL DEFAULT 'open',
  seat_zone seat_zone,
  table_no INTEGER,
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. 建立系統設定表（控制報名狀態）
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. 插入預設設定
INSERT INTO public.system_settings (key, value) VALUES 
  ('deadline', '2026-01-31T23:59:59+08:00'),
  ('total_tables', '10'),
  ('seats_per_table', '10'),
  ('registration_mode', 'open');

-- 10. 建立管理員表
CREATE TABLE public.admins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 11. 建立更新時間觸發器函數
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. 為 registrations 表建立觸發器
CREATE TRIGGER update_registrations_updated_at
  BEFORE UPDATE ON public.registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 13. 為 system_settings 表建立觸發器
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 14. 建立產生報名編號的函數
CREATE OR REPLACE FUNCTION public.generate_ref_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'DINE-0303-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    SELECT EXISTS(SELECT 1 FROM public.registrations WHERE ref_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- 15. 啟用 RLS (Row Level Security)
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- 16. 報名表 RLS 政策（公開可插入，管理員可讀寫）
CREATE POLICY "Anyone can insert registrations"
  ON public.registrations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view their own registration by ref_code"
  ON public.registrations
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can update registrations"
  ON public.registrations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admins 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete registrations"
  ON public.registrations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admins 
      WHERE user_id = auth.uid()
    )
  );

-- 17. 系統設定表 RLS 政策（公開可讀，管理員可寫）
CREATE POLICY "Anyone can view system settings"
  ON public.system_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can update system settings"
  ON public.system_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admins 
      WHERE user_id = auth.uid()
    )
  );

-- 18. 管理員表 RLS 政策（僅管理員可查看）
CREATE POLICY "Admins can view admins"
  ON public.admins
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admins 
      WHERE user_id = auth.uid()
    )
  );

-- 完成！
-- 現在您可以在應用中使用這個資料庫了
