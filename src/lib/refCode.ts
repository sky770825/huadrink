/**
 * 產生報名編號
 * @param prefix 前綴，'HUADRINK' 為隨機 4 碼，'ADMIN' 為時間戳末 6 碼
 */
export function generateRefCode(prefix: 'HUADRINK' | 'ADMIN' = 'HUADRINK'): string {
  if (prefix === 'ADMIN') {
    const timestamp = Date.now().toString().slice(-6);
    return `ADMIN-${timestamp}`;
  }
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `HUADRINK-${random}`;
}
