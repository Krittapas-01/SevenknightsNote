import { HEROES, baseName, englishOf, getUnit } from '../data/heroes'
import { matchHeroName, vowels, type HeroCandidate } from './heroMatch'

/** ตัดสระบน/ล่าง/วรรณยุกต์ไทย + ช่องว่าง — OCR มักอ่านพวกนี้เพี้ยน (ซอรัน → ซอร์น) */
const thaiSkeleton = (x: string) => x.replace(/[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\s]/g, '').replace(/ช/g, 'ซ') // ช/ซ OCR สลับกันบ่อย

/** ชื่อในเกมที่ต่างจากชื่อในเว็บ (ชื่อเต็ม/สะกดต่าง) — ใช้หาอัศวินจากภาพเท่านั้น */
const OCR_ALIASES: Record<string, string[]> = {
  'กิยู': ['โทมิโอกะ'],
  'ชิโนบุ': ['โคโจ', 'โคโจว'],
  'ทันจิโร่': ['คามาโดะ'],
  'เซนอิทสึ': ['อางาซึมะ', 'เซนอิทซึ', 'เซนอิท'],
}

/** ชื่อที่ใช้จับคู่ของอัศวิน 1 ตัว: ชื่อไทย + ชื่อเต็ม/สะกดในเกม + ชื่ออังกฤษ */
export const candidate = (id: string): HeroCandidate => {
  const base = baseName(getUnit(id)?.name ?? id)
  const en = englishOf(id)
  return { id, names: [base, ...(OCR_ALIASES[base] ?? []), ...(en ? [en] : [])] }
}
export const ALL_CANDIDATES = HEROES.map((h) => candidate(h.id))

/** ส่วนหัวของภาพ (ก่อนแถวโจมตี) — ชื่ออัศวินอยู่ตรงนี้ ส่วนล่างของภาพมีชื่ออัศวินตัวอื่นในคลังปนอยู่ */
export const header = (text: string) => {
  const i = text.search(/[กภ]ายภ|เวท|[พผ]ลังโจ|attack/i)
  return i > 0 ? text.slice(0, i) : text
}

/**
 * หาชื่ออัศวินในข้อความ (เทียบชื่ออังกฤษ/ไทย เลือกชื่อที่ยาวที่สุดที่เจอ)
 * loose = เทียบชื่อไทยแบบตัดสระ/วรรณยุกต์ (ใช้กับอัศวินในทีม) · ไม่ loose = ต้องตรงเป๊ะ (กันเตือนผิดตัว)
 */
export function detectHero(texts: string[], team: string[], loose = true) {
  const text = texts.map(header).join('\n')
  const t = text.toLowerCase()
  const flat = text.replace(/\s+/g, '')
  const skel = thaiSkeleton(text)
  let best: { id: string; len: number } | null = null
  const hit = (id: string, len: number) => { if (!best || len > best.len) best = { id, len } }
  for (const id of team) {
    const en = englishOf(id)?.toLowerCase()
    if (en && new RegExp(`\\b${en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(t)) hit(id, en.length)
    // ชื่อไทย (ภาพเกมภาษาไทย) — ชื่อสั้นเกินไปข้าม กันไปตรงกับคำอื่นในภาพ
    const base = baseName(getUnit(id)?.name ?? '')
    for (const name of [base, ...(OCR_ALIASES[base] ?? [])]) {
      const th = name.replace(/\s+/g, '')
      if (th.length >= 3 && flat.includes(th)) hit(id, th.length)
      else if (loose) {
        const k = thaiSkeleton(th)
        if (k.length >= 3 && skel.includes(k)) hit(id, k.length)
      }
    }
  }
  return (best as { id: string } | null)?.id ?? null
}

/**
 * ภาพนี้เป็นอัศวินตัวไหน (name = บรรทัดชื่อที่ครอปมาอ่าน · text = ข้อความทั้งภาพ · team = อัศวินในทีม)
 * found = ตัวในทีม (ใส่ให้ได้เลย) · other = ไม่ใช่ตัวในทีม แต่รู้ว่าเป็นใคร (เตือน/ถามเพิ่มเข้าทีม) · ทั้งคู่ null = ไม่รู้
 */
export function pickHero(name: string, text: string, team: string[]): { found: string | null; other: string | null } {
  // 1) บรรทัดชื่อ → เทียบกับชื่ออัศวินทุกตัวแบบยอมเพี้ยน (ในทีมได้ก่อนถ้าใกล้เท่ากัน)
  // บรรทัดชื่ออ่านพลาด (ครอปไม่โดนชื่อ เช่นภาพแคปจากหน้าจัดทีม) → ลองหาชื่อในบรรทัดก่อนแถวค่าความสามารถของภาพทั้งภาพ
  // รับเฉพาะที่ตรงเป๊ะเมื่อตัดสระ/วรรณยุกต์ (อารส = อาริส) กันจับคำอื่นผิดเป็นชื่ออัศวิน
  const head = header(text)
  const tc = team.map(candidate)
  const exact = (m: ReturnType<typeof matchHeroName>) => (m && m.dist === 0 ? m : null)
  const inTeam = (name ? matchHeroName(name, tc) : null) ?? exact(matchHeroName(head, tc))
  const anyHero = (name ? matchHeroName(name, ALL_CANDIDATES) : null) ?? exact(matchHeroName(head, ALL_CANDIDATES))
  // ชื่อสั้นมาก (ลุค/ซีค) OCR อ่านพยัญชนะผิด 1 ตัวก็ไปตรงกับอีกตัว → ตัวในทีมได้แต้มต่อ 1 ตัว แต่เฉพาะเมื่อ
  // - ตัวที่ตรงที่สุดเป็นชื่อสั้น (≤3 พยัญชนะ) และไม่ได้ตรงเป๊ะทั้งสระ (ตรงเป๊ะ = เชื่อชื่อนั้น)
  // - ตัวในทีมใกล้แบบมีสระไม่แพ้ตัวนั้น (กัน "ชีค" ไปเป็น ลุค ในทีม)
  // ผิดแบบเงียบ (ใส่ค่าผิดตัว) แย่กว่าขึ้นเตือนให้ผู้ใช้กดยืนยันเอง → เงื่อนไขนี้ตั้งใจให้แคบ
  const loose = !inTeam && name ? matchHeroName(name, tc, 1) : null
  const strictWins = !!inTeam && (!anyHero || anyHero.id === inTeam.id || inTeam.dist < anyHero.dist || (inTeam.dist === anyHero.dist && (inTeam.raw < anyHero.raw || (inTeam.raw === anyHero.raw && inTeam.len >= anyHero.len))))
  // (เท่ากันหมด → ชื่อยาวกว่าชนะ: "Xiao Qiao" ต้องเป็น เสี่ยวเฉียว ไม่ใช่ เสี่ยว ที่อยู่ในทีม)
  const looseWins = !!loose && (anyHero
    ? loose.dist === anyHero.dist + 1 && anyHero.len <= 3 && anyHero.raw > 0 && loose.raw <= anyHero.raw
      // และสระที่อ่านได้ต้องตรงกับตัวในทีมเป๊ะ แต่ไม่ตรงกับตัวนั้น (ซุค: สระ ุ ตรงกับ ลุค ไม่ตรงกับ ซีค) · อ่านไม่ได้สระเลย = ไม่เดา
      && vowels(loose.span) !== '' && vowels(loose.span) === vowels(loose.name) && vowels(anyHero.span) !== vowels(anyHero.name)
    : loose.raw <= 1) // ไม่ตรงกับใครเลย: รับตัวในทีมที่ต่างแค่ 1 ตัวอักษร (นับสระด้วย)
  const byName = strictWins ? inTeam!.id : looseWins ? loose!.id : null
  // 2) สำรอง: หาชื่อตัวในทีมจากข้อความทั้งภาพ — เฉพาะเมื่อบรรทัดชื่อไม่ได้บอกชัดว่าเป็นตัวอื่น
  // (กัน เอมิเลีย → มิเลีย, ยูจินโฮ → จิน เพราะชื่อหนึ่งเป็นท่อนหนึ่งของอีกชื่อ)
  const found = byName ?? (anyHero && !team.includes(anyHero.id) ? null : detectHero([name, text], team))
  if (found) return { found, other: null }
  // ภาพเป็นอัศวินตัวอื่นที่ไม่ได้อยู่ในคอมพ์ → เตือน (ข้อความทั้งภาพต้องตรงเป๊ะ กันเตือนผิดตัว)
  return { found: null, other: anyHero?.id ?? detectHero([text], HEROES.map((h) => h.id), false) }
}
