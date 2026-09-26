import { baseName, getUnit } from '../data/heroes'
import type { WarOption, WarSlot } from './types'

/**
 * จัดสรรตัวละคร 5 ไม้: แต่ละไม้บุกเลือก "ทีมหลัก" 1 ทีม
 * ตัวละครใช้ได้รอบเดียว → ตัวที่อยู่ในทีมหลักของไม้อื่นถือว่า "ใช้แล้ว"
 * (สัตว์เลี้ยงไม่นับ — ใช้ซ้ำได้)
 */
export const heroKey = (id: string) => baseName(getUnit(id)?.name ?? id)

/** index ทีมหลักของไม้นี้ (-1 = ไม่มีทีม) */
export const mainIndex = (slot: WarSlot) =>
  slot.options.length ? Math.min(Math.max(slot.main ?? 0, 0), slot.options.length - 1) : -1

export const mainOption = (slot: WarSlot): WarOption | null => {
  const i = mainIndex(slot)
  return i >= 0 ? slot.options[i] : null
}

export const heroesOf = (o: WarOption | null) => (o ? (o.team.slots.filter(Boolean) as string[]) : [])

/** ฮีโร่ (ชื่อฐาน) → ไม้ที่ใช้ตัวนี้ในทีมหลัก */
export function heroUsage(slots: WarSlot[]) {
  const use = new Map<string, number[]>()
  slots.forEach((slot, s) => {
    if (slot.kind !== 'attack') return
    for (const id of heroesOf(mainOption(slot))) {
      const k = heroKey(id)
      use.set(k, [...(use.get(k) ?? []), s])
    }
  })
  return use
}

/** ตัวในทีมนี้ที่ชนกับทีมหลักของไม้อื่น */
export function conflictsOf(option: WarOption, slotIndex: number, use: Map<string, number[]>) {
  return heroesOf(option)
    .map((id) => ({ id, name: heroKey(id), slots: (use.get(heroKey(id)) ?? []).filter((s) => s !== slotIndex) }))
    .filter((c) => c.slots.length > 0)
}

/** ตัวที่ใช้ไปแล้วในไม้อื่น → ป้าย เช่น "ไม้ 2" (ใช้หรี่ในแถบตัวละคร) */
export function blockedFor(slotIndex: number, use: Map<string, number[]>) {
  const out: Record<string, string> = {}
  for (const [k, slots] of use) {
    const other = slots.filter((s) => s !== slotIndex)
    if (other.length) out[k] = other.map((s) => `ไม้ ${s + 1}`).join(', ')
  }
  return out
}

/** จำนวนตัวที่ใช้ซ้ำข้ามไม้ */
export const conflictCount = (use: Map<string, number[]>) => [...use.values()].filter((s) => s.length > 1).length

/** ทีมนี้ตรงกับชุดที่ยกเลิกไหม (ทุกตัวในชุดอยู่ในทีม) */
const isBanned = (o: WarOption, banned: string[][]) => {
  const inTeam = new Set(heroesOf(o).map(heroKey))
  return banned.some((g) => g.length > 0 && g.every((id) => inTeam.has(heroKey(id))))
}

/**
 * จัดให้อัตโนมัติ: เลือกทีมหลักไม้ละ 1 ทีม ให้ตัวไม่ซ้ำกันเลย
 * - พยายามให้ได้ครบทุกไม้ก่อน แล้วค่อยเลือกทีมลำดับต้น ๆ (ทีมบนสุด = ทีมที่แนะนำที่สุด)
 * - ข้ามทีมที่ตรงกับชุดที่ยกเลิก
 * ไม้ละไม่เกิน 8 ทีม × 5 ไม้ → ลองทุกแบบได้สบาย
 */
export function autoAssign(slots: WarSlot[], banned: string[][]) {
  const todo = slots.map((slot, s) => ({ slot, s })).filter(({ slot }) => slot.kind === 'attack' && slot.options.length > 0)
  const cands = todo.map(({ slot }) =>
    slot.options
      .map((o, i) => ({ i, keys: heroesOf(o).map(heroKey) }))
      .filter(({ i, keys }) => keys.length > 0 && !isBanned(slot.options[i], banned)),
  )
  let best: { pick: number[]; score: number } = { pick: todo.map(() => -1), score: -Infinity }
  const pick: number[] = []
  const used = new Set<string>()
  function dfs(k: number, filled: number, cost: number) {
    // ตัดกิ่ง: ต่อให้ไม้ที่เหลือได้หมด ก็ยังไม่ดีกว่าที่มี
    if ((filled + (todo.length - k)) * 1000 - cost <= best.score) return
    if (k === todo.length) {
      best = { pick: [...pick], score: filled * 1000 - cost }
      return
    }
    for (const c of cands[k]) {
      if (c.keys.some((x) => used.has(x))) continue
      c.keys.forEach((x) => used.add(x))
      pick.push(c.i)
      dfs(k + 1, filled + 1, cost + c.i)
      pick.pop()
      c.keys.forEach((x) => used.delete(x))
    }
    pick.push(-1) // ไม้นี้หาทีมไม่ชนไม่ได้
    dfs(k + 1, filled, cost)
    pick.pop()
  }
  dfs(0, 0, 0)
  const mains = new Map<number, number>()
  const unresolved: number[] = []
  todo.forEach(({ s }, k) => (best.pick[k] >= 0 ? mains.set(s, best.pick[k]) : unresolved.push(s)))
  return { mains, unresolved }
}
