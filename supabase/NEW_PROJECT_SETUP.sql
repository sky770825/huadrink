-- HUADRINK 新專案建置腳本
-- Project: dwchlfeiqebwufxvzlhc
-- https://supabase.com/dashboard/project/dwchlfeiqebwufxvzlhc/sql/new

CREATE SCHEMA IF NOT EXISTS huadrink;

DO $$ BEGIN CREATE TYPE huadrink.registration_type AS ENUM ('internal', 'external', 'vip'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE huadrink.registration_status AS ENUM ('open', 'closed', 'waitlist'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE huadrink.payment_method AS ENUM ('transfer', 'cash', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE huadrink.payment_status AS ENUM ('paid', 'unpaid', 'pending'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE huadrink.diet_type AS ENUM ('normal', 'vegetarian', 'no_beef', 'no_pork', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE huadrink.seat_zone AS ENUM ('vip', 'general', 'internal'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TABLE IF EXISTS huadrink.registrations CASCADE;
DROP TABLE IF EXISTS huadrink.system_settings CASCADE;
DROP TABLE IF EXISTS huadrink.admins CASCADE;
DROP TABLE IF EXISTS huadrink.internal_members CASCADE;

CREATE TABLE huadrink.registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY, ref_code TEXT NOT NULL UNIQUE,
  type huadrink.registration_type NOT NULL DEFAULT 'external',
  headcount INTEGER NOT NULL DEFAULT 1 CHECK (headcount >= 1 AND headcount <= 10),
  attendee_list JSONB DEFAULT '[]'::jsonb, company TEXT, title TEXT, contact_name TEXT NOT NULL,
  phone TEXT NOT NULL, email TEXT, line_id TEXT, diet huadrink.diet_type NOT NULL DEFAULT 'normal',
  diet_other TEXT, allergy_note TEXT, photo_consent BOOLEAN NOT NULL DEFAULT true,
  inviter TEXT, vip_note TEXT, invoice_needed BOOLEAN DEFAULT false, invoice_title TEXT, invoice_tax_id TEXT,
  pay_method huadrink.payment_method NOT NULL DEFAULT 'transfer', pay_status huadrink.payment_status NOT NULL DEFAULT 'unpaid',
  pay_proof_url TEXT, pay_proof_base64 TEXT, pay_proof_last5 TEXT, status huadrink.registration_status NOT NULL DEFAULT 'open',
  seat_zone huadrink.seat_zone, table_no INTEGER, admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE huadrink.system_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY, key TEXT NOT NULL UNIQUE, value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE huadrink.admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE huadrink.internal_members (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, specialty TEXT DEFAULT '', phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION huadrink.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION huadrink.update_internal_members_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER update_registrations_updated_at BEFORE UPDATE ON huadrink.registrations FOR EACH ROW EXECUTE FUNCTION huadrink.update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON huadrink.system_settings FOR EACH ROW EXECUTE FUNCTION huadrink.update_updated_at_column();
CREATE TRIGGER update_internal_members_updated_at BEFORE UPDATE ON huadrink.internal_members FOR EACH ROW EXECUTE FUNCTION huadrink.update_internal_members_updated_at();

CREATE OR REPLACE FUNCTION huadrink.generate_ref_code() RETURNS TEXT AS $$
DECLARE new_code TEXT; code_exists BOOLEAN;
BEGIN LOOP new_code := 'HUADRINK-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
SELECT EXISTS(SELECT 1 FROM huadrink.registrations WHERE ref_code = new_code) INTO code_exists; EXIT WHEN NOT code_exists; END LOOP; RETURN new_code;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION huadrink.submit_payment_proof(p_registration_id UUID, p_pay_proof_url TEXT, p_pay_proof_last5 TEXT, p_pay_proof_base64 TEXT DEFAULT NULL) RETURNS void AS $$
BEGIN UPDATE huadrink.registrations SET pay_proof_url = CASE WHEN p_pay_proof_base64 IS NOT NULL THEN NULL ELSE p_pay_proof_url END, pay_proof_base64 = p_pay_proof_base64, pay_proof_last5 = p_pay_proof_last5, pay_status = 'pending', updated_at = now() WHERE id = p_registration_id AND type = 'internal' AND pay_status IN ('unpaid', 'pending'); END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.submit_payment_proof(p_registration_id UUID, p_pay_proof_url TEXT, p_pay_proof_last5 TEXT, p_pay_proof_base64 TEXT DEFAULT NULL) RETURNS void AS $$
BEGIN PERFORM huadrink.submit_payment_proof(p_registration_id, p_pay_proof_url, p_pay_proof_last5, p_pay_proof_base64); END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT USAGE ON SCHEMA huadrink TO anon, authenticated;
GRANT EXECUTE ON FUNCTION huadrink.submit_payment_proof, public.submit_payment_proof, huadrink.generate_ref_code TO anon, authenticated;

ALTER TABLE huadrink.registrations, huadrink.system_settings, huadrink.admins, huadrink.internal_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert registrations" ON huadrink.registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view registrations" ON huadrink.registrations FOR SELECT USING (true);
CREATE POLICY "Admins can update registrations" ON huadrink.registrations FOR UPDATE USING (EXISTS (SELECT 1 FROM huadrink.admins WHERE user_id = auth.uid()));
CREATE POLICY "Admins can delete registrations" ON huadrink.registrations FOR DELETE USING (EXISTS (SELECT 1 FROM huadrink.admins WHERE user_id = auth.uid()));

CREATE POLICY "Allow all internal_members" ON huadrink.internal_members FOR ALL USING (true);
CREATE POLICY "Anyone can view settings" ON huadrink.system_settings FOR SELECT USING (true);
CREATE POLICY "Admins can update settings" ON huadrink.system_settings FOR UPDATE USING (EXISTS (SELECT 1 FROM huadrink.admins WHERE user_id = auth.uid()));
CREATE POLICY "Admins can view own admin record" ON huadrink.admins FOR SELECT USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON huadrink.registrations, huadrink.internal_members TO anon, authenticated;
GRANT SELECT, UPDATE ON huadrink.system_settings TO anon, authenticated;
GRANT SELECT ON huadrink.admins TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA huadrink TO service_role;

CREATE INDEX idx_registrations_type_pay_status ON huadrink.registrations (type, pay_status);
CREATE INDEX idx_registrations_created_at_desc ON huadrink.registrations (created_at DESC);

INSERT INTO huadrink.system_settings (key, value) VALUES
('registration_mode','open'),('deadline','2026-01-31T23:59:59+08:00'),('total_tables','10'),('seats_per_table','10'),
('payment_bank_name','台灣銀行'),('payment_account_number','1234567890'),('payment_account_name','華地產有限公司'),('payment_amount','1500')
ON CONFLICT (key) DO NOTHING;

-- 111筆成員名單（簡化版，完整請從專案檔案匯入）
INSERT INTO huadrink.internal_members (id, name, specialty) VALUES
(1,'洪怡芳Ruby','包租代管平台'),(2,'何青馨Eva','人壽房產金融'),(3,'黃懷瑩Hannah','桃園市軟裝設計'),
(4,'黃齡毅Melody','雙北軟裝設計'),(5,'鄭博元','一條龍搬家'),(6,'戴龍睿Brett','包租代管-內湖區'),
(7,'林於樵Joe','臉書發文機器人'),(8,'邱碩鈺Ellie','雙北住宅買房教學'),(9,'陳書緯Peter','專業投資人-高資產'),
(10,'張榮均','商務中心-新莊'),(11,'姚巧玲Amanda','包租代管-士林'),
(12,'蘇家弘Andre','包租代管-北投'),(13,'莊雅嵐Scarlett','包租代管-高雄左營'),
(14,'王鈞和Ray','包租代管-大同區'),(15,'胡宇駿Josh','手工沙發-赫里亞'),
(16,'蔡濬瑒','房屋買賣-楊梅、中壢'),(17,'方建勛','小巨除蟲專家-雙北'),
(18,'周庠','代租代管-台北市'),(19,'黃馨嬋Sunny','包租代管-新北市雙和區'),
(20,'王俐穎','包租代管-台北市南港區')
ON CONFLICT (id) DO NOTHING;
