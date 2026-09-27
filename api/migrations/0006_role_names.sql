-- ชื่อยศที่แสดงต่อท้ายชื่อคนประกาศ (Discord ไม่บอกชื่อยศถ้าไม่มีบอท → หัวกิลด์ตั้งเอง) JSON: {roleId: name} เรียงตามลำดับความสำคัญ
ALTER TABLE guild_settings ADD COLUMN discord_role_names TEXT NOT NULL DEFAULT '[]';
ALTER TABLE announcements ADD COLUMN author_role TEXT NOT NULL DEFAULT '';
