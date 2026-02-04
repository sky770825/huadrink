# 資料庫注意事項（huadrink schema）

## 一、索引（務必建立）

無索引時常用查詢會做**全表掃描**，報名筆數一多會嚴重延遲。請在 Supabase SQL Editor 執行：

```sql
-- 內部付款頁：WHERE type='internal' AND pay_status='unpaid'
CREATE INDEX IF NOT EXISTS idx_registrations_type_pay_status
  ON huadrink.registrations (type, pay_status);

-- 管理後台列表：ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_registrations_created_at_desc
  ON huadrink.registrations (created_at DESC);
```

或執行專案內 `supabase/add_registrations_index.sql`。

| 索引 | 用途 | 查詢位置 |
|------|------|----------|
| `idx_registrations_type_pay_status` | 內部付款頁下拉名單 | usePaymentEligibleRegistrations |
| `idx_registrations_created_at_desc` | 管理後台報名列表排序 | useRegistrations |

## 二、既有約束（無需額外索引）

- `registrations.id`：PRIMARY KEY
- `registrations.ref_code`：UNIQUE
- `system_settings.key`：UNIQUE
- `admins.user_id`：UNIQUE

## 三、重要設定

1. **Exposed schemas**：Project Settings → API → 需包含 `huadrink`
2. **RLS**：已啟用，anon 可 SELECT registrations、system_settings
3. **submit_payment_proof**：anon/authenticated 可執行

## 四、新專案 / 完整重設

執行 `supabase/huadrink-setup.sql` 會建立 schema、表、函式、RLS、索引。
