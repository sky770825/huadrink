import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { authLog } from '@/lib/authDebug';

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
  } catch { /* ignore */ }
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

  const startRef = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    startRef.current = Date.now();
    authLog('AuthProvider mounted (start)');

    const setLoadingFalse = () => {
      if (!cancelled) setIsLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;
        const elapsed = Date.now() - startRef.current;
        authLog(`onAuthStateChange`, { event, hasUser: !!session?.user, elapsed });
        setUser(session?.user ?? null);
        if (event === 'INITIAL_SESSION') {
          if (session?.user) resolveAdmin(session.user.id);
          else {
            authLog('INITIAL_SESSION: no user, setLoadingFalse');
            setLoadingFalse();
          }
          return;
        }

        if (session?.user) {
          const cached = getCachedAdminUserId();
          if (cached === session.user.id) {
            try { sessionStorage.removeItem(ADMIN_VERIFIED_CACHE_KEY); } catch { /* ignore */ }
            authLog('admin from cache (login verified)');
            if (!cancelled) {
              setIsAdmin(true);
              setLoadingFalse();
            }
            return;
          }
          try {
            const ADMIN_QUERY_MS = 15_000;
            const adminsPromise = supabase
              .schema('huadrink').from('admins')
              .select('id')
              .eq('user_id', session.user.id)
              .maybeSingle();
            const timeoutPromise = new Promise<{ _timeout: true }>((resolve) =>
              setTimeout(() => resolve({ _timeout: true }), ADMIN_QUERY_MS)
            );
            type AdminsResult = { data: { id: string } | null; error: unknown };
            const result = await Promise.race([
              adminsPromise as Promise<AdminsResult>,
              timeoutPromise.then(() => ({ _timeout: true } as const)),
            ]);
            if (result && (result as { _timeout?: boolean })._timeout) {
              authLog('admins query timeout (SIGNED_IN branch)', { ADMIN_QUERY_MS });
              if (!cancelled) setIsAdmin(false);
            } else {
              const adminData = (result as AdminsResult).data;
              authLog('admins query done', { isAdmin: !!adminData });
              if (!cancelled) setIsAdmin(!!adminData);
            }
          } catch (e) {
            authLog('admins query error', { err: String(e) });
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
        } catch { /* ignore */ }
        authLog('resolveAdmin: cache hit');
        if (!cancelled) {
          setIsAdmin(true);
          setIsLoading(false);
        }
        return;
      }
      const ADMIN_CHECK_TIMEOUT_MS = 15_000; // 與 SESSION_WAIT 一致，避免慢速時誤判非管理員
      authLog('resolveAdmin: querying admins', { uid: uid.slice(0, 8) + '…' });
      const resolveTimeout = setTimeout(() => {
        if (!cancelled) {
          authLog('ADMIN_CHECK_TIMEOUT fired – 可能原因 5：admins 查詢逾時', { ADMIN_CHECK_TIMEOUT_MS });
          setIsAdmin(false);
          setIsLoading(false);
        }
      }, ADMIN_CHECK_TIMEOUT_MS);
      const tryAdmins = (retry = false) => {
        supabase
          .schema('huadrink')
          .from('admins')
          .select('id')
          .eq('user_id', uid)
          .maybeSingle()
          .then(({ data: adminData }) => {
            clearTimeout(resolveTimeout);
            if (!cancelled) {
              setIsAdmin(!!adminData);
              setIsLoading(false);
            }
          })
          .catch(() => {
            if (cancelled) return;
            clearTimeout(resolveTimeout);
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

    const SESSION_WAIT_MS = 15_000; // 15 秒：實測 getSession 在慢速／冷啟動時可達 12s，5s 會誤判未登入
    let sessionResolved = false;
    const tryGetSession = (retry = false) => {
      authLog('tryGetSession start', { retry, SESSION_WAIT_MS });
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<{ data: { session: null }; _timeout?: boolean }>((resolve) =>
        setTimeout(() => resolve({ data: { session: null }, _timeout: true }), SESSION_WAIT_MS)
      );
      const getSessionStart = Date.now();
      sessionPromise.then((result) => {
        const elapsed = Date.now() - getSessionStart;
        authLog('getSession() resolved', { elapsed, hasSession: !!result.data.session, afterTimeout: sessionResolved });
        if (sessionResolved) {
          authLog('→ getSession 晚於逾時，可能原因 1/4：逾時先觸發導致誤判未登入');
        }
      });
      Promise.race([sessionPromise, timeoutPromise])
        .then((raceResult) => {
          const { data: { session }, _timeout } = raceResult as { data: { session: { user?: unknown } | null }; _timeout?: boolean };
          sessionResolved = true;
          if (cancelled) return;
          if (_timeout) {
            authLog('SESSION_WAIT timeout 先觸發 – 僅結束 loading，不覆寫 user（避免蓋掉 onAuthStateChange 已設的登入狀態）', { SESSION_WAIT_MS });
            setLoadingFalse();
            return;
          }
          setUser(session?.user ?? null);

          if (!session?.user) {
            setIsLoading(false);
            return;
          }

          resolveAdmin(session.user.id);
        })
        .catch((e) => {
          if (cancelled) return;
          authLog('tryGetSession catch', { err: String(e) });
          if (retry) {
            setLoadingFalse();
          } else {
            setTimeout(() => tryGetSession(true), 300);
          }
        });
    };
    tryGetSession();

    const timeoutId = setTimeout(() => {
      authLog('LOADING fallback fired – 強制結束載入', { ms: SESSION_WAIT_MS });
      setLoadingFalse();
    }, SESSION_WAIT_MS);

    /** 分頁回到前景時 refresh token，節流 30 秒內只執行一次，減少多分頁切換時的請求 */
    const VISIBILITY_REFRESH_THROTTLE_MS = 30_000;
    let lastVisibilityRefresh = 0;
    const handleVisibilityChange = () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastVisibilityRefresh < VISIBILITY_REFRESH_THROTTLE_MS) return;
      lastVisibilityRefresh = now;
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
      authLog('AuthProvider unmounted (cleanup)');
    };
  }, []);

  const signOut = async () => {
    try {
      sessionStorage.removeItem(ADMIN_VERIFIED_CACHE_KEY);
    } catch { /* ignore */ }
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
