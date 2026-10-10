/**
 * จับคู่ชื่ออัศวินที่ OCR อ่านได้ (มักเพี้ยน) กับรายชื่ออัศวิน — ไม่ต้องจดคำเพี้ยนทีละตัว
 * 1) ตัดสระบน/ล่าง/วรรณยุกต์ + ช่องว่าง (OCR อ่านพวกนี้ผิดบ่อยสุด)
 * 2) รวมพยัญชนะหน้าตาคล้ายกันเป็นตัวเดียว (ก/ภ, ซ/ช, ด/ต/ถ, น/บ, อ/จ, ร/ธ …)
 * 3) เทียบทีละคำ/กลุ่มคำ แบบ edit distance — ยอมผิดได้ ~1 ตัวต่อ 3 ตัวอักษร เลือกตัวที่ใกล้ที่สุด
 */
const MARKS = /[ัิ-ฺ็-๎\s|"'`“”‘’.,:;!?()[\]{}<>\-_=+*#@%&/\\~^]/g
const SAME: [RegExp, string][] = [
  [/[ภฦ]/g, 'ก'], [/ช/g, 'ซ'], [/[ตถ]/g, 'ด'], [/[บษ]/g, 'น'], [/จ/g, 'อ'], [/ธ/g, 'ร'], [/ำ/g, 'า'],
  [/[ฌฆ]/g, 'ม'], [/ฏ/g, 'ฎ'], [/ศ/g, 'ส'], [/ฬ/g, 'พ'], [/ญ/g, 'ณ'],
]
export function skeleton(x: string) {
  let s = x.toLowerCase().replace(MARKS, '')
  for (const [re, to] of SAME) s = s.replace(re, to)
  return s
}

function lev(a: string, b: string) {
  const d = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0]
    d[0] = i
    for (let j = 1; j <= b.length; j++) {
      const t = d[j]
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = t
    }
  }
  return d[b.length]
}

/** กลุ่มคำติดกัน 1-3 คำ (ชื่อบางตัวมี 2 คำ เช่น คามาโดะ ทันจิโร่) — เทียบทั้งกลุ่ม ไม่ใช่ท่อนกลางคำ
 * (ท่อนกลางคำทำให้ชื่อสั้นอย่าง "จิน" ไปตรงกับ "ฮายอน" ที่อ่านเพี้ยนเป็น "ฮายจน") */
function spans(text: string) {
  const words = text.split(/\s+/).filter((w) => w.replace(NOISE, ''))
  const out: string[] = []
  for (let i = 0; i < words.length; i++)
    for (let n = 1; n <= 3 && i + n <= words.length; n++) out.push(words.slice(i, i + n).join(''))
  return out
}

export type HeroCandidate = { id: string; names: string[] }
export type HeroMatch = { id: string; dist: number; raw: number; len: number }

const NOISE = /[\s|"'`“”‘’.,:;!?()[\]{}<>\-_=+*#@%&/\\~^]/g

/** ยอมผิดได้กี่ตัว: ชื่อสั้น (≤3 ตัวหลังตัดสระ) ต้องตรงเป๊ะ กันไปตรงกับชื่อสั้นตัวอื่น */
const allowed = (len: number) => Math.floor((len - 1) / 3)

/** อัศวินที่ชื่อใกล้ข้อความที่สุด (null = ไม่มีตัวไหนใกล้พอ) */
export function matchHeroName(text: string, cands: HeroCandidate[]): HeroMatch | null {
  const parts = spans(text).map((x) => ({ k: skeleton(x), raw: x.toLowerCase().replace(NOISE, '') }))
  let best: HeroMatch | null = null
  for (const c of cands)
    for (const n of c.names) {
      const k = skeleton(n)
      const nRaw = n.toLowerCase().replace(NOISE, '')
      if (!k) continue
      for (const p of parts) {
        // ชื่อ 1 พยัญชนะ (เช่น ลี) ต้องตรงทั้งคำ
        if (k.length < 2 && p.raw !== nRaw) continue
        const dist = lev(p.k, k)
        if (dist > allowed(k.length)) continue
        // ตัวตัดสินรอง: เทียบแบบมีสระ (ริน vs รีน่า ตัดสระแล้วใกล้กัน แต่มีสระแล้วต่างกัน)
        const raw = lev(p.raw, nRaw)
        if (!best || dist < best.dist || (dist === best.dist && (raw < best.raw || (raw === best.raw && k.length > best.len))))
          best = { id: c.id, dist, raw, len: k.length }
      }
    }
  return best
}
