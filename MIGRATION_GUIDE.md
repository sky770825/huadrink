# 資料庫遷移指南

## 方案 1: 使用 Supabase Dashboard SQL Editor（推薦）

這是最簡單直接的方式，不需要 CLI 登入。

### 步驟：

1. **訪問 SQL Editor**
   - 打開瀏覽器，訪問：
     ```
     https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi/sql/new
     ```

2. **執行 SQL 腳本**
   - 打開文件 `setup_new_supabase.sql`
   - 複製整個 SQL 腳本內容
   - 貼上到 SQL Editor 中
   - 點擊「Run」或按 `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)

3. **確認執行結果**
   - 如果成功，會顯示 "Success. No rows returned"
   - 如果有錯誤，會顯示具體的錯誤訊息

4. **驗證表結構**
   - 在左側選單點擊「Table Editor」
   - 確認以下表已創建：
     - `registrations` - 報名資料表
     - `system_settings` - 系統設定表
     - `admins` - 管理員表

---

## 方案 2: 使用 Supabase CLI（需要 Access Token）

如果您想使用 CLI，需要先獲取 Access Token。

### 步驟 1: 獲取 Access Token

1. 訪問 Supabase Dashboard：
   ```
   https://supabase.com/dashboard/account/tokens
   ```

2. 點擊「Generate new token」
3. 複製生成的 token

### 步驟 2: 使用 Token 登入

```bash
# 設置環境變數
export SUPABASE_ACCESS_TOKEN="您的_access_token"

# 連結專案
supabase link --project-ref kwxlxjfcdghpguypadvi

# 推送遷移
supabase db push
```

或者一次性執行：

```bash
SUPABASE_ACCESS_TOKEN="您的_access_token" supabase link --project-ref kwxlxjfcdghpguypadvi
SUPABASE_ACCESS_TOKEN="您的_access_token" supabase db push
```

---

## 遷移文件說明

專案中有以下遷移文件（按順序執行）：

1. **20260127023221_a59e5fb9-f459-4b4d-b0d4-8baaa0830a71.sql**
   - 創建所有表、枚舉、函數和 RLS 策略

2. **20260127030000_make_company_optional.sql**
   - 將 `company` 欄位改為可選

3. **setup_new_supabase.sql**
   - 完整的設置腳本（包含所有遷移的內容）

**建議**：直接使用 `setup_new_supabase.sql`，它包含了所有必要的設置。

---

## 驗證設置

執行完 SQL 腳本後，可以執行以下查詢驗證：

```sql
-- 檢查表是否存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('registrations', 'system_settings', 'admins');

-- 檢查枚舉類型
SELECT typname 
FROM pg_type 
WHERE typname IN ('registration_type', 'registration_status', 'payment_method', 'payment_status', 'diet_type', 'seat_zone');

-- 檢查 RLS 是否啟用
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('registrations', 'system_settings', 'admins');
```

---

## 常見問題

### Q: 執行時出現 "already exists" 錯誤？
A: 這表示某些對象已經存在。可以：
- 忽略這些錯誤（如果對象已正確創建）
- 或者先刪除現有對象再執行

### Q: 如何重置資料庫？
A: 在 SQL Editor 中執行：
```sql
-- 警告：這會刪除所有資料！
DROP TABLE IF EXISTS public.registrations CASCADE;
DROP TABLE IF EXISTS public.system_settings CASCADE;
DROP TABLE IF EXISTS public.admins CASCADE;
-- 然後重新執行 setup_new_supabase.sql
```

### Q: 如何檢查 RLS 策略？
A: 執行：
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```
