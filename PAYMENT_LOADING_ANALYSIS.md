# 內部付款頁載入不穩：根因分析與緩解

## 一、可能原因

| 環節 | 說明 | 可能性 |
|------|------|--------|
| **1. 無請求逾時** | Supabase 使用原生 `fetch`，沒有設定 timeout。網路不穩時請求可能長時間卡住，畫面一直轉圈。 | ⭐⭐⭐ 高 |
| **2. 兩查詢都要成功** | `registrations` 與 `system_settings` 同時發送，任一失敗就顯示「載入失敗」。`system_settings` 其實有 localStorage 快取，不應與 registrations 同等對待。 | ⭐⭐⭐ 已修正 |
| **3. Supabase 延遲／冷啟動** | Free tier 閒置後第一次請求較慢；或 Supabase 伺服器所在區域（如美西）與台灣延遲較高。 | ⭐⭐ 中 |
| **4. 網路波動** | ISP、行動網路或跨境連線偶發變慢或失敗。 | ⭐⭐ 中 |
| **5. 並行連線** | 同一頁面兩個查詢同時發送，若 Supabase 有連線／速率限制，可能造成其中一個失敗。 | ⭐ 低 |

## 二、已實作緩解

1. **僅在報名名單查詢失敗時顯示錯誤**  
   `system_settings` 失敗時使用 localStorage 快取或 fallback，不再擋住整頁。

2. **React Query retry**  
   - `usePaymentEligibleRegistrations`：retry 2 次，指數退避  
   - `useSystemSettings`：retry 2 次，指數退避  

3. **Supabase 請求逾時（15 秒）**  
   自訂 `fetch`，為所有 Supabase 請求加上 15 秒逾時；逾時後拋出 AbortError，觸發 React Query retry，避免無限轉圈。

## 三、資料庫索引（重要：解決內部付款與後台延遲）

**根因**：`registrations` 常用查詢無索引時會做**全表掃描**，報名筆數一多就會嚴重延遲。

**解法**：執行專案內 `supabase/add_registrations_index.sql`，或詳見 `DATABASE_NOTES.md`。

## 四、若仍不穩可檢查

- **Supabase 專案區域**：Dashboard → Project Settings → General → Region。建議選 Tokyo 或 Singapore。
- **瀏覽器開發者工具**：Network 分頁查看 Supabase 請求狀態與回應時間。
- **錯誤訊息**：若出現「無法載入報名名單」，通常是 `registrations` 查詢失敗，可檢查 RLS、schema 設定與 Supabase 日誌。
