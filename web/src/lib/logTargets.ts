import { api } from './api'
import { heroKey } from './allocation'
import { teamNotes } from './heroNotes'
import { houseView, type Counter, type HeroNote, type PlanData, type Target, type Team, type WarOption } from './types'
import { L } from './i18n'

/**
 * ทีมที่ "จัดทีมเอง" ในแผน → ถามว่าจะจดลง "บ้านศัตรู" (targets/counters) ด้วยไหม
 * - หาบ้านในคลังที่ตัวตรงกัน (ไม่สนตำแหน่ง/awake) → เพิ่มเป็นทีมแก้
 * - ไม่มีบ้านนี้ → สร้างบ้านใหม่ + ทีมแก้
 * - ทีมแก้นี้มีอยู่แล้ว / เคยถามแล้ว (logged) → ไม่ถามซ้ำ
 */
export type LogItem = { s: number; o: number; opt: WarOption; vs: Team; vsTag: string; target: Target | null; /** บ้านใหม่: แท็ก/โน้ตที่จะสร้าง */ tags: string[]; note: string }

const heroSet = (t: Team) => t.slots.filter(Boolean).map((id) => heroKey(id!)).sort().join('|')

export function findLogItems(plan: PlanData, targets: Target[]): LogItem[] {
  const out: LogItem[] = []
  plan.slots.forEach((raw, s) => {
    // ทุกบ้านของไม้นี้ (บ้านหลัก + บ้านอื่นที่ทีมเดียวกันตีได้)
    for (let h = 0; h <= (raw.alts?.length ?? 0); h++) {
      const slot = houseView(raw, h)
      if (slot.kind !== 'attack' || !slot.vs || !heroSet(slot.vs)) continue
      const target = targets.find((t) => heroSet(t.team) === heroSet(slot.vs!)) ?? null
      slot.options.forEach((opt, o) => {
        if (!opt.custom || opt.logged || !heroSet(opt.team)) return
        if (target?.counters.some((c) => heroSet(c.team) === heroSet(opt.team))) return
        const tags = slot.vsTags?.length ? slot.vsTags : slot.vsTag ? [slot.vsTag] : []
        out.push({ s, o, opt, vs: slot.vs!, vsTag: slot.vsTag ?? '', target, tags, note: slot.vsNote ?? '' })
      })
    }
  })
  return out
}

/**
 * อุปกรณ์/ค่าความสามารถที่แก้ในแผน → ส่งกลับไปที่ทีมแก้ตัวเดียวกันในบ้านศัตรู (แผนเก็บสำเนาของคอมพ์ไว้แยก)
 * จับคู่: บ้านตัวตรงกัน + ทีมแก้ตัวตรงกัน · ส่งเฉพาะที่ข้อมูลต่างจากในคลังจริง
 */
export type SyncItem = { s: number; o: number; opt: WarOption; vs: Team; counter: Counter; heroNotes: HeroNote[] }

const noteKey = (id: string) => heroKey(id)
/** แทนโน้ตของอัศวินตัวเดียวกันด้วยของในแผน (ตัวที่ไม่มีในแผนคงไว้) */
function mergeNotes(lib: HeroNote[], plan: HeroNote[]): HeroNote[] {
  const out = lib.map((n) => plan.find((p) => noteKey(p.hero) === noteKey(n.hero)) ?? n)
  for (const p of plan) if (!out.some((n) => noteKey(n.hero) === noteKey(p.hero))) out.push(p)
  return out.slice(0, 5)
}
const emptyNote = (n: HeroNote) => !n.text.trim() && !n.sets.length && !n.rings.length && !Object.values(n.stats ?? {}).some((v) => typeof v === 'number')

/** prev = แผนก่อนแก้รอบนี้ → ส่งเฉพาะโน้ตที่เพิ่งแก้ (กันเอาข้อมูลเก่าในแผนไปทับคลังที่คนอื่นอัปเดตแล้ว) */
export function findSyncItems(plan: PlanData, targets: Target[], prev?: PlanData): SyncItem[] {
  const out: SyncItem[] = []
  const seen = new Set<string>()
  plan.slots.forEach((raw, s) => {
    for (let h = 0; h <= (raw.alts?.length ?? 0); h++) {
      const slot = houseView(raw, h)
      if (slot.kind !== 'attack' || !slot.vs || !heroSet(slot.vs)) continue
      const target = targets.find((t) => heroSet(t.team) === heroSet(slot.vs!))
      if (!target) continue
      slot.options.forEach((opt, o) => {
        const before = prev?.slots[s]?.options ?? []
        const old = (hero: string) => before.flatMap((x) => x.heroNotes ?? []).filter((n) => noteKey(n.hero) === noteKey(hero))
        const notes = (opt.heroNotes ?? []).filter((n) => !emptyNote(n) && !old(n.hero).some((x) => JSON.stringify(x) === JSON.stringify(n)))
        if (!notes.length || !heroSet(opt.team)) return
        const counter = target.counters.find((c) => heroSet(c.team) === heroSet(opt.team))
        if (!counter || seen.has(counter.id)) return
        // เฉพาะตัวที่อยู่ในทีม (ของตัวที่เคยเอาออกจากทีมแล้วไม่ส่งกลับ)
        const lib = teamNotes(counter.heroNotes, counter.team.slots)
        const merged = mergeNotes(lib, teamNotes(notes, counter.team.slots))
        if (JSON.stringify(merged) === JSON.stringify(lib)) return
        seen.add(counter.id)
        out.push({ s, o, opt, vs: slot.vs!, counter, heroNotes: merged })
      })
    }
  })
  return out
}

/** ส่งอุปกรณ์/ค่าความสามารถกลับคลัง (แก้แค่ heroNotes ของทีมแก้ — ทีม/สกิล/โน้ตคงเดิม) */
export async function syncToLibrary(gid: string, items: SyncItem[]) {
  let ok = 0
  const errors: string[] = []
  for (const it of items) {
    const c = it.counter
    try {
      // ส่งเวอร์ชันที่เห็นไปด้วย: ระหว่างนั้นมีคนแก้ทีมแก้นี้ = ไม่ทับ (ขึ้นในรายการที่ไม่สำเร็จ)
      await api.updateCounter(gid, c.id, { team: c.team, skills: c.skills, note: c.note, heroNotes: it.heroNotes, baseUpdatedAt: c.updatedAt })
      ok++
    } catch (e) {
      errors.push((e as Error).message)
    }
  }
  return { ok, errors }
}

/** บันทึกรายการที่เลือกลงบ้านศัตรู → คืนจำนวนที่สำเร็จ + ข้อผิดพลาด */
export async function logToTargets(gid: string, items: LogItem[]) {
  const created = new Map<string, string>() // บ้านใหม่ที่เพิ่งสร้าง (กันสร้างซ้ำ)
  let ok = 0
  const errors: string[] = []
  for (const it of items) {
    try {
      let tid = it.target?.id ?? created.get(heroSet(it.vs))
      if (!tid) {
        const t = await api.createTarget(gid, { team: it.vs, tags: it.tags.slice(0, 5), note: it.note.slice(0, 500) })
        tid = t.id
        created.set(heroSet(it.vs), tid)
      }
      await api.createCounter(gid, tid, {
        team: it.opt.team,
        skills: it.opt.skills,
        note: [it.opt.condition, it.opt.notes].filter(Boolean).join('\n').slice(0, 500),
        heroNotes: teamNotes(it.opt.heroNotes, it.opt.team.slots),
      })
      ok++
    } catch (e) {
      errors.push(L(`ไม้ ${it.s + 1}: ${(e as Error).message}`, `Slot ${it.s + 1}: ${(e as Error).message}`))
    }
  }
  return { ok, errors }
}

/** ทำเครื่องหมายว่าถามแล้ว (บันทึกหรือไม่ก็ตาม) จะได้ไม่ถามซ้ำ */
export const markLogged = (plan: PlanData, items: LogItem[]): PlanData => ({
  ...plan,
  slots: plan.slots.map((slot, s) => ({
    ...slot,
    options: slot.options.map((opt, o) => (items.some((it) => it.s === s && it.o === o) ? { ...opt, logged: true } : opt)),
  })),
})
