-- แพ็คในเกม (หน้าเช็กความคุ้มค่าแพ็ค /packs) — แอดมินเพิ่ม/แก้ได้ที่หน้า /admin
-- price = บาท · gems = ราคาเพชร (ไม่บังคับ) · items = JSON { rubies, chests, summon, raid, other }
-- limit_period: once | daily | weekly | monthly · ends_at = หมดอายุ (ms, NULL = ไม่หมด) · is_base = แพ็คที่ใช้เป็นเส้นฐาน 100%
CREATE TABLE IF NOT EXISTS packs (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  group_name   TEXT NOT NULL DEFAULT '',
  price        REAL NOT NULL,
  gems         INTEGER NOT NULL DEFAULT 0,
  items        TEXT NOT NULL,
  limit_count  INTEGER NOT NULL DEFAULT 1,
  limit_period TEXT NOT NULL DEFAULT 'once',
  ends_at      INTEGER,
  is_base      INTEGER NOT NULL DEFAULT 0,
  sort         INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);

-- แพ็คตั้งต้น (จากร้านในเกม ต.ค. 2026) — วันหมดอายุเป็นค่าประมาณ แก้ได้ที่หน้าแอดมิน
INSERT OR IGNORE INTO packs (id, name, group_name, price, gems, items, limit_count, limit_period, ends_at, is_base, sort, created_at, updated_at) VALUES
 ('monthly-key', 'Monthly Key Bundle Pack', 'Monthly', 1800, 718, '{"rubies":2650,"chests":150}', 1, 'monthly', NULL, 1, 0, 1791763200000, 1791763200000),
 ('daily-special', 'Daily Special Pack', 'Daily', 349, 136, '{"rubies":500,"chests":15,"raid":20}', 1, 'daily', NULL, 0, 1, 1791763200000, 1791763200000),
 ('rookie-179', 'Rookie Cheer Key Special ฿179', 'Rookie Cheer Key Special Pack', 179, 68, '{"rubies":450,"chests":15}', 1, 'once', 1793232000000, 0, 10, 1791763200000, 1791763200000),
 ('rookie-349', 'Rookie Cheer Key Special ฿349', 'Rookie Cheer Key Special Pack', 349, 136, '{"rubies":800,"chests":30}', 1, 'once', 1793232000000, 0, 11, 1791763200000, 1791763200000),
 ('rookie-729', 'Rookie Cheer Key Special ฿729', 'Rookie Cheer Key Special Pack', 729, 273, '{"rubies":1500,"chests":60}', 2, 'once', 1793232000000, 0, 12, 1791763200000, 1791763200000),
 ('rookie-1450', 'Rookie Cheer Key Special ฿1,450', 'Rookie Cheer Key Special Pack', 1450, 545, '{"rubies":3000,"chests":100}', 3, 'once', 1793232000000, 0, 13, 1791763200000, 1791763200000),
 ('adv-s-179', 'Adventure Support S ฿179', 'Adventure Support S', 179, 68, '{"rubies":250,"chests":15}', 1, 'once', NULL, 0, 20, 1791763200000, 1791763200000),
 ('adv-s-729', 'Adventure Support S ฿729', 'Adventure Support S', 729, 273, '{"rubies":1000,"chests":50}', 1, 'once', NULL, 0, 21, 1791763200000, 1791763200000),
 ('adv-s-1150', 'Adventure Support S ฿1,150', 'Adventure Support S', 1150, 445, '{"rubies":1650,"chests":70}', 1, 'once', NULL, 0, 22, 1791763200000, 1791763200000),
 ('rateup-149', 'Rate Up Summon Special ฿149', 'Rate Up Summon Special', 149, 55, '{"summon":12,"other":"การ์ด 2~3★ ×1"}', 2, 'once', 1792022400000, 0, 30, 1791763200000, 1791763200000),
 ('rateup-349', 'Rate Up Summon Special ฿349', 'Rate Up Summon Special', 349, 136, '{"summon":30,"other":"การ์ด 2~3★ ×2"}', 2, 'once', 1792022400000, 0, 31, 1791763200000, 1791763200000),
 ('rateup-729', 'Rate Up Summon Special ฿729', 'Rate Up Summon Special', 729, 273, '{"summon":60,"other":"การ์ด 2~3★ ×3"}', 2, 'once', 1792022400000, 0, 32, 1791763200000, 1791763200000),
 ('rateup-1100', 'Rate Up Summon Special ฿1,100', 'Rate Up Summon Special', 1100, 409, '{"summon":70,"other":"การ์ด 2~3★ ×4 · คริสตัล ×1 · เงิน 300,000"}', 1, 'once', 1792022400000, 0, 33, 1791763200000, 1791763200000);
