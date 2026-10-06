-- รวมแท็ก "กายภาพ"/"กาย" เข้ากับ "โจมตี" (ชื่อประเภทฮีโร่ในเกม) · ไม่ให้ซ้ำ · คงลำดับเดิม · ไม่แตะ updated_at
UPDATE targets
SET tags = (
  SELECT json_group_array(v) FROM (
    SELECT CASE WHEN value IN ('กายภาพ', 'กาย') THEN 'โจมตี' ELSE value END AS v, MIN(key) AS k
    FROM json_each(targets.tags)
    GROUP BY v
    ORDER BY k
  )
)
WHERE EXISTS (SELECT 1 FROM json_each(targets.tags) WHERE value IN ('กายภาพ', 'กาย'));
