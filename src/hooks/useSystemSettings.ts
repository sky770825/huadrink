import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { huadrink } from '@/lib/supabase-huadrink';
import type { SystemSettings } from '@/types/registration';
import { withTimeout } from '@/lib/async';

const SYSTEM_SETTINGS_CACHE_KEY = 'huadrink_system_settings_v2';
const SYSTEM_SETTINGS_TIMEOUT_MS = 15_000;

export function useSystemSettings() {
  return useQuery({
    queryKey: ['system-settings'],
    /**
     * 前端快取機制：
     * - 先從 localStorage 讀取上一次的設定，立即回傳，讓畫面先渲染
     * - 再向 Supabase 取得最新資料並更新快取
     */
    queryFn: async ({ signal }): Promise<SystemSettings> => {
      const fetchInner = async () => {
        const { data, error } = await huadrink
          .from('system_settings')
          .select('key, value');

        if (error) throw error;

        const settings: Record<string, string> = {};
        data?.forEach((row) => {
          settings[row.key] = row.value;
        });

        const result: SystemSettings = {
          registration_mode: settings.registration_mode as 'open' | 'closed' | 'waitlist',
          // 截止日期已延長至 2026年3月3日
          deadline: '2026-03-03T23:59:00+08:00',
          total_tables: parseInt(settings.total_tables || '10'),
          seats_per_table: parseInt(settings.seats_per_table || '10'),
          payment_bank_name: settings.payment_bank_name,
          payment_account_number: settings.payment_account_number,
          payment_account_name: settings.payment_account_name,
          payment_amount: settings.payment_amount,
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
      };

      return withTimeout(fetchInner(), {
        ms: SYSTEM_SETTINGS_TIMEOUT_MS,
        message: '載入系統設定逾時，請檢查網路後重試',
        signal,
      });
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
    // 在一定時間內視為「新鮮」資料，不重複打 API（2 分鐘，確保後台更新後前台較快反映）
    staleTime: 2 * 60 * 1000, // 2 分鐘
    gcTime: 30 * 60 * 1000, // 30 分鐘後才從記憶體快取回收（v5 將 cacheTime 更名為 gcTime）
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}

export function useUpdateSystemSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await huadrink
        .from('system_settings')
        .update({ value })
        .eq('key', key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      // 清除 localStorage 快取，強制下次載入從 API 取得最新設定
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem(SYSTEM_SETTINGS_CACHE_KEY);
        } catch {
          /* ignore */
        }
      }
    },
  });
}

export function isDeadlinePassed(deadline: string): boolean {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  return now > deadlineDate;
}
