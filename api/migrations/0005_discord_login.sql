-- ล็อกอินด้วย Discord + ให้ยศในเซิร์ฟเวอร์ Discord แก้แผนได้
CREATE TABLE IF NOT EXISTS oauth_states (
  state       TEXT PRIMARY KEY,
  return_to   TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash    TEXT PRIMARY KEY,   -- SHA-256 ของ session token (ไม่เก็บ token ตรง ๆ)
  user_id       TEXT NOT NULL,
  name          TEXT NOT NULL,
  avatar        TEXT NOT NULL,
  access_token  TEXT NOT NULL,      -- ของ Discord (scope: identify guilds.members.read) ใช้เช็คยศ
  expires_at    INTEGER NOT NULL
);
-- ยศของผู้ใช้ในเซิร์ฟเวอร์ (แคช 5 นาที กันโดน Discord rate limit)
CREATE TABLE IF NOT EXISTS member_cache (
  k      TEXT PRIMARY KEY,          -- user_id:discord_guild_id
  roles  TEXT NOT NULL,             -- JSON string[] ; null member = '[]'
  nick   TEXT NOT NULL DEFAULT '',
  at     INTEGER NOT NULL
);
ALTER TABLE guild_settings ADD COLUMN discord_guild_id TEXT NOT NULL DEFAULT '';
ALTER TABLE guild_settings ADD COLUMN discord_edit_roles TEXT NOT NULL DEFAULT '[]';
ALTER TABLE announcements ADD COLUMN author_name TEXT NOT NULL DEFAULT '';
ALTER TABLE announcements ADD COLUMN author_avatar TEXT NOT NULL DEFAULT '';
