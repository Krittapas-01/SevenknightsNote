-- ลิงก์ Drinkeenassu เป็นรหัสสุ่มเหมือนกิลด์อื่น (/g/drinkeenassu → /g/RtXRcvAp) · ลิงก์เก่าใช้ไม่ได้แล้ว (ตั้งใจ: เดาไม่ได้)
INSERT INTO guilds (id, name, edit_hash, created_at)
  SELECT 'RtXRcvAp', name, edit_hash, created_at FROM guilds
  WHERE id = 'drinkeenassu' AND NOT EXISTS (SELECT 1 FROM guilds WHERE id = 'RtXRcvAp');
UPDATE targets SET guild_id = 'RtXRcvAp' WHERE guild_id = 'drinkeenassu';
UPDATE counters SET guild_id = 'RtXRcvAp' WHERE guild_id = 'drinkeenassu';
UPDATE plans SET guild_id = 'RtXRcvAp' WHERE guild_id = 'drinkeenassu';
UPDATE announcements SET guild_id = 'RtXRcvAp' WHERE guild_id = 'drinkeenassu';
UPDATE guild_settings SET guild_id = 'RtXRcvAp' WHERE guild_id = 'drinkeenassu';
DELETE FROM auth_fails WHERE k LIKE 'drinkeenassu:%';
DELETE FROM guilds WHERE id = 'drinkeenassu' AND EXISTS (SELECT 1 FROM guilds WHERE id = 'RtXRcvAp');
