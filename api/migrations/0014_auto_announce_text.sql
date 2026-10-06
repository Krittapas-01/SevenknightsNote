-- ข้อความประกาศอัตโนมัติ 07:00 ที่แต่ละกิลด์ตั้งเอง (ว่าง = ใช้ข้อความเริ่มต้น) · {วัน} = ชื่อวัน เช่น อังคาร
ALTER TABLE guild_settings ADD COLUMN auto_text_attack TEXT NOT NULL DEFAULT '';
ALTER TABLE guild_settings ADD COLUMN auto_text_defense TEXT NOT NULL DEFAULT '';
