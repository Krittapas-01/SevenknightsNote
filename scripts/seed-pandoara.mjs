// สร้างกิลด์ pandoara + ใส่คอมพ์ทั้งหมดจาก web/src/data/comps.json (ข้อมูลจากกิลด์ pandoara — ได้รับอนุญาตแล้ว)
// ใช้:  node scripts/seed-pandoara.mjs   → ได้ไฟล์ api/seed-pandoara.sql + edit key (เก็บใน api/.pandoara-key)
//       cd api; npx wrangler d1 execute 7k-note --local --file=seed-pandoara.sql     (เครื่องตัวเอง)
//       cd api; npx wrangler d1 execute 7k-note --remote --file=seed-pandoara.sql -y (ขึ้นเว็บจริง)
// รันซ้ำได้: ลบทีมเป้าหมาย/ทีมแก้เดิมของกิลด์นี้แล้วใส่ใหม่ (key เดิม, แผน/ประกาศไม่โดนลบ)
import { createHash, randomInt } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const GUILD_ID = 'pandoara'
const GUILD_NAME = 'Drinkeenassu'
const root = new URL('..', import.meta.url)
const keyFile = new URL('api/.pandoara-key', root)
const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const key = existsSync(keyFile)
  ? readFileSync(keyFile, 'utf8').trim()
  : Array.from({ length: 20 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')
writeFileSync(keyFile, key + '\n')
const hash = createHash('sha256').update(key).digest('hex')

const { defenses } = JSON.parse(readFileSync(new URL('web/src/data/comps.json', root), 'utf8'))
const q = (v) => `'${String(v).replace(/'/g, "''")}'`
const team = (t, skills) => {
  const out = { front: t.front, slots: t.slots, pet: t.pet ?? null, extras: [0, 1, 2, 3].map((i) => t.extras?.[i] ?? null), speed: t.speed ?? 0 }
  if (skills?.length) out.skills = skills
  return JSON.stringify(out)
}
const heroNotes = (list = []) =>
  list.map((n) => {
    const extra = [...(n.sets ?? []), ...(n.rings ?? [])].join(', ')
    return `• ${n.hero}: ${n.text ?? ''}${extra ? ` [${extra}]` : ''}`.trim()
  })
const note = (n, hn) => [n, ...heroNotes(hn)].filter(Boolean).join('\n')

const now = Date.now()
const sql = [
  `DELETE FROM counters WHERE guild_id = ${q(GUILD_ID)};`,
  `DELETE FROM targets WHERE guild_id = ${q(GUILD_ID)};`,
  `INSERT INTO guilds (id, name, edit_hash, created_at) VALUES (${q(GUILD_ID)}, ${q(GUILD_NAME)}, ${q(hash)}, ${now}) ON CONFLICT(id) DO UPDATE SET name = excluded.name, edit_hash = excluded.edit_hash;`,
]
let nC = 0
const upgrade = []
defenses.forEach((d, i) => {
  const tid = `pd${String(i + 1).padStart(3, '0')}`
  const t = now - i * 1000 // เรียงตามลำดับเดิม (ใหม่สุดขึ้นก่อน)
  const tags = JSON.stringify(d.type ? [d.type] : [])
  sql.push(`INSERT INTO targets (id, guild_id, team, tags, note, created_at, updated_at) VALUES (${q(tid)}, ${q(GUILD_ID)}, ${q(team(d.team, d.skills))}, ${q(tags)}, ${q(note(d.note, d.heroNotes))}, ${t}, ${t});`)
  ;(d.counters ?? []).slice(0, 30).forEach((c, j) => {
    nC++
    const cid = `${tid}c${j + 1}`
    const hn = JSON.stringify(c.heroNotes ?? [])
    sql.push(`INSERT INTO counters (id, target_id, guild_id, team, skills, note, hero_notes, created_at, updated_at) VALUES (${q(cid)}, ${q(tid)}, ${q(GUILD_ID)}, ${q(team(c.team))}, ${q(JSON.stringify(c.skills ?? []))}, ${q(c.note ?? '')}, ${q(hn)}, ${now + j}, ${now + j});`)
    // อัปเกรดของเดิมแบบไม่ลบอะไร (ตัวที่ลบไปแล้วจะไม่กลับมา)
    upgrade.push(`UPDATE counters SET note = ${q(c.note ?? '')}, hero_notes = ${q(hn)} WHERE id = ${q(cid)} AND guild_id = ${q(GUILD_ID)};`)
  })
})
writeFileSync(new URL('api/seed-pandoara.sql', root), sql.join('\n') + '\n')
writeFileSync(new URL('api/upgrade-pandoara-heronotes.sql', root), upgrade.join('\n') + '\n')
console.log(`targets ${defenses.length}, counters ${nC}`)
console.log(`edit key: ${key}`)
console.log(`ลิงก์แก้ไข: /g/${GUILD_ID}?key=${key}`)
