export type RegistrationType = 'internal' | 'external' | 'vip';
export type RegistrationStatus = 'open' | 'closed' | 'waitlist';
export type PaymentMethod = 'transfer' | 'cash' | 'other';
export type PaymentStatus = 'paid' | 'unpaid';
export type DietType = 'normal' | 'vegetarian' | 'no_beef' | 'no_pork' | 'other';
export type SeatZone = 'vip' | 'general' | 'internal';

export interface Attendee {
  name: string;
  phone?: string;
}

export interface Registration {
  id: string;
  ref_code: string;
  type: RegistrationType;
  headcount: number;
  attendee_list: Attendee[];
  company: string;
  title?: string;
  contact_name: string;
  phone: string;
  email?: string;
  line_id?: string;
  diet: DietType;
  diet_other?: string;
  allergy_note?: string;
  photo_consent: boolean;
  inviter?: string;
  vip_note?: string;
  invoice_needed: boolean;
  invoice_title?: string;
  invoice_tax_id?: string;
  pay_method: PaymentMethod;
  pay_status: PaymentStatus;
  pay_proof_url?: string;
  status: RegistrationStatus;
  seat_zone?: SeatZone;
  table_no?: number;
  admin_note?: string;
  created_at: string;
  updated_at: string;
}

export interface RegistrationFormData {
  // Step 1
  type: RegistrationType;
  member_id?: number; // 內部成員 ID（僅當 type === 'internal' 時使用）
  headcount: number;
  attendee_list: Attendee[];
  company: string;
  title?: string;
  invoice_needed: boolean;
  invoice_title?: string;
  invoice_tax_id?: string;
  inviter?: string;
  vip_note?: string;

  // Step 2
  contact_name: string;
  phone: string;
  email?: string;
  line_id?: string;
  diet: DietType;
  diet_other?: string;
  allergy_note?: string;
  photo_consent: boolean;

  // Step 3
  pay_method: PaymentMethod;
  pay_status: PaymentStatus;
  pay_proof_file?: File;
}

export interface SystemSettings {
  registration_mode: 'open' | 'closed' | 'waitlist';
  deadline: string;
  total_tables: number;
  seats_per_table: number;
}
