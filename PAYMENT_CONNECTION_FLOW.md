# 內部付款頁連線流程

## 一、資料從哪裡來？

```
瀏覽器 (Payment.tsx)
    ↓ usePaymentEligibleRegistrations()
    ↓ huadrink.from('registrations').select(...).eq('type','internal').eq('pay_status','unpaid')
    ↓
Supabase Client (src/integrations/supabase/client.ts)
    ↓ 使用 .env 的 VITE_SUPABASE_URL、VITE_SUPABASE_PUBLISHABLE_KEY
    ↓
Supabase 雲端 (sqgrnowrcvspxhuudrqc.supabase.co)
    ↓ PostgREST API：GET /rest/v1/registrations?type=eq.internal&pay_status=eq.unpaid
    ↓
PostgreSQL 資料庫 (huadrink.registrations 表)
```

## 二、若「載入報名名單中...」一直轉圈

代表上述請求**尚未完成**，可能原因：

| 原因 | 檢查方式 |
|------|----------|
| 網路慢／逾時 | 開瀏覽器開發者工具 → Network → 找 `registrations` 請求，看狀態與耗時 |
| Supabase 專案休眠 (Free tier) | 稍等或重新整理，第一次請求會喚醒 |
| 資料庫無索引 | 在 Supabase SQL Editor 執行 `supabase/add_registrations_index.sql` |
| 環境變數錯誤 | 確認 `.env` 有 `VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY`，且對應正確專案 |
| huadrink schema 未開放 | Supabase Dashboard → Project Settings → API → Exposed schemas 需包含 `huadrink` |

## 三、如何驗證連線

1. 開 **開發者工具 (F12)** → **Network** 分頁
2. 進入內部付款頁
3. 搜尋 `rest/v1` 或 `registrations`
4. 若看到紅色失敗請求 → 點開查看 Status 與 Response
5. 若請求一直 Pending → 多半是網路或 Supabase 延遲
