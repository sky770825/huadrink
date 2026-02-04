# 登入狀態檢查指南

當發生「登入後沒多久被登出」或「無法讀取資料」時，可依此檢查。

---

## 一、瀏覽器端檢查（開發者工具）

1. 開啟 **F12** → **Application**（或「應用程式」）分頁
2. 左側點 **Storage** → **Local Storage**（或 **Session Storage**）
3. 選擇你的網域（如 `https://huadrink.pages.dev` 或 `http://localhost:5173`）
4. 檢查：

| 鍵名 | 說明 |
|------|------|
| `huadrink_remember_login` | `true` = 使用 localStorage（關閉分頁仍保留）；`false` = 使用 sessionStorage（關閉即登出） |
| `sb-<project>-auth-token` | Supabase 登入 token；若不存在表示未登入或已登出 |

**結論**：
- 若 `huadrink_remember_login` 為 `false`，關分頁或長時間背景後容易登出
- 若沒有 `sb-*-auth-token`，表示目前未登入

---

## 二、已實作的保護機制

1. **分頁回到前景時 refresh token**：從其他分頁切回時會主動 refresh，降低背景過期
2. **預設勾選「記住登入」**：登入頁預設使用 localStorage，減少意外登出
3. **提示文字**：登入頁已加「建議勾選以避免意外登出」

---

## 三、建議作法

1. 登入時**勾選「記住登入狀態」**
2. 避免長時間將後台分頁放在背景
3. 若被登出，重新登入即可
