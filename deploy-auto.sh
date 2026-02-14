#!/bin/bash
set -e

echo "🚀 HUADRINK 一鍵修復部署腳本"
echo "=============================="

PROJECT_DIR="$HOME/Desktop/程式專案資料夾/華地產鑽石春酒"
cd "$PROJECT_DIR"

# 讀取環境變數
SUPABASE_URL=$(grep VITE_SUPABASE_URL .env | cut -d'=' -f2 | tr -d '"')
SUPABASE_KEY=$(grep VITE_SUPABASE_PUBLISHABLE_KEY .env | cut -d'=' -f2 | tr -d '"')

echo "🗄️ 資料庫重建需手動執行 SQL："
echo "   前往: https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi/sql/new"
echo "   貼上: supabase/FIX_REBUILD_ALL.sql"
echo ""
echo "是否已執行 SQL？(y/n)"
read -r CONFIRM

if [ "$CONFIRM" != "y" ]; then
    echo "❌ 請先執行 SQL 後再跑此腳本"
    exit 1
fi

# 1. 安裝依賴
echo "📦 安裝 npm 依賴..."
npm ci

# 2. 本地測試
echo "🧪 本地測試建置..."
npm run build

# 3. Git 提交
echo "💾 Git 提交..."
git add .
git commit -m "fix: 資料庫重建 + 圖片上傳修復 + 自動化部署 $(date +%Y%m%d_%H%M)" || echo "無變更可提交"

# 4. 推送
echo "⬆️ 推送到 GitHub..."
git push origin main

# 5. 等待 Cloudflare Pages 部署
echo "⏳ 等待 Cloudflare Pages 部署 (約 1-2 分鐘)..."
sleep 30

# 6. 驗證部署
echo "🔍 驗證部署..."
for i in {1..5}; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://huadrink.pages.dev/admin/login)
    if [ "$STATUS" = "200" ]; then
        echo "✅ 部署成功！https://huadrink.pages.dev/admin"
        break
    fi
    echo "  嘗試 $i/5... 狀態: $STATUS"
    sleep 15
done

# 7. 測試 Supabase 連線
echo "🔌 測試資料庫連線..."
COUNT=$(curl -s "${SUPABASE_URL}/rest/v1/huadrink.registrations?select=count" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" | \
  jq -r '.[0].count // "0"' 2>/dev/null || echo "0")
echo "📊 報名資料筆數: $COUNT"

echo ""
echo "🎉 修復完成！"
echo "📱 前台: https://huadrink.pages.dev/"
echo "🔧 後台: https://huadrink.pages.dev/admin"
echo "📊 Supabase: https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi"
