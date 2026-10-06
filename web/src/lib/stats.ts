/**
 * สเตตัสฮีโร่ (อ่านจากภาพหน้าจอเกม หรือพิมพ์เอง)
 * อ่านได้ทั้งภาพเกมภาษาอังกฤษ (en) และภาษาไทย (thRe)
 */
export type StatKey =
  | 'atk' | 'def' | 'hp' | 'spd' | 'critRate' | 'critDmg' | 'weak' | 'block'
  | 'hit' | 'resist' | 'dtr' | 'amp' | 'crush' | 'resil' | 'rejuv'
export type HeroStats = Partial<Record<StatKey, number>> & { magic?: boolean; level?: string }

// th = ชื่อแบบในเกมภาษาไทย (โจมตีคงไว้ เพราะในเกมแยกกายภาพ/เวท)
// thRe = จับจากภาพเกมภาษาไทย — ใช้ท่อนที่ OCR อ่านถูกบ่อย (สระ/วรรณยุกต์มักเพี้ยน เช่น ยืดหยุ่น→ยิดหยุ่น)
export const STATS: { key: StatKey; th: string; en: RegExp; thRe: RegExp; pct?: boolean }[] = [
  { key: 'atk', th: 'โจมตี', en: /(?:magic\s*)?attack(?!\s*\))/, thRe: /โจมตี\s*(?:กาย\S*|เวท\S*)/ },
  { key: 'def', th: 'พลังป้องกัน', en: /defen[cs]e/, thRe: /ป้องกัน/ },
  { key: 'hp', th: 'HP', en: /\bhp\b/, thRe: /\bHP\b/ },
  { key: 'spd', th: 'ความเร็วโจมตี', en: /speed/, thRe: /ความเร็ว\S*/ },
  { key: 'critRate', th: 'อัตราคริติคอล', en: /crit(?:ical)?\s*rate/, thRe: /ตรา\s*คริ\S*/, pct: true },
  { key: 'critDmg', th: 'ความเสียหายคริติคอล', en: /crit(?:ical)?\s*damage/, thRe: /หาย\s*คริ\S*/, pct: true },
  { key: 'weak', th: 'อัตราโจมตีจุดอ่อน', en: /weakness\s*hit\s*chance/, thRe: /จุดอ่อน/, pct: true },
  { key: 'block', th: 'อัตราบล็อก', en: /block\s*rate/, thRe: /บล็อก|ล็อก/, pct: true },
  { key: 'hit', th: 'ผลเข้าเป้า', en: /effect\s*hit\s*rate/, thRe: /เข้าเป้า/, pct: true },
  { key: 'resist', th: 'ต้านทานผล', en: /effect\s*resist(?:ance)?/, thRe: /[ทก]านผล/, pct: true },
  { key: 'dtr', th: 'ลดความเสียหายที่ได้รับ', en: /damage\s*taken\s*reduction/, thRe: /ได้รับ/, pct: true },
  { key: 'amp', th: 'เสริมความเสียหาย', en: /damage\s*amplification/, thRe: /เสริม\S*/, pct: true },
  { key: 'crush', th: 'บดขยี้', en: /crush/, thRe: /ยี้/, pct: true },
  { key: 'resil', th: 'ยืดหยุ่น', en: /resilience/, thRe: /หยุ่น/, pct: true },
  { key: 'rejuv', th: 'ฟื้นคืน', en: /rejuvenat\w*/, thRe: /คืน/, pct: true },
]

/** O→0, l/I/|→1 เฉพาะในก้อนตัวเลข */
const toNum = (raw: string) => {
  const n = Number(raw.replace(/[Oo]/g, '0').replace(/[lI|]/g, '1').replace(/[,\s]/g, ''))
  return Number.isFinite(n) ? n : undefined
}

/** แยกค่าสเตตัสจากข้อความ OCR (ไม่ขึ้นกับขนาดภาพ — จับจากชื่อสเตตัสแล้วเอาเลขที่ตามมา) */
export function parseStats(text: string): HeroStats {
  const t = text.replace(/[‘’`´]/g, "'").replace(/[ \t]+/g, ' ') // OCR ไทยต้องเปิด preserve spaces → ยุบช่องว่างยาวให้เหลือ 1
  const out: HeroStats = {}
  for (const s of STATS) {
    // เลขติดกันไม่มีช่องว่าง (มีจุลภาคหลักพันได้) — กันไอคอนคอลัมน์ขวาที่ OCR อ่านเป็นเลขมาต่อท้าย
    const num = '([\\dO]{1,3}(?:,[\\dO]{3})+|[\\dOlI]+(?:\\.\\d+)?)\\s*(%?)'
    const m = t.match(new RegExp(`(?:${s.en.source})[^\\d\\n%]{0,6}${num}`, 'i'))
      ?? t.match(new RegExp(`(?:${s.thRe.source})[^\\d\\n%]{0,8}${num}`))
    if (!m) continue
    const v = toNum(m[1])
    if (v === undefined) continue
    out[s.key] = v
    if (s.key === 'atk') out.magic = /magic\s*attack|เวท/i.test(m[0])
  }
  const lv = t.match(/lv\.?\s*(\d{1,3}(?:\s*\+\s*\d{1,2})?)/i)
  if (lv) out.level = lv[1].replace(/\s+/g, '')
  return out
}

export const hasStats = (s?: HeroStats) => !!s && STATS.some((x) => s[x.key] !== undefined)

export const fmtStat = (key: StatKey, v: number) => {
  const d = STATS.find((s) => s.key === key)
  return d?.pct ? `${v}%` : v.toLocaleString('en-US')
}
