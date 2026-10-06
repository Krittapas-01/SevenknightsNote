import { hasStats } from './stats'
import type { HeroNote } from './types'

/**
 * สเตตัส/ของล่าสุดที่ "เครื่องนี้" เคยบันทึก (ต่อตัวละคร) — เก็บใน localStorage ของเบราว์เซอร์
 * สเตตัสแต่ละคนไม่เท่ากัน เลยจำแยกตามเครื่อง ไม่ได้ดึงของคนอื่นในกิลด์
 */
const KEY = '7k-note:my-heroes'
type Saved = { note: Omit<HeroNote, 'hero'>; at: number }

function load(): Record<string, Saved> {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}

/** จำของ/สเตตัสของตัวที่มีข้อมูล (เรียกตอนบันทึกทีม/แผนสำเร็จ) */
export function rememberNotes(notes: HeroNote[] | undefined) {
  const useful = (notes ?? []).filter((n) => hasStats(n.stats) || n.sets.length || n.rings.length)
  if (!useful.length) return
  const all = load()
  const now = Date.now()
  for (const { hero, ...note } of useful) all[hero] = { note, at: now }
  try { localStorage.setItem(KEY, JSON.stringify(all)) } catch { /* เต็ม/โหมดส่วนตัว — ข้ามไป */ }
}

/** ของ/สเตตัสล่าสุดของตัวนี้บนเครื่องนี้ (ไม่มี = null) */
export function recallNote(hero: string): Saved | null {
  return load()[hero] ?? null
}

/** ข้อมูลในแถวนี้ตรงกับที่จำไว้แล้ว (ไม่ต้องขึ้นปุ่ม) */
export const sameAsSaved = (n: HeroNote, s: Saved) =>
  JSON.stringify([n.stats ?? {}, n.sets, n.rings]) === JSON.stringify([s.note.stats ?? {}, s.note.sets, s.note.rings])

export function agoText(ts: number) {
  const m = Math.floor((Date.now() - ts) / 60_000)
  if (m < 60) return `${Math.max(1, m)} นาทีก่อน`
  if (m < 1440) return `${Math.floor(m / 60)} ชม.ก่อน`
  return `${Math.floor(m / 1440)} วันก่อน`
}
