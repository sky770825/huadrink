import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

/** 登入頁驗證通過後快取，進入後台時可跳過一次 admins 查詢（約 30 秒內有效） */
const ADMIN_VERIFIED_CACHE_KEY = 'huadrink_admin_verified';
const ADMIN_CACHE_TTL_MS = 30_000;

function getCachedAdminUserId(): string | null {
  try {
    const raw = sessionStorage.getItem(ADMIN_VERIFIED_CACHE_KEY);
    if (!raw) return null;
    const { userId, at } = JSON.parse(raw) as { userId: string; at: number };
    if (Date.now() - at > ADMIN_CACHE_TTL_MS) return null;
    return userId;
  } catch {
    return null;
  }
}

/** 登入成功並確認為管理員後呼叫，讓 useAuth 進入後台時可跳過 admins 查詢 */
export function setAdminVerifiedCache(userId: string) {
  try {
    sessionStorage.setItem(ADMIN_VERIFIED_CACHE_KEY, JSON.stringify({ userId, at: Date.now() }));
  } catch {}
}

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

    // 僅在「非初始」的 auth 變更時查 admins，避免與 getSession() 重複查兩次
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;
        setUser(session?.user ?? null);
        if (event === 'INITIAL_SESSION') return; // 初始狀態交給 getSession() 處理，不重複查 admins

        if (session?.user) {
          try {
            const { data: adminData } = await supabase
              .schema('huadrink').from('admins')
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

    // 單一來源：初始 session + 只查一次 admins
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (cancelled) return;
        setUser(session?.user ?? null);

        if (!session?.user) {
          setIsLoading(false);
          return;
        }

        const cached = getCachedAdminUserId();
        if (cached === session.user.id) {
          try {
            sessionStorage.removeItem(ADMIN_VERIFIED_CACHE_KEY);
          } catch {}
          if (!cancelled) {
            setIsAdmin(true);
            setIsLoading(false);
          }
          return;
        }

        supabase
          .schema('huadrink').from('admins')
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
      })
      .catch(() => setLoadingFalse());

    const timeoutId = setTimeout(setLoadingFalse, 10000);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      sessionStorage.removeItem(ADMIN_VERIFIED_CACHE_KEY);
    } catch {}
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
