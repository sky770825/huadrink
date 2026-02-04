# 專案檢視報告

檢視日期：2026/02

---

## 1. 建議調整或極度需要優化的地方

### 極度需要優化

| 項目 | 說明 | 建議 |
|------|------|------|
| **內部成員名單硬編碼** | `src/lib/members.ts` 含 ~80 筆成員，每次新增/異動需改程式碼 | 改為從後台 `system_settings`、API 或 Google Sheets 動態載入；至少抽成單一 JSON 檔供批次匯入 |
| **PAYMENT_INSTRUCTIONS 與後台脫鉤** | `constants.ts` 的匯款資訊為 fallback，但 `Step3Form` 只讀 constants，未用 `useSystemSettings` | 匯款區塊應優先使用 `useSystemSettings` 的 `payment_*`，constants 僅作 API 失敗時的備援 |
| **React Query `cacheTime` 已棄用** | `useSystemSettings.ts` 使用 `cacheTime`，v5 已改為 `gcTime` | 將 `cacheTime` 改為 `gcTime`，避免未來升級報錯 |
| **付款頁與報名列表 query 不同步** | `useUpdateRegistration` 只 invalidate `['registrations']`，未 invalidate `['registrations','payment-eligible']` | 後台更新付款狀態時，同時 invalidate payment-eligible，避免付款頁顯示過期資料 |

### 建議優化

| 項目 | 說明 |
|------|------|
| **useRegistration mutation 後未 invalidate 單筆** | 更新報名後應 `invalidateQueries(['registration', id])`，否則詳情 modal 可能顯示舊資料 |
| **報名截止日 fallback 過期** | `EVENT_INFO.deadline`、`PAYMENT_INSTRUCTIONS.deadline` 為 2/7，活動後可考慮改為動態或提醒更新 |
| **Google Sheets ID 硬編碼** | `googleSheets.ts`、`membersGoogleSheets.ts` 的 Spreadsheet ID 寫死 | 改為環境變數 `VITE_GOOGLE_SHEETS_ID` 等 |

---

## 2. 潛在的風險

### 安全性

| 風險 | 說明 |
|------|------|
| **Storage 無 DELETE  policy** | `payment-proofs` 只有 INSERT、SELECT；改為未付款時無法刪除舊檔，可能累積無用檔案 |
| **anon 可上傳任意路徑** | 目前任何人可上傳到 `payment-proofs`，路徑為 `{registrationId}/proof.*`；若 registrationId 可猜測，可能覆蓋他人憑證 | 建議：用 RLS 或 Edge Function 驗證 registration 存在且為 internal+unpaid |
| **管理員帳號建立** | `setup-admin` 使用 service_role，密碼經 CLI 傳入；若日誌或環境變數外洩有風險 | 建立後建議立即修改密碼，並限制 service_role 使用場景 |

### 穩定性

| 風險 | 說明 |
|------|------|
| **單點 Supabase** | 全部依賴 Supabase；若中斷則系統無法使用 | 可考慮關鍵操作加上離線提示或重試策略 |
| **付款頁無 Rate Limit** | 內部付款頁可重複提交；惡意或誤操作可能造成大量上傳 | 前端可加 debounce / 防重複送出，或由 Supabase RPC 做簡易頻率檢查 |
| **預覽 URL 記憶體洩漏** | `Payment.tsx`、`Step3Form` 用 `URL.createObjectURL`，卸載時應 `revokeObjectURL` | `Step3Form` 的 `handleRemoveFile` 已清理；`Payment` 在 reset 時有清理，但需確認所有分支都有 revoke |

---

## 3. 程式碼層面的問題

### 重複與不一致

| 問題 | 位置 | 說明 |
|------|------|------|
| **`sortByMemberId` 重複** | `Payment.tsx`、`RegistrationTable.tsx` | 排序邏輯相同，應抽成 `lib/registrations.ts` 或 `utils/sortRegistrations.ts` |
| **`generateRefCode` 重複** | `Register.tsx`（兩處）、`useRegistrations.ts` | Register 用 `HUADRINK-XXXX`，Admin 用 `ADMIN-XXXX`；可統一抽成 `generateRefCode(prefix)` |
| **姓名比對邏輯重複** | `useRegistrationStats` 與 `getMemberByContactName` 的模糊比對 | 可集中到 `lib/members.ts` 的 `matchMemberByName` |

###  dead code

| 項目 | 說明 |
|------|------|
| **Step3Form 未使用** | `Register.tsx` 只有 Step1、Step2，`Step3Form` 未被引用 | 刪除或改為正式 Step3（若未來要在報名流程上傳憑證） |
| **supabaseFetch.ts 未使用** | `createFetchWithTimeout` 未被任何檔案 import | 刪除或整合到 Supabase client 的 custom fetch |

### 型別與維護

| 問題 | 說明 |
|------|------|
| **Registration 手動 map** | `useRegistrations`、`useRegistration` 的 row → Registration 對應重複且易漏欄位 | 可抽成 `mapRowToRegistration(row, opts)` 共用 |
| **魔法數字** | 如 `itemsPerPage: 10`、`PAYMENT_QUERY_TIMEOUT_MS: 60_000` 散落各處 | 抽成 `lib/constants.ts` 或各模組專用常數 |

---

## 4. 需要做模組化處理的部分

### 建議拆分

| 模組 | 現狀 | 建議 |
|------|------|------|
| **RegistrationTable** | ~570 行，含篩選、分頁、匯出、審核、憑證預覽、重複檢測 | 拆成：`RegistrationFilters`、`RegistrationTableBody`、`PaymentProofButton`（若尚未獨立）、`useRegistrationFilters` |
| **Dashboard** | 含 stats、internal members、diet stats、tabs、多個 Dialog | 拆成：`DashboardStats`、`InternalMembersSection`、`DietStatsSection`，或按 tab 拆成子頁面 |
| **Register.tsx** | 含 open / waitlist 兩套表單與共用邏輯 | 拆成：`OpenRegistrationForm`、`WaitlistForm`、共用 `useRegistrationSubmit` |
| **useRegistrations.ts** | 400+ 行，含多種 hooks 與 `useRegistrationStats` | 拆成：`useRegistrations`、`useRegistration`、`useRegistrationStats`、`useRegistrationMutations` 等，或依功能分檔 |

### 可抽成共用的邏輯

| 邏輯 | 建議位置 |
|------|----------|
| 重複報名檢測 `getDuplicateGroupIds` | `lib/registrations.ts` |
| 內部成員排序 `sortByMemberId` | `lib/registrations.ts` |
| ref_code 產生 | `lib/refCode.ts` 或 `utils/refCode.ts` |
| 匯款資訊顯示（含 fallback） | `hooks/usePaymentInfo.ts` 或 `components/PaymentInfoBlock` |
| 逾時載入 UI（loadingTooLong + 重試） | `hooks/useLoadingTimeout.ts` 或共用 `LoadingWithRetry` 元件 |

### 結構建議

```
src/
  lib/
    registrations.ts   # getDuplicateGroupIds, sortByMemberId
    refCode.ts         # generateRefCode
  hooks/
    useRegistrationFilters.ts
    usePaymentInfo.ts
  components/
    admin/
      RegistrationTable/     # 目錄化
        index.tsx
        Filters.tsx
        TableBody.tsx
```

---

## 優先順序建議

1. **高**：React Query `cacheTime` → `gcTime`；`useUpdateRegistration` 同時 invalidate payment-eligible；移除 dead code（Step3Form / supabaseFetch）
2. **中**：抽出重複邏輯（sortByMemberId、generateRefCode）；PAYMENT_INSTRUCTIONS 改為優先使用 system_settings
3. **低**：members 改為動態來源；RegistrationTable / Dashboard 模組化
