-- ===========================================
-- HUADRINK 完整修復腳本
-- 執行方式：在 Supabase Dashboard > SQL Editor 執行
-- URL: https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi/sql/new
-- ===========================================

-- 1. 建立 Schema
CREATE SCHEMA IF NOT EXISTS huadrink;

-- 2. 建立 ENUM 類型
DO $$ BEGIN CREATE TYPE huadrink.registration_type AS ENUM ('internal', 'external', 'vip'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE huadrink.registration_status AS ENUM ('open', 'closed', 'waitlist'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE huadrink.payment_method AS ENUM ('transfer', 'cash', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE huadrink.payment_status AS ENUM ('paid', 'unpaid', 'pending'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE huadrink.diet_type AS ENUM ('normal', 'vegetarian', 'no_beef', 'no_pork', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE huadrink.seat_zone AS ENUM ('vip', 'general', 'internal'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. 刪除舊表（如果有）
DROP TABLE IF EXISTS huadrink.registrations CASCADE;
DROP TABLE IF EXISTS huadrink.system_settings CASCADE;
DROP TABLE IF EXISTS huadrink.admins CASCADE;
DROP TABLE IF EXISTS huadrink.internal_members CASCADE;

-- 4. 建立 registrations 表
CREATE TABLE huadrink.registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ref_code TEXT NOT NULL UNIQUE,
  type huadrink.registration_type NOT NULL DEFAULT 'external',
  headcount INTEGER NOT NULL DEFAULT 1 CHECK (headcount >= 1 AND headcount <= 10),
  attendee_list JSONB DEFAULT '[]'::jsonb,
  company TEXT, title TEXT, contact_name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT, line_id TEXT,
  diet huadrink.diet_type NOT NULL DEFAULT 'normal', diet_other TEXT, allergy_note TEXT,
  photo_consent BOOLEAN NOT NULL DEFAULT true, inviter TEXT, vip_note TEXT,
  invoice_needed BOOLEAN DEFAULT false, invoice_title TEXT, invoice_tax_id TEXT,
  pay_method huadrink.payment_method NOT NULL DEFAULT 'transfer',
  pay_status huadrink.payment_status NOT NULL DEFAULT 'unpaid',
  pay_proof_url TEXT, pay_proof_base64 TEXT, pay_proof_last5 TEXT,
  status huadrink.registration_status NOT NULL DEFAULT 'open',
  seat_zone huadrink.seat_zone, table_no INTEGER, admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. 建立 system_settings 表
CREATE TABLE huadrink.system_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE, value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. 建立 admins 表
CREATE TABLE huadrink.admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. 建立 internal_members 表
CREATE TABLE huadrink.internal_members (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, specialty TEXT DEFAULT '', phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. 更新時間函數
CREATE OR REPLACE FUNCTION huadrink.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION huadrink.update_internal_members_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- 9. 觸發器
CREATE TRIGGER update_registrations_updated_at BEFORE UPDATE ON huadrink.registrations
  FOR EACH ROW EXECUTE FUNCTION huadrink.update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON huadrink.system_settings
  FOR EACH ROW EXECUTE FUNCTION huadrink.update_updated_at_column();
CREATE TRIGGER update_internal_members_updated_at BEFORE UPDATE ON huadrink.internal_members
  FOR EACH ROW EXECUTE FUNCTION huadrink.update_internal_members_updated_at();

-- 10. 產生參考編號函數
CREATE OR REPLACE FUNCTION huadrink.generate_ref_code() RETURNS TEXT AS $$
DECLARE new_code TEXT; code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'HUADRINK-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    SELECT EXISTS(SELECT 1 FROM huadrink.registrations WHERE ref_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. 付款證明提交函數（huadrink schema）
CREATE OR REPLACE FUNCTION huadrink.submit_payment_proof(
  p_registration_id UUID, p_pay_proof_url TEXT, p_pay_proof_last5 TEXT, p_pay_proof_base64 TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
  UPDATE huadrink.registrations
  SET pay_proof_url = CASE WHEN p_pay_proof_base64 IS NOT NULL THEN NULL ELSE p_pay_proof_url END,
      pay_proof_base64 = p_pay_proof_base64, pay_proof_last5 = p_pay_proof_last5,
      pay_status = 'pending', updated_at = now()
  WHERE id = p_registration_id AND type = 'internal' AND pay_status IN ('unpaid', 'pending');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. 【關鍵修復】在 public schema 建立包裝函數，供前端調用
-- 前端使用 supabase.rpc('submit_payment_proof') 時會找 public schema
CREATE OR REPLACE FUNCTION public.submit_payment_proof(
  p_registration_id UUID, p_pay_proof_url TEXT, p_pay_proof_last5 TEXT, p_pay_proof_base64 TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
  PERFORM huadrink.submit_payment_proof(p_registration_id, p_pay_proof_url, p_pay_proof_last5, p_pay_proof_base64);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. 授予執行權限
GRANT USAGE ON SCHEMA huadrink TO anon, authenticated;
GRANT EXECUTE ON FUNCTION huadrink.submit_payment_proof TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_payment_proof TO anon, authenticated;
GRANT EXECUTE ON FUNCTION huadrink.generate_ref_code TO anon, authenticated;

-- 14. RLS
ALTER TABLE huadrink.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE huadrink.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE huadrink.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE huadrink.internal_members ENABLE ROW LEVEL SECURITY;

-- 15. RLS 政策
CREATE POLICY "Anyone can insert registrations" ON huadrink.registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view registrations" ON huadrink.registrations FOR SELECT USING (true);
CREATE POLICY "Admins can update registrations" ON huadrink.registrations FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM huadrink.admins WHERE user_id = auth.uid()));
CREATE POLICY "Admins can delete registrations" ON huadrink.registrations FOR DELETE 
  USING (EXISTS (SELECT 1 FROM huadrink.admins WHERE user_id = auth.uid()));

CREATE POLICY "Allow read internal_members" ON huadrink.internal_members FOR SELECT USING (true);
CREATE POLICY "Allow insert internal_members" ON huadrink.internal_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update internal_members" ON huadrink.internal_members FOR UPDATE USING (true);
CREATE POLICY "Allow delete internal_members" ON huadrink.internal_members FOR DELETE USING (true);

CREATE POLICY "Anyone can view settings" ON huadrink.system_settings FOR SELECT USING (true);
CREATE POLICY "Admins can update settings" ON huadrink.system_settings FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM huadrink.admins WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view own admin record" ON huadrink.admins FOR SELECT USING (user_id = auth.uid());

-- 16. 表權限
GRANT SELECT, INSERT, UPDATE, DELETE ON huadrink.registrations TO anon, authenticated;
GRANT SELECT, UPDATE ON huadrink.system_settings TO anon, authenticated;
GRANT SELECT ON huadrink.admins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON huadrink.internal_members TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA huadrink TO service_role;

-- 17. 效能索引
CREATE INDEX idx_registrations_type_pay_status ON huadrink.registrations (type, pay_status);
CREATE INDEX idx_registrations_created_at_desc ON huadrink.registrations (created_at DESC);

-- 18. 系統設定預設值
INSERT INTO huadrink.system_settings (key, value) VALUES
  ('registration_mode', 'open'),
  ('deadline', '2026-01-31T23:59:59+08:00'),
  ('total_tables', '10'),
  ('seats_per_table', '10'),
  ('payment_bank_name', '台灣銀行'),
  ('payment_account_number', '1234567890'),
  ('payment_account_name', '華地產有限公司'),
  ('payment_amount', '1500')
ON CONFLICT (key) DO NOTHING;

-- 19. 內部成員名單（111 筆完整資料）
INSERT INTO huadrink.internal_members (id, name, specialty) VALUES
(1,'洪怡芳Ruby','包租代管平台'),(2,'何青馨Eva','人壽房產金融'),(3,'黃懷瑩Hannah','桃園市軟裝設計'),(4,'黃齡毅Melody','雙北軟裝設計'),(5,'鄭博元','一條龍搬家'),
(6,'戴龍睿Brett','包租代管-內湖區'),(7,'林於樵Joe','臉書發文機器人'),(8,'邱碩鈺Ellie','雙北住宅買房教學'),(9,'陳書緯Peter','專業投資人-高資產'),(10,'張榮均','商務中心-新莊'),
(11,'姚巧玲Amanda','包租代管-士林'),(12,'蘇家弘Andre','包租代管-北投'),(13,'莊雅嵐Scarlett','包租代管-高雄左營、鼓山、楠梓、三民'),(14,'王鈞和Ray','包租代管-大同區'),
(15,'胡宇駿Josh','手工沙發-赫里亞'),(16,'蔡濬瑒','房屋買賣-楊梅、中壢、平鎮、龍潭'),(17,'方建勛/小巨','小巨除蟲專家-雙北'),
(18,'周庠','代租代管-台北市'),(19,'黃馨嬋Sunny','包租代管-新北市雙和區'),(20,'王俐穎','包租代管-台北市南港區'),
(21,'林雨青Queenie','包租代管-台北市大安區西區'),(23,'鍾依靜','地政士代書-桃園市平鎮、中壢、龍潭、楊梅、大溪區'),
(24,'林純純Carrie','包租代管-台北市大安區南區'),(26,'林律吟Rita','窗簾窗飾業-雙北'),(27,'邱梅鈴','彩妝教學-雙北、桃園'),
(28,'周擇宇','系統櫃-台灣中部地區'),(29,'劉宜佳Carol','房產投資客-高雄區'),(30,'李世偉Bob','社會住宅包租代管-桃園'),
(31,'李佳玲Adline','品牌行銷-活動企劃與執行-北部'),(32,'黃博俊Wally','壽險-醫療險'),(33,'黃思齊Leti','整理師-台北市'),
(34,'陳塵','溝通教練-藝術律動'),(35,'陳舒婷','地板建材-台灣中部地區'),(36,'羅珮玉Ruby','土地資產傳承'),
(37,'廖士鈞','資產活化-觀光旅宿業宜蘭區'),(38,'陳乙嘉','房屋產險-北部'),(39,'黃鈺琦Rowan','危老都更業-雙北'),
(40,'白岳霖Kelly','住宅室內設計-台中區'),(41,'賴易紃Ruby','統包工程-雙北市'),(42,'黃泓顥','理財型房貸減壓-北部'),
(43,'龔秋敏','基金理財-中部'),(44,'笠原藤真','房屋仲介-商用廠房-北區'),(45,'何欣哲Cliff','包租代管-萬華區'),
(46,'陳貞茹Vivi','積木式鋁櫃'),(47,'陳力羣/娃娃','住宅室內設計-新北市三重、蘆洲、板橋、中和、永和、淡水'),
(48,'陳逸凱/阿凱','住宅室內設計-台北市'),(49,'陳昱維Tony','宜蘭民宿平台'),(50,'林柏蒼Kevin','包租業清潔-雙北'),
(51,'陳誌原','包租代管-新北市板橋區'),(52,'林昱均Judy','月租型田野短租-宜蘭'),(53,'林易增Eason','美潔盾地板建材及施工'),
(54,'蔣京叡','房產線上導客'),(55,'唐靖童Amy','辦公室租賃-台北市中山、松山、信義區'),(56,'郭洲忠Joe','模組化輕裝修-北部'),
(57,'Josh Hung','進口戶外遮陽設備'),(58,'羅豪偉','長照空間規劃-北部'),(59,'黃聖文Color','住宅室內設計-台南市'),
(60,'林稼諭Jessica','包租代管-新北市三重區'),(61,'張簡筱凡Sarah','房屋仲介業-新加坡'),(62,'陳姵璇Ann','房產專業律師-北部'),
(63,'王勝仟Johnny','機電工程規畫派遣-台北市'),(64,'劉怡吟','法拍屋代標-北部'),(65,'吳富明Alan','抗病毒抗菌地板-北部'),
(66,'陳亞靖Emily','包租代管-台北市中山南區'),(67,'丁乃玉','澳洲房產投資講師'),
(68,'楊麗華','包租代管-高雄新興、前金、鹽埕、苓雅、前鎮'),(69,'陳百毅','小坪數空間造型師-台中'),
(70,'沈琳朣Sophia','法拍屋代標-中部'),(71,'王瑀Eva','企業形象官網（無購物車）-北部'),
(72,'黃靜愉','包租代管 (隔套出租)-台南中西區'),(73,'蔡宜靜Ronda','包租代管-新竹市'),(74,'田智娟Joanna','房東租房管理系統'),
(75,'黃彥銘','土地開發-台北市'),(76,'申瑩萱Sally','房屋仲介業-台北市大安區、中正區'),(77,'沈玲婕','科學風水命理教學'),
(78,'林裕翔Shawn','冷氣安裝保養維修-雙北'),(79,'陳啟宇Andy','買房陪跑教練-雙北'),(80,'游曉瑄Charming','Meta廣告投放'),
(81,'廖瑀瑄Fay','歐必斯床墊'),(82,'游珈嘉','建案品牌視覺設計-北部'),(83,'杜佳曄杜杜','藥局-桃園'),
(84,'張濬池','中小企業政府補助顧問-高雄'),(85,'陳閔祥James','法商策略顧問'),(87,'謝慈軒','綠晶木環保建材'),
(88,'呂宥澄','飯店專業施工'),(89,'陳家穎Queenie','包租代管-台北市松山西區（光復北路以西）'),
(90,'張家華','房屋仲介業-住宅-新北市雙和區'),(91,'黃振呈','冷氣空調設備-北部'),(92,'林典毅Chance','短影音代操'),
(93,'楊哲軒 Darren','居家收納用品電商'),(94,'林怡均Karen','租賃企業管理系統（ERP)'),(95,'黃詩惠Katy','AI設計師接案軟體'),
(96,'王文子','買房投資-高雄'),(97,'顏敏哲','建築執照顧問'),(98,'林鉦澤 (阿信）','房屋仲介業-新北市三重、蘆洲'),
(99,'簡麒倫Chi Lu','包租代管業（隔套出租）-台中市'),(100,'廖宜勤-Daniel','影像直播服務'),
(101,'林雨軒','合法隔套設計裝修'),(102,'唐瑋Oma','旅館商空室內設計師-北部'),(103,'左沁靈','綜合建材數位轉型'),
(104,'謝欣蓉/小布','毛一本唐揚茶漬-新竹'),(105,'陳俊翔AK','紫微風水命理規劃'),(106,'范藝馨','理財型房貸-台北富邦銀行'),
(107,'康博勝','冷氣細清-桃竹苗'),(108,'蔡明翰Marco','房屋仲介業-新北市林口區'),(109,'顏羽宏','一般照明設備'),
(110,'孫士閔','AIoT物聯網平台'),(111,'郭哲宇','')
ON CONFLICT (id) DO NOTHING;

-- 20. 驗證查詢
SELECT '修復完成！' as status;
SELECT 'Tables:' as info, COUNT(*) FROM information_schema.tables WHERE table_schema = 'huadrink';
SELECT 'Members:' as info, COUNT(*) FROM huadrink.internal_members;
SELECT 'Indexes:' as info, COUNT(*) FROM pg_indexes WHERE schemaname = 'huadrink';
