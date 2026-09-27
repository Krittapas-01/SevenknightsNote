import { getUnit } from './heroes'
import catalog from './skills.json'

type SkillArt = { file: string; name: string }
const skills: Record<string, (SkillArt | null)[]> = catalog
const images = import.meta.glob('../assets/skills/*.webp', { eager: true, query: '?url&no-inline', import: 'default' }) as Record<string, string>

/** Resolve legacy IDs first; never substitute a different hero or form. */
export function getSkillArt(id: string, skill: 1 | 2) {
  const unit = getUnit(id)
  const art = unit && skills[unit.name]?.[skill - 1]
  if (!art) return null
  const src = images[`../assets/skills/${art.file}`]
  return src ? { src, name: art.name } : null
}
