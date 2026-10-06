import { api } from './api'
import { heroKey } from './allocation'
import { houseView, type PlanData, type Target, type Team, type WarOption } from './types'

/**
 * ทีมที่ "จัดทีมเอง" ในแผน → ถามว่าจะจดลง "จดทีมศัตรู" (targets/counters) ด้วยไหม
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

/** บันทึกรายการที่เลือกลงจดทีมศัตรู → คืนจำนวนที่สำเร็จ + ข้อผิดพลาด */
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
        heroNotes: it.opt.heroNotes ?? [],
      })
      ok++
    } catch (e) {
      errors.push(`ไม้ ${it.s + 1}: ${(e as Error).message}`)
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
