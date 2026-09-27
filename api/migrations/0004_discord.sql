-- แจ้งเตือนประกาศเข้า Discord (Webhook) — URL เป็นความลับ ห้องส่งกลับให้ client
ALTER TABLE guild_settings ADD COLUMN discord_webhook TEXT NOT NULL DEFAULT '';
-- '' = ไม่แท็ก, 'everyone', 'here', หรือ role id (ตัวเลข)
ALTER TABLE guild_settings ADD COLUMN discord_mention TEXT NOT NULL DEFAULT '';
