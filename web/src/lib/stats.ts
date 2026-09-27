/**
 * สเตตัสฮีโร่ (อ่านจากภาพหน้าจอเกม หรือพิมพ์เอง)
 * ชื่อ en = ข้อความในเกมภาษาอังกฤษ (ใช้จับค่าจากผล OCR)
 */
export type StatKey =
  | 'atk' | 'def' | 'hp' | 'spd' | 'critRate' | 'critDmg' | 'weak' | 'block'
  | 'hit' | 'resist' | 'dtr' | 'amp' | 'crush' | 'resil' | 'rejuv'
export type HeroStats = Partial<Record<StatKey, number>> & { magic?: boolean; level?: string }

export const STATS: { key: StatKey; th: string; en: RegExp; pct?: boolean }[] = [
  { key: 'atk', th: 'โจมตี', en: /(?:magic\s*)?attack(?!\s*\))/ },
  { key: 'def', th: 'ป้องกัน', en: /defen[cs]e/ },
  { key: 'hp', th: 'HP', en: /\bhp\b/ },
  { key: 'spd', th: 'ความเร็ว', en: /speed/ },
  { key: 'critRate', th: 'อัตราคริ', en: /crit(?:ical)?\s*rate/, pct: true },
  { key: 'critDmg', th: 'เสียหายคริ', en: /crit(?:ical)?\s*damage/, pct: true },
  { key: 'weak', th: 'จุดอ่อน', en: /weakness\s*hit\s*chance/, pct: true },
  { key: 'block', th: 'บล็อก', en: /block\s*rate/, pct: true },
  { key: 'hit', th: 'เข้าเป้า', en: /effect\s*hit\s*rate/, pct: true },
  { key: 'resist', th: 'ต้าน', en: /effect\s*resist(?:ance)?/, pct: true },
  { key: 'dtr', th: 'ลดดาเมจที่รับ', en: /damage\s*taken\s*reduction/, pct: true },
  { key: 'amp', th: 'เพิ่มดาเมจ', en: /damage\s*amplification/, pct: true },
  { key: 'crush', th: 'บดขยี้', en: /crush/, pct: true },
  { key: 'resil', th: 'ทนทาน', en: /resilience/, pct: true },
  { key: 'rejuv', th: 'ฟื้นฟู', en: /rejuvenat\w*/, pct: true },
]

/** O→0, l/I/|→1 เฉพาะในก้อนตัวเลข */
const toNum = (raw: string) => {
  const n = Number(raw.replace(/[Oo]/g, '0').replace(/[lI|]/g, '1').replace(/[,\s]/g, ''))
  return Number.isFinite(n) ? n : undefined
}

/** แยกค่าสเตตัสจากข้อความ OCR (ไม่ขึ้นกับขนาดภาพ — จับจากชื่อสเตตัสแล้วเอาเลขที่ตามมา) */
export function parseStats(text: string): HeroStats {
  const t = text.replace(/[‘’`´]/g, "'")
  const out: HeroStats = {}
  for (const s of STATS) {
    // เลขติดกันไม่มีช่องว่าง (มีจุลภาคหลักพันได้) — กันไอคอนคอลัมน์ขวาที่ OCR อ่านเป็นเลขมาต่อท้าย
    const re = new RegExp(`${s.en.source}[^\\d\\n%]{0,6}([\\dO]{1,3}(?:,[\\dO]{3})+|[\\dOlI]+(?:\\.\\d+)?)\\s*(%?)`, 'i')
    const m = t.match(re)
    if (!m) continue
    const v = toNum(m[1])
    if (v === undefined) continue
    out[s.key] = v
    if (s.key === 'atk') out.magic = /magic\s*attack/i.test(m[0])
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
