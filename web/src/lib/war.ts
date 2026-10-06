import { DAY_LABEL, DAY_NAMES, DAY_NAMES_SHORT, DAY_PHASES, RESET_HOUR, hhmm } from '../../../shared/game'
import type { Announcement, DayType, GuildData } from './types'

// ชื่อวัน / เวลาเริ่มวัน / เฟส มาจาก shared/game.ts (กติกาเกม ที่เดียวกับ API)
export { RESET_HOUR }
/** จันทร์..อาทิตย์ */
export const DAYS = DAY_NAMES
export const DAYS_SHORT = DAY_NAMES_SHORT

export const DAY_TYPE: Record<DayType, { label: string; short: string; cls: string }> = {
  attack: { label: DAY_LABEL.attack, short: 'ตี', cls: 'bg-red-500/25 text-red-100 border-red-400/50' },
  defense: { label: DAY_LABEL.defense, short: 'จัดบ้าน', cls: 'bg-sky-400/20 text-sky-100 border-sky-300/50' },
  rest: { label: DAY_LABEL.rest, short: 'พัก', cls: 'bg-white/5 text-white/50 border-white/15' },
}

const TZ = 'Asia/Bangkok'
const HOUR = 3_600_000
const gameTs = (ts: number) => ts - RESET_HOUR * HOUR

/** index วันในเกม (0 = จันทร์) */
export function dayIndex(ts = Date.now()) {
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(gameTs(ts))
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(wd)
}
/** วันในเกมแบบ YYYY-MM-DD (ใช้เทียบว่าเป็นวันเดียวกันไหม) */
export const dateKey = (ts = Date.now()) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(gameTs(ts))

/** เหลืออีกกี่นาทีจะถึง 07:00 รอบถัดไป */
export function minutesToReset(ts = Date.now()) {
  // เวลาไทย = UTC+7 ตลอด (ไม่มี daylight saving)
  const bkk = new Date(ts + 7 * HOUR)
  const mins = bkk.getUTCHours() * 60 + bkk.getUTCMinutes()
  const reset = RESET_HOUR * 60
  return (reset - mins + 24 * 60) % (24 * 60) || 24 * 60
}
const fmtLeft = (m: number) => {
  const h = Math.floor(m / 60)
  return h > 0 ? `${h} ชม. ${m % 60} นาที` : `${m} นาที`
}
export function resetLabel(ts = Date.now()) {
  return fmtLeft(minutesToReset(ts))
}

/** ช่วงย่อยของวันตอนนี้ (เวลาไทย) — เวลา/ชื่อเฟสอยู่ที่ DAY_PHASES ใน shared/game.ts */
export function dayPhase(type: DayType, ts = Date.now()) {
  const p = DAY_PHASES[type]
  if (!p) return null
  const bkk = new Date(ts + 7 * HOUR)
  const mins = bkk.getUTCHours() * 60 + bkk.getUTCMinutes()
  const first = mins >= RESET_HOUR * 60 && mins < p.switchHour * 60
  return first
    ? { step: 1 as const, label: p.first, until: hhmm(p.switchHour), left: fmtLeft(p.switchHour * 60 - mins) }
    : { step: 2 as const, label: p.second, until: hhmm(RESET_HOUR), left: resetLabel(ts) }
}
/** คำอธิบายช่วงของวันนั้น (ไว้ใส่ tooltip) */
export const phaseHelp = (type: DayType) => {
  const p = DAY_PHASES[type]
  return p ? `${hhmm(RESET_HOUR)}–${hhmm(p.switchHour)} ${p.first} · ${hhmm(p.switchHour)}–${hhmm(RESET_HOUR)} ${p.second}` : ''
}

export const fmtTime = (ts: number) =>
  new Date(ts).toLocaleString('th-TH', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** แผนที่ใช้อยู่ = ประกาศล่าสุดที่เลือกแผนไว้ */
export function activePlanId(data: Pick<GuildData, 'announcements' | 'plans'>) {
  const a = data.announcements.find((x) => x.planId && data.plans.some((p) => p.id === x.planId))
  return a?.planId ?? null
}

/** ประกาศนี้อยู่ในวันเกมเดียวกับตอนนี้ไหม */
export const isToday = (a: Announcement, now = Date.now()) => dateKey(a.createdAt) === dateKey(now)
