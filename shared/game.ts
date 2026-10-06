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
