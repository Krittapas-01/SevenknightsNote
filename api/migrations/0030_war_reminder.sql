-- แจ้งเตือน Discord ก่อนหมดเวลา 1 ชม. (วันตี 23:00 · วันจัดบ้าน 17:00) — กิลด์เปิดเอง (ค่าเริ่มต้น = ปิด)
ALTER TABLE guild_settings ADD COLUMN war_reminder INTEGER NOT NULL DEFAULT 0;
