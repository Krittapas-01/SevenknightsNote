-- Monthly Key Bundle: ชื่อเต็มตามในเกม + ของแถม Topaz ×790 (ป้าย BONUS) — จากรูปที่ Krit ส่งมา 24 ต.ค. 2026
UPDATE packs
SET name = 'Monthly Key Bundle Special Pack',
    items = '{"list":[{"k":"rubies","n":2650},{"k":"chests","n":160},{"k":"ore","n":790,"b":1}],"tab":"monthly"}',
    updated_at = 1792821600000
WHERE id = 'monthly-key';
