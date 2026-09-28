import { getUnit } from './heroes'
import catalog from './skills.json'

type SkillArt = { file: string; name: string }
const skills: Record<string, (SkillArt | null)[]> = catalog
const images = import.meta.glob('../assets/skills/*.webp', { eager: true, query: '?url&no-inline', import: 'default' }) as Record<string, string>

/** Resolve legacy IDs first; never substitute a different hero or form. */
export function getSkillArt(id: string, skill: 1 | 2) {
  const unit = getUnit(id)
  // คิวจองสกิล: 1 = สกิลบน, 2 = สกิลล่าง (ตามตำแหน่งในเกม) · ในไฟล์รูปเรียงกลับกัน (…03 = บน, …02 = ล่าง)
  const art = unit && skills[unit.name]?.[skill === 1 ? 1 : 0]
  if (!art) return null
  const src = images[`../assets/skills/${art.file}`]
  return src ? { src, name: art.name } : null
}
