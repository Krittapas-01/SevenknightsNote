import { tx } from './i18n'

// รูปแบบ Lv.40 (จากในเกม): แถวหลังได้ All Attack % · แถวหน้าได้แค่ Defense % (ไม่มีผลกับโจมตี)
export const FORMATION_ATK: { front: number; name: string; atk: number }[] = [
  { front: 2, name: tx('พื้นฐาน'), atk: 14 },
  { front: 3, name: tx('สมดุล'), atk: 21 },
  { front: 1, name: tx('บุก'), atk: 10.5 },
  { front: 4, name: tx('ป้องกัน'), atk: 42 },
]
// คอลัมน์ (ซ้าย→ขวา) ที่เป็นแถวหน้า ตามรูปแบบ (เหมือนในเกม/AtlasTeam)
export const FRONT_COLS: Record<number, number[]> = { 1: [2], 2: [1, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4] }
