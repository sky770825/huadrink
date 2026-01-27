import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SystemSettings } from '@/types/registration';

export function useSystemSettings() {
  return useQuery({
    queryKey: ['system-settings'],
    queryFn: async (): Promise<SystemSettings> => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value');

      if (error) throw error;

      const settings: Record<string, string> = {};
      data?.forEach((row) => {
        settings[row.key] = row.value;
      });

      return {
        registration_mode: settings.registration_mode as 'open' | 'closed' | 'waitlist',
        deadline: settings.deadline,
        total_tables: parseInt(settings.total_tables || '10'),
        seats_per_table: parseInt(settings.seats_per_table || '10'),
      };
    },
  });
}

export function useUpdateSystemSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from('system_settings')
        .update({ value })
        .eq('key', key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    },
  });
}

export function isDeadlinePassed(deadline: string): boolean {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  return now > deadlineDate;
}
