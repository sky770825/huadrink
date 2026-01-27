# 修改管理員密碼指南

## 新密碼
- **Email**: `123@admin.com`
- **新密碼**: `123456`

---

## 方法 1: 通過 Supabase Dashboard（推薦）

### 步驟：

1. **訪問 Supabase Auth 用戶管理頁面**
   ```
   https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi/auth/users
   ```

2. **找到用戶**
   - 在用戶列表中找到 `123@admin.com`
   - 點擊該用戶進入詳情頁面

3. **修改密碼**
   - 在用戶詳情頁面中，找到 "Password" 區塊
   - 點擊 "Reset Password" 或 "Change Password"
   - 輸入新密碼：`123456`
   - 確認新密碼：`123456`
   - 點擊 "Update" 或 "Save"

4. **完成**
   - 密碼已更新
   - 現在可以使用新密碼登入

---

## 方法 2: 通過 SQL（如果 Dashboard 無法使用）

如果 Dashboard 無法修改，可以使用 SQL 重置密碼：

1. **訪問 SQL Editor**
   ```
   https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi/sql/new
   ```

2. **執行以下 SQL**
   ```sql
   -- 注意：Supabase 使用 bcrypt 加密密碼
   -- 此方法需要知道用戶 ID，然後使用 Supabase 的內部函數
   -- 建議使用方法 1（Dashboard）
   
   -- 查找用戶 ID
   SELECT id, email FROM auth.users WHERE email = '123@admin.com';
   
   -- 然後使用 Supabase 的密碼重置功能
   -- 或通過 Dashboard 修改
   ```

---

## 方法 3: 使用 Supabase Management API

如果需要通過 API 修改，需要使用 Service Role Key：

```javascript
// 注意：這需要在後端執行，因為需要 Service Role Key
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  'https://kwxlxjfcdghpguypadvi.supabase.co',
  'YOUR_SERVICE_ROLE_KEY' // 需要從 Supabase Dashboard 獲取
);

// 更新用戶密碼
const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
  'USER_ID', // 用戶 ID
  { password: '123456' }
);
```

---

## 測試新密碼

修改完成後，測試登入：

1. **訪問登入頁面**
   ```
   http://localhost:5174/admin/login
   ```

2. **使用新密碼登入**
   - Email: `123@admin.com`
   - 密碼: `123456`

3. **確認登入成功**
   - 應該會跳轉到後台管理頁面

---

## 快速操作

### 直接訪問修改頁面

1. 訪問用戶列表：
   ```
   https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi/auth/users
   ```

2. 找到 `123@admin.com` 並點擊

3. 在用戶詳情頁面修改密碼

---

## 注意事項

1. **密碼強度**
   - Supabase 預設要求密碼至少 6 個字元
   - `123456` 符合最低要求，但建議使用更強的密碼

2. **安全性**
   - 這是測試環境，可以使用簡單密碼
   - 正式環境請使用強密碼（至少 12 個字元，包含大小寫、數字、特殊符號）

3. **多個管理員**
   - 如果有多個管理員帳號，需要分別修改每個帳號的密碼

---

## 驗證密碼是否修改成功

修改完成後，可以通過以下方式驗證：

1. **嘗試登入**
   - 使用舊密碼應該會失敗
   - 使用新密碼應該會成功

2. **檢查用戶詳情**
   - 在 Supabase Dashboard 中查看用戶詳情
   - 確認密碼已更新
