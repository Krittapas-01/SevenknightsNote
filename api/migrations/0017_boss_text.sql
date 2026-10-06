-- ข้อความแจ้งเตือนบอสจุติ (วันเริ่ม / วันสุดท้าย) · NULL = ข้อความเริ่มต้น, '' = ไม่ส่ง
ALTER TABLE guild_settings ADD COLUMN boss_text_start TEXT;
ALTER TABLE guild_settings ADD COLUMN boss_text_end TEXT;
