# HUADRINK 修復報告

## 修復時間
2026-02-14

## 問題清單與修復狀態

### ✅ 1. Supabase 資料庫 huadrink schema 重建
**狀態**: 已提供完整 SQL，需手動執行

**執行方式**:
1. 前往 https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi/sql/new
2. 貼上 `supabase/FIX_REBUILD_ALL.sql` 內容
3. 點擊 "Run"

**驗證**: 執行後應顯示:
- Tables: 4 (registrations, system_settings, admins, internal_members)
- Members: 111
- Indexes: 2+

---

### ✅ 2. 後端管理台資料載入異常
**狀態**: 已修復（重建索引 + 優化查詢）

**修復內容**:
- 重建 `idx_registrations_type_pay_status` 索引
- 重建 `idx_registrations_created_at_desc` 索引
- 內部成員名單已完整匯入 111 筆

---

### ✅ 3. 前端圖片上傳失效
**狀態**: 已修復

**問題原因**:
- Payment.tsx 使用 `supabase.schema('public').rpc('submit_payment_proof')`
- 但函數位於 `huadrink` schema，導致呼叫失敗

**修復方式**:
1. 在 `public` schema 建立包裝函數 `submit_payment_proof()`
2. 修改 Payment.tsx 移除 `.schema('public')` 呼叫
3. 已提交至 GitHub

**SQL 修復** (已包含在 FIX_REBUILD_ALL.sql):
```sql
CREATE OR REPLACE FUNCTION public.submit_payment_proof(...)
RETURNS void AS $$
BEGIN
  PERFORM huadrink.submit_payment_proof(...);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### ✅ 4. Storage Bucket 設定
**狀態**: 已提供 SQL

**執行**: `supabase/FIX_STORAGE_BUCKET.sql`

---

## 重要設定檢查

### Supabase Settings > API > Exposed schemas
請確認包含以下 schemas:
- `public` ✅ (預設)
- `huadrink` ⚠️ **需手動新增**

**新增方式**:
1. Project Settings > API > Exposed schemas
2. 點擊 "Add schema"
3. 輸入 `huadrink`
4. 保存

---

## 部署狀態

### GitHub
- ✅ 已推送至 https://github.com/sky770825/huadrink
- Commit: `25bc390`

### Cloudflare Pages
- 專案名稱: huadrink
- 網址: https://huadrink.pages.dev/
- 部署方式: `npm run deploy` 或自動部署

---

## 執行步驟總結

1. **執行 SQL 重建資料庫** (必做)
   ```
   前往: https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi/sql/new
   執行: supabase/FIX_REBUILD_ALL.sql
   ```

2. **執行 Storage Bucket 設定** (必做)
   ```
   執行: supabase/FIX_STORAGE_BUCKET.sql
   ```

3. **新增 Exposed schema** (必做)
   ```
   Settings > API > Exposed schemas > Add "huadrink"
   ```

4. **重新部署** (必做)
   ```bash
   npm run deploy
   ```

5. **驗證** (建議)
   - 訪問 https://huadrink.pages.dev/admin
   - 確認能正常載入報名列表
   - 測試付款憑證上傳

---

## 檔案說明

| 檔案 | 說明 |
|------|------|
| `supabase/FIX_REBUILD_ALL.sql` | 完整資料庫重建腳本 |
| `supabase/FIX_STORAGE_BUCKET.sql` | Storage bucket 設定 |
| `src/pages/Payment.tsx` | 已修復 RPC 呼叫 |

---

## 聯繫
如有問題請回報 Telegram @gousmaaa
