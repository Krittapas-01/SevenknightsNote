import { getUnit } from './heroes'
import catalog from './skills.json'

type SkillArt = { file: string; name: string }
const skills: Record<string, (SkillArt | null)[]> = catalog
const images = import.meta.glob('../assets/skills/*.webp', { eager: true, query: '?url&no-inline', import: 'default' }) as Record<string, string>

/** Resolve legacy IDs first; never substitute a different hero or form. */
export function getSkillArt(id: string, skill: 1 | 2 | 3) {
  const unit = getUnit(id)
  // คิวจองสกิล: 1 = สกิลบน, 2 = สกิลล่าง (ตามตำแหน่งในเกม) · ในไฟล์รูปเรียงกลับกัน (…03 = บน, …02 = ล่าง)
  // สกิลอเวค (คิวที่ 3) อยู่ช่องที่ 3 ของไฟล์
  const art = unit && skills[unit.name]?.[skill === 3 ? 2 : skill === 1 ? 1 : 0]
  if (!art) return null
  const src = images[`../assets/skills/${art.file}`]
  return src ? { src, name: art.name } : null
}

/** สกิลที่จองได้ของฮีโร่: ตัวร่าง awake มี 3 สกิล (อเวคอยู่บนสุดแบบในเกม) */
export function skillKeysOf(id: string): (1 | 2 | 3)[] {
  const unit = getUnit(id)
  const art = unit && skills[unit.name]
  if (!art) return [1, 2] // ไม่มีข้อมูล (เช่นชื่อที่พิมพ์เอง) → ให้จองได้ทั้งบน/ล่าง
  // ตัวที่มีสกิลเดียว (เช่น บาลิสต้า) ไม่แสดงช่องสกิลที่ไม่มี
  return ([3, 1, 2] as const).filter((k) => art[k === 3 ? 2 : k === 1 ? 1 : 0])
}
