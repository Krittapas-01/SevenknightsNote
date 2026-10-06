/**
 * กติกาของเกมที่ "ทุกกิลด์เหมือนกัน" — แก้ที่ไฟล์นี้ที่เดียว แล้ว deploy (ทั้ง API และเว็บใช้ไฟล์นี้)
 * - ตารางวอร์ 7 วัน · Season · เวลาเริ่มวัน · ช่วง (เฟส) ของวันตี/วันจัดบ้าน · ข้อความประกาศเริ่มต้น
 * - ห้ามใช้ของเฉพาะเบราว์เซอร์/Worker ในไฟล์นี้ (ต้องรันได้ทั้งสองฝั่ง)
 */

export type DayType = 'attack' | 'defense' | 'rest'

/** จันทร์..อาทิตย์ */
export const DAY_NAMES = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์', 'อาทิตย์']
export const DAY_NAMES_SHORT = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']

/** ตารางวอร์ จันทร์..อาทิตย์: ตี จ/พ/ส · จัดบ้านกัน อ/ศ/อา · พักพฤหัส */
export const GAME_SCHEDULE: DayType[] = ['attack', 'defense', 'attack', 'rest', 'defense', 'attack', 'defense']

/**
 * Season ที่รู้วันแน่นอน (วันในเกม YYYY-MM-DD) · Season ถัดไปนับต่อเอง: เริ่มหลังจบ 1 สัปดาห์ ยาวเท่าเดิม (season.ts)
 * ถ้าเกมเปลี่ยนรอบ Season แก้ตรงนี้แล้ว deploy
 */
export const GAME_SEASON = { start: '2026-08-06', end: '2026-09-17' }

/** วันในเกมเริ่ม 07:00 เวลาไทย (= 00:00 UTC) */
export const RESET_HOUR = 7

export const DAY_LABEL: Record<DayType, string> = { attack: 'วันตี', defense: 'วันจัดบ้านกัน', rest: 'วันพัก' }

/**
 * วันตี/วันจัดบ้านแบ่ง 2 ช่วง: RESET_HOUR → switchHour = ช่วงแรก, switchHour → RESET_HOUR วันถัดไป = ช่วงสอง
 * วันตี: 07:00–24:00 ช่วงตี → 00:00–07:00 คำนวณผลวอร์
 * วันจัดบ้าน: 07:00–18:00 สมาชิกแก้ทีม → 18:00–07:00 ช่วงจัดบ้าน
 */
export const DAY_PHASES: Partial<Record<DayType, { switchHour: number; first: string; second: string; /** ต่อท้ายประกาศ 07:00 */ secondNote?: string }>> = {
  attack: { switchHour: 24, first: 'ช่วงตี', second: 'คำนวณผลวอร์' },
  defense: { switchHour: 18, first: 'ช่วงแก้ทีม', second: 'ช่วงจัดบ้าน', secondNote: 'เริ่มจัดบ้าน' },
}

/** 7 → "07:00", 24 → "00:00" */
export const hhmm = (h: number) => `${String(h % 24).padStart(2, '0')}:00`

/** ใส่ในข้อความประกาศที่ตั้งเอง → แทนด้วยชื่อวัน */
export const DAY_PLACEHOLDER = '{วัน}'
/** ข้อความประกาศอัตโนมัติที่กิลด์ตั้งเอง ยาวสุด (ตัวอักษร) */
export const MAX_AUTO_TEXT = 300

/**
 * ข้อความประกาศ 07:00 เริ่มต้น (มี {วัน}) — สร้างจากเวลาเฟส แก้เวลาที่ DAY_PHASES แล้วข้อความเปลี่ยนตาม
 * เช่น "วันนี้ ({วัน}) วันจัดบ้านกัน · ช่วงแก้ทีม 07:00–18:00 (18:00 เริ่มจัดบ้าน)"
 */
export function defaultAutoText(type: 'attack' | 'defense') {
  const p = DAY_PHASES[type]!
  const note = p.secondNote ? ` (${hhmm(p.switchHour)} ${p.secondNote})` : ''
  return `วันนี้ (${DAY_PLACEHOLDER}) ${DAY_LABEL[type]} · ${p.first} ${hhmm(RESET_HOUR)}–${hhmm(p.switchHour)}${note}`
}
export const fillDay = (text: string, day: string) => text.split(DAY_PLACEHOLDER).join(day)

// ---------- สงครามเบ็ดเสร็จ (Total War) ----------
/** จำนวนรอบต่อซีซัน */
export const TOTAL_WAR_ROUNDS = 22

/**
 * แรงค์: ถึงคะแนน min แล้วเลื่อนขั้น และตกกลับแรงค์เก่าไม่ได้ · teams = จำนวนทีมที่ใช้ในแรงค์นั้น (ทีมละ 5 ตัว)
 * เทพเจ้า: ยังไม่ได้ยืนยันจำนวนทีม — ใช้ 5 เท่าตำนานไปก่อน
 */
export const TOTAL_WAR_RANKS = [
  { key: 'normal', name: 'ทั่วไป', min: 0, teams: 2 },
  { key: 'high', name: 'ระดับสูง', min: 1500, teams: 3 },
  { key: 'rare', name: 'หายาก', min: 3500, teams: 4 },
  { key: 'legend', name: 'ตำนาน', min: 6000, teams: 5 },
  { key: 'god', name: 'เทพเจ้า', min: 8000, teams: 5 },
] as const
export type TotalWarRank = (typeof TOTAL_WAR_RANKS)[number]

/** แรงค์จากคะแนนปัจจุบัน (index ใน TOTAL_WAR_RANKS) */
export function totalWarRankIndex(score: number) {
  let i = 0
  while (i + 1 < TOTAL_WAR_RANKS.length && score >= TOTAL_WAR_RANKS[i + 1].min) i++
  return i
}

/**
 * คะแนนหลังจบ 1 รอบ: ได้/เสีย = ((อัตราชนะ% − 50) / 5) × จำนวนทีม × 40
 * - ได้จนถึงเกณฑ์แรงค์ถัดไป → หยุดที่เกณฑ์พอดี แล้วเลื่อนขั้น (3480 + 720 → 3500)
 * - เสียแต่ไม่ต่ำกว่าเกณฑ์ของแรงค์ตัวเอง (6120 − 240 → 6000)
 */
export function totalWarResult(score: number, winRate: number) {
  const rankIndex = totalWarRankIndex(score)
  const rank = TOTAL_WAR_RANKS[rankIndex]
  const raw = Math.round(((winRate - 50) / 5) * rank.teams * 40)
  const nextRank = TOTAL_WAR_RANKS[rankIndex + 1]
  let next = score + raw
  let promoted: TotalWarRank | null = null
  if (raw > 0 && nextRank && next >= nextRank.min) {
    next = nextRank.min
    promoted = nextRank
  }
  if (raw < 0) next = Math.max(rank.min, next)
  return { rank, rankIndex, raw, change: next - score, next, promoted, capped: next - score !== raw }
}
