import type { Announcement, DayType, GuildData } from './types'

/** จันทร์..อาทิตย์ */
export const DAYS = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์', 'อาทิตย์']
export const DAYS_SHORT = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']

export const DAY_TYPE: Record<DayType, { label: string; short: string; cls: string }> = {
  attack: { label: 'วันตี', short: 'ตี', cls: 'bg-red-500/25 text-red-100 border-red-400/50' },
  defense: { label: 'วันจัดบ้านกัน', short: 'จัดบ้าน', cls: 'bg-sky-400/20 text-sky-100 border-sky-300/50' },
  rest: { label: 'วันพัก', short: 'พัก', cls: 'bg-white/5 text-white/50 border-white/15' },
}

const TZ = 'Asia/Bangkok'
/** วันในเกมเปลี่ยนตอน 07:00 เวลาไทย (ก่อน 7 โมงยังนับเป็นวันก่อนหน้า) */
export const RESET_HOUR = 7
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

/**
 * ช่วงย่อยของวัน (เวลาไทย) — วันในเกมเริ่ม 07:00 แล้วแบ่ง 2 ช่วง:
 * วันตี: 07:00–24:00 ช่วงตี → 00:00–07:00 คำนวณผลวอร์
 * วันจัดบ้าน: 07:00–18:00 สมาชิกแก้ทีม → 18:00–07:00 ช่วงจัดบ้าน
 */
const PHASES: Partial<Record<DayType, { switchHour: number; first: string; second: string }>> = {
  attack: { switchHour: 24, first: 'ช่วงตี', second: 'คำนวณผลวอร์' },
  defense: { switchHour: 18, first: 'ช่วงแก้ทีม', second: 'ช่วงจัดบ้าน' },
}
export function dayPhase(type: DayType, ts = Date.now()) {
  const p = PHASES[type]
  if (!p) return null
  const bkk = new Date(ts + 7 * HOUR)
  const mins = bkk.getUTCHours() * 60 + bkk.getUTCMinutes()
  const first = mins >= RESET_HOUR * 60 && mins < p.switchHour * 60
  return first
    ? { step: 1 as const, label: p.first, until: `${String(p.switchHour % 24).padStart(2, '0')}:00`, left: fmtLeft(p.switchHour * 60 - mins) }
    : { step: 2 as const, label: p.second, until: `0${RESET_HOUR}:00`, left: resetLabel(ts) }
}
/** คำอธิบายช่วงของวันนั้น (ไว้ใส่ tooltip) */
export const phaseHelp = (type: DayType) => {
  const p = PHASES[type]
  return p ? `07:00–${String(p.switchHour % 24).padStart(2, '0')}:00 ${p.first} · ${String(p.switchHour % 24).padStart(2, '0')}:00–07:00 ${p.second}` : ''
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
