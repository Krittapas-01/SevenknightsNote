/**
 * คำนวณรูบี้ขายวิญญาณ — ฟาร์มรูบี้ด้วยการต่อสู้ซ้ำ (Ruby Farming) แล้วดูว่าซื้อกล่องกุญแจถึงขั้นไหนถึงคุ้ม
 * ค่าเริ่มต้นจากที่ Krit เล่นจริง (24 ต.ค. 2026):
 * - 1 รอบใช้ 6 กุญแจ สู้ 21 วิ (เกมบอกเฉลี่ย) + โหลด ~16 วิ = ~37 วิ ได้ ~6,800 ทอง (500 รอบ = 3,000 กุญแจ 3.4M ทอง)
 * - อัศวินดรอป: 500 รอบได้ 2–3★ 140 ตัว (ใช้ฟาร์มต่อได้ = 28 ตัว/100 รอบ) + 1★ 26 ตัว (ไม่นับ)
 * - อัศวิน Lv.1 5 ตัวเต็มเลเวลทุก 11 รอบ (มีแพ็ค Daily Ruby Support = EXP เพิ่ม → 10 รอบ) ได้ตัวละ 20 รูบี้ = 100 รูบี้ (นับเฉพาะชุดครบ)
 * - กุญแจฟื้น 1 ดอก/3 นาที = 480/วัน (แพ็ค Daily Power Up Support: เร็วขึ้น 60 วิ → 2 นาที = 720/วัน + 80 ดอก/วัน) · ไม่มีเพดาน → ที่เหลือเก็บไว้วันถัดไปได้
 * - กุญแจฟรีอื่น ๆ: กล่องฟรีร้านรายวัน 30 · ภารกิจรายวัน 60 (40 แต้ม 20 + 80 แต้ม 40) · เช็กอินกิลด์ 14/40/52/64/80
 * - แพ็ค Daily Ruby Support: EXP เพิ่ม (อัศวินตันใน 10 รอบแทน 11) + 200 รูบี้/วัน (แสดงแยก ไม่รวมกับรูบี้จากฟาร์ม)
 * - เควสต์ทำซ้ำ: ทุก 160 รอบ ได้ 20 กุญแจ + 60,000 ทอง
 * - กล่องกุญแจ 60 ดอก ราคาต่อวัน: กล่องแรกฟรี · 20 กล่องถัดไป 50 · 50 กล่องถัดไป 80 · 50 กล่องถัดไป 100 รูบี้
 */

/**
 * ด่าน Ruby Farming ที่เลือกได้ (ค่าจากหน้าต่าง Repeat Battle ในเกม 500 รอบ, Krit 25 ต.ค. 2026)
 * - ด่านปกติ: 3,000 กุญแจ · ทอง 3.3M · รูบี้ 5,000 · อัศวิน 1–3★ 139 (ทองใช้ที่ Krit วัดจริง 6,800/รอบ · ดรอปที่ใช้ได้จริง 140/500)
 * - ด่านฝันร้าย (ด่านล่าสุด): เล่น 2 ทีม (12 กุญแจ/รอบ) · 10 ช่อง ต้องมีตัวแบกทีมละ 1 → อัศวิน Lv.1 ได้ 8 ตัว (ตัวละ 20 รูบี้ · 500 รอบ = 50 ชุด × 8 × 20 = 8,000) · ทอง 15.6M · อัศวิน 3–4★ 303 · สู้ 6 วิ/รอบ (+ โหลด)
 * goldPerBattle = ทองพื้นฐาน ไม่มีโบนัส (เกมประมาณ 500 รอบ: ปกติ 3.3M = 6,000 × 1.1 Elena · ฝันร้าย 15.6M = 24,000 × 1.3 Mick+Elena · Krit 25 ต.ค.)
 * secPerBattle ในด่าน/ฟอร์ม = เวลาสู้ที่เกมบอก · เว็บบวกโหลด LOAD_SEC ให้เอง (Krit: โหลด 15–17 วิ ไม่ต้องให้คนปรับเอง)
 * เลือกด่าน = ตั้งค่าในฟอร์มตามนี้ + จำนวนอัศวินเต็มทีม (ยังแก้เองต่อได้)
 */
/** เวลาโหลดต่อรอบ (เริ่มรอบใหม่) ที่บวกให้เอง · Krit วัด 15–17 วิ */
export const LOAD_SEC = 16

/** โบนัสทองจาก Ruby Farming (บวกกันตรง ๆ: 24,000 × (1 + 20% + 10%) = 31,200 ตรงกับเกม)
 * - Mick (สัตว์เลี้ยง): +20% · เสริมสกิล 22/24/26% (แก้ได้ในค่าในเกม) · ซ้ำกันไม่ซ้อน
 * - Elena's Blessing (Unlimited): +10% · นับให้ทุกคน (Krit: ทุกคนซื้อ) */
export const GOLD_BONUS = { mick: 20, elena: 10 }
/** สัตว์เลี้ยง Eri: อัศวินดรอปจาก Ruby Farming +10% · เสริมสกิล 11/12/13% (เกมประมาณ 500 รอบด่านปกติ 139 → 151 ตัว) */
export const ERI_DROP = 10

export const STAGES = [
  { id: 'first', th: 'ด่านปกติ', en: 'Normal', keysPerBattle: 6, goldPerBattle: 6000, rubyPerHero: 20, heroDrop: 28, secPerBattle: 21, maxTeam: 5 },
  { id: 'latest', th: 'ด่านฝันร้าย', en: 'Nightmare', keysPerBattle: 12, goldPerBattle: 24000, rubyPerHero: 20, heroDrop: 60, secPerBattle: 6, maxTeam: 8 },
] as const
export type StageId = (typeof STAGES)[number]['id']
export const stageOf = (id: string) => STAGES.find((x) => x.id === id) ?? STAGES[0]
export const stageForm = (id: StageId) => {
  const st = stageOf(id)
  return { stage: st.id as StageId, team: st.maxTeam as number, keysPerBattle: String(st.keysPerBattle), goldPerBattle: String(st.goldPerBattle), rubyPerHero: String(st.rubyPerHero), heroDrop: String(st.heroDrop), secPerBattle: String(st.secPerBattle) }
}

/** แสดงหน้าคำนวณรูบี้ในเมนูและบันทึกอัปเดต (ปิด = ยังเข้าได้ทางลิงก์ /ruby เท่านั้น · Krit: รอสมบูรณ์ก่อน) */
export const RUBY_ON = true

export type BoxTier = { boxes: number; price: number }

export type FarmInput = {
  freeKeys: number
  keysPerBattle: number
  secPerBattle: number
  battlesPerSet: number
  heroesPerSet: number
  rubyPerHero: number
  goldPerBattle: number
  questEvery: number
  questKeys: number
  questGold: number
  keysPerBox: number
  tiers: BoxTier[]
  /** อัศวิน 2–3★ ที่ดรอปต่อรอบ (เฉลี่ย ใช้ฟาร์มต่อได้) */
  heroDrop: number
  /** เล่นได้วันละกี่ชั่วโมง (สูงสุด 24) */
  maxHours: number
}

export const FARM_DEFAULTS: FarmInput = {
  freeKeys: 950, // ≈ กุญแจพื้นฐาน + เช็กอินกิลด์ 80 (หน้า /ruby คิดจริงจาก dailyKeys)
  keysPerBattle: 6,
  secPerBattle: 37,
  battlesPerSet: 10,
  heroesPerSet: 5,
  rubyPerHero: 20,
  goldPerBattle: 6000,
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
  heroDrop: 0.28,
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
  const rubies = heroesUsed * pos(input.rubyPerHero)
  return {
    boxes: n, cost, keys, battles, sets, rubies, net: rubies - cost,
    gold: battles * pos(input.goldPerBattle) + quests * pos(input.questGold),
    quests, seconds: battles * sec, heroesUsed, heroesDropped: battles * pos(input.heroDrop),
    leftKeys, timeCapped: possible >= timeMax && left + 1e-9 >= kpb,
  }
}

/** ฟาร์ม `battles` รอบ: ใช้เวลาเท่าไหร่ ใช้อัศวินกี่ตัว ได้รูบี้เท่าไหร่ และต้องซื้อกล่องกุญแจกี่กล่อง */
export type BattlesResult = {
  battles: number
  sets: number
  seconds: number
  heroes: number
  /** อัศวิน 2–3★ ที่ดรอปคืนระหว่างฟาร์ม (ใช้ฟาร์มต่อได้) */
  dropped: number
  rubies: number
  /** กุญแจที่ต้องใช้ (หักกุญแจคืนจากเควสต์ทำซ้ำแล้ว) */
  keysNeeded: number
  freeKeys: number
  /** กล่องที่ต้องซื้อ (เริ่มจากกล่องฟรี) */
  boxes: number
  cost: number
  net: number
  gold: number
  quests: number
  leftKeys: number
  /** ร้านขายกล่องไม่พอสำหรับวันเดียว */
  overShop: boolean
  /** กล่องใบสุดท้ายที่ซื้อราคาเท่าไหร่ */
  lastPrice: number
}

export function farmBattles(input: FarmInput, battles: number, prices = boxPrices(input.tiers)): BattlesResult {
  const b = Math.max(0, Math.min(100000, Math.floor(pos(battles))))
  const setSize = Math.max(1, Math.floor(pos(input.battlesPerSet, 1)))
  const every = Math.floor(pos(input.questEvery))
  const quests = every > 0 ? Math.floor(b / every) : 0
  const keysNeeded = Math.max(0, b * pos(input.keysPerBattle, 1) - quests * pos(input.questKeys))
  const freeKeys = pos(input.freeKeys)
  const perBox = pos(input.keysPerBox)
  const want = keysNeeded > freeKeys + 1e-9 ? (perBox > 0 ? Math.ceil((keysNeeded - freeKeys - 1e-9) / perBox) : Infinity) : 0
  const boxes = Math.min(want, prices.length)
  let cost = 0
  for (let i = 0; i < boxes; i++) cost += prices[i]
  const sets = Math.floor(b / setSize)
  const heroes = sets * Math.floor(pos(input.heroesPerSet))
  const rubies = heroes * pos(input.rubyPerHero)
  return {
    battles: b, sets, seconds: b * pos(input.secPerBattle, 1), heroes, dropped: Math.round(b * pos(input.heroDrop)), rubies, keysNeeded, freeKeys, boxes, cost, net: rubies - cost,
    gold: b * pos(input.goldPerBattle) + quests * pos(input.questGold), quests,
    leftKeys: freeKeys + boxes * perBox - keysNeeded, overShop: want > prices.length, lastPrice: boxes ? prices[boxes - 1] : 0,
  }
}

/** ฟาร์มกี่รอบได้รูบี้สุทธิมากสุด (เสมอกันเลือกที่เร็วกว่า ใช้อัศวินน้อยกว่า) · ไล่ทีละชุดจนกุญแจที่ร้านขายได้หมด */
export function bestBattles(input: FarmInput, prices = boxPrices(input.tiers), maxBattles = simulateDay(input, prices.length, prices).battles) {
  const setSize = Math.max(1, Math.floor(pos(input.battlesPerSet, 1)))
  let best = 0
  let bestNet = -Infinity
  for (let b = 0; b <= maxBattles; b += setSize) {
    const net = farmBattles(input, b, prices).net
    if (net > bestNet) { bestNet = net; best = b }
  }
  return best
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
    // กล่องฟรีรับไว้เสมอ (ไม่เสียอะไร กุญแจที่เหลือยกไปวันถัดไป)
    if (!(r.price === 0 && addNet >= 0) && !(addNet > 0 && (addHours <= 0 || addNet / addHours >= soulPrice))) break
    best = end
    bestTier = r.tier
    if (days[r.to].timeCapped) break
  }
  return { prices, days, rows, best, bestTier }
}

/* ===== ค่าที่ผู้ใช้กรอกในหน้า /ruby (เก็บในเครื่อง) — หน้าอื่น (เช่น เช็กความคุ้มค่าแพ็ค) อ่านผ่าน loadFarmInput() ได้ ===== */

export const FARM_STORE_KEY = '7k-note:ruby'
/** แพ็ครายเดือน Daily Power Up Support: กุญแจฟื้นเร็วขึ้น 60 วิ (3 → 2 นาที) + 80 ดอก/วัน */
export const POWER_UP = { regenCut: 60, dailyKeys: 80 }
/** กุญแจที่ทุกคนได้เท่ากัน (เฉลี่ยต่อวัน) — ไม่ต้องกรอก แสดงเป็นยอดพื้นฐานบรรทัดเดียว */
export const BASE_KEYS: { id: string; th: string; en: string; keys: number; days: number }[] = [
  { id: 'regen', th: 'ฟื้นเอง 1 ดอกทุก 3 นาที', en: 'Regen 1 key every 3 min', keys: 480, days: 1 },
  { id: 'shopFree', th: 'กล่องฟรีร้านรายวัน', en: 'Daily Shop free box', keys: 30, days: 1 },
  { id: 'missions', th: 'ภารกิจรายวัน (40 แต้ม 20 + 80 แต้ม 40)', en: 'Daily missions (40 pts 20 + 80 pts 40)', keys: 60, days: 1 },
  { id: 'login', th: 'เช็กชื่อรายวัน (กล่องกุญแจ 2 กล่องทุก 5 วัน)', en: 'Daily login (2 key boxes every 5 days)', keys: 120, days: 5 },
  { id: 'pass', th: '7K Pass (เส้นทางฟรี)', en: '7K Pass (free track)', keys: 690, days: 28 },
  { id: 'relay', th: 'อีเวนต์ Relay (ฟรี 30 กุญแจ)', en: 'Relay event (30 free keys)', keys: 30, days: 14 },
  { id: 'guildMission', th: 'รางวัลภารกิจกิลด์', en: 'Guild mission rewards', keys: 180, days: 7 },
  { id: 'honor', th: 'ร้านค้าเกียรติยศ (รายสัปดาห์)', en: 'Honor Shop (weekly)', keys: 420, days: 7 },
  { id: 'arena', th: 'ร้านค้าอารีน่า (รายเดือน)', en: 'Arena Shop (monthly)', keys: 1680, days: 28 },
  { id: 'totalWar', th: 'ร้านค้าสงครามรวม (รายเดือน)', en: 'Total War Shop (monthly)', keys: 600, days: 28 },
  { id: 'guild', th: 'ร้านค้ากิลด์ (รายสัปดาห์)', en: 'Guild Shop (weekly)', keys: 420, days: 7 },
  { id: 'guildWar', th: 'ร้านค้าสงครามกิลด์ (รายเดือน)', en: 'Guild War Shop (monthly)', keys: 600, days: 28 },
]
/** กุญแจสำหรับคนเติม (ติ๊กเอง) */
export const PAID_KEYS = {
  passPremium: { th: '7K Pass พรีเมียม', en: '7K Pass premium', keys: 1200, days: 28 },
  premiumCheckin: { th: 'เช็กอินพรีเมียม', en: 'Premium check-in', keys: 180, days: 7 },
}
/** แพ็ค Daily Ruby Support: EXP เพิ่ม → อัศวินตันใน 10 รอบ (ไม่มีแพ็ค 11 รอบ) + รูบี้ฟรีทุกวัน (ไม่ได้มาจากการฟาร์ม → แสดงแยก) */
export const RUBY_SUPPORT = { dailyRubies: 200, battlesPerSet: 10, battlesPerSetWithout: 11 }
export const BASE_KEYS_PER_DAY = BASE_KEYS.reduce((sum, x) => sum + x.keys / x.days, 0)
/** เช็กอินกิลด์ (ตามจำนวนคนที่เช็กอินเมื่อวาน 1/10/15/20/25 คน) */
export const GUILD_CHECKIN = [0, 14, 40, 52, 64, 80]
type NumKey = Exclude<keyof FarmInput, 'tiers' | 'heroesPerSet' | 'freeKeys' | 'maxHours'>
/** ค่าในฟอร์มเป็นข้อความ (ช่องว่าง = ใช้ค่าเริ่มต้น) · team = อัศวิน Lv.1 ในทีม 1–5 */
export type FarmForm = Record<NumKey, string> & {
  team: number; tiers: { boxes: string; price: string }[]
  // heroDrop ในฟอร์ม = ตัวต่อ 100 รอบ (FarmInput เก็บเป็นต่อรอบ)
  /** รอบต่อชุดเมื่อไม่มีแพ็ค Daily Ruby Support (battlesPerSet = มีแพ็ค) */
  battlesPerSetBase: string
  /** เล่นได้วันละกี่ชั่วโมง (ว่าง = เท่าที่กุญแจฟรีพอ) */
  hours: string
  /** ด่านที่เลือก (ตั้งค่าต่อรอบตาม STAGES) */
  stage: StageId
  /** ส่วนที่แต่ละคนต่างกัน: เช็กอินกิลด์ · กุญแจอื่น ๆ · แพ็ค */
  powerUp: boolean; guildKeys: number; extraKeys: string
  passPremium: boolean; premiumCheckin: boolean; rubySupport: boolean
  /** โบนัสทองจาก Mick (mickPct %) · Elena's Blessing นับให้เสมอ */
  mick: boolean; mickPct: string
  /** สัตว์เลี้ยง Eri: ดรอปอัศวินเพิ่ม eriPct % */
  eri: boolean; eriPct: string
}

const s = (n: number) => String(n)
export const DEFAULT_FARM_FORM: FarmForm = {
  keysPerBattle: s(FARM_DEFAULTS.keysPerBattle), secPerBattle: s(FARM_DEFAULTS.secPerBattle - LOAD_SEC),
  battlesPerSet: s(FARM_DEFAULTS.battlesPerSet), rubyPerHero: s(FARM_DEFAULTS.rubyPerHero), goldPerBattle: s(FARM_DEFAULTS.goldPerBattle),
  questEvery: s(FARM_DEFAULTS.questEvery), questKeys: s(FARM_DEFAULTS.questKeys), questGold: s(FARM_DEFAULTS.questGold),
  keysPerBox: s(FARM_DEFAULTS.keysPerBox), heroDrop: s(Math.round(FARM_DEFAULTS.heroDrop * 100)),
  team: FARM_DEFAULTS.heroesPerSet,
  tiers: FARM_DEFAULTS.tiers.map((t) => ({ boxes: s(t.boxes), price: s(t.price) })),
  hours: '', stage: 'first', battlesPerSetBase: s(RUBY_SUPPORT.battlesPerSetWithout),
  powerUp: false, guildKeys: 80, extraKeys: '', passPremium: false, premiumCheckin: false, rubySupport: false,
  mick: false, mickPct: s(GOLD_BONUS.mick), eri: false, eriPct: s(ERI_DROP),
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
      // ค่าเก่าที่เคยบันทึก (22 = เวลาเก่า · 37/24 = เวลารวมโหลด) → เวลาสู้ที่เกมบอก (เว็บบวกโหลดให้เอง)
      if (['22', '37', '24'].includes(out.secPerBattle)) out.secPerBattle = out.secPerBattle === '24' ? '6' : DEFAULT_FARM_FORM.secPerBattle
      // ทองเก่า (รวมโบนัส) → ทองพื้นฐาน
      if (out.goldPerBattle === '6800') out.goldPerBattle = '6000'
      if (out.goldPerBattle === '31200') out.goldPerBattle = '24000'
      if (out.heroDrop.trim() === '') out.heroDrop = DEFAULT_FARM_FORM.heroDrop
      if (STAGES.some((x) => x.id === v.stage)) out.stage = v.stage
      if (typeof v.team === 'number' && v.team >= 1 && v.team <= stageOf(out.stage).maxTeam) out.team = Math.round(v.team)
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
  // แพ็คทำให้ฟื้นเร็วขึ้น 3 → 2 นาที (+240) + 80 ดอก/วัน
  const powerUpRegen = Math.floor(86400 / 120) - Math.floor(86400 / 180)
  const parts = {
    base: BASE_KEYS_PER_DAY,
    powerUp: f.powerUp ? powerUpRegen + POWER_UP.dailyKeys : 0,
    guild: f.guildKeys,
    passPremium: f.passPremium ? PAID_KEYS.passPremium.keys / PAID_KEYS.passPremium.days : 0,
    premiumCheckin: f.premiumCheckin ? PAID_KEYS.premiumCheckin.keys / PAID_KEYS.premiumCheckin.days : 0,
    extra: Math.max(0, val(f.extraKeys, 0)),
  }
  return { ...parts, powerUpRegen, total: Object.values(parts).reduce((a, b) => a + b, 0) }
}

/** ตัวคูณทอง (โบนัสบวกกัน): Elena เสมอ + Mick ถ้าเปิด */
export const goldMultiplier = (f: FarmForm) => 1 + ((f.mick ? Math.max(0, val(f.mickPct, GOLD_BONUS.mick)) : 0) + GOLD_BONUS.elena) / 100

/** ตัวคูณดรอปอัศวินจาก Eri */
export const dropMultiplier = (f: FarmForm) => 1 + (f.eri ? Math.max(0, val(f.eriPct, ERI_DROP)) : 0) / 100

export function farmInputOf(f: FarmForm): FarmInput {
  const D = FARM_DEFAULTS
  return {
    freeKeys: dailyKeys(f).total, keysPerBattle: val(f.keysPerBattle, D.keysPerBattle), secPerBattle: val(f.secPerBattle, D.secPerBattle - LOAD_SEC) + LOAD_SEC,
    battlesPerSet: f.rubySupport ? val(f.battlesPerSet, RUBY_SUPPORT.battlesPerSet) : val(f.battlesPerSetBase, RUBY_SUPPORT.battlesPerSetWithout), heroesPerSet: f.team, rubyPerHero: val(f.rubyPerHero, 0),
    goldPerBattle: val(f.goldPerBattle, 0) * goldMultiplier(f), questEvery: val(f.questEvery, 0), questKeys: val(f.questKeys, 0), questGold: val(f.questGold, 0),
    keysPerBox: val(f.keysPerBox, 0), heroDrop: (val(f.heroDrop, D.heroDrop * 100) / 100) * dropMultiplier(f), maxHours: D.maxHours,
    tiers: f.tiers.map((t) => ({ boxes: val(t.boxes, 0), price: val(t.price, 0) })),
  }
}

/** ค่าที่ผู้ใช้ตั้งไว้ในหน้า /ruby (ยังไม่เคยเปิด = ค่าเริ่มต้น) */
export const loadFarmInput = () => farmInputOf(loadFarmForm())

/**
 * กุญแจ 1 ดอกฟาร์มได้กี่รูบี้ (เฉลี่ยระยะยาว ไม่ปัดชุด)
 * = รูบี้ต่อรอบ ÷ กุญแจสุทธิต่อรอบ (เควสต์ทำซ้ำคืนกุญแจ) · 5 อัศวิน = 10 ÷ 5.875 ≈ 1.70
 */
export function rubiesPerKey(input: FarmInput = loadFarmInput()) {
  const setSize = Math.max(1, pos(input.battlesPerSet, 1))
  const perBattle = (Math.floor(pos(input.heroesPerSet)) * pos(input.rubyPerHero)) / setSize
  const every = Math.floor(pos(input.questEvery))
  const netKeys = pos(input.keysPerBattle, 1) - (every > 0 ? pos(input.questKeys) / every : 0)
  return netKeys > 0 ? perBattle / netKeys : 0
}

/** กล่องกุญแจ 1 กล่องฟาร์มได้กี่รูบี้ (เช่น 60 ดอก × 1.70 ≈ 102 · ทีม 4 ตัว ≈ 82) */
export const chestRubyValue = (input: FarmInput = loadFarmInput()) => rubiesPerKey(input) * pos(input.keysPerBox)
