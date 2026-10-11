-- ลำดับทีมแก้ในบ้านศัตรู (#1 = ทีมที่แนะนำให้ใช้ก่อน) · NULL = ยังไม่เคยเรียง → ต่อท้ายตามเวลาที่จด
ALTER TABLE counters ADD COLUMN sort INTEGER;
