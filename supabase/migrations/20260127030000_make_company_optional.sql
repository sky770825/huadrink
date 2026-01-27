-- 將 company 欄位改為可選（允許 NULL）
ALTER TABLE public.registrations 
  ALTER COLUMN company DROP NOT NULL;

-- 將 invoice_needed 的預設值改為 false，並允許 NULL
ALTER TABLE public.registrations 
  ALTER COLUMN invoice_needed DROP NOT NULL,
  ALTER COLUMN invoice_needed SET DEFAULT false;
