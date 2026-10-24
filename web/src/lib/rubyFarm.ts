/**
 * คำนวณรูบี้ขายวิญญาณ — ฟาร์มรูบี้ด้วยการต่อสู้ซ้ำ (Ruby Farming) แล้วดูว่าซื้อกล่องกุญแจถึงขั้นไหนถึงคุ้ม
 * ค่าเริ่มต้นจากที่ Krit เล่นจริง (24 ต.ค. 2026):
 * - 1 รอบใช้ 6 กุญแจ ~21 วิ ได้ ~6,800 ทอง
 * - ทุก 10 รอบ ฮีโร่ Lv.1 5 ตัวเต็มเลเวล ได้ตัวละ 20 รูบี้ = 100 รูบี้ (นับเฉพาะชุดครบ 10 รอบ)
 * - กุญแจฟื้น 1 ดอก/2 นาที = 720/วัน (แพ็ค Daily Power Up Support: +80 ดอก/วัน) · ไม่มีเพดาน → ที่เหลือเก็บไว้วันถัดไปได้
 * - กุญแจฟรีอื่น ๆ: กล่องฟรีร้านรายวัน 30 · ภารกิจรายวัน 60 (40 แต้ม 20 + 80 แต้ม 40) · เช็กอินกิลด์ 14/40/52/64/80
 * - แพ็ค Daily Ruby Support: รูบี้จากฟาร์มเพิ่ม x% (+ 200 รูบี้/วัน ไม่นับในหน้านี้)
 * - เควสต์ทำซ้ำ: ทุก 160 รอบ ได้ 20 กุญแจ + 60,000 ทอง
 * - กล่องกุญแจ 60 ดอก ราคาต่อวัน: กล่องแรกฟรี · 20 กล่องถัดไป 50 · 50 กล่องถัดไป 80 · 50 กล่องถัดไป 100 รูบี้
 */

export type BoxTier = { boxes: number; price: number }

export type FarmInput = {
  freeKeys: number
  keysPerBattle: number
  secPerBattle: number
  battlesPerSet: number
  heroesPerSet: number
  rubyPerHero: number
  /** รูบี้จากฟาร์มเพิ่มกี่ % (แพ็ค Daily Ruby Support) */
  rubyBoost: number
  goldPerBattle: number
  questEvery: number
  questKeys: number
  questGold: number
  keysPerBox: number
  tiers: BoxTier[]
  /** ฮีโร่ดรอปต่อรอบ (เฉลี่ย) */
  heroDrop: number
  /** เล่นได้วันละกี่ชั่วโมง (สูงสุด 24) */
  maxHours: number
}

export const FARM_DEFAULTS: FarmInput = {
  freeKeys: 720 + 30 + 60 + 80, // ฟื้นเอง + กล่องฟรีร้าน + ภารกิจรายวัน + เช็กอินกิลด์
  keysPerBattle: 6,
  secPerBattle: 21,
  battlesPerSet: 10,
  heroesPerSet: 5,
  rubyPerHero: 20,
  rubyBoost: 0,
  goldPerBattle: 6800,
  questEvery: 160,
  questKeys: 20,
  questGold: 60000,
  keysPerBox: 60,
  tiers: [
    { boxes: 1, price: 0 },
    { boxes: 20, price: 50 },
    { boxes: 50, price: 80 },
    { boxes: 50, price: 100 },
  ],
  heroDrop: 0,
  maxHours: 24,
}

export type DayResult = {
  boxes: number
  /** รูบี้ที่จ่ายค่ากล่อง */
  cost: number
  keys: number
  battles: number
  sets: number
  rubies: number
  /** รูบี้ที่ได้ − ค่ากล่อง */
  net: number
  gold: number
  quests: number
  seconds: number
  heroesUsed: number
  heroesDropped: number
  /** กุญแจที่เหลือ (เก็บไว้วันถัดไป) */
  leftKeys: number
  /** ติดเวลาที่เล่นได้ (ใช้กุญแจไม่หมด) */
  timeCapped: boolean
}

const pos = (n: number, min = 0) => (Number.isFinite(n) ? Math.max(min, n) : min)

/** ราคาของกล่องแต่ละใบ เรียงตามลำดับที่ซื้อ */
export function boxPrices(tiers: BoxTier[]) {
  const out: number[] = []
  for (const t of tiers) for (let i = 0; i < Math.min(500, Math.floor(pos(t.boxes))); i++) out.push(pos(t.price))
  return out
}

/** เล่น 1 วัน เมื่อซื้อกล่อง `boxes` ใบ */
export function simulateDay(input: FarmInput, boxes: number, prices = boxPrices(input.tiers)): DayResult {
  const kpb = pos(input.keysPerBattle, 1)
  const sec = pos(input.secPerBattle, 1)
  const setSize = Math.max(1, Math.floor(pos(input.battlesPerSet, 1)))
  const every = Math.floor(pos(input.questEvery))
  const qKeys = pos(input.questKeys)
  const n = Math.max(0, Math.min(prices.length, Math.floor(boxes)))
  let cost = 0
  for (let i = 0; i < n; i++) cost += prices[i]
  const keys = pos(input.freeKeys) + n * pos(input.keysPerBox)
  // เล่นได้สูงสุดกี่รอบตามเวลา (ปัดลงให้ครบชุด)
  const timeMax = Math.floor(Math.floor((Math.min(24, pos(input.maxHours)) * 3600) / sec) / setSize) * setSize
  // เล่นทีละรอบจนกุญแจไม่พอ (เควสต์ทำซ้ำคืนกุญแจระหว่างทาง)
  let left = keys
  let possible = 0
  while (left + 1e-9 >= kpb && possible < timeMax) {
    left -= kpb
    possible++
    if (every > 0 && possible % every === 0) left += qKeys
  }
  // นับเฉพาะชุดครบ → เล่นแค่ถึงชุดสุดท้ายที่ครบ ที่เหลือเก็บกุญแจไว้
  const battles = Math.floor(possible / setSize) * setSize
  const quests = every > 0 ? Math.floor(battles / every) : 0
  const leftKeys = keys - battles * kpb + quests * qKeys
  const sets = battles / setSize
  const heroesUsed = sets * Math.floor(pos(input.heroesPerSet))
  const rubies = heroesUsed * pos(input.rubyPerHero) * (1 + pos(input.rubyBoost) / 100)
  return {
    boxes: n, cost, keys, battles, sets, rubies, net: rubies - cost,
    gold: battles * pos(input.goldPerBattle) + quests * pos(input.questGold),
    quests, seconds: battles * sec, heroesUsed, heroesDropped: battles * pos(input.heroDrop),
    leftKeys, timeCapped: possible >= timeMax && left + 1e-9 >= kpb,
  }
}

export type TierRow = {
  /** ลำดับขั้นราคาใน tiers (-1 = ไม่ซื้อเลย) */
  tier: number
  price: number
  /** กล่องที่ซื้อในขั้นนี้ ตั้งแต่ใบที่ from ถึง to (เริ่ม 1) */
  from: number
  to: number
  /** ผลรวมเมื่อซื้อถึงท้ายขั้นนี้ */
  day: DayResult
  /** เพิ่มจากขั้นก่อน */
  addNet: number
  addHours: number
  /** รูบี้สุทธิที่ได้เพิ่มต่อชั่วโมงที่เล่นเพิ่ม */
  perHour: number
  /** ได้คืนต่อกล่อง */
  perBox: number
}

export type FarmPlan = {
  prices: number[]
  days: DayResult[]
  rows: TierRow[]
  /** จำนวนกล่องที่แนะนำ */
  best: number
  /** ขั้นสุดท้ายที่ผ่านเกณฑ์ (-1 = ไม่ซื้อ) */
  bestTier: number
}

/**
 * แนะนำว่าซื้อถึงขั้นไหน: ซื้อขั้นถัดไปต่อเมื่อขั้นนั้นได้รูบี้สุทธิเพิ่ม และได้อย่างน้อย `soulPrice` รูบี้ต่อชั่วโมงที่ต้องเล่นเพิ่ม
 * (ราคาวิญญาณ = เวลา 1 ชั่วโมงของเรามีค่ากี่รูบี้ · 0 = ซื้อจนกำไรสูงสุด)
 */
export function planFarm(input: FarmInput, soulPrice: number): FarmPlan {
  const prices = boxPrices(input.tiers)
  const days = Array.from({ length: prices.length + 1 }, (_, n) => simulateDay(input, n, prices))
  const rows: TierRow[] = [{ tier: -1, price: 0, from: 0, to: 0, day: days[0], addNet: days[0].net, addHours: days[0].seconds / 3600, perHour: days[0].seconds ? days[0].net / (days[0].seconds / 3600) : 0, perBox: 0 }]
  let start = 0
  input.tiers.forEach((t, i) => {
    const count = Math.min(500, Math.floor(pos(t.boxes)))
    if (!count) return
    const end = start + count
    const prev = days[start]
    const day = days[end]
    const addNet = day.net - prev.net
    const addHours = (day.seconds - prev.seconds) / 3600
    rows.push({ tier: i, price: pos(t.price), from: start + 1, to: end, day, addNet, addHours, perHour: addHours > 0 ? addNet / addHours : addNet > 0 ? Infinity : -Infinity, perBox: (day.rubies - prev.rubies) / count })
    start = end
  })
  // ไล่ขั้นจากถูกไปแพง หยุดที่ขั้นแรกที่ไม่ผ่านเกณฑ์
  let best = 0
  let bestTier = -1
  for (const r of rows.slice(1)) {
    // ในขั้นนี้เลือกจำนวนที่กำไรสูงสุด (ติดเวลาเล่นแล้ว ซื้อเพิ่มก็เสียเปล่า)
    let pick = r.from - 1
    for (let n = r.from; n <= r.to; n++) if (days[n].net > days[pick].net) pick = n
    // ไม่ติดเวลา → ตัดสินจากทั้งขั้น (กันเศษกุญแจที่เหลือมาเติมชุดพอดี ทำให้ดูเหมือนซื้อเพิ่มไม่กี่กล่องแล้วคุ้ม)
    const end = days[r.to].timeCapped ? pick : r.to
    const addNet = days[end].net - days[best].net
    const addHours = (days[end].seconds - days[best].seconds) / 3600
    if (!(addNet > 0 && (addHours <= 0 || addNet / addHours >= soulPrice))) break
    best = pick
    bestTier = r.tier
    if (pick < r.to) break
  }
  return { prices, days, rows, best, bestTier }
}

/* ===== ค่าที่ผู้ใช้กรอกในหน้า /ruby (เก็บในเครื่อง) — หน้าอื่น (เช่น เช็กความคุ้มค่าแพ็ค) อ่านผ่าน loadFarmInput() ได้ ===== */

export const FARM_STORE_KEY = '7k-note:ruby'
/** แพ็ครายเดือน Daily Power Up Support: นับแค่กุญแจรายวัน (Krit: ไม่นับที่ฟื้นเร็วขึ้น) */
export const POWER_UP = { dailyKeys: 80 }
/** เช็กอินกิลด์ (ตามจำนวนคนที่เช็กอินเมื่อวาน 1/10/15/20/25 คน) */
export const GUILD_CHECKIN = [0, 14, 40, 52, 64, 80]
type NumKey = Exclude<keyof FarmInput, 'tiers' | 'heroesPerSet' | 'freeKeys' | 'rubyBoost'>
/** ค่าในฟอร์มเป็นข้อความ (ช่องว่าง = ใช้ค่าเริ่มต้น) · team = ฮีโร่ Lv.1 ในทีม 1–5 */
export type FarmForm = Record<NumKey, string> & {
  team: number; tiers: { boxes: string; price: string }[]; soul: string; owned: string
  /** กุญแจฟื้น 1 ดอกทุกกี่วินาที (ก่อนลดจากแพ็ค) */
  regenSec: string; powerUp: boolean; shopKeys: string; missionKeys: string; guildKeys: number; extraKeys: string
  rubySupport: boolean; rubyBoost: string
}

const s = (n: number) => String(n)
export const DEFAULT_FARM_FORM: FarmForm = {
  keysPerBattle: s(FARM_DEFAULTS.keysPerBattle), secPerBattle: s(FARM_DEFAULTS.secPerBattle),
  battlesPerSet: s(FARM_DEFAULTS.battlesPerSet), rubyPerHero: s(FARM_DEFAULTS.rubyPerHero), goldPerBattle: s(FARM_DEFAULTS.goldPerBattle),
  questEvery: s(FARM_DEFAULTS.questEvery), questKeys: s(FARM_DEFAULTS.questKeys), questGold: s(FARM_DEFAULTS.questGold),
  keysPerBox: s(FARM_DEFAULTS.keysPerBox), heroDrop: '', maxHours: s(FARM_DEFAULTS.maxHours),
  team: FARM_DEFAULTS.heroesPerSet,
  tiers: FARM_DEFAULTS.tiers.map((t) => ({ boxes: s(t.boxes), price: s(t.price) })),
  soul: '100', owned: '',
  regenSec: '120', powerUp: false, shopKeys: '30', missionKeys: '60', guildKeys: 80, extraKeys: '',
  rubySupport: false, rubyBoost: '',
}

/** อ่านฟอร์มที่จำไว้ (รวมกับค่าเริ่มต้นทีละช่อง → ข้อมูลเก่าที่ขาดบางช่องไม่ทำให้หน้าพัง) */
export function loadFarmForm(): FarmForm {
  try {
    const v = JSON.parse(localStorage.getItem(FARM_STORE_KEY) ?? '')
    if (v && typeof v === 'object') {
      const out = { ...DEFAULT_FARM_FORM }
      for (const k of Object.keys(DEFAULT_FARM_FORM) as (keyof FarmForm)[]) {
        if (typeof v[k] === 'string' && typeof DEFAULT_FARM_FORM[k] === 'string') (out as Record<string, unknown>)[k] = v[k]
        if (typeof v[k] === 'boolean' && typeof DEFAULT_FARM_FORM[k] === 'boolean') (out as Record<string, unknown>)[k] = v[k]
      }
      if (typeof v.team === 'number' && v.team >= 1 && v.team <= 5) out.team = Math.round(v.team)
      if (GUILD_CHECKIN.includes(v.guildKeys)) out.guildKeys = v.guildKeys
      if (Array.isArray(v.tiers) && v.tiers.length) {
        out.tiers = v.tiers.slice(0, 6).map((t: { boxes?: unknown; price?: unknown } | null) => ({
          boxes: typeof t?.boxes === 'string' ? t.boxes : '', price: typeof t?.price === 'string' ? t.price : '',
        }))
      }
      return out
    }
  } catch { /* ใช้ค่าเริ่มต้น */ }
  return DEFAULT_FARM_FORM
}

/** รับ "6800", "6,800", "1249.71" · ว่าง/อ่านไม่ได้ = NaN */
export const parseNum = (v: string) => {
  const t = v.replace(/[\s,]/g, '')
  return t === '' ? NaN : Number(t)
}
const val = (v: string, d: number) => { const n = parseNum(v); return Number.isFinite(n) ? n : d }

/** กุญแจฟรีต่อวันแยกตามที่มา */
export function dailyKeys(f: FarmForm) {
  const regenSec = Math.max(1, val(f.regenSec, 120))
  const parts = {
    regen: Math.floor(86400 / regenSec),
    powerUp: f.powerUp ? POWER_UP.dailyKeys : 0,
    shop: Math.max(0, val(f.shopKeys, 0)),
    missions: Math.max(0, val(f.missionKeys, 0)),
    guild: f.guildKeys,
    extra: Math.max(0, val(f.extraKeys, 0)),
  }
  return { ...parts, regenSec, total: Object.values(parts).reduce((a, b) => a + b, 0) }
}

export function farmInputOf(f: FarmForm): FarmInput {
  const D = FARM_DEFAULTS
  return {
    freeKeys: dailyKeys(f).total, rubyBoost: f.rubySupport ? Math.max(0, val(f.rubyBoost, 0)) : 0, keysPerBattle: val(f.keysPerBattle, D.keysPerBattle), secPerBattle: val(f.secPerBattle, D.secPerBattle),
    battlesPerSet: val(f.battlesPerSet, D.battlesPerSet), heroesPerSet: f.team, rubyPerHero: val(f.rubyPerHero, 0),
    goldPerBattle: val(f.goldPerBattle, 0), questEvery: val(f.questEvery, 0), questKeys: val(f.questKeys, 0), questGold: val(f.questGold, 0),
    keysPerBox: val(f.keysPerBox, 0), heroDrop: val(f.heroDrop, 0), maxHours: val(f.maxHours, D.maxHours),
    tiers: f.tiers.map((t) => ({ boxes: val(t.boxes, 0), price: val(t.price, 0) })),
  }
}

/** ค่าที่ผู้ใช้ตั้งไว้ในหน้า /ruby (ยังไม่เคยเปิด = ค่าเริ่มต้น) */
export const loadFarmInput = () => farmInputOf(loadFarmForm())

/**
 * กุญแจ 1 ดอกฟาร์มได้กี่รูบี้ (เฉลี่ยระยะยาว ไม่ปัดชุด)
 * = รูบี้ต่อรอบ ÷ กุญแจสุทธิต่อรอบ (เควสต์ทำซ้ำคืนกุญแจ) · 5 ฮีโร่ = 10 ÷ 5.875 ≈ 1.70
 */
export function rubiesPerKey(input: FarmInput = loadFarmInput()) {
  const setSize = Math.max(1, pos(input.battlesPerSet, 1))
  const perBattle = (Math.floor(pos(input.heroesPerSet)) * pos(input.rubyPerHero) * (1 + pos(input.rubyBoost) / 100)) / setSize
  const every = Math.floor(pos(input.questEvery))
  const netKeys = pos(input.keysPerBattle, 1) - (every > 0 ? pos(input.questKeys) / every : 0)
  return netKeys > 0 ? perBattle / netKeys : 0
}

/** กล่องกุญแจ 1 กล่องฟาร์มได้กี่รูบี้ (เช่น 60 ดอก × 1.70 ≈ 102 · ทีม 4 ตัว ≈ 82) */
export const chestRubyValue = (input: FarmInput = loadFarmInput()) => rubiesPerKey(input) * pos(input.keysPerBox)
