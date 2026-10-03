-- D1 schema for 7K Note
-- รันด้วย: npx wrangler d1 execute 7k-note --local --file=schema.sql   (ตัด --local ออกเมื่อจะรันบน production ให้ใช้ --remote)

CREATE TABLE IF NOT EXISTS guilds (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  edit_hash   TEXT NOT NULL,          -- SHA-256 ของ edit key (ไม่เก็บ key ตรง ๆ)
  created_at  INTEGER NOT NULL
);

-- ทีมเป้าหมาย (ทีมป้องกันของศัตรู)
CREATE TABLE IF NOT EXISTS targets (
  id          TEXT PRIMARY KEY,
  guild_id    TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  team        TEXT NOT NULL,          -- JSON: Team
  tags        TEXT NOT NULL DEFAULT '[]',
  note        TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_targets_guild ON targets(guild_id);

-- ทีมที่ใช้แก้ทีมเป้าหมาย
CREATE TABLE IF NOT EXISTS counters (
  id          TEXT PRIMARY KEY,
  target_id   TEXT NOT NULL REFERENCES targets(id) ON DELETE CASCADE,
  guild_id    TEXT NOT NULL,
  team        TEXT NOT NULL,          -- JSON: Team
  skills      TEXT NOT NULL DEFAULT '[]', -- JSON: {slot:number, skill:1|2}[] เรียงตามลำดับกด
  note        TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_counters_target ON counters(target_id);
CREATE INDEX IF NOT EXISTS idx_counters_guild ON counters(guild_id, created_at);

-- แผนวอร์ (5 ไม้ แต่ละไม้มีหลายทางเลือก) เก็บเป็น JSON ก้อนเดียว
CREATE TABLE IF NOT EXISTS plans (
  id          TEXT PRIMARY KEY,
  guild_id    TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  data        TEXT NOT NULL,          -- JSON: PlanData
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_plans_guild ON plans(guild_id);

-- ประกาศของกิลด์ (เช่น วันนี้เปลี่ยนจากแผน 1 เป็นแผน 2)
CREATE TABLE IF NOT EXISTS announcements (
  id          TEXT PRIMARY KEY,
  guild_id    TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  body        TEXT NOT NULL DEFAULT '',
  plan_id     TEXT,                   -- แผนที่ให้ใช้ (ถ้ามี) → ประกาศล่าสุดที่มีแผน = แผนที่ใช้อยู่
  opponent    TEXT NOT NULL DEFAULT '', -- กิลด์ที่เจอ
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ann_guild ON announcements(guild_id, created_at);

-- ตั้งค่ากิลด์ (ตารางวอร์รายสัปดาห์)
CREATE TABLE IF NOT EXISTS guild_settings (
  guild_id    TEXT PRIMARY KEY REFERENCES guilds(id) ON DELETE CASCADE,
  schedule    TEXT NOT NULL           -- JSON: 7 ช่อง จันทร์..อาทิตย์ = 'attack' | 'defense' | 'rest'
);
