-- เลขเวอร์ชันข้อมูลกิลด์: ขยับทุกครั้งที่มีการบันทึก/แก้/ลบ → เว็บเช็กเลขนี้ก่อน ถ้าเท่าเดิมไม่ต้องโหลดทั้งกิลด์ใหม่
ALTER TABLE guilds ADD COLUMN rev INTEGER NOT NULL DEFAULT 0;
-- index คู่ (กิลด์, เวลาแก้) ให้ ORDER BY updated_at ไม่ต้องเรียงเอง → อ่านแถวน้อยลง
CREATE INDEX IF NOT EXISTS idx_targets_guild_updated ON targets(guild_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_plans_guild_updated ON plans(guild_id, updated_at);
