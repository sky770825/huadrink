import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { huadrink } from '@/lib/supabase-huadrink';

/** 與 huadrink.internal_members 表對應的型別 */
export interface InternalMemberRow {
  id: number;
  name: string;
  specialty: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

const INTERNAL_MEMBERS_QUERY_KEY = ['internal-members'];

export function useInternalMembers() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: INTERNAL_MEMBERS_QUERY_KEY,
    queryFn: async (): Promise<InternalMemberRow[]> => {
      const { data, error } = await huadrink
        .from('internal_members' as 'registrations')
        .select('id, name, specialty, phone, created_at, updated_at')
        .order('id', { ascending: true });
      if (error) throw error;
      return (data ?? []) as InternalMemberRow[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (row: { id: number; name: string; specialty?: string; phone?: string }) => {
      const { error } = await huadrink
        .from('internal_members' as 'registrations')
        .insert({
          id: row.id,
          name: row.name.trim(),
          specialty: row.specialty?.trim() ?? '',
          phone: row.phone?.trim() || null,
        } as Record<string, unknown>);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INTERNAL_MEMBERS_QUERY_KEY });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (rows: { id: number; name: string; specialty?: string; phone?: string }[]) => {
      if (rows.length === 0) return;
      const payload = rows.map((r) => ({
        id: r.id,
        name: r.name.trim(),
        specialty: r.specialty?.trim() ?? '',
        phone: r.phone?.trim() || null,
      }));
      const { error } = await huadrink
        .from('internal_members' as 'registrations')
        .upsert(payload as Record<string, unknown>[], { onConflict: 'id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INTERNAL_MEMBERS_QUERY_KEY });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: number; name: string; specialty?: string; phone?: string }) => {
      const { error } = await huadrink
        .from('internal_members' as 'registrations')
        .update({
          name: payload.name.trim(),
          specialty: payload.specialty?.trim() ?? '',
          phone: payload.phone?.trim() || null,
        } as Record<string, unknown>)
        .eq('id', payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INTERNAL_MEMBERS_QUERY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await huadrink
        .from('internal_members' as 'registrations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INTERNAL_MEMBERS_QUERY_KEY });
    },
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    addMember: addMutation.mutateAsync,
    addMemberPending: addMutation.isPending,
    importMembers: importMutation.mutateAsync,
    importMembersPending: importMutation.isPending,
    updateMember: updateMutation.mutateAsync,
    updateMemberPending: updateMutation.isPending,
    deleteMember: deleteMutation.mutateAsync,
    deleteMemberPending: deleteMutation.isPending,
  };
}
