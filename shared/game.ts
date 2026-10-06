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
/** แต่ละทีมสู้รอบละ 20 ครั้ง → อัตราชนะรวม = ชนะทั้งหมด ÷ (ทีม × 20) */
export const TOTAL_WAR_FIGHTS_PER_TEAM = 20

/**
 * เวลาเริ่มซีซันปัจจุบัน (เวลาไทย) = วันศุกร์ 07:00 หลังวันอัปเดตแพทช์ (พฤหัส)
 * แพทช์ 1 ต.ค. 2026 → เริ่ม 2 ต.ค. 07:00 · แพทช์ใหม่มาแล้วแก้บรรทัดนี้แล้ว deploy
 */
export const TOTAL_WAR_SEASON_START = '2026-10-02T07:00:00+07:00'
/** 1 รอบ = เตรียมรอบ (จัดทีม) 5 ชม. → ดำเนินการต่อสู้ 6 ชม. → สรุปผลรอบ 1 ชม. (รอบละ 12 ชม. = วันละ 2 รอบ) */
export const TOTAL_WAR_PHASES = [
  { key: 'prep', name: 'เตรียมรอบ (จัดทีม)', hours: 5 },
  { key: 'fight', name: 'ดำเนินการต่อสู้', hours: 6 },
  { key: 'result', name: 'สรุปผลรอบ (รอคิดคะแนน)', hours: 1 },
] as const
const TW_ROUND_HOURS = TOTAL_WAR_PHASES.reduce((n, p) => n + p.hours, 0)

/**
 * ตอนนี้ซีซันอยู่รอบไหน/เฟสไหน · round = รอบที่กำลังเล่น (1..22)
 * resultsLeft = จำนวนรอบที่ยังไม่ได้คิดคะแนน (รวมรอบนี้ ถ้ายังไม่สรุปผล) — ใช้วางแผน
 */
export function totalWarNow(ts = Date.now(), start = TOTAL_WAR_SEASON_START) {
  const t0 = Date.parse(start)
  const H = 3_600_000
  if (ts < t0) return { state: 'before' as const, startsIn: t0 - ts, resultsLeft: TOTAL_WAR_ROUNDS }
  const elapsed = ts - t0
  const roundIdx = Math.floor(elapsed / (TW_ROUND_HOURS * H))
  if (roundIdx >= TOTAL_WAR_ROUNDS) return { state: 'ended' as const, endedAt: t0 + TOTAL_WAR_ROUNDS * TW_ROUND_HOURS * H, resultsLeft: 0 }
  let inRound = elapsed - roundIdx * TW_ROUND_HOURS * H
  let phaseIdx = 0
  while (inRound >= TOTAL_WAR_PHASES[phaseIdx].hours * H) inRound -= TOTAL_WAR_PHASES[phaseIdx++].hours * H
  const phase = TOTAL_WAR_PHASES[phaseIdx]
  const round = roundIdx + 1
  return {
    state: 'running' as const, round, phase, phaseLeft: phase.hours * H - inRound,
    // ช่วงสรุปผล = รอบนี้เล่นจบแล้ว คะแนนกำลังจะเข้า (นับเป็นรอบที่ยังไม่ได้คิดคะแนน)
    resultsLeft: TOTAL_WAR_ROUNDS - round + 1,
    seasonEnd: t0 + TOTAL_WAR_ROUNDS * TW_ROUND_HOURS * H,
  }
}

/**
 * แรงค์: ถึงคะแนน min แล้วเลื่อนขั้น และตกกลับแรงค์เก่าไม่ได้ · teams = จำนวนทีมที่ใช้ในแรงค์นั้น (ทีมละ 5 ตัว)
 * reward = รางวัลระดับตอนจบซีซัน (ตามในเกม)
 */
export const TOTAL_WAR_RANKS = [
  { key: 'normal', name: 'ทั่วไป', min: 0, teams: 2, reward: 'รูบี้ 200' },
  { key: 'high', name: 'ระดับสูง', min: 1500, teams: 3, reward: 'รูบี้ 1,200' },
  { key: 'rare', name: 'หายาก', min: 3500, teams: 4, reward: 'รูบี้ 2,000' },
  { key: 'legend', name: 'ตำนาน', min: 6000, teams: 5, reward: 'รูบี้ 3,000' },
  { key: 'god', name: 'เทพเจ้า', min: 8000, teams: 5, reward: 'กรอบโปรไฟล์' },
] as const
export type TotalWarRank = (typeof TOTAL_WAR_RANKS)[number]

/** แรงค์จากคะแนนปัจจุบัน (index ใน TOTAL_WAR_RANKS) */
export function totalWarRankIndex(score: number) {
  let i = 0
  while (i + 1 < TOTAL_WAR_RANKS.length && score >= TOTAL_WAR_RANKS[i + 1].min) i++
  return i
}

/** จำนวนครั้งที่สู้ทั้งหมดในรอบของแรงค์นี้ (เช่น 4 ทีม = 80) */
export const totalWarFights = (teams: number) => teams * TOTAL_WAR_FIGHTS_PER_TEAM

/**
 * คะแนนหลังจบ 1 รอบ จาก "จำนวนชนะรวม" (ทุกทีม)
 * สูตรเกม ((อัตราชนะ% − 50) ÷ 5) × ทีม × 40 เมื่อแต่ละทีมสู้ 20 ครั้ง = (ชนะ − ครึ่งหนึ่ง) × 40 → ชนะเกินครึ่ง 1 ครั้ง = +40
 * - ได้จนถึงเกณฑ์แรงค์ถัดไป → หยุดที่เกณฑ์พอดี แล้วเลื่อนขั้น (3480 + 720 → 3500)
 * - เสียแต่ไม่ต่ำกว่าเกณฑ์ของแรงค์ตัวเอง (6120 − 240 → 6000)
 */
export function totalWarResult(score: number, wins: number) {
  const rankIndex = totalWarRankIndex(score)
  const rank = TOTAL_WAR_RANKS[rankIndex]
  const fights = totalWarFights(rank.teams)
  const raw = (wins - fights / 2) * 40
  const nextRank = TOTAL_WAR_RANKS[rankIndex + 1]
  let next = score + raw
  let promoted: TotalWarRank | null = null
  if (raw > 0 && nextRank && next >= nextRank.min) {
    next = nextRank.min
    promoted = nextRank
  }
  if (raw < 0) next = Math.max(rank.min, next)
  return { rank, rankIndex, fights, rate: (wins / fights) * 100, raw, change: next - score, next, promoted, capped: next - score !== raw }
}

/**
 * ต้องชนะเฉลี่ยกี่ % ต่อรอบ ถึงจะถึงแรงค์เป้าหมายภายใน rounds รอบ (คิดเลื่อนขั้น/จำนวนทีมที่เพิ่มให้)
 * ตอบเป็น % ต่ำสุด (ทีละ 0.25%) + จำนวนชนะต่อรอบที่แรงค์ปัจจุบัน · null = ชนะ 100% ก็ไม่ทัน
 */
export function totalWarPlan(score: number, targetMin: number, rounds: number) {
  if (score >= targetMin) return { done: true as const }
  const reach = (rate: number) => {
    let s = score
    for (let i = 0; i < rounds && s < targetMin; i++) {
      const t = TOTAL_WAR_RANKS[totalWarRankIndex(s)].teams
      s = totalWarResult(s, Math.ceil((rate / 100) * totalWarFights(t))).next
    }
    return s >= targetMin
  }
  for (let r = 50; r <= 100; r += 0.25) {
    if (!reach(r)) continue
    const teams = TOTAL_WAR_RANKS[totalWarRankIndex(score)].teams
    const fights = totalWarFights(teams)
    return { done: false as const, rate: r, wins: Math.ceil((r / 100) * fights), fights, perRound: Math.ceil((targetMin - score) / Math.max(1, rounds)) }
  }
  return null
}
