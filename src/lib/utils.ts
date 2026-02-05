import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 將 ISO 截止時間轉成前台顯示用：M/D（週X，含） */
export function formatDeadlineDisplay(deadline: string): string {
  if (!deadline?.trim()) return '';
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return '';
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const w = weekdays[d.getDay()];
  return `${m}/${day}（週${w}，含）`;
}

/** 取得付款憑證顯示用 URL（支援 Storage URL 或 Base64） */
export function getPaymentProofUrl(reg: { pay_proof_url?: string; pay_proof_base64?: string }): string | null {
  if (reg.pay_proof_url) return reg.pay_proof_url;
  if (reg.pay_proof_base64) return `data:image/jpeg;base64,${reg.pay_proof_base64}`;
  return null;
}

/** 從 pay_proof_url 解析出 Storage 物件路徑（供刪除用）。若非 payment-proofs 的 URL 則回傳 null。 */
export function getPaymentProofStoragePath(payProofUrl: string | null | undefined): string | null {
  if (!payProofUrl || !payProofUrl.includes('payment-proofs/')) return null;
  const match = payProofUrl.match(/payment-proofs\/(.+?)(?:\?|$)/);
  return match ? decodeURIComponent(match[1]) : null;
}
