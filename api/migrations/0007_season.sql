-- ช่วง Season ของ Guild War (วันในเกม YYYY-MM-DD) — จบแล้วพัก 1 สัปดาห์ Season ถัดไปยาวเท่าเดิม (ระบบนับต่อเองถ้าไม่ได้อัปเดต)
ALTER TABLE guild_settings ADD COLUMN season_start TEXT NOT NULL DEFAULT '';
ALTER TABLE guild_settings ADD COLUMN season_end TEXT NOT NULL DEFAULT '';
