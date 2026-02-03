import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 取得付款憑證顯示用 URL（支援 Storage URL 或 Base64） */
export function getPaymentProofUrl(reg: { pay_proof_url?: string; pay_proof_base64?: string }): string | null {
  if (reg.pay_proof_url) return reg.pay_proof_url;
  if (reg.pay_proof_base64) return `data:image/jpeg;base64,${reg.pay_proof_base64}`;
  return null;
}
