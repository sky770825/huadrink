import { useQuery } from '@tanstack/react-query';
import { huadrink } from '@/lib/supabase-huadrink';
import { MEMBERS, MEMBERS_SOURCE } from '@/lib/members';
import type { Member } from '@/lib/members';

const MEMBERS_QUERY_KEY = ['internal-members']; // 與 useInternalMembers 共用，後台新增/刪除後會一併更新

async function fetchMembersFromDb(): Promise<Member[]> {
  const { data, error } = await huadrink
    .from('internal_members' as 'registrations')
    .select('id, name, specialty, phone')
    .order('id', { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as { id: number; name: string; specialty: string | null; phone: string | null }[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    specialty: r.specialty ?? '',
    phone: r.phone ?? undefined,
  }));
}

/**
 * 單一來源取得內部成員名單（無痛轉換用）
 * - MEMBERS_SOURCE === 'static'：回傳 members.ts 的 MEMBERS，不發請求
 * - MEMBERS_SOURCE === 'database'：從 huadrink.internal_members 讀取並回傳
 * 全站改為使用此 hook 取得名單後，切換來源只需改 MEMBERS_SOURCE 並完成名單同步即可。
 */
export function useMembers(): { members: Member[]; isLoading: boolean } {
  const fromDb = useQuery({
    queryKey: MEMBERS_QUERY_KEY,
    queryFn: fetchMembersFromDb,
    enabled: MEMBERS_SOURCE === 'database',
    staleTime: 60 * 1000,
  });

  if (MEMBERS_SOURCE === 'static') {
    return { members: MEMBERS, isLoading: false };
  }

  // database 模式：載入中或 API 失敗時用 MEMBERS 墊底，無縫接軌、不閃空選單
  const members = fromDb.data ?? (fromDb.isLoading || fromDb.isError ? MEMBERS : []);
  return {
    members,
    isLoading: fromDb.isLoading,
  };
}
