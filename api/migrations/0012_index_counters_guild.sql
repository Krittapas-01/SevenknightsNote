-- โหลดหน้ากิลด์ดึงทีมแก้ด้วย guild_id — เดิมไม่มี index เลยสแกนทีมแก้ของทุกกิลด์ทุกครั้ง (rows read โตตามจำนวนกิลด์)
CREATE INDEX IF NOT EXISTS idx_counters_guild ON counters(guild_id, created_at);
