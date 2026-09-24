// ดึงคอมพ์จากลิงก์กิลด์ของ 7k-combo มาเป็นคลังคอมพ์ของ 7K Note
// ใช้:  node scripts/import-7k-combo.mjs https://7k-combo.pages.dev/g/<id>
// ผลลัพธ์: web/src/data/comps.json  (แล้ว build เว็บใหม่)
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const url = process.argv[2] ?? 'https://7k-combo.pages.dev/g/afKyNduQ'
const gid = url.match(/\/g\/([^/?#]+)/)?.[1] ?? url
const API = `https://7k-combo-api.phongit-ton.workers.dev/api/guild/${gid}`

const res = await fetch(API)
if (!res.ok) throw new Error(`ดึงข้อมูลไม่สำเร็จ: HTTP ${res.status}`)
const src = await res.json()

const TYPE = { magic: 'เวทย์', physical: 'กายภาพ', tanky: 'ถึก', other: 'อื่นๆ' }
const SLOT_COUNT = 5

/** แปลงทีมของ 7k-combo → Team ของเรา (+ ลำดับสกิล + โน้ตรายตัว) */
function convert(t) {
  const front = t.front.characters
  const back = t.back.characters
  const f = Math.min(4, Math.max(1, front.length))
  const slots = [...front.slice(0, f), ...back].map((c) => c.name || null)
  while (slots.length < SLOT_COUNT) slots.push(null)
  slots.length = SLOT_COUNT

  const chars = [...front.slice(0, f), ...back]
  const steps = []
  chars.forEach((c, slot) => {
    if (!c.name) return
    const o = c.skillOrder ?? {}
    if (o.T > 0) steps.push({ order: o.T, slot, skill: 1 })
    if (o.B > 0) steps.push({ order: o.B, slot, skill: 2 })
  })
  steps.sort((a, b) => a.order - b.order)

  const heroNotes = chars
    .filter((c) => c.name && (c.description || c.equip?.sets?.length || c.equip?.rings?.length))
    .map((c) => ({
      hero: c.name,
      text: (c.description ?? '').trim(),
      sets: c.equip?.sets ?? [],
      rings: c.equip?.rings ?? [],
    }))

  const pets = t.pets.map((p) => p.name || null)
  return {
    team: {
      front: f,
      slots,
      pet: pets[0] ?? null,
      extras: [1, 2, 3, 4].map((i) => pets[i] ?? null),
      speed: 0,
    },
    skills: steps.map(({ slot, skill }) => ({ slot, skill })),
    note: (t.note ?? '').trim(),
    heroNotes,
  }
}

const defenses = src.combos
  .filter((c) => c.enemy)
  .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
  .map((c, i) => ({
    id: c.id ?? `d${i + 1}`, // ใช้ id เดิมของ 7k-combo จะได้คงที่เวลาดึงใหม่
    type: TYPE[c.enemyTeamTypeTag] ?? 'อื่นๆ',
    ...convert(c.enemy),
    counters: c.counterTeams
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((k, j) => ({ id: `${c.id ?? `d${i + 1}`}-${j + 1}`, ...convert(k) })),
  }))

// นับความถี่ฮีโร่/สัตว์เลี้ยง เพื่อเรียงรายชื่อตามความนิยม
const heroFreq = {}
const petFreq = {}
for (const d of defenses)
  for (const t of [d, ...d.counters]) {
    t.team.slots.forEach((h) => h && (heroFreq[h] = (heroFreq[h] ?? 0) + 1))
    ;[t.team.pet, ...t.team.extras].forEach((p) => p && (petFreq[p] = (petFreq[p] ?? 0) + 1))
  }
const byFreq = (m) => Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k]) => k)

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'web', 'src', 'data')

// คลังคอมพ์ (ไฟล์ใหญ่ โหลดตอนเปิดคลังเท่านั้น)
writeFileSync(
  join(dataDir, 'comps.json'),
  JSON.stringify({ source: { name: src.guild?.name ?? gid, url, fetchedAt: new Date().toISOString() }, defenses }),
)
// รายชื่อฮีโร่/สัตว์เลี้ยง เรียงตามความนิยม (ไฟล์เล็ก ใช้ในหน้าเลือกฮีโร่)
const catalog = { heroes: byFreq(heroFreq), pets: byFreq(petFreq) }
writeFileSync(join(dataDir, 'catalog.json'), JSON.stringify(catalog, null, 0))

console.log(
  `✓ ${defenses.length} ทีมกัน, ${defenses.reduce((a, d) => a + d.counters.length, 0)} ทีมแก้, ` +
    `${catalog.heroes.length} ฮีโร่, ${catalog.pets.length} สัตว์เลี้ยง → web/src/data/`,
)
