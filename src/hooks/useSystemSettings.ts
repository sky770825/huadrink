import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SystemSettings } from '@/types/registration';

const SYSTEM_SETTINGS_CACHE_KEY = 'huadrink_system_settings_v1';

export function useSystemSettings() {
  return useQuery({
    queryKey: ['system-settings'],
    /**
     * 前端快取機制：
     * - 先從 localStorage 讀取上一次的設定，立即回傳，讓畫面先渲染
     * - 再向 Supabase 取得最新資料並更新快取
     */
    queryFn: async (): Promise<SystemSettings> => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value');

      if (error) throw error;

      const settings: Record<string, string> = {};
      data?.forEach((row) => {
        settings[row.key] = row.value;
      });

      const result: SystemSettings = {
        registration_mode: settings.registration_mode as 'open' | 'closed' | 'waitlist',
        deadline: settings.deadline,
        total_tables: parseInt(settings.total_tables || '10'),
        seats_per_table: parseInt(settings.seats_per_table || '10'),
      };

      // 將最新設定寫入 localStorage，供下次快速讀取
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(SYSTEM_SETTINGS_CACHE_KEY, JSON.stringify(result));
        } catch {
          // 忽略快取寫入失敗（例如隱私模式）
        }
      }

      return result;
    },
    // 將快取資料當作初始值，減少初次載入延遲
    initialData: () => {
      if (typeof window === 'undefined') return undefined;
      try {
        const raw = window.localStorage.getItem(SYSTEM_SETTINGS_CACHE_KEY);
        if (!raw) return undefined;
        return JSON.parse(raw) as SystemSettings;
      } catch {
        return undefined;
      }
    },
    // 在一定時間內視為「新鮮」資料，不重複打 API
    staleTime: 5 * 60 * 1000, // 5 分鐘
    cacheTime: 30 * 60 * 1000, // 30 分鐘後才從記憶體快取回收
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
