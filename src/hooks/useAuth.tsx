import { createContext, useContext, useEffect, useState } from 'react';
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

interface AuthState {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/** 全站唯一 auth 狀態，避免多個 useAuth() 各自 getSession 導致重整時誤導向登入 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const setLoadingFalse = () => {
      if (!cancelled) setIsLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;
        setUser(session?.user ?? null);
        if (event === 'INITIAL_SESSION') {
          if (session?.user) resolveAdmin(session.user.id);
          else setLoadingFalse();
          return;
        }

        if (session?.user) {
          const cached = getCachedAdminUserId();
          if (cached === session.user.id) {
            try { sessionStorage.removeItem(ADMIN_VERIFIED_CACHE_KEY); } catch {}
            if (!cancelled) {
              setIsAdmin(true);
              setLoadingFalse();
            }
            return;
          }
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

    const resolveAdmin = (uid: string) => {
      const cached = getCachedAdminUserId();
      if (cached === uid) {
        try {
          sessionStorage.removeItem(ADMIN_VERIFIED_CACHE_KEY);
        } catch {}
        if (!cancelled) {
          setIsAdmin(true);
          setIsLoading(false);
        }
        return;
      }
      const tryAdmins = (retry = false) => {
        supabase
          .schema('huadrink')
          .from('admins')
          .select('id')
          .eq('user_id', uid)
          .maybeSingle()
          .then(({ data: adminData }) => {
            if (!cancelled) {
              setIsAdmin(!!adminData);
              setIsLoading(false);
            }
          })
          .catch(() => {
            if (cancelled) return;
            if (retry) {
              setIsAdmin(false);
              setIsLoading(false);
            } else {
              tryAdmins(true);
            }
          });
      };
      tryAdmins();
    };

    const tryGetSession = (retry = false) => {
      supabase.auth
        .getSession()
        .then(({ data: { session } }) => {
          if (cancelled) return;
          setUser(session?.user ?? null);

          if (!session?.user) {
            setIsLoading(false);
            return;
          }

          resolveAdmin(session.user.id);
        })
        .catch(() => {
          if (cancelled) return;
          if (retry) {
            setLoadingFalse();
          } else {
            setTimeout(() => tryGetSession(true), 300);
          }
        });
    };
    tryGetSession();

    const timeoutId = setTimeout(setLoadingFalse, 10000);

    /** 分頁回到前景時主動 refresh token，避免背景節流導致過期 */
    const handleVisibilityChange = () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (cancelled || !session?.user) return;
        supabase.auth.refreshSession().catch(() => {
          /* 忽略，onAuthStateChange 會處理 SIGNED_OUT */
        });
      });
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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

  return (
    <AuthContext.Provider value={{ user, isAdmin, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useRequireAdmin() {
  const { user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      navigate('/admin/login', { replace: true });
    }
  }, [user, isAdmin, isLoading, navigate]);

  return { user, isAdmin, isLoading };
}
