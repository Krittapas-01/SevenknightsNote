/**
 * Season ของ Guild War — ใช้ร่วมกันทั้ง API และเว็บ (shared/)
 * - วันที่เป็น "วันในเกม" แบบ YYYY-MM-DD (วันเปลี่ยนตอน 07:00 เวลาไทย)
 * - จบ Season แล้วพัก 1 สัปดาห์ Season ถัดไปเริ่มหลังวันจบ 7 วัน และยาวเท่าเดิม
 *   → ถ้าหัวกิลด์ไม่ได้อัปเดตวันที่ ระบบนับ Season ถัดไปให้เอง
 */
const DAY = 86_400_000
export const OFF_WEEK_DAYS = 7

const toDay = (key: string) => Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10)) / DAY
const toKey = (day: number) => new Date(day * DAY).toISOString().slice(0, 10)
export const isDateKey = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(toDay(v))

export type SeasonPhase = 'before' | 'in' | 'off'
export type Season = {
  start: string
  end: string
  phase: SeasonPhase
  /** นับต่อเอง (ไม่ใช่วันที่หัวกิลด์ใส่) */
  projected: boolean
  /** วันที่เหลือจนจบ (นับวันนี้ด้วย) ตอนอยู่ใน Season */
  daysLeft: number
  /** วันเริ่ม Season ถัดไป */
  nextStart: string
}

export function currentSeason(start: string, end: string, todayKey: string): Season | null {
  if (!isDateKey(start) || !isDateKey(end) || !isDateKey(todayKey)) return null
  let s = toDay(start)
  let e = toDay(end)
  if (e < s) return null
  const cycle = e - s + 1 + OFF_WEEK_DAYS - 1 // จบวันพฤหัส → Season ถัดไปเริ่มพฤหัสหน้า (end + 7)
  const today = toDay(todayKey)
  let projected = false
  while (today >= e + OFF_WEEK_DAYS) {
    s += cycle
    e += cycle
    projected = true
  }
  const phase: SeasonPhase = today < s ? 'before' : today <= e ? 'in' : 'off'
  return { start: toKey(s), end: toKey(e), phase, projected, daysLeft: phase === 'in' ? e - today + 1 : 0, nextStart: toKey(phase === 'before' ? s : e + OFF_WEEK_DAYS) }
}

/**
 * รอบวอร์แบบในเกม "รอบซีซัน X / Y": Y = จำนวนวันตีใน Season, X = วันตีที่ผ่านมา (นับวันนี้ถ้าวันนี้ตี)
 * วันที่ไม่ใช่วันตี → นับเป็นรอบถัดไป (กำลังเตรียม/ตั้งบ้านกันของรอบนั้น) — ตรงกับเกม
 * schedule: 7 ช่อง จันทร์..อาทิตย์
 */
export function warRound(s: Season, schedule: string[], todayKey: string): { round: number; total: number } | null {
  if (s.phase !== 'in') return null
  const isAttack = (day: number) => schedule[(new Date(day * DAY).getUTCDay() + 6) % 7] === 'attack'
  const start = toDay(s.start)
  const end = toDay(s.end)
  const today = toDay(todayKey)
  let total = 0
  let done = 0
  for (let d = start; d <= end; d++) {
    if (!isAttack(d)) continue
    total++
    if (d <= today) done++
  }
  if (!total) return null
  return { round: Math.min(total, isAttack(today) ? done : done + 1), total }
}
