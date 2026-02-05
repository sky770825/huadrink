/**
 * Auth 診斷日誌：僅在 localStorage.huadrink_auth_debug === 'true' 時輸出。
 * 用於排查「刷新後自動登出／卡住」。
 * 使用方式：Console 執行 localStorage.setItem('huadrink_auth_debug','1') 後重整頁面，再查看 [Auth ...] 日誌。
 */
const AUTH_DEBUG_KEY = 'huadrink_auth_debug';

export function isAuthDebugEnabled(): boolean {
  try {
    const v = typeof window !== 'undefined' && window.localStorage?.getItem(AUTH_DEBUG_KEY);
    return v === 'true' || v === '1';
  } catch {
    return false;
  }
}

export function authLog(message: string, detail?: Record<string, unknown>): void {
  try {
    const v = typeof window !== 'undefined' && window.localStorage?.getItem(AUTH_DEBUG_KEY);
    if (v === 'true' || v === '1') {
      const t = ((performance?.now?.() ?? 0) / 1000).toFixed(2);
      const out = detail ? `${message} ${JSON.stringify(detail)}` : message;
      console.log(`[Auth ${t}s]`, out);
    }
  } catch { /* ignore */ }
}
