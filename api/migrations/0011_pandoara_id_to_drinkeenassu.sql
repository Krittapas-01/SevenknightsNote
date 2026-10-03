-- ย้ายลิงก์กิลด์ /g/pandoara → /g/drinkeenassu (ข้อมูลทั้งหมดย้ายตาม · เว็บพาลิงก์เก่าไปลิงก์ใหม่ให้เอง)
INSERT INTO guilds (id, name, edit_hash, created_at)
  SELECT 'drinkeenassu', name, edit_hash, created_at FROM guilds
  WHERE id = 'pandoara' AND NOT EXISTS (SELECT 1 FROM guilds WHERE id = 'drinkeenassu');
UPDATE targets SET guild_id = 'drinkeenassu' WHERE guild_id = 'pandoara';
UPDATE counters SET guild_id = 'drinkeenassu' WHERE guild_id = 'pandoara';
UPDATE plans SET guild_id = 'drinkeenassu' WHERE guild_id = 'pandoara';
UPDATE announcements SET guild_id = 'drinkeenassu' WHERE guild_id = 'pandoara';
UPDATE guild_settings SET guild_id = 'drinkeenassu' WHERE guild_id = 'pandoara';
DELETE FROM guilds WHERE id = 'pandoara' AND EXISTS (SELECT 1 FROM guilds WHERE id = 'drinkeenassu');
