import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { huadrink } from '@/lib/supabase-huadrink';
import type { Registration, Attendee } from '@/types/registration';
import type { Json } from '@/integrations/supabase/types';
import { MEMBERS } from '@/lib/members';

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

export function useRegistrations() {
  return useQuery({
    queryKey: ['registrations'],
    queryFn: async (): Promise<Registration[]> => {
      const { data, error } = await huadrink
        .from('registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((row) => ({
        id: row.id,
        ref_code: row.ref_code,
        type: row.type as Registration['type'],
        headcount: row.headcount,
        attendee_list: parseAttendeeList(row.attendee_list),
        company: row.company,
        title: row.title,
        contact_name: row.contact_name,
        phone: row.phone,
        email: row.email,
        line_id: row.line_id,
        diet: row.diet as Registration['diet'],
        diet_other: row.diet_other,
        allergy_note: row.allergy_note,
        photo_consent: row.photo_consent,
        inviter: row.inviter,
        vip_note: row.vip_note,
        invoice_needed: row.invoice_needed,
        invoice_title: row.invoice_title,
        invoice_tax_id: row.invoice_tax_id,
        pay_method: row.pay_method as Registration['pay_method'],
        pay_status: row.pay_status as Registration['pay_status'],
        pay_proof_url: row.pay_proof_url,
        pay_proof_base64: row.pay_proof_base64 ?? undefined,
        pay_proof_last5: row.pay_proof_last5 ?? undefined,
        status: row.status as Registration['status'],
        seat_zone: row.seat_zone as Registration['seat_zone'],
        table_no: row.table_no,
        admin_note: row.admin_note,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    },
  });
}

export function useRegistration(id: string) {
  return useQuery({
    queryKey: ['registration', id],
    queryFn: async (): Promise<Registration | null> => {
      const { data, error } = await huadrink
        .from('registrations')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        ref_code: data.ref_code,
        type: data.type as Registration['type'],
        headcount: data.headcount,
        attendee_list: parseAttendeeList(data.attendee_list),
        company: data.company,
        title: data.title,
        contact_name: data.contact_name,
        phone: data.phone,
        email: data.email,
        line_id: data.line_id,
        diet: data.diet as Registration['diet'],
        diet_other: data.diet_other,
        allergy_note: data.allergy_note,
        photo_consent: data.photo_consent,
        inviter: data.inviter,
        vip_note: data.vip_note,
        invoice_needed: data.invoice_needed,
        invoice_title: data.invoice_title,
        invoice_tax_id: data.invoice_tax_id,
        pay_method: data.pay_method as Registration['pay_method'],
        pay_status: data.pay_status as Registration['pay_status'],
        pay_proof_url: data.pay_proof_url,
        pay_proof_base64: data.pay_proof_base64 ?? undefined,
        pay_proof_last5: data.pay_proof_last5 ?? undefined,
        status: data.status as Registration['status'],
        seat_zone: data.seat_zone as Registration['seat_zone'],
        table_no: data.table_no,
        admin_note: data.admin_note,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    },
    enabled: !!id,
  });
}

interface UpdateRegistrationParams {
  id: string;
  updates: {
    pay_status?: 'paid' | 'unpaid' | 'pending';
    seat_zone?: 'vip' | 'general' | 'internal' | null;
    table_no?: number | null;
    admin_note?: string | null;
    /** 清除付款憑證時設為 null */
    pay_proof_url?: string | null;
    pay_proof_base64?: string | null;
    pay_proof_last5?: string | null;
  };
}

export function useUpdateRegistration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: UpdateRegistrationParams) => {
      const { error } = await huadrink
        .from('registrations')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
    },
  });
}

export function useRegistrationStats() {
  const { data: registrations } = useRegistrations();

  const stats = {
    total: 0,
    totalHeadcount: 0,
    paid: 0,
    unpaid: 0,
    /** 已提交付款憑證待審核的人數（報名筆數，非 headcount） */
    pending: 0,
    vip: 0,
    external: 0,
    internal: 0,
    waitlist: 0,
    dietNormal: 0,
    dietVegetarian: 0,
    dietNoBeef: 0,
    dietNoPork: 0,
    dietOther: 0,
    /** 依聯絡人姓名與內部名單比對，已報名的內部成員人數（不重複） */
    internalRegisteredCount: 0,
    /** 內部成員總數中尚未報名的人數（僅供參考） */
    internalNotRegisteredCount: MEMBERS.length,
  };

  if (registrations) {
    const registeredInternalMemberIds = new Set<number>();

    registrations.forEach((reg) => {
      if (reg.status !== 'waitlist') {
        stats.total++;
        stats.totalHeadcount += reg.headcount;

        if (reg.pay_status === 'paid') stats.paid += reg.headcount;
        else if (reg.pay_status === 'pending') stats.pending += 1;
        else stats.unpaid += reg.headcount;

        if (reg.type === 'vip') stats.vip += reg.headcount;
        else if (reg.type === 'external') stats.external += reg.headcount;
        else stats.internal += reg.headcount;

        // 內部報名：以聯絡人姓名與內部成員名單比對，記錄已報名成員 ID
        if (reg.type === 'internal' && reg.contact_name) {
          const name = reg.contact_name.trim().replace(/\s+/g, '');
          const member = MEMBERS.find(
            (m) =>
              m.name.replace(/\s+/g, '') === name ||
              name.includes(m.name.replace(/\s+/g, '')) ||
              m.name.replace(/\s+/g, '').includes(name)
          );
          if (member) registeredInternalMemberIds.add(member.id);
        }

        // 飲食需求統計（以人數計）
        switch (reg.diet) {
          case 'normal':
            stats.dietNormal += reg.headcount;
            break;
          case 'vegetarian':
            stats.dietVegetarian += reg.headcount;
            break;
          case 'no_beef':
            stats.dietNoBeef += reg.headcount;
            break;
          case 'no_pork':
            stats.dietNoPork += reg.headcount;
            break;
          case 'other':
            stats.dietOther += reg.headcount;
            break;
        }
      } else {
        stats.waitlist += reg.headcount;
      }
    });

    stats.internalRegisteredCount = registeredInternalMemberIds.size;
    stats.internalNotRegisteredCount = Math.max(0, MEMBERS.length - registeredInternalMemberIds.size);
  }

  return stats;
}

interface CreateRegistrationParams {
  type: 'internal' | 'external';
  member_id?: number;
  headcount: number;
  attendee_list: Attendee[];
  company: string;
  title?: string | null;
  contact_name: string;
  phone: string;
  email?: string | null;
  line_id?: string | null;
  diet: 'normal' | 'vegetarian' | 'no_beef' | 'no_pork' | 'other';
  diet_other?: string | null;
  allergy_note?: string | null;
  photo_consent: boolean;
  inviter?: string | null;
  vip_note?: string | null;
  invoice_needed: boolean;
  invoice_title?: string | null;
  invoice_tax_id?: string | null;
  pay_method: 'transfer' | 'cash' | 'other';
  pay_status: 'paid' | 'unpaid';
  pay_proof_url?: string | null;
  status: 'open' | 'closed' | 'waitlist';
  admin_note?: string | null;
}

export function useCreateRegistration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateRegistrationParams) => {
      // 生成 ref_code
      const generateRefCode = () => {
        const timestamp = Date.now().toString().slice(-6);
        return `ADMIN-${timestamp}`;
      };

      const refCode = generateRefCode();

      // 轉換 attendee_list 為 JSON 格式
      const attendeeListJson = (params.attendee_list || []).map((a) => ({
        name: a.name || '',
        phone: a.phone || null,
      })) as Json;

      const insertData = {
        ref_code: refCode,
        type: params.type,
        headcount: params.headcount,
        attendee_list: attendeeListJson || [],
        company: params.company || '未填寫',
        title: params.title || null,
        contact_name: params.contact_name,
        phone: params.phone,
        email: params.email || null,
        line_id: params.line_id || null,
        diet: params.diet,
        diet_other: params.diet_other || null,
        allergy_note: params.allergy_note || null,
        photo_consent: params.photo_consent,
        inviter: params.inviter || null,
        vip_note: params.vip_note || null,
        invoice_needed: params.invoice_needed,
        invoice_title: params.invoice_title || null,
        invoice_tax_id: params.invoice_tax_id || null,
        pay_method: params.pay_method,
        pay_status: params.pay_status,
        pay_proof_url: params.pay_proof_url || null,
        status: params.status,
        admin_note: params.admin_note || null,
      };

      const { data, error } = await huadrink
        .from('registrations')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
    },
  });
}

export function useDeleteRegistration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await huadrink
        .from('registrations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
    },
  });
}
