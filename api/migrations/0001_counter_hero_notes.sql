-- ของ/สเตตัสรายตัวของทีมแก้ (JSON: {hero, text, sets[], rings[]}[])
ALTER TABLE counters ADD COLUMN hero_notes TEXT NOT NULL DEFAULT '[]';
