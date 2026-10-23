import { heroKey } from './allocation'
import type { HeroNote } from './types'

/**
 * อุปกรณ์/ค่าความสามารถรายตัว เฉพาะอัศวินที่ยังอยู่ในทีม
 * (ตัวที่เอาออกจากทีมแล้วไม่โชว์และไม่บันทึก · เทียบตามชื่อหลัก ร่าง awake = ตัวเดียวกัน)
 */
export function teamNotes(notes: HeroNote[] | undefined, slots: (string | null)[]): HeroNote[] {
  if (!notes?.length) return []
  const keys = new Set(slots.filter((h): h is string => !!h).map(heroKey))
  return notes.filter((n) => keys.has(heroKey(n.hero)))
}

/**
 * แก้แถวที่โชว์อยู่ (shown = ตัวในทีม) เสร็จ → รวมกลับกับของตัวที่ถูกเอาออกจากทีมระหว่างแก้
 * ของพวกนั้นยังจำไว้ (ใส่กลับเข้าทีมก่อนกดบันทึก = ข้อมูลเดิมกลับมา) · ตัวที่มีแถวใหม่แล้วไม่เก็บของเก่าซ้ำ
 */
export function keepHiddenNotes(all: HeroNote[], shown: HeroNote[], next: HeroNote[]): HeroNote[] {
  const seen = new Set(shown)
  const nextKeys = new Set(next.map((n) => heroKey(n.hero)))
  return [...next, ...all.filter((n) => !seen.has(n) && !nextKeys.has(heroKey(n.hero)))]
}
