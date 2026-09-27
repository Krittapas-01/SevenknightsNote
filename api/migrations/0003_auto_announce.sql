-- ประกาศอัตโนมัติทุกวัน 07:00 (เวลาไทย) ตามตารางวอร์
ALTER TABLE guild_settings ADD COLUMN auto_announce INTEGER NOT NULL DEFAULT 1;
-- 1 = ระบบประกาศให้เอง
ALTER TABLE announcements ADD COLUMN auto INTEGER NOT NULL DEFAULT 0;
