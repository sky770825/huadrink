# 設置新的 Supabase 專案

## 專案資訊

- **專案 ID**: `kwxlxjfcdghpguypadvi`
- **專案 URL**: `https://kwxlxjfcdghpguypadvi.supabase.co`
- **儀表板**: https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi

## 步驟 1: 獲取 Anon/Public Key

1. 訪問 Supabase 儀表板：https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi
2. 點擊左側選單的「Settings」（設置）
3. 選擇「API」
4. 在「Project API keys」區塊中，找到「anon public」key
5. 複製這個 key（它應該是以 `eyJ` 開頭的 JWT token）

## 步驟 2: 更新 .env 文件

將 `.env` 文件中的 `VITE_SUPABASE_PUBLISHABLE_KEY` 更新為您剛才複製的 anon public key：

```env
VITE_SUPABASE_PROJECT_ID="kwxlxjfcdghpguypadvi"
VITE_SUPABASE_PUBLISHABLE_KEY="您剛才複製的 anon public key"
VITE_SUPABASE_URL="https://kwxlxjfcdghpguypadvi.supabase.co"
VITE_GOOGLE_APPS_SCRIPT_URL="https://script.google.com/macros/s/AKfycbzIbMWSSwXtGJfQHDxGYj0SLVXQdVa3KW5IwGnFhUvsGnjtBNEduT7zI9SiHZARGmxCXg/exec"
```

## 步驟 3: 確認資料庫結構

確保新專案的資料庫中有以下表：

1. **registrations** 表 - 用於存儲報名資料
2. **admins** 表 - 用於存儲管理員資訊（如果需要管理後台）

如果沒有這些表，您需要：
1. 在 Supabase 儀表板中點擊「SQL Editor」
2. 運行遷移腳本（在 `supabase/migrations/` 目錄中）

## 步驟 4: 運行遷移（如果需要）

如果新專案還沒有資料表結構，請運行遷移：

```bash
# 使用 Supabase CLI
supabase link --project-ref kwxlxjfcdghpguypadvi
supabase db push
```

或者手動在 SQL Editor 中執行遷移腳本。

## 步驟 5: 重新啟動開發伺服器

更新 `.env` 後，需要重新啟動開發伺服器：

```bash
# 停止當前伺服器（Ctrl+C）
# 然後重新啟動
npm run dev -- --port 5174
```

## 注意事項

- 您提供的 `sbp_006e074dc21b1344f65c863a457b7fccf164ca48` 看起來像是 service role key，但前端應用需要使用 **anon/public key**，因為 service role key 有完整權限，不應該暴露在前端代碼中。
- 如果新專案還沒有設置資料表，需要先運行遷移腳本創建表結構。
