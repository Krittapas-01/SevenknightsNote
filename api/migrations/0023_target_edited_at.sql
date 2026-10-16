-- เวลาที่แก้ตัวบ้านศัตรูเอง (ทีม/แท็ก/โน้ต) — ใช้กันแก้ทับกัน
-- (updated_at ของบ้านถูกขยับทุกครั้งที่ทีมแก้ของบ้านนั้นเปลี่ยน เลยใช้เช็กชนกันไม่ได้)
ALTER TABLE targets ADD COLUMN edited_at INTEGER NOT NULL DEFAULT 0;
