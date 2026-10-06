-- ไลค์ทีมแก้ (ทีมที่ตีแล้วชนะ) ผูกกับ Discord user · คนละ 1 ครั้งต่อทีม · ลบทีมแก้แล้วไลค์หายตาม
CREATE TABLE IF NOT EXISTS likes (
  user_id     TEXT NOT NULL,
  counter_id  TEXT NOT NULL REFERENCES counters(id) ON DELETE CASCADE,
  guild_id    TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (user_id, counter_id)
);
CREATE INDEX IF NOT EXISTS idx_likes_guild ON likes(guild_id, counter_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id, created_at);
