import { noteFor } from '../components/HeroDetailModal'
import type { HeroNote, Team } from './types'

/**
 * ความเร็วทีมจากค่าความสามารถรายตัว: บวก "ความเร็วโจมตี" ของอัศวินทุกตัวในทีม (ไม่นับสัตว์เลี้ยง)
 * full = ทุกตัวมีความเร็ว → ใช้ค่านี้แทนช่องความเร็วที่พิมพ์เอง
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
