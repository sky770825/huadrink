# 潛在效能與 DB 檢查清單

本文件列出可能造成**延遲**或**影響資料庫效能**的程式碼位置，供後續規劃與維修參考。

---

## 一、可能造成延遲的部分

### 1. 登入流程（Login.tsx）

| 項目 | 位置 | 說明 | 建議 |
|------|------|------|------|
| 管理員權限查詢 | `Login.tsx` L67–84 | 登入後查 `huadrink.admins`，逾時 12 秒 | 已設逾時；若常逾時可考慮縮短或加 loading 提示 |
| Prefetch 等待 | `Login.tsx` L97–101 | 並行 prefetch 報名 + 內部成員，最多等 8 秒 | 目前合理；若 8 秒內未完成仍會導向，進後台再載入 |

### 2. 重整／進入後台（useAuth.tsx）

| 項目 | 位置 | 說明 | 建議 |
|------|------|------|------|
| getSession 逾時 | `useAuth.tsx` L136–138 | 已用 `Promise.race` 5 秒逾時 | 已處理 |
| admins 查詢逾時 | `useAuth.tsx` L99–105 | 單次 8 秒逾時 | 已處理 |
| 分頁回到前景 | `useAuth.tsx` L168–176 | 每次 tab 回到前景會 `getSession` + `refreshSession` | 可能增加請求次數；若無過期問題可考慮加節流（例如 30 秒內只做一次） |

### 3. 後台資料載入

| 項目 | 位置 | 說明 | 建議 |
|------|------|------|------|
| 報名名單 | `useRegistrations.ts` L27–31 | 一次拉全表，無分頁 | 筆數多時（例如 >500）可考慮分頁或虛擬捲動 |
| 報名逾時 | `useRegistrations.ts` L24, L68–82 | 20 秒逾時 | 已設；若網路慢仍可能體感久 |
| 單筆報名含 base64 | `useRegistrations.ts` L159–161 | 點擊「查看憑證」時 `select('*')` 含 `pay_proof_base64`（單筆可達數百 KB） | 已限定僅詳情/憑證時才取；列表已排除，屬合理 |

### 4. React Query 快取與重試

| 項目 | 位置 | 說明 | 建議 |
|------|------|------|------|
| registrations staleTime | `useRegistrations.ts` L94 | 10 秒 | 後台常改資料可維持；若希望更即時可略降 |
| payment-eligible staleTime | `useRegistrations.ts` L139 | 5 分鐘 | 繳費頁不需太即時，可維持 |
| 全域 refetchOnWindowFocus | `App.tsx` L20 | 已關閉 | 避免分頁切回時整批 refetch 造成卡頓，建議維持 false |

---

## 二、可能影響 DB 效能的部分

### 1. 查詢欄位與索引

| 查詢 | 位置 | 使用欄位／條件 | 說明與建議 |
|------|------|----------------|------------|
| 報名列表 | `useRegistrations.ts` L29–31 | `select(LIST_SELECT)`，`order('created_at', { ascending: false })` | 已有索引 `idx_registrations_created_at_desc`（migration） |
| 繳費名單 | `useRegistrations.ts` L121–125 | `eq('type', memberType).eq('pay_status', 'unpaid').order('contact_name')` | 已有 `idx_registrations_type_pay_status`；若筆數大可考慮複合索引含 contact_name |
| 內部成員 | `useMembers.ts` L10–12 | `select('id, name, specialty, phone').order('id')` | 主鍵 id，無需額外索引 |
| 系統設定 | `useSystemSettings.ts` L17–18 | `select('key, value')` 全表 | 設定筆數少，影響小 |

### 2. Mutation 後 invalidate 範圍

| 項目 | 位置 | 說明 | 建議 |
|------|------|------|------|
| 單筆 update | `useRegistrations.ts` L234–237 | 每次 update 會 invalidate `['registrations']`、`['registrations', 'payment-eligible']`、`['registration', id]` | 會觸發列表與繳費名單 refetch；若後台常單筆改動，可考慮只 invalidate 該 id 的 detail，列表用樂觀更新或較長 staleTime |
| 刪除／新增報名 | L404–406, L423–425 | 同上，整批 invalidate | 刪除／新增後列表理應重抓，目前合理 |

### 3. 批次寫入（桌次）

| 項目 | 位置 | 說明 | 建議 |
|------|------|------|------|
| 自動分桌 | `SeatingManager.tsx` L199–206 | `Promise.all(updates.map(...))` 每筆一則 update | 已並行；若筆數極多（例如 >200）可考慮 RPC 一次更新多筆 |
| 重設桌次 | `SeatingManager.tsx` L286–297 | 單一 `.in('id', toResetIds).update(...)` | 已批次，對 DB 友善 |

### 4. 其他

| 項目 | 位置 | 說明 | 建議 |
|------|------|------|------|
| 報名列表無分頁 | `useRegistrations.ts` | 全表 select | 筆數 <200 影響不大；超過可改為分頁或 limit + 捲動載入 |
| useRegistration(includePayProofBase64: true) | `useRegistrations.ts` L159 | `select('*')` 含大欄位 | 僅在「查看憑證」時啟用，可接受 |

---

## 三、已做好的優化（無需再動）

- 列表不載入 `pay_proof_base64`，僅詳情/憑證時再取。
- 登入後並行 prefetch 報名 + 內部成員，再導向後台。
- getSession / admins 查詢皆有逾時，避免重整卡住。
- 重設桌次／自動分桌採批次或並行 update，並檢查回傳筆數。
- `refetchOnWindowFocus: false`，避免分頁切回整批 refetch。
- 報名列表與繳費名單查詢有對應索引（見 migrations）。

---

## 四、建議優先檢查的項目（若仍覺得慢）

1. **網路與環境**：在實際使用環境執行 `npm run test-data-load-timing`，看報名／內部成員請求耗時。
2. **分頁回到前景**：若常開多分頁並切換，可為 `visibilitychange` 的 getSession/refreshSession 加節流（例如 30 秒內只執行一次）。
3. **報名筆數**：若預期超過 200～500 筆，可規劃列表分頁或 limit + 捲動載入，並配合索引。
4. **單筆 update 後 refetch**：若後台多為「單筆改付款狀態」等操作，可考慮只 invalidate 該筆 detail，列表用樂觀更新或較長 staleTime 減少 refetch。

---

*最後更新：依目前程式碼與 migrations 整理。*
