import { hasStats } from './stats'
import type { HeroNote } from './types'
import { L } from './i18n'

/**
 * ค่าความสามารถ/ของล่าสุดที่ "เครื่องนี้" เคยบันทึก (ต่ออัศวิน) — เก็บใน localStorage ของเบราว์เซอร์
 * ค่าความสามารถแต่ละคนไม่เท่ากัน เลยจำแยกตามเครื่อง ไม่ได้ดึงของคนอื่นในกิลด์
 */
const KEY = '7k-note:my-heroes'
type Saved = { note: Omit<HeroNote, 'hero'>; at: number }

function load(): Record<string, Saved> {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}

/** จำนวนตัวที่จำไว้ / ล้างทั้งหมด (หน้าตั้งค่า) */
export const savedCount = () => Object.keys(load()).length
export function clearSaved() {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}

/** จำอุปกรณ์/ค่าความสามารถของตัวที่มีข้อมูล (เรียกตอนบันทึกทีม/แผนสำเร็จ) */
export function rememberNotes(notes: HeroNote[] | undefined) {
  const useful = (notes ?? []).filter((n) => hasStats(n.stats) || n.sets.length || n.rings.length)
  if (!useful.length) return
  const all = load()
  const now = Date.now()
  for (const { hero, ...note } of useful) all[hero] = { note, at: now }
  try { localStorage.setItem(KEY, JSON.stringify(all)) } catch { /* เต็ม/โหมดส่วนตัว — ข้ามไป */ }
}

/** อุปกรณ์/ค่าความสามารถล่าสุดของตัวนี้บนเครื่องนี้ (ไม่มี = null) */
export function recallNote(hero: string): Saved | null {
  return load()[hero] ?? null
}

/** ข้อมูลในแถวนี้ตรงกับที่จำไว้แล้ว (ไม่ต้องขึ้นปุ่ม) */
export const sameAsSaved = (n: HeroNote, s: Saved) =>
  JSON.stringify([n.stats ?? {}, n.sets, n.rings]) === JSON.stringify([s.note.stats ?? {}, s.note.sets, s.note.rings])

export function agoText(ts: number) {
  const m = Math.floor((Date.now() - ts) / 60_000)
  if (m < 60) return L(`${Math.max(1, m)} นาทีก่อน`, `${Math.max(1, m)} min ago`)
  if (m < 1440) return L(`${Math.floor(m / 60)} ชม.ก่อน`, `${Math.floor(m / 60)}h ago`)
  return L(`${Math.floor(m / 1440)} วันก่อน`, `${Math.floor(m / 1440)}d ago`)
}
