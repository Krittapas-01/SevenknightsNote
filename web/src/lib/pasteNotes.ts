import { HEROES, baseName } from '../data/heroes'
import { mainIndex } from './allocation'
import { MAX_HEROES, emptyOption, type HeroNote, type PlanData } from './types'

/**
 * วางโน้ตจากข้อความ (เช่น ก๊อปจากแชทกิลด์) → ใส่ลงแผนทีเดียว
 *   Team 1  ถ้ามี เกลลิดัส c6 ใช้แทนไอลีนได้      ← หัวทีม + ข้อความต่อท้าย = โน้ตทีม
 *   แร็ดกริด : บล็อก 78 / ต้าน เท่าที่ได้          ← ชื่อฮีโร่ : รายละเอียด = ของรายตัว
 *   บรรทัดอื่น ๆ                                  ← โน้ตทีม
 */
export type ParsedTeam = { index: number; notes: string[]; heroes: { id: string; raw: string; text: string }[] }
export type Parsed = { teams: ParsedTeam[]; unknown: string[] }

const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase()
function lev(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}

/** หาฮีโร่จากชื่อที่พิมพ์ (ไม่สน awake / เว้นวรรค / พิมพ์ผิด 1 ตัวอักษร) */
export function resolveHero(name: string): string | null {
  const q = norm(name.replace(/\b(c|C)\d\b/g, ''))
  if (!q) return null
  const base = (id: string) => norm(baseName(HEROES.find((h) => h.id === id)?.name ?? id))
  const exact = HEROES.find((h) => base(h.id) === q)
  if (exact) return exact.id
  const part = HEROES.find((h) => base(h.id).startsWith(q) || q.startsWith(base(h.id)))
  if (part && q.length >= 3) return part.id
  let best: { id: string; d: number } | null = null
  for (const h of HEROES) {
    const d = lev(q, base(h.id))
    if (d <= (q.length >= 5 ? 2 : 1) && (!best || d < best.d)) best = { id: h.id, d }
  }
  return best?.id ?? null
}

export function parseNotes(text: string): Parsed {
  const teams: ParsedTeam[] = []
  const unknown: string[] = []
  let cur: ParsedTeam | null = null
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const head = line.match(/^(?:team|ทีม|ไม้)\s*(\d+)\s*[:.\-]?\s*(.*)$/i)
    if (head) {
      cur = { index: Number(head[1]), notes: head[2] ? [head[2].trim()] : [], heroes: [] }
      teams.push(cur)
      continue
    }
    if (!cur) {
      cur = { index: 1, notes: [], heroes: [] }
      teams.push(cur)
    }
    const m = line.match(/^([^:：]+)[:：]\s*(.*)$/)
    const id = m ? resolveHero(m[1]) : null
    if (m && id) {
      // "โอม๊ก : ยุนกอน : คริ 100" → ใช้ชื่อแรก เก็บส่วนที่เหลือเป็นรายละเอียด
      cur.heroes.push({ id, raw: m[1].trim(), text: m[2].trim() })
    } else {
      if (m) unknown.push(m[1].trim())
      cur.notes.push(line)
    }
  }
  return { teams, unknown }
}

/** ใส่ลงแผน: ไม้ N = Team N · ใส่ในทีมหลัก (แผนบุก) / ทางเลือกแรก (แผนกัน) · ทีมว่าง = เอาฮีโร่ในโน้ตมาใส่ทีมให้ด้วย */
export function applyNotes(plan: PlanData, parsed: Parsed): PlanData {
  const slots = plan.slots.map((s) => ({ ...s, options: s.options.map((o) => ({ ...o, team: { ...o.team, slots: [...o.team.slots] } })) }))
  for (const t of parsed.teams) {
    const slot = slots[t.index - 1]
    if (!slot) continue
    if (!slot.options.length) slot.options.push({ ...emptyOption(), custom: true })
    const oi = slot.kind === 'attack' ? Math.max(mainIndex(slot), 0) : 0
    const opt = slot.options[oi]
    // ทีมยังว่าง → ใส่ฮีโร่ตามลำดับในโน้ต
    if (!opt.team.slots.some(Boolean)) {
      t.heroes.slice(0, MAX_HEROES).forEach((h, i) => (opt.team.slots[i] = h.id))
    }
    const notes: HeroNote[] = [...(opt.heroNotes ?? [])]
    for (const h of t.heroes) {
      const i = notes.findIndex((n) => baseName(n.hero) === baseName(h.id))
      const text = h.text.slice(0, 300)
      if (i >= 0) notes[i] = { ...notes[i], text }
      else notes.push({ hero: h.id, text, sets: [], rings: [] })
    }
    opt.heroNotes = notes.slice(0, 5)
    if (t.notes.length) {
      const old = opt.notes.split('\n').map((l) => l.trim()).filter(Boolean)
      opt.notes = [...old, ...t.notes.filter((n) => !old.includes(n))].join('\n').slice(0, 1000)
    }
  }
  return { ...plan, slots }
}
