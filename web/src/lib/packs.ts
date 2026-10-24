import { PACK_BASE_KEYS, PACK_ITEM_KEYS, PACK_TABS, type PackBaseKey, type PackItemKey, type PackPeriod, type PackTab } from '../../../shared/packs'
import { PACK_GROUPS } from './packGroups.gen'
import { ATLAS_CATS, ATLAS_ITEMS, type AtlasCat } from '../../../shared/atlasItems'
import { L } from './i18n'
import artDemonSlayer from '../assets/packs/shop-demon-slayer.webp'
import artSurpriseKey from '../assets/packs/shop-surprise-key.webp'
import artRookieRuby from '../assets/packs/shop-rookie-ruby.webp'
import artElite from '../assets/packs/shop-elite.webp'
import artRookieCheer from '../assets/packs/shop-rookie-cheer.webp'
import artFledgling from '../assets/packs/shop-fledgling.webp'
import artPet500 from '../assets/packs/shop-pet-500.webp'
import artAdventureS from '../assets/packs/shop-adventure-s.webp'
import artRateUp from '../assets/packs/shop-rate-up.webp'

/**
 * เช็กความคุ้มค่าแพ็ค — แปลงของในแพ็คเป็น "รูบี้เทียบเท่า" ตามค่าที่ผู้เล่นให้จริง (ไม่ใช่ราคาร้านรูบี้) แล้วหารด้วยราคา (บาท หรือ ปริซึม 💎)
 * ค่าตั้งต้นจาก Krit (24 ต.ค. 2026) — ราคาร้านรูบี้แพงกว่าค่าจริง และรูบี้มีจำกัด จึงใช้เป็นแค่ตัวเทียบ
 * - กล่องกุญแจ = 100: ฟาร์ม 4 ตัวได้ 80 รูบี้ + ช่องที่ 5 ไว้ฟาร์มของรัก/แหวน ≈ ฟาร์ม 5 ตัวได้ 100
 * - ตั๋วกดได้ด้วยรูบี้ (100/ครั้ง · ของรัก 80) → ค่าไม่เกินนั้น แล้วลดตามความหายาก · Pet Wish List กดด้วยรูบี้ไม่ได้ = 200
 * - ผลึก: กดตู้ของรัก 80 รูบี้ได้เฉลี่ย ≈31.5 ผลึก · วัสดุเลื่อนขั้น + Inner Spark: แบ่งค่ารอบดันเจี้ยน (เฉลี่ย 3 รอบแรก 150 รูบี้) ตามสัดส่วนราคาร้าน
 * เทียบเป็น % กับแพ็คฐาน (Monthly Key Bundle)
 */
/** เปิด/ปิดหน้าเช็กความคุ้มค่าแพ็ค (ปิด = ไม่อยู่ในเมนู หน้าแรก และบันทึกอัปเดต · ยังเข้าได้ทางลิงก์ /packs · หน้าแอดมินเตรียมข้อมูลได้) */
export const PACKS_ON = false

export const KEYS_PER_CHEST = 60
export { ATLAS_CATS, PACK_BASE_KEYS, PACK_ITEM_KEYS, PACK_TABS, type AtlasCat, type PackItemKey, type PackPeriod, type PackTab }

/** ของ 1 ช่องในแพ็ค · b = ของแถม (ป้าย BONUS ในเกม) · s = ตัวเลือกของช่อง "Select" กลุ่มที่ s (เลือกได้ 1 อย่างจากทุกบรรทัดที่มี s เดียวกัน) */
export type ItemLine = { k: PackItemKey; n: number; b?: 1; s?: number }
export type PackItems = {
  list?: ItemLine[]; tab?: PackTab; other?: string
  /** ข้อมูลรุ่นแรก (ก่อนมี list) */
  rubies?: number; chests?: number; summon?: number; raid?: number
}
export type Pack = {
  id: string; name: string; group: string; price: number; gems: number
  items: PackItems; limit: number; period: PackPeriod; endsAt: number | null; base: boolean; sort: number; updatedAt: number
}

// ---------- ชนิดของ: ชื่อ ราคาร้านรูบี้ (ต่อ 1 ชิ้น) และค่าตั้งต้น ----------
export type ItemDef = {
  th: string; en: string
  /** ราคาในร้านรูบี้ต่อ 1 ชิ้น (ไม่มี = ไม่ขายในร้าน) */
  shop?: number
  /** ค่าที่ให้ (รูบี้ต่อ 1 ชิ้น) — ผู้เล่นเก่า */
  worth: number
  /** ค่าที่ให้ถ้าเป็นผู้เล่นใหม่ (ไม่ใส่ = เท่าผู้เล่นเก่า) */
  rookie?: number
  /** ที่มาของค่า */
  note?: [string, string]
  /** ยังไม่รู้ว่าคืออะไร/ค่าเท่าไหร่ */
  unknown?: boolean
  /** หมวดของไอเท็มจาก 7K Atlas (ไม่มี = ของหลัก) */
  cat?: AtlasCat
}
const BASE_ITEMS: Record<PackBaseKey, ItemDef> = {
  rubies: { th: 'รูบี้', en: 'Rubies', worth: 1 },
  chests: { th: 'กล่องกุญแจ (60 ดอก)', en: 'Key chest (60 keys)', shop: 100, worth: 100,
    note: ['ฟาร์ม 4 ตัวได้ 80 + ช่องที่ 5 ไว้ฟาร์มของรัก/แหวน', 'Farming 4 heroes gives 80, plus a 5th slot for gear drops'] },
  keys: { th: 'กุญแจ', en: 'Keys', worth: 100 / KEYS_PER_CHEST, note: ['1/60 ของกล่องกุญแจ', '1/60 of a key chest'] },
  gold: { th: 'ทอง', en: 'Gold', worth: 0, note: ['ไม่นับ', 'Not counted'] },
  pickup: { th: 'ตั๋วพิคอัพ (Rate Up)', en: 'Rate Up summon ticket', shop: 100, worth: 100, note: ['หายาก เท่าราคากดด้วยรูบี้', 'Rare: same as a ruby pull'] },
  collab: { th: 'ตั๋วคอลแลป', en: 'Collab summon ticket', shop: 100, worth: 100, note: ['นาน ๆ มาที เท่าราคากดด้วยรูบี้', 'Rare: same as a ruby pull'] },
  permanent: { th: 'ตั๋วถาวร (ม่วง)', en: 'Hero summon ticket', shop: 100, worth: 70, note: ['แจกบ่อย ได้เรื่อย ๆ', 'Handed out all the time'] },
  pet: { th: 'ตั๋วสัตว์', en: 'Pet summon ticket', shop: 100, worth: 60, note: ['สำคัญน้อยกว่าตั๋วม่วงนิดหน่อย', 'A bit less than a hero summon ticket'] },
  petWish: { th: 'ตั๋ว Pet Wish List', en: 'Pet Wish List voucher', shop: 200, worth: 200, note: ['ตู้เดียวที่กดด้วยรูบี้ไม่ได้', 'The only banner rubies can’t pull'] },
  equip: { th: 'ตั๋วของรัก', en: 'Dedicated gear ticket', shop: 80, worth: 80, note: ['เท่ากดตู้ของรักด้วยรูบี้', 'Same as a ruby pull'] },
  card23: { th: 'ตั๋วอัศวิน Common (2★)', en: 'Common Hero Ticket (2★)', worth: 0, unknown: true },
  card3: { th: 'ตั๋วอัศวิน Uncommon (3★)', en: 'Uncommon Hero Ticket (3★)', worth: 0, unknown: true },
  chaos: { th: 'Chaos Essence (ขวดเหลือง)', en: 'Chaos Essence', shop: 120, worth: 120,
    note: ['ได้จากเรด/จบซีซั่นเท่านั้น · ราคาร้านสมเหตุสมผล', 'Raids/season rewards only · shop price is fair'] },
  oblivion: { th: 'Oblivion Essence (ขวดแดง)', en: 'Oblivion Essence', shop: 500, worth: 300, note: ['ค่าสูง แต่ร้านแพงไป', 'Valuable, but overpriced in the shop'] },
  memories: { th: 'Essence of Memories', en: 'Essence of Memories', shop: 20, worth: 0, note: ['เทียบยาก ไม่นับ', 'Hard to compare, not counted'] },
  awakening: { th: 'Awakening Stone', en: 'Awakening Stone', shop: 400, worth: 0, rookie: 400,
    note: ['ผู้เล่นเก่ามีล้นคลัง · ผู้เล่นใหม่ต้องการมาก', 'Veterans have plenty · new players need lots'] },
  crystal: { th: 'Tuning Crystal', en: 'Tuning Crystal', shop: 3, worth: 2.54, note: ['กดตู้ของรัก 80 รูบี้ ได้ ≈31.5 ผลึก', 'A dedicated gear pull (80) gives ≈31.5'] },
  rankUp: { th: 'วัสดุเลื่อนขั้น', en: 'Rank Up material', shop: 10, worth: 0, note: ['หาง่ายเกินไป ไม่นับ', 'Too easy to get, not counted'] },
  spark: { th: 'Inner Spark', en: 'Inner Spark', shop: 1, worth: 0.28, note: ['จากรอบดันเจี้ยน Power Up', 'From Power Up Dungeon runs'] },
  skillStone: { th: 'หินสกิล Brilliant', en: 'Brilliant Skill Stone', shop: 3000, worth: 2500, note: ['หายากมาก ส่วนใหญ่จากร้านรายเดือน', 'Very rare, mostly from the monthly shop'] },
  raid: { th: 'ตั๋วเรด', en: 'Raid ticket', worth: 0, note: ['ไม่นับ', 'Not counted'] },
  ore: { th: 'Topaz', en: 'Topaz', worth: 0, unknown: true },
  star: { th: 'Star Crystal', en: 'Star Crystal', worth: 0, unknown: true },
}
/** ค่าตั้งต้นของไอเท็ม Atlas บางตัวที่เทียบกับของหลักได้ (ที่เหลือ = ยังไม่รู้ค่า ไม่นับ) */
const ATLAS_WORTH: Partial<Record<PackItemKey, [number, [string, string]]>> = {
  a_203000037: [100, ['เลือกตั๋วเรียก 1 ใบ', 'Pick 1 summon voucher']],
  a_526: [200, ['เท่าตั๋ว Pet Wish List', 'Same as a Pet Wish List voucher']],
  // ค่าจาก 7K Atlas (ยังไม่มีค่าที่ผู้เล่นตั้งเอง)
  a_203000016: [20000, ['เลือกอัศวินตำนานได้ (L+ ด้วย) · ค่าจาก 7K Atlas', 'Pick a Legendary hero (L+ too) · 7K Atlas value']],
  a_202000055: [10000, ['สุ่มอัศวินตำนาน 1 ตัว · ค่าจาก 7K Atlas', 'A random Legendary hero · 7K Atlas value']],
  a_203000069: [20000, ['เลือกสัตว์เลี้ยงตำนาน 5★ · ค่าจาก 7K Atlas', 'Pick a 5★ Legendary pet · 7K Atlas value']],
  a_304000004: [10000, ['ไข่ตำนาน · ค่าจาก 7K Atlas', 'Legendary egg · 7K Atlas value']],
  a_202000067: [10000, ['ราคาร้าน Topaz · ค่าจาก 7K Atlas', 'Topaz Shop price · 7K Atlas value']],
}
export const ITEMS = {
  ...BASE_ITEMS,
  ...Object.fromEntries(ATLAS_ITEMS.map((x): [PackItemKey, ItemDef] => {
    const w = ATLAS_WORTH[x.k]
    return [x.k, w ? { th: x.th, en: x.en, cat: x.c, worth: w[0], note: w[1] } : { th: x.th, en: x.en, cat: x.c, worth: 0, unknown: true }]
  })),
} as Record<PackItemKey, ItemDef>
/** รูปแบนเนอร์กลุ่มจาก 7K Atlas (assets/packs/atlas/<slug>.webp) */
const ATLAS_ART = Object.fromEntries(
  Object.entries(import.meta.glob<string>('../assets/packs/atlas/*.webp', { eager: true, import: 'default' }))
    .map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -5), url]),
) as Record<string, string>
/** รูปของกลุ่มแพ็ค: รูปจากคลิปในเกม (GROUP_META) ก่อน แล้วค่อยรูปจาก 7K Atlas · square = รูปไอเท็ม ไม่ใช่แบนเนอร์ */
export function groupArt(g: string): { src: string; square: boolean; atlas: boolean } | null {
  if (GROUP_META[g]?.art) return { src: GROUP_META[g].art!, square: false, atlas: false }
  const m = PACK_GROUPS[g]
  return m?.art && ATLAS_ART[m.art] ? { src: ATLAS_ART[m.art], square: !!m.square, atlas: true } : null
}
/** ชื่อกลุ่ม: โหมดไทยใช้คำแปลของ 7K Atlas ถ้ามี */
export const groupName = (g: string) => L(PACK_GROUPS[g]?.th ?? g, g)
/** ชื่อหมวด (ตามหมวดของ 7K Atlas) */
export const CAT_NAME: Record<AtlasCat, [string, string]> = {
  summonvouchers: ['ตั๋วเรียกอื่น ๆ', 'Other summon vouchers'],
  tickets: ['ใบเรียก / ใบเลือกอัศวินและสัตว์เลี้ยง', 'Hero & pet tickets'],
  materials: ['วัตถุดิบ', 'Materials'],
  elements: ['ธาตุ / วัตถุดิบวิวัฒนาการ', 'Particles & rank up'],
  petrelated: ['ไข่สัตว์เลี้ยง', 'Pet eggs'],
  accessoryrelated: ['ของเสริมพลังเครื่องประดับ', 'Accessory refining'],
  accessories: ['กล่องเครื่องประดับ', 'Accessory boxes'],
  dedicatedequipment: ['อุปกรณ์เฉพาะ', 'Dedicated equipment'],
  gears: ['กล่องอุปกรณ์', 'Equipment boxes'],
  essentials: ['ของพื้นฐาน', 'Essentials'],
  shopping: ['เหรียญร้านค้า', 'Shop currencies'],
  entrytokens: ['ตั๋ว / ตราเข้าเล่น', 'Entry tokens'],
  misc: ['อื่น ๆ', 'Other'],
}
export const itemName = (k: PackItemKey) => L(ITEMS[k].th, ITEMS[k].en)

// ---------- ค่าที่ผู้ใช้ให้ (จำในเครื่อง) ----------
export type Profile = 'vet' | 'rookie'
export type Metric = 'baht' | 'gem'
export type WorthPrefs = { profile: Profile; metric: Metric; worth: Partial<Record<PackItemKey, number>> }
export type Worth = Record<PackItemKey, number>
const PREFS_KEY = '7k-note:pack-worth'

export const defaultWorth = (k: PackItemKey, profile: Profile) => (profile === 'rookie' && ITEMS[k].rookie !== undefined ? ITEMS[k].rookie! : ITEMS[k].worth)
export function worthTable(prefs: Pick<WorthPrefs, 'profile' | 'worth'>): Worth {
  const w = {} as Worth
  for (const k of PACK_ITEM_KEYS) {
    const own = prefs.worth[k]
    w[k] = typeof own === 'number' && Number.isFinite(own) && own >= 0 ? own : defaultWorth(k, prefs.profile)
  }
  return w
}
export const DEFAULT_WORTH = worthTable({ profile: 'vet', worth: {} })

export function loadWorthPrefs(): WorthPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')
    const worth: WorthPrefs['worth'] = {}
    for (const k of PACK_ITEM_KEYS) if (typeof raw.worth?.[k] === 'number') worth[k] = raw.worth[k]
    return { profile: raw.profile === 'rookie' ? 'rookie' : 'vet', metric: raw.metric === 'gem' ? 'gem' : 'baht', worth }
  } catch { return { profile: 'vet', metric: 'baht', worth: {} } }
}
export function saveWorthPrefs(p: WorthPrefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)) } catch { /* ไม่มี storage */ }
}

// ---------- คำนวณ ----------
const isKey = (k: unknown): k is PackItemKey => (PACK_ITEM_KEYS as readonly string[]).includes(k as string)
/** ของในแพ็คเป็นรายการ (แปลงข้อมูลรุ่นแรกให้ด้วย) */
export function itemsOf(p: Pick<Pack, 'items'>): ItemLine[] {
  const it = p.items ?? {}
  if (Array.isArray(it.list)) return it.list.filter((x) => isKey(x?.k) && x.n > 0)
  const out: ItemLine[] = []
  if (it.rubies) out.push({ k: 'rubies', n: it.rubies })
  if (it.chests) out.push({ k: 'chests', n: it.chests })
  if (it.summon) out.push({ k: 'pickup', n: it.summon })
  if (it.raid) out.push({ k: 'raid', n: it.raid })
  return out
}
/** แท็บในร้านของแพ็ค */
export function packTab(p: Pack): PackTab {
  const t = p.items?.tab ?? GROUP_META[p.group]?.tab ?? PACK_GROUPS[p.group]?.tab
  if (t && (PACK_TABS as readonly string[]).includes(t)) return t
  return p.period === 'monthly' ? 'monthly' : p.period === 'daily' ? 'daily' : 'special'
}

/** ตัวเลือกที่คุ้มสุดของช่อง "Select" ตามค่าที่ให้ (ไม่มีช่องเลือก = null) */
export function bestPick(lines: ItemLine[], val: (k: PackItemKey) => number, s = 1) {
  let best: ItemLine | null = null
  for (const x of lines) if (x.s === s && (!best || x.n * val(x.k) > best.n * val(best.k))) best = x
  return best
}
/** ช่องที่แสดง/นับจริง: ของตายตัว + ช่องเลือก 1 ช่อง (ใช้ตัวเลือกที่คุ้มสุด วางที่ตำแหน่งตัวเลือกแรก) */
export function shownItems(p: Pick<Pack, 'items'>, val: (k: PackItemKey) => number) {
  const all = itemsOf(p)
  const seen = new Set<number>()
  return all.flatMap((x) => {
    if (!x.s) return [x]
    if (seen.has(x.s)) return []
    seen.add(x.s)
    const best = bestPick(all, val, x.s)
    return best ? [best] : []
  })
}
/** มูลค่ารวม (รูบี้เทียบเท่า) ตามค่าที่ให้ */
export function packValue(p: Pick<Pack, 'items'>, worth: Worth = DEFAULT_WORTH) {
  return shownItems(p, (k) => worth[k]).reduce((s, x) => s + x.n * worth[x.k], 0)
}
/** มูลค่าถ้าคิดตามราคาร้านรูบี้ (แบบเว็บอื่น) — ของที่ไม่มีในร้านใช้ค่าตั้งต้น */
export function shopValue(p: Pick<Pack, 'items'>) {
  const shop = (k: PackItemKey) => ITEMS[k].shop ?? DEFAULT_WORTH[k]
  return shownItems(p, shop).reduce((s, x) => s + x.n * shop(x.k), 0)
}
export const priceOf = (p: Pick<Pack, 'price' | 'gems'>, m: Metric) => (m === 'gem' ? p.gems : p.price)
/** รูบี้เทียบเท่าต่อ 1 บาท / 1 ปริซึม (0 = ไม่มีราคาแบบนั้น) */
export function rateOf(p: Pick<Pack, 'items' | 'price' | 'gems'>, m: Metric, worth: Worth = DEFAULT_WORTH) {
  const price = priceOf(p, m)
  return price > 0 ? packValue(p, worth) / price : 0
}
export const perBaht = (p: Pick<Pack, 'items' | 'price' | 'gems'>, worth?: Worth) => rateOf(p, 'baht', worth)

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
      : p === 'biweekly' ? L(`2 สัปดาห์ละ ${n} ครั้ง`, `${n}× per 2 weeks`)
      : p === 'monthly' ? L(`เดือนละ ${n} ครั้ง`, `${n}× per month`)
        : L(`ซื้อได้ ${n} ครั้ง`, `Limit ${n}`)

// ---------- กลุ่มแพ็ค (แถบในร้าน): รูปแบนเนอร์ + คำอธิบาย · ชื่อกลุ่มตรงกับช่อง "กลุ่ม" ในหน้าแอดมิน ----------
export type GroupMeta = { art?: string; sub?: [string, string]; tab?: PackTab }
export const GROUP_META: Record<string, GroupMeta> = {
  'Monthly Key Bundle': { sub: ['แพ็ครายเดือน ใช้เป็นเส้นฐาน 100%', 'Monthly pack, the 100% baseline'], tab: 'limited' },
  'Demon Slayer Summons Bonanza': { art: artDemonSlayer, sub: ['ตั๋วคอลแลปดาบพิฆาตอสูร ลดราคาพิเศษ', 'Demon Slayer summon voucher special sale'] },
  'Surprise Adventurer Key Support Pack': { art: artSurpriseKey, sub: ['กล่องกุญแจ + Chaos Essence', 'Key bundles and Chaos Essence'] },
  'Rookie Ruby Support Pack': { art: artRookieRuby, sub: ['แพ็ครูบี้สำหรับนักผจญภัย', 'Rubies for adventurers in need'] },
  'Elite Adventurer Gameplay Special Pack': { art: artElite, sub: ['กล่องกุญแจ + ตั๋วเรด', 'Key bundles and raid tickets'] },
  'Rookie Cheer Key Special Pack': { art: artRookieCheer, sub: ['รูบี้ + กล่องกุญแจ', 'Rubies and key bundles'] },
  'Fledgling Adventurer Cheer Pack': { art: artFledgling, sub: ['แพ็คเสริมพลังสำหรับผู้เล่นใหม่', 'Power-up support for new adventurers'] },
  '500 Days Celebration Pet Wish List Pack': { art: artPet500, sub: ['ฉลอง 500 วัน: ตั๋ว Pet Wish List', '500 days: Pet Wish List perks'] },
  'Adventure Support S': { art: artAdventureS, sub: ['มาเฉพาะสุดสัปดาห์', 'Weekends only'] },
  'Rate Up Summon Special': { art: artRateUp, sub: ['ตั๋วพิคอัพ ลดราคาพิเศษ', 'Rate Up hero summon voucher sale'] },
  'Pet Summon Special': { sub: ['ตั๋วสัตว์ ลดราคาพิเศษ', 'Pet summon voucher sale'] },
}

// ---------- แพ็คที่ซื้อแล้ว (จำในเครื่อง) — รายวัน/สัปดาห์/เดือน นับใหม่ตามรอบรีเซ็ตของเกม (07:00 ไทย = 00:00 UTC) ----------
const KEY = '7k-note:packs-bought'
type Bought = Record<string, { n: number; at: string }>
/** คีย์รอบของแพ็ค: เปลี่ยนรอบ = ยอดที่ซื้อกลับเป็น 0 */
export function periodKey(period: PackPeriod, now = Date.now()) {
  const d = new Date(now)
  if (period === 'daily') return d.toISOString().slice(0, 10)
  if (period === 'monthly') return d.toISOString().slice(0, 7)
  if (period === 'biweekly') return 'b' + Math.floor((now - 345_600_000) / 1_209_600_000) // รอบ 14 วันนับจากวันจันทร์
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
export function recommend(packs: { pack: Pack; left: number }[], budget: number, worth: Worth = DEFAULT_WORTH) {
  const B = Math.min(100_000, Math.max(0, Math.floor(budget)))
  const units: Pack[] = []
  for (const { pack, left } of packs) if (pack.price > 0) for (let i = 0; i < left; i++) units.push(pack)
  if (!B || !units.length) return { picks: [] as { pack: Pack; n: number }[], spent: 0, value: 0 }
  const best = new Float64Array(B + 1)
  const take: Uint8Array[] = units.map(() => new Uint8Array(B + 1))
  units.forEach((p, i) => {
    const w = Math.ceil(p.price), v = packValue(p, worth)
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
  const picks = [...counts.values()].sort((x, y) => perBaht(y.pack, worth) - perBaht(x.pack, worth))
  return { picks, spent: picks.reduce((s, x) => s + x.pack.price * x.n, 0), value: best[B] }
}
