import { EN } from './i18n'
/**
 * ค่าความสามารถอัศวิน (อ่านจากภาพหน้าจอเกม หรือพิมพ์เอง)
 * อ่านได้ทั้งภาพเกมภาษาอังกฤษ (en) และภาษาไทย (thRe)
 */
export type StatKey =
  | 'atk' | 'def' | 'hp' | 'spd' | 'critRate' | 'critDmg' | 'weak' | 'block'
  | 'hit' | 'resist' | 'dtr' | 'amp' | 'crush' | 'resil' | 'rejuv'
export type HeroStats = Partial<Record<StatKey, number>> & { magic?: boolean; level?: string }

// th = ชื่อแบบในเกมภาษาไทย (โจมตีคงไว้ เพราะในเกมแยกกายภาพ/เวท)
// thRe = จับจากภาพเกมภาษาไทย — ใช้ท่อนที่ OCR อ่านถูกบ่อย (สระ/วรรณยุกต์มักเพี้ยน เช่น ยืดหยุ่น→ยิดหยุ่น, คริติคอล→ครีติคอล)
export const STATS: { key: StatKey; th: string; en: RegExp; thRe: RegExp; pct?: boolean }[] = [
  { key: 'atk', th: 'โจมตี', en: /(?:magic\s*)?attack(?!\s*\))/, thRe: /\S*(?:[กภ]ายภ|เวท)\S*|[พผ]ลังโจ\S*/ },
  { key: 'def', th: 'พลังป้องกัน', en: /defen[cs]e/, thRe: /ป้อง\S*|อง[กภ]ัน/ },
  { key: 'hp', th: 'HP', en: /\bhp\b/, thRe: /\bHP\b/ },
  { key: 'spd', th: 'ความเร็วโจมตี', en: /speed/, thRe: /(?:ความเร็ว|เร็วโจ)\S*/ },
  { key: 'critRate', th: 'อัตราคริติคอล', en: /crit(?:ical)?\s*rate/, thRe: /ตรา\s*คร\S*/, pct: true },
  { key: 'critDmg', th: 'ความเสียหายคริติคอล', en: /crit(?:ical)?\s*damage/, thRe: /หาย\s*คร\S*/, pct: true },
  { key: 'weak', th: 'อัตราโจมตีจุดอ่อน', en: /weakness\s*hit\s*chance/, thRe: /ดอ่อน/, pct: true },
  { key: 'block', th: 'อัตราบล็อก', en: /block\s*rate/, thRe: /บล็อก|ล็อก/, pct: true },
  { key: 'hit', th: 'ผลเข้าเป้า', en: /effect\s*hit\s*rate/, thRe: /เป้า/, pct: true },
  { key: 'resist', th: 'ต้านทานผล', en: /effect\s*resist(?:ance)?/, thRe: /านผล/, pct: true },
  { key: 'dtr', th: 'ลดความเสียหายที่ได้รับ', en: /damage\s*taken\s*reduction/, thRe: /ด้รับ/, pct: true },
  { key: 'amp', th: 'เสริมความเสียหาย', en: /damage\s*amplification/, thRe: /เสร[ิี]\S*/, pct: true },
  { key: 'crush', th: 'บดขยี้', en: /crush/, thRe: /ยี้|ยยี/, pct: true },
  { key: 'resil', th: 'ยืดหยุ่น', en: /resilience/, thRe: /ยุ่น/, pct: true },
  { key: 'rejuv', th: 'ฟื้นคืน', en: /rejuvenat\w*/, thRe: /คืน/, pct: true },
]

/** แถวเดียวกันในหน้าเกม: คอลัมน์ซ้าย ↔ คอลัมน์ขวา */
const ROW_PAIRS: [StatKey, StatKey][] = [
  ['atk', 'hit'], ['def', 'resist'], ['hp', 'dtr'], ['spd', 'amp'], ['critRate', 'crush'], ['critDmg', 'resil'], ['weak', 'rejuv'],
]

/** O→0, l/I/|→1 เฉพาะในก้อนตัวเลข · % ที่ใช้จุลภาคเป็นทศนิยม (12,5%) → 12.5 */
const toNum = (raw: string, pct = false) => {
  let t = raw.replace(/[Oo]/g, '0').replace(/[lI|]/g, '1')
  t = pct && /^\d+,\d{1,2}$/.test(t) ? t.replace(',', '.') : t.replace(/[,\s]/g, '')
  const n = Number(t)
  return Number.isFinite(n) ? n : undefined
}

/** แยกค่าความสามารถจากข้อความ OCR (ไม่ขึ้นกับขนาดภาพ — จับจากชื่อค่าความสามารถแล้วเอาเลขที่ตามมา) */
export function parseStats(text: string): HeroStats {
  const t = text.replace(/[‘’`´]/g, "'").replace(/[ \t]+/g, ' ') // OCR ไทยต้องเปิด preserve spaces → ยุบช่องว่างยาวให้เหลือ 1
  const out: HeroStats = {}
  const rest: Partial<Record<StatKey, string>> = {} // ข้อความที่เหลือในบรรทัดหลังค่าคอลัมน์ซ้าย
  for (const s of STATS) {
    // เลขติดกันไม่มีช่องว่าง (มีจุลภาคหลักพันได้) — กันไอคอนคอลัมน์ขวาที่ OCR อ่านเป็นเลขมาต่อท้าย
    // l/I = เลข 1 ที่ OCR อ่านผิด (Attack l,389 = 1,389) → ช่องคั่นระหว่างชื่อกับเลขเป็นแบบสั้นสุดก่อน (?) ไม่กินตัว l/I ไป
    // ต้องมีเลขจริงอย่างน้อย 1 ตัว (กัน I/l เดี่ยว ๆ) · ค่า % รับจุลภาคทศนิยมแบบยุโรป (12,5%) ก่อนแบบอื่น
    const D = '[\\dOlI]'
    const dec = s.pct ? `${D}*\\d${D}*,\\d{1,2}(?=\\s*%)|` : ''
    // ไม่มีเลขจริงเลยแต่ตามด้วย % (lOO% = 100%) ก็รับ
    const num = `(${dec}${D}{1,3}(?:,${D}{3})+|${D}*\\d${D}*(?:\\.\\d+)?|${D}{2,}(?=\\s*%))\\s*(%?)`
    const m = t.match(new RegExp(`(?:${s.en.source})[^\\d\\n%]{0,6}?${num}`, 'i'))
      ?? t.match(new RegExp(`(?:${s.thRe.source})[^\\d\\n%]{0,16}?${num}`))
    if (!m) continue
    // ค่าความสามารถที่ไม่ใช่ % เป็นจำนวนเต็มเสมอ — OCR ชอบอ่านจุลภาคหลักพันเป็นจุด (9,318 → 9.318)
    const v = toNum(s.pct ? m[1] : m[1].replace(/\./g, ''), s.pct)
    if (v === undefined) continue
    out[s.key] = v
    const end = (m.index ?? 0) + m[0].length
    const eol = t.indexOf('\n', end)
    rest[s.key] = t.slice(end, eol < 0 ? undefined : eol)
    if (s.key === 'atk') out.magic = /magic\s*attack|เวท/i.test(m[0])
  }
  // ชื่อคอลัมน์ขวาอ่านเพี้ยนจนจับไม่ได้ → ใช้ % ท้ายบรรทัดเดียวกับคู่ของมันในคอลัมน์ซ้าย (หน้าเกมเรียงแถวตายตัว)
  for (const [left, right] of ROW_PAIRS) {
    if (out[right] !== undefined || rest[left] === undefined) continue
    const pcts = [...rest[left]!.matchAll(/(\d+(?:\.\d+)?)\s*%/g)]
    if (pcts.length) out[right] = Number(pcts[pcts.length - 1][1])
  }
  const lv = t.match(/lv\.?\s*(\d{1,3}(?:\s*\+\s*\d{1,2})?)/i)
  if (lv) out.level = lv[1].replace(/\s+/g, '')
  return out
}

const STAT_EN: Record<StatKey, string> = {
  atk: 'Attack', def: 'Defense', hp: 'HP', spd: 'Speed', critRate: 'Crit Rate', critDmg: 'Crit Damage', weak: 'Weakness Hit Chance',
  block: 'Block Rate', hit: 'Effect Hit Rate', resist: 'Effect Resistance', dtr: 'Damage Taken Reduction', amp: 'Damage Amplification',
  crush: 'Crush', resil: 'Resilience', rejuv: 'Rejuvenate',
}
/** ชื่อค่าความสามารถที่โชว์ (โจมตีของสายเวท = พลังโจมตีเวท) */
export const statLabel = (key: StatKey, magic?: boolean) =>
  key === 'atk' && magic ? (EN ? 'Magic Attack' : 'พลังโจมตีเวท') : EN ? STAT_EN[key] : STATS.find((x) => x.key === key)!.th
export const hasStats = (s?: HeroStats) => !!s && STATS.some((x) => s[x.key] !== undefined)

export const fmtStat = (key: StatKey, v: number) => {
  const d = STATS.find((s) => s.key === key)
  return d?.pct ? `${v}%` : v.toLocaleString('en-US')
}
