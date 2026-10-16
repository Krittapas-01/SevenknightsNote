import { L } from './i18n'

/**
 * เช็กความคุ้มค่าแพ็ค — แปลงของในแพ็คเป็น "รูบี้เทียบเท่า" แล้วหารด้วยราคา (บาท)
 * - กล่องกุญแจ 1 กล่อง (60 กุญแจ) = ราคากล่องในร้านที่คนทั่วไปซื้อ (80–100 รูบี้) → ใช้ 100
 * - ตั๋วสุ่ม 1 ใบ = 100 รูบี้
 * - ตั๋วเรด / ของอื่น / โทปาซ: แสดงไว้ แต่ไม่นับ
 * เทียบเป็น % กับแพ็คฐาน (Monthly Key Bundle)
 */
/** เปิด/ปิดหน้าเช็กความคุ้มค่าแพ็ค (ปิด = ซ่อนหน้า เมนู การ์ดหน้าแรก และบันทึกอัปเดต · หน้าแอดมินยังเตรียมข้อมูลได้) */
export const PACKS_ON = false

export const CHEST_RUBY = 100
export const TICKET_RUBY = 100
export const KEYS_PER_CHEST = 60

export type PackItems = { rubies?: number; chests?: number; summon?: number; raid?: number; other?: string }
export type PackPeriod = 'once' | 'daily' | 'weekly' | 'monthly'
export type Pack = {
  id: string; name: string; group: string; price: number; gems: number
  items: PackItems; limit: number; period: PackPeriod; endsAt: number | null; base: boolean; sort: number; updatedAt: number
}

/** มูลค่ารวม (รูบี้เทียบเท่า) */
export function packValue(p: Pick<Pack, 'items'>) {
  const it = p.items
  return (it.rubies ?? 0) + (it.chests ?? 0) * CHEST_RUBY + (it.summon ?? 0) * TICKET_RUBY
}
export const perBaht = (p: Pack) => packValue(p) / p.price

export type Tier = { key: 'great' | 'good' | 'ok' | 'bad'; label: string; cls: string; bar: string }
export function tierOf(pct: number): Tier {
  if (pct >= 120) return { key: 'great', label: L('คุ้มมาก', 'Great value'), cls: 'bg-emerald-500/15 text-emerald-300', bar: 'bg-emerald-400' }
  if (pct >= 90) return { key: 'good', label: L('คุ้ม', 'Good value'), cls: 'bg-sky-500/15 text-sky-200', bar: 'bg-sky-400' }
  if (pct >= 70) return { key: 'ok', label: L('พอใช้', 'Fair'), cls: 'bg-amber-500/15 text-amber-200', bar: 'bg-amber-400' }
  return { key: 'bad', label: L('ไม่คุ้ม', 'Poor value'), cls: 'bg-red-500/15 text-red-300', bar: 'bg-red-400' }
}

export const periodLabel = (p: PackPeriod, n: number) =>
  p === 'daily' ? L(`วันละ ${n} ครั้ง`, `${n}× per day`)
    : p === 'weekly' ? L(`สัปดาห์ละ ${n} ครั้ง`, `${n}× per week`)
      : p === 'monthly' ? L(`เดือนละ ${n} ครั้ง`, `${n}× per month`)
        : L(`ซื้อได้ ${n} ครั้ง`, `Limit ${n}`)

// ---------- แพ็คที่ซื้อแล้ว (จำในเครื่อง) — รายวัน/สัปดาห์/เดือน นับใหม่ตามรอบรีเซ็ตของเกม (07:00 ไทย = 00:00 UTC) ----------
const KEY = '7k-note:packs-bought'
type Bought = Record<string, { n: number; at: string }>
/** คีย์รอบของแพ็ค: เปลี่ยนรอบ = ยอดที่ซื้อกลับเป็น 0 */
export function periodKey(period: PackPeriod, now = Date.now()) {
  const d = new Date(now)
  if (period === 'daily') return d.toISOString().slice(0, 10)
  if (period === 'monthly') return d.toISOString().slice(0, 7)
  if (period === 'weekly') { const mon = new Date(now - ((d.getUTCDay() + 6) % 7) * 86_400_000); return 'w' + mon.toISOString().slice(0, 10) }
  return 'once'
}
const load = (): Bought => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} } }
export function boughtCount(p: Pack) {
  const b = load()[p.id]
  return b && b.at === periodKey(p.period) ? Math.min(b.n, p.limit) : 0
}
export function setBought(p: Pack, n: number) {
  const all = load()
  if (n <= 0) delete all[p.id]
  else all[p.id] = { n: Math.min(n, p.limit), at: periodKey(p.period) }
  try { localStorage.setItem(KEY, JSON.stringify(all)) } catch { /* ไม่มี storage */ }
}

/**
 * แนะนำตามงบ: เลือกชุดแพ็ค (ไม่เกินจำนวนที่ยังซื้อได้) ให้ได้รูบี้เทียบเท่ารวมมากที่สุดในงบ
 * = bounded knapsack ราคาเป็นบาท (ปัดเป็นบาทเต็ม) · งบสูงสุด 100,000 บาท
 */
export function recommend(packs: { pack: Pack; left: number }[], budget: number) {
  const B = Math.min(100_000, Math.max(0, Math.floor(budget)))
  const units: Pack[] = []
  for (const { pack, left } of packs) for (let i = 0; i < left; i++) units.push(pack)
  if (!B || !units.length) return { picks: [] as { pack: Pack; n: number }[], spent: 0, value: 0 }
  const best = new Float64Array(B + 1)
  const take: Uint8Array[] = units.map(() => new Uint8Array(B + 1))
  units.forEach((p, i) => {
    const w = Math.ceil(p.price), v = packValue(p)
    for (let b = B; b >= w; b--) {
      if (best[b - w] + v > best[b]) { best[b] = best[b - w] + v; take[i][b] = 1 }
    }
  })
  // ย้อนหาว่าเลือกอะไร
  let b = B
  const counts = new Map<string, { pack: Pack; n: number }>()
  for (let i = units.length - 1; i >= 0; i--) {
    if (take[i][b]) {
      const p = units[i]
      const c = counts.get(p.id) ?? { pack: p, n: 0 }
      c.n++; counts.set(p.id, c)
      b -= Math.ceil(p.price)
    }
  }
  const picks = [...counts.values()].sort((x, y) => perBaht(y.pack) - perBaht(x.pack))
  return { picks, spent: picks.reduce((s, x) => s + x.pack.price * x.n, 0), value: best[B] }
}
