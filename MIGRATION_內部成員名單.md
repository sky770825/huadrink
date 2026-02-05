# 內部成員名單：無痛轉換步驟

目前名單有兩種來源，由 `src/lib/members.ts` 的 **`MEMBERS_SOURCE`** 控制：

- **`'static'`**：使用同檔案內的 `MEMBERS` 陣列，不連線資料庫。
- **`'database'`**（目前使用）：從 Supabase `huadrink.internal_members` 表讀取，報名表與後台皆顯示資料庫名單。載入中或 API 失敗時會暫時以 `MEMBERS` 墊底，避免選單空白。

只要維持 `MEMBERS_SOURCE === 'static'`，現有功能完全不變；要改用資料庫時，依下列步驟即可無痛轉換。

---

## 一、目前狀態（不影響現有功能）

- 全站已改為透過 **`useMembers()`** 取得名單（報名表、後台、統計皆同）。
- `getMemberByContactName`、`getUnregisteredInternalMembers`、`sortByMemberId` 等皆支援傳入名單；未傳時仍使用 `MEMBERS`。
- 後台「內部成員」分頁可對 **`huadrink.internal_members`** 新增／刪除，與靜態名單並存，互不影響。

---

## 二、無痛轉換步驟（改為使用資料庫名單）

### 1. 確認資料表與權限

- 已執行 migration：`supabase/migrations/20260205100000_create_internal_members.sql`
- 表 `huadrink.internal_members` 存在，且後台「內部成員」可正常新增／刪除。

### 2. 同步現有名單到資料庫（二擇一）

**方式 A：後台一鍵同步（若已實作）**  
在「內部成員」分頁點「從目前名單同步至資料庫」，將 `members.ts` 的 `MEMBERS` 全部寫入 `internal_members`（`ON CONFLICT (id) DO NOTHING`，避免覆蓋已手動新增的筆數）。

**方式 B：手動 SQL**  
在 Supabase SQL Editor 執行，把現有 `MEMBERS` 匯入（可依實際筆數調整或從匯出檔貼上）：

```sql
INSERT INTO huadrink.internal_members (id, name, specialty)
VALUES
  (1, '洪怡芳Ruby', '包租代管平台'),
  (2, '何青馨Eva', '人壽房產金融'),
  -- ... 其餘成員 ...
  (111, '郭哲宇', '')
ON CONFLICT (id) DO NOTHING;
```

### 3. 切換名單來源

在 `src/lib/members.ts` 將：

```ts
export const MEMBERS_SOURCE: 'static' | 'database' = 'static';
```

改為：

```ts
export const MEMBERS_SOURCE: 'static' | 'database' = 'database';
```

存檔後部署／重整。

### 4. 驗證

- 報名表「內部夥伴」與「來賓來源」選單應顯示資料庫名單。
- 後台名單管理、統計、座位安排等應與資料庫一致。
- 在「內部成員」新增／刪除後，重整報名表應看到更新（因 `useMembers()` 會從 DB 讀取）。

### 5. 日後維護

- 名單僅在後台「內部成員」新增／刪除即可，無需再改 `members.ts`。
- 若要暫時改回靜態名單，將 `MEMBERS_SOURCE` 改回 `'static'` 即可。

---

## 三、注意事項

- **未同步就切換**：若改為 `'database'` 但尚未執行步驟 2，報名表選單會是空的，請先完成同步再切換。
- **匯出／CSV**：若 `src/lib/googleSheets.ts` 等處仍直接使用 `getMemberByContactName(reg.contact_name)`（未傳名單），會繼續使用 `MEMBERS` 做比對；若要完全以 DB 為準，可改為傳入 `useMembers().members` 或改為從 DB 查詢（需在可取得 hook 的元件內呼叫）。
- **查詢 key**：`useMembers()` 與後台「內部成員」的 `useInternalMembers()` 共用 query key `['internal-members']`，後台新增／刪除後會 invalidate，下次讀取會拿到最新資料庫名單。
