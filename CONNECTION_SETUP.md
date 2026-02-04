# 前後端連線設定指南

## 一、架構說明

```
前端 (React / Vite)          Supabase 雲端
     │                            │
     │  VITE_SUPABASE_URL         │  PostgreSQL
     │  VITE_SUPABASE_PUBLISHABLE_KEY   huadrink schema
     │                            │
     └──── supabase-js client ────┴──► registrations
                                  system_settings
                                  admins
```

## 二、必要環境變數

在專案根目錄建立 `.env`（可複製 `.env.example`）：

```env
# 必填：前端連線 Supabase
VITE_SUPABASE_URL=https://sqgrnowrcvspxhuudrqc.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=你的_anon_public_key

# 選填：腳本用（setup-admin、diagnose-supabase 等）
SUPABASE_SERVICE_ROLE_KEY=你的_service_role_key
```

取得金鑰：https://supabase.com/dashboard/project/sqgrnowrcvspxhuudrqc/settings/api

## 三、驗證步驟

### 1. 本機連線測試

```bash
npm run diagnose-supabase
```

預期輸出：
- ✓ 專案：sqgrnowrcvspxhuudrqc
- ✓ system_settings 成功
- ✓ registrations 成功

### 2. 開發伺服器

```bash
npm run dev
```

開啟 http://localhost:8080 ，在 Console 應看到：
```
[Supabase] 前端資料庫連線： sqgrnowrcvspxhuudrqc | schema: huadrink
```

### 3. Supabase 設定檢查

| 項目 | 路徑 | 說明 |
|------|------|------|
| Exposed schemas | Project Settings → API | 需包含 `huadrink` |
| huadrink 表 | SQL Editor | 執行 `supabase/huadrink-setup.sql` |
| 索引 | SQL Editor | 執行 `supabase/add_registrations_index.sql` |

## 四、若仍無法讀取資料

1. **重開 dev server**：改動 .env 後需重啟
2. **清除快取**：無痕視窗或清除 localStorage
3. **檢查 Network**：F12 → Network，查看 Supabase 請求狀態
