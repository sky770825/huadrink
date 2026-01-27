# 修復 500 錯誤指南

## 錯誤說明

**錯誤訊息**：
```
kwxlxjfcdghpguypadvi.supabase.co/rest/v1/admins?select=id:1  Failed to load resource: the server responded with a status of 500 ()
```

## 問題原因

1. **RLS 策略問題**：`admins` 表的 RLS 策略要求用戶必須是管理員才能查看表，但在登入時用戶還沒有被確認為管理員，形成循環依賴。

2. **查詢方式問題**：登入代碼中使用 `.single()` 但沒有添加 `.eq('user_id', ...)` 過濾條件。

## 解決方案

### 步驟 1: 修復 RLS 策略（必須執行）

1. **訪問 Supabase SQL Editor**
   ```
   https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi/sql/new
   ```

2. **執行以下 SQL**（已保存在 `fix_admins_rls.sql`）：
   ```sql
   -- 刪除舊的 RLS 策略
   DROP POLICY IF EXISTS "Admins can view admins" ON public.admins;

   -- 創建新的 RLS 策略：允許用戶查看自己的 admin 記錄
   CREATE POLICY "Users can view their own admin record"
     ON public.admins
     FOR SELECT
     USING (user_id = auth.uid());
   ```

3. **驗證策略是否正確**
   ```sql
   SELECT 
     schemaname,
     tablename,
     policyname,
     cmd,
     qual
   FROM pg_policies
   WHERE schemaname = 'public' 
     AND tablename = 'admins';
   ```

### 步驟 2: 代碼已修復

我已經修復了 `src/pages/admin/Login.tsx` 中的查詢代碼：
- 添加了 `.eq('user_id', user.id)` 過濾條件
- 將 `.single()` 改為 `.maybeSingle()` 以避免多條記錄錯誤

### 步驟 3: 重新啟動開發伺服器

修復 RLS 策略後，需要重新啟動開發伺服器以載入代碼更改：

```bash
# 停止當前伺服器（Ctrl+C）
# 然後重新啟動
npm run dev -- --port 5174
```

## 驗證修復

修復完成後，測試登入：

1. **訪問登入頁面**
   ```
   http://localhost:5174/admin/login
   ```

2. **使用管理員帳號登入**
   - Email: `123@admin.com`
   - 密碼: `123456`

3. **確認登入成功**
   - 應該不會再出現 500 錯誤
   - 應該會跳轉到後台管理頁面

## 如果問題仍然存在

如果執行 SQL 後仍然出現 500 錯誤，請檢查：

1. **確認 RLS 策略已更新**
   ```sql
   SELECT policyname, cmd, qual 
   FROM pg_policies 
   WHERE tablename = 'admins';
   ```
   應該看到策略名稱是 "Users can view their own admin record"

2. **確認用戶已創建**
   ```sql
   SELECT id, email FROM auth.users WHERE email = '123@admin.com';
   ```

3. **確認管理員記錄存在**
   ```sql
   SELECT a.*, u.email
   FROM public.admins a
   JOIN auth.users u ON a.user_id = u.id
   WHERE u.email = '123@admin.com';
   ```

4. **檢查瀏覽器控制台**
   - 查看具體的錯誤訊息
   - 確認是否還有其他問題

## 技術說明

### 原來的 RLS 策略問題

```sql
-- 舊策略（有問題）
CREATE POLICY "Admins can view admins"
  ON public.admins
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admins 
      WHERE user_id = auth.uid()
    )
  );
```

這個策略要求：要查看 `admins` 表，必須先確認用戶在 `admins` 表中存在，形成循環依賴。

### 新的 RLS 策略

```sql
-- 新策略（正確）
CREATE POLICY "Users can view their own admin record"
  ON public.admins
  FOR SELECT
  USING (user_id = auth.uid());
```

這個策略允許：用戶可以查看自己的 admin 記錄（如果存在），不需要先確認是否是管理員。

## 相關文件

- `fix_admins_rls.sql` - 修復 RLS 策略的 SQL 腳本
- `src/pages/admin/Login.tsx` - 已修復的登入代碼
