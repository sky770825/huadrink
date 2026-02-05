-- 內部成員名單表（華地產春酒）
-- 供日後後台「新增/刪除名單」與前後端讀取使用，目前先建立表並寫入一筆新成員

-- 若專案使用 huadrink schema，在此 schema 下建表（與 registrations 同區）
CREATE TABLE IF NOT EXISTS huadrink.internal_members (
  id INTEGER NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  specialty TEXT DEFAULT '',
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE huadrink.internal_members IS '春酒內部成員名單，可於後台新增/刪除，取代前端 hardcode';

-- 更新時間觸發
CREATE OR REPLACE FUNCTION huadrink.update_internal_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_internal_members_updated_at ON huadrink.internal_members;
CREATE TRIGGER update_internal_members_updated_at
  BEFORE UPDATE ON huadrink.internal_members
  FOR EACH ROW
  EXECUTE FUNCTION huadrink.update_internal_members_updated_at();

-- RLS：目前允許所有人讀取（與報名表一致）；寫入留待後台登入後用 service_role 或 admins 控制
ALTER TABLE huadrink.internal_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read internal_members"
  ON huadrink.internal_members FOR SELECT
  USING (true);

CREATE POLICY "Allow insert for authenticated"
  ON huadrink.internal_members FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow update for authenticated"
  ON huadrink.internal_members FOR UPDATE
  USING (true);

CREATE POLICY "Allow delete for authenticated"
  ON huadrink.internal_members FOR DELETE
  USING (true);

-- 寫入新成員（先以正常新增為主，僅加一筆）
INSERT INTO huadrink.internal_members (id, name, specialty)
VALUES (111, '郭哲宇', '')
ON CONFLICT (id) DO NOTHING;

GRANT ALL ON huadrink.internal_members TO service_role;
