-- นับการใส่รหัสแก้ไขผิด (ต่อกิลด์ + IP) กันการเดารหัส
CREATE TABLE IF NOT EXISTS auth_fails (
  k      TEXT PRIMARY KEY,   -- guild_id:ip
  count  INTEGER NOT NULL,
  since  INTEGER NOT NULL    -- เวลาที่ผิดครั้งแรกของรอบนี้ (ms)
);
