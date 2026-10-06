-- พรีเซ็ตทีมบุกส่วนตัว (ผูกกับ Discord user · ใช้ได้ทุกกิลด์/ทุกเครื่อง)
CREATE TABLE IF NOT EXISTS presets (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  name        TEXT NOT NULL,
  data        TEXT NOT NULL,          -- JSON: { team, skills, note, heroNotes }
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_presets_user ON presets(user_id, updated_at);
