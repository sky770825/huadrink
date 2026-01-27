# 管理員帳號設置指南

## 管理員登入資訊
- **Email**: `123@admin.com`
- **密碼**: `123`

---

## 設置步驟

### 步驟 1: 在 Supabase Dashboard 創建用戶

1. **訪問 Supabase Auth 管理頁面**
   ```
   https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi/auth/users
   ```

2. **創建新用戶**
   - 點擊右上角的 **"Add user"** 按鈕
   - 選擇 **"Create new user"**
   - 填寫以下資訊：
     - **Email**: `123@admin.com`
     - **Password**: `123`
     - **Auto Confirm User**: ✅ 勾選（自動確認用戶，無需驗證郵件）
   - 點擊 **"Create user"**

3. **複製用戶 ID**
   - 創建成功後，會顯示用戶詳情
   - 複製 **User UID** (UUID 格式)

### 步驟 2: 在資料庫中添加管理員記錄

1. **訪問 SQL Editor**
   ```
   https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi/sql/new
   ```

2. **執行以下 SQL**
   ```sql
   -- 方法 1: 使用 Email 查找用戶 ID（推薦）
   INSERT INTO public.admins (user_id)
   SELECT id FROM auth.users WHERE email = '123@admin.com'
   ON CONFLICT (user_id) DO NOTHING;
   
   -- 方法 2: 如果知道用戶 ID，直接插入
   -- INSERT INTO public.admins (user_id)
   -- VALUES ('YOUR_USER_ID_HERE')
   -- ON CONFLICT (user_id) DO NOTHING;
   ```

3. **驗證管理員是否創建成功**
   ```sql
   SELECT a.id, a.user_id, u.email, a.created_at
   FROM public.admins a
   JOIN auth.users u ON a.user_id = u.id
   WHERE u.email = '123@admin.com';
   ```

### 步驟 3: 測試登入

1. **訪問登入頁面**
   ```
   http://localhost:5174/admin/login
   ```

2. **使用以下帳號登入**
   - Email: `123@admin.com`
   - 密碼: `123`

3. **確認登入成功**
   - 應該會跳轉到後台管理頁面
   - 可以查看名單、提交名單等功能

---

## 快速設置腳本

如果您想快速設置，可以在 Supabase SQL Editor 中執行以下完整腳本：

```sql
-- 創建管理員用戶（如果不存在）
-- 注意：這需要在 Supabase Dashboard 中手動創建用戶
-- 此 SQL 僅用於在 admins 表中添加記錄

-- 檢查用戶是否存在
DO $$
DECLARE
  user_id UUID;
BEGIN
  -- 查找用戶
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = '123@admin.com';
  
  -- 如果用戶存在，添加到 admins 表
  IF user_id IS NOT NULL THEN
    INSERT INTO public.admins (user_id)
    VALUES (user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE '管理員帳號已創建，用戶 ID: %', user_id;
  ELSE
    RAISE EXCEPTION '用戶 123@admin.com 不存在，請先在 Supabase Dashboard 中創建用戶';
  END IF;
END $$;

-- 驗證
SELECT 
  a.id as admin_id,
  u.id as user_id,
  u.email,
  u.created_at as user_created_at,
  a.created_at as admin_created_at
FROM public.admins a
JOIN auth.users u ON a.user_id = u.id
WHERE u.email = '123@admin.com';
```

---

## 常見問題

### Q: 登入時顯示 "您沒有管理員權限"
**A:** 這表示用戶已創建，但 `admins` 表中沒有對應記錄。請執行步驟 2 的 SQL。

### Q: 登入時顯示 "Invalid login credentials"
**A:** 這表示用戶尚未創建或密碼錯誤。請確認：
1. 用戶是否已在 Supabase Dashboard 中創建
2. Email 和密碼是否正確
3. 用戶是否已確認（Auto Confirm User 是否勾選）

### Q: 如何創建多個管理員？
**A:** 重複步驟 1-2，使用不同的 Email 即可。

### Q: 如何修改管理員密碼？
**A:** 在 Supabase Dashboard → Auth → Users 中找到用戶，點擊編輯即可修改密碼。

---

## 測試登入

設置完成後，可以使用以下方式測試：

1. **瀏覽器測試**
   - 訪問：http://localhost:5174/admin/login
   - 輸入 Email: `123@admin.com`
   - 輸入密碼: `123`
   - 點擊登入

2. **API 測試**
   ```bash
   curl -X POST "https://kwxlxjfcdghpguypadvi.supabase.co/auth/v1/token?grant_type=password" \
     -H "apikey: [YOUR_KEY]" \
     -H "Content-Type: application/json" \
     -d '{"email":"123@admin.com","password":"123"}'
   ```

---

## 安全建議

⚠️ **重要**：這是測試環境的簡單密碼，正式環境請：
1. 使用強密碼（至少 12 個字元，包含大小寫字母、數字、特殊符號）
2. 啟用雙因素認證（2FA）
3. 定期更換密碼
4. 限制管理員帳號數量
