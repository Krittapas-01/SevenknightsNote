-- ห้องที่ 2: แจ้งเตือนบอสจุติ (ตอนนี้ใช้เฉพาะ ThousandSunny) · URL เก็บเป็นความลับ ไม่ส่งออกไปหน้าเว็บ
ALTER TABLE guild_settings ADD COLUMN boss_webhook TEXT NOT NULL DEFAULT '';
