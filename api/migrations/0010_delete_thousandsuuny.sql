-- กิลด์ที่สร้างซ้ำชื่อ "ThousandSuuny" (พิมพ์ผิด) — ลบ เก็บตัวจริง iWMpFr9g ไว้
DELETE FROM counters WHERE guild_id IN (SELECT id FROM guilds WHERE lower(trim(name)) IN ('thousandsuuny', 'thousandsunny') AND id <> 'iWMpFr9g');
DELETE FROM targets WHERE guild_id IN (SELECT id FROM guilds WHERE lower(trim(name)) IN ('thousandsuuny', 'thousandsunny') AND id <> 'iWMpFr9g');
DELETE FROM plans WHERE guild_id IN (SELECT id FROM guilds WHERE lower(trim(name)) IN ('thousandsuuny', 'thousandsunny') AND id <> 'iWMpFr9g');
DELETE FROM announcements WHERE guild_id IN (SELECT id FROM guilds WHERE lower(trim(name)) IN ('thousandsuuny', 'thousandsunny') AND id <> 'iWMpFr9g');
DELETE FROM guild_settings WHERE guild_id IN (SELECT id FROM guilds WHERE lower(trim(name)) IN ('thousandsuuny', 'thousandsunny') AND id <> 'iWMpFr9g');
DELETE FROM guilds WHERE lower(trim(name)) IN ('thousandsuuny', 'thousandsunny') AND id <> 'iWMpFr9g';
