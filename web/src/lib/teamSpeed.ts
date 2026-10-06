import { noteFor } from '../components/HeroDetailModal'
import type { HeroNote, Team } from './types'

/**
 * สปีดทีมจากสเตตัสรายตัว: บวก "ความเร็วโจมตี" ของฮีโร่ทุกตัวในทีม (ไม่นับสัตว์เลี้ยง)
 * full = ทุกตัวมีสปีด → ใช้ค่านี้แทนช่องสปีดที่พิมพ์เอง
 */
export function autoSpeed(team: Team, notes: HeroNote[] | undefined) {
  const heroes = team.slots.filter((h): h is string => !!h)
  let total = 0
  let have = 0
  for (const h of heroes) {
    const spd = notes ? noteFor(h, notes)?.stats?.spd : undefined
    if (typeof spd === 'number') { total += spd; have++ }
  }
  return { total, have, need: heroes.length, full: heroes.length > 0 && have === heroes.length }
}
