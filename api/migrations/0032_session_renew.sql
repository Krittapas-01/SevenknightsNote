-- 1.7: ล็อกอิน Discord ต่ออายุเองเมื่อใช้งาน (เหลือไม่ถึง 3 วัน → ต่อเป็น 7 วัน, เพดาน 30 วันนับจากล็อกอิน)
-- refresh_token: ของ Discord ใช้ขอ access_token ใหม่ตอนต่ออายุ (session ก่อน 1.7 = NULL → ไม่ต่อ ล็อกอินใหม่ครั้งเดียว)
-- created_at: เวลาล็อกอินครั้งแรก (ใช้กับเพดาน 30 วัน) · last_seen: เข้าใช้ครั้งล่าสุด (เขียนไม่เกินวันละครั้ง ดูในหน้า admin)
ALTER TABLE sessions ADD COLUMN refresh_token TEXT;
ALTER TABLE sessions ADD COLUMN created_at INTEGER;
ALTER TABLE sessions ADD COLUMN last_seen INTEGER;
