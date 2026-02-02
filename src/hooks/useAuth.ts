import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const setLoadingFalse = () => {
      if (!cancelled) setIsLoading(false);
    };

    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;
        setUser(session?.user ?? null);

        if (session?.user) {
          try {
            const { data: adminData } = await supabase
              .from('admins')
              .select('id')
              .eq('user_id', session.user.id)
              .maybeSingle();
            if (!cancelled) setIsAdmin(!!adminData);
          } catch {
            if (!cancelled) setIsAdmin(false);
          }
        } else {
          setIsAdmin(false);
        }
        setLoadingFalse();
      }
    );

    // Then check initial session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (cancelled) return;
        setUser(session?.user ?? null);

        if (session?.user) {
          supabase
            .from('admins')
            .select('id')
            .eq('user_id', session.user.id)
            .maybeSingle()
            .then(({ data: adminData }) => {
              if (!cancelled) {
                setIsAdmin(!!adminData);
                setIsLoading(false);
              }
            })
            .catch(() => {
              if (!cancelled) {
                setIsAdmin(false);
                setIsLoading(false);
              }
            });
        } else {
          setIsLoading(false);
        }
      })
      .catch(() => {
        setLoadingFalse();
      });

    // 逾時保護：超過 10 秒仍沒結果就停止轉圈，讓 useRequireAdmin 可導向登入頁
    const timeoutId = setTimeout(setLoadingFalse, 10000);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  return { user, isAdmin, isLoading, signOut };
}

export function useRequireAdmin() {
  const { user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      navigate('/admin/login');
    }
  }, [user, isAdmin, isLoading, navigate]);

  return { user, isAdmin, isLoading };
}
