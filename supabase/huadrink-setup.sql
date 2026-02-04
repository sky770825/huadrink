-- huadrink 華地產鑽石春酒 - 完整資料庫設定（獨立 schema，不與共同資料庫其他專案衝突）
-- 在 Supabase SQL Editor 執行：https://supabase.com/dashboard/project/sqgrnowrcvspxhuudrqc/sql/new
--
-- 若 API 無法存取 huadrink，請到 Project Settings > API > Exposed schemas 新增 "huadrink"

CREATE SCHEMA IF NOT EXISTS huadrink;

DO $$ BEGIN
  CREATE TYPE huadrink.registration_type AS ENUM ('internal', 'external', 'vip');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE huadrink.registration_status AS ENUM ('open', 'closed', 'waitlist');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE huadrink.payment_method AS ENUM ('transfer', 'cash', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE huadrink.payment_status AS ENUM ('paid', 'unpaid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE huadrink.diet_type AS ENUM ('normal', 'vegetarian', 'no_beef', 'no_pork', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE huadrink.seat_zone AS ENUM ('vip', 'general', 'internal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'huadrink' AND t.typname = 'payment_status' AND e.enumlabel = 'pending') THEN
    ALTER TYPE huadrink.payment_status ADD VALUE 'pending';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS huadrink.registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ref_code TEXT NOT NULL UNIQUE,
  type huadrink.registration_type NOT NULL DEFAULT 'external',
  headcount INTEGER NOT NULL DEFAULT 1 CHECK (headcount >= 1 AND headcount <= 10),
  attendee_list JSONB DEFAULT '[]'::jsonb,
  company TEXT,
  title TEXT,
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  line_id TEXT,
  diet huadrink.diet_type NOT NULL DEFAULT 'normal',
  diet_other TEXT,
  allergy_note TEXT,
  photo_consent BOOLEAN NOT NULL DEFAULT true,
  inviter TEXT,
  vip_note TEXT,
  invoice_needed BOOLEAN DEFAULT false,
  invoice_title TEXT,
  invoice_tax_id TEXT,
  pay_method huadrink.payment_method NOT NULL DEFAULT 'transfer',
  pay_status huadrink.payment_status NOT NULL DEFAULT 'unpaid',
  pay_proof_url TEXT,
  pay_proof_base64 TEXT,
  pay_proof_last5 TEXT,
  status huadrink.registration_status NOT NULL DEFAULT 'open',
  seat_zone huadrink.seat_zone,
  table_no INTEGER,
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

DROP TABLE IF EXISTS huadrink.system_settings CASCADE;
CREATE TABLE huadrink.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS huadrink.admins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE huadrink.registrations ADD COLUMN IF NOT EXISTS pay_proof_base64 TEXT;
ALTER TABLE huadrink.registrations ADD COLUMN IF NOT EXISTS pay_proof_last5 TEXT;

CREATE OR REPLACE FUNCTION huadrink.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = huadrink AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS update_registrations_updated_at ON huadrink.registrations;
CREATE TRIGGER update_registrations_updated_at BEFORE UPDATE ON huadrink.registrations
  FOR EACH ROW EXECUTE FUNCTION huadrink.update_updated_at_column();
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON huadrink.system_settings;
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON huadrink.system_settings
  FOR EACH ROW EXECUTE FUNCTION huadrink.update_updated_at_column();

CREATE OR REPLACE FUNCTION huadrink.generate_ref_code()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = huadrink AS $$
DECLARE new_code TEXT; code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'HUADRINK-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    SELECT EXISTS(SELECT 1 FROM huadrink.registrations WHERE ref_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END; $$;

CREATE OR REPLACE FUNCTION huadrink.submit_payment_proof(
  p_registration_id UUID, p_pay_proof_url TEXT, p_pay_proof_last5 TEXT, p_pay_proof_base64 TEXT DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = huadrink AS $$
BEGIN
  UPDATE huadrink.registrations
  SET pay_proof_url = CASE WHEN p_pay_proof_base64 IS NOT NULL THEN NULL ELSE p_pay_proof_url END,
      pay_proof_base64 = p_pay_proof_base64, pay_proof_last5 = p_pay_proof_last5,
      pay_status = 'pending', updated_at = now()
  WHERE id = p_registration_id AND type = 'internal' AND pay_status IN ('unpaid', 'pending');
END; $$;
GRANT USAGE ON SCHEMA huadrink TO anon, authenticated;
GRANT EXECUTE ON FUNCTION huadrink.submit_payment_proof TO anon, authenticated;

ALTER TABLE huadrink.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE huadrink.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE huadrink.admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "huadrink_Anyone can insert registrations" ON huadrink.registrations;
CREATE POLICY "huadrink_Anyone can insert registrations" ON huadrink.registrations FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "huadrink_Anyone can view" ON huadrink.registrations;
CREATE POLICY "huadrink_Anyone can view" ON huadrink.registrations FOR SELECT USING (true);
DROP POLICY IF EXISTS "huadrink_Admins can update" ON huadrink.registrations;
CREATE POLICY "huadrink_Admins can update" ON huadrink.registrations FOR UPDATE
  USING (EXISTS (SELECT 1 FROM huadrink.admins WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "huadrink_Admins can delete" ON huadrink.registrations;
CREATE POLICY "huadrink_Admins can delete" ON huadrink.registrations FOR DELETE
  USING (EXISTS (SELECT 1 FROM huadrink.admins WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "huadrink_Anyone can view settings" ON huadrink.system_settings;
CREATE POLICY "huadrink_Anyone can view settings" ON huadrink.system_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "huadrink_Admins can update settings" ON huadrink.system_settings;
CREATE POLICY "huadrink_Admins can update settings" ON huadrink.system_settings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM huadrink.admins WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "huadrink_Admins can view admins" ON huadrink.admins;
CREATE POLICY "huadrink_Admins can view admins" ON huadrink.admins
  FOR SELECT USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON huadrink.registrations TO anon, authenticated;
GRANT SELECT, UPDATE ON huadrink.system_settings TO anon, authenticated;
GRANT SELECT ON huadrink.admins TO authenticated;

INSERT INTO huadrink.system_settings (key, value) VALUES
  ('registration_mode', 'open'),
  ('deadline', '2026-01-31T23:59:59+08:00'),
  ('total_tables', '10'),
  ('seats_per_table', '10'),
  ('payment_bank_name', '（請填入銀行名稱）'),
  ('payment_account_number', '（請填入帳號）'),
  ('payment_account_name', '（請填入戶名）'),
  ('payment_amount', '（請填入金額或另洽主辦）')
ON CONFLICT (key) DO NOTHING;

-- 索引：避免全表掃描，報名筆數一多會嚴重延遲
CREATE INDEX IF NOT EXISTS idx_registrations_type_pay_status
  ON huadrink.registrations (type, pay_status);
CREATE INDEX IF NOT EXISTS idx_registrations_created_at_desc
  ON huadrink.registrations (created_at DESC);
