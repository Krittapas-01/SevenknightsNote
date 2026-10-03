-- ลบกิลด์ ThousandSunny ที่สร้างซ้ำ (เก็บตัวจริง iWMpFr9g ไว้)
DELETE FROM counters WHERE guild_id IN (SELECT id FROM guilds WHERE lower(trim(name)) = 'thousandsunny' AND id <> 'iWMpFr9g');
DELETE FROM targets WHERE guild_id IN (SELECT id FROM guilds WHERE lower(trim(name)) = 'thousandsunny' AND id <> 'iWMpFr9g');
DELETE FROM plans WHERE guild_id IN (SELECT id FROM guilds WHERE lower(trim(name)) = 'thousandsunny' AND id <> 'iWMpFr9g');
DELETE FROM announcements WHERE guild_id IN (SELECT id FROM guilds WHERE lower(trim(name)) = 'thousandsunny' AND id <> 'iWMpFr9g');
DELETE FROM guild_settings WHERE guild_id IN (SELECT id FROM guilds WHERE lower(trim(name)) = 'thousandsunny' AND id <> 'iWMpFr9g');
DELETE FROM guilds WHERE lower(trim(name)) = 'thousandsunny' AND id <> 'iWMpFr9g';
