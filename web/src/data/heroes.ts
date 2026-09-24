/**
 * รายชื่อฮีโร่ / สัตว์เลี้ยง
 * ------------------------------------------------------------
 * - แก้ไขหรือเพิ่มได้ในไฟล์นี้ที่เดียว
 * - รายชื่อหลักอัปเดตอัตโนมัติจาก scripts/import-7k-combo.mjs (catalog.json)
 * - เพิ่มชื่อที่ไม่มีใน EXTRA_HEROES / EXTRA_PETS, ใส่ประเภทใน HERO_TYPE, ใส่รูปใน IMAGES
 * - ในหน้าเลือกฮีโร่ พิมพ์ชื่อที่ไม่มีในรายการแล้วกด "ใช้ชื่อนี้" ได้เลย
 */

export type HeroType = 'attack' | 'magic' | 'defense' | 'support' | 'universal'

export type Unit = {
  id: string
  name: string
  type?: HeroType
  img?: string
}

export const HERO_TYPES: Record<HeroType, { label: string; color: string }> = {
  attack: { label: 'โจมตี', color: '#e5484d' },
  magic: { label: 'เวทย์', color: '#3e8ef7' },
  defense: { label: 'ป้องกัน', color: '#d9a23b' },
  support: { label: 'สนับสนุน', color: '#30a46c' },
  universal: { label: 'สมดุล', color: '#8e4ec6' },
}

// รายชื่อฮีโร่/สัตว์เลี้ยงหลักมาจาก catalog.json (สร้างโดย scripts/import-7k-combo.mjs เรียงตามความนิยม)
// ชื่อ = id เลย (ใช้ชื่อไทยในเกม เช่น "ซอรัน awake") จะได้เข้ากับคลังคอมพ์
import catalog from './catalog.json'

/** ฮีโร่ที่ยังไม่มีในคลัง — เพิ่มชื่อเองได้ที่นี่ */
const EXTRA_HEROES: string[] = ['ซอรัน', 'เคลมิส', 'อาริส', 'ยุนกอน', 'โดยอง', 'สกัลด์', 'เดลโลนส์', 'ออร์ก้า', 'ยูชิน', 'เกล', 'เรเชล', 'ไอลีน', 'เทโอ', 'คาร์มา']
const EXTRA_PETS: string[] = []

/** ประเภทฮีโร่ (ชื่อไม่รวม awake) — ดูจากไอคอนในเกม ใส่เพิ่มได้ ถ้าไม่ใส่จะเป็นสีเทา */
const HERO_TYPE: Record<string, HeroType> = {
  // Attack
  ซอรัน: 'attack', เดลโลนส์: 'attack', ออร์ก้า: 'attack', ลิโป้: 'attack', แทโอ: 'attack', เทโอ: 'attack', ไคล์: 'attack',
  'บรันซ์ & บรันเซล': 'attack', แรนด์กริด: 'attack', 'คาร์ล เฮรอน': 'attack', บาลิสต้า: 'attack',
  // Magic
  มิเลีย: 'magic', จูริ: 'magic', ซิลเวสตา: 'magic', สกัลด์: 'magic', ยุนกอน: 'magic', โดยอง: 'magic',
  วาเนสซา: 'magic', ยอนฮี: 'magic', เฟรย่า: 'magic', ริน: 'magic',
  // Defense
  ลูดี้: 'defense', แร็ดกริด: 'defense', น็อกซ์: 'defense', เฮเลเนีย: 'defense', อากีลา: 'defense',
  // Support
  โรซี่: 'support', เคลมิส: 'support', อีจูฉี: 'support',
  // Universal
  เกลลิดัส: 'universal', ไอลีน: 'universal', อาริส: 'universal', ธรูด: 'universal', เจฟ: 'universal',
  คาร์มา: 'universal', เรเชล: 'universal', สไปค์: 'universal', ซุนหงอคง: 'universal',
}

/** ชื่ออังกฤษในเกม (ใช้ค้นหา + จับคู่ชื่อไฟล์รูป) */
export const EN_NAME: Record<string, string> = {
  เกลลิดัส: 'Gelidus', มิเลีย: 'Melia', จูริ: 'Juri', โรซี่: 'Rosie', ซอรัน: 'Sunran', ลูดี้: 'Rudy', ไอลีน: 'Eileene',
  อาริส: 'Aris', ซิลเวสตา: 'Silvesta', สกัลด์: 'Skuld', ยุนกอน: 'Yoongun', เคลมิส: 'Clemyth', เดลโลนส์: 'Dellons',
  ออร์ก้า: 'Orkah', โดยอง: 'Dongyoung', อีจูฉี: 'Hayeon', แร็ดกริด: 'Radgrid', ลิโป้: 'Lu Bu', น็อกซ์: 'Knox',
  เฮเลเนีย: 'Hellenia', แทโอ: 'Teo', เทโอ: 'Teo', ไคล์: 'Kyle', วาเนสซา: 'Vanessa', ยอนฮี: 'Yeonhee', ธรูด: 'Trude',
  เฟรย่า: 'Freyja', ริน: 'Rin', 'บรันซ์ & บรันเซล': 'Branze & Bransel', เจฟ: 'Jave', คาร์มา: 'Karma',
  แรนด์กริด: 'Randgrid', อากีลา: 'Aquila', เรเชล: 'Rachel', สไปค์: 'Spike', ซุนหงอคง: 'Sun Wukong',
  'คาร์ล เฮรอน': 'Karl Heron', เจโอ: 'Jeo',
}

/**
 * รูป: วางไฟล์ไว้ที่ web/src/assets/units/ ตั้งชื่อไฟล์เป็นชื่อตัวละคร แล้วเว็บจับคู่ให้เอง
 *   - ชื่อไทย:   "ซอรัน.png", "ซอรัน awake.png", "ยอนจี.webp"
 *   - หรืออังกฤษ: "Sunran.png", "Sunran awake.png" (ตาม EN_NAME)
 * รองรับ .png .jpg .jpeg .webp
 */
const files = import.meta.glob('../assets/units/*.{png,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const IMAGES: Record<string, string> = {}
for (const [path, url] of Object.entries(files)) {
  const name = decodeURIComponent(path.split('/').pop()!.replace(/\.[^.]+$/, '')).normalize('NFC').trim().toLowerCase()
  IMAGES[name] = url
}
const imageFor = (name: string) => {
  const base = name.replace(/ awake.*$/, '')
  const en = EN_NAME[base]
  const suffix = name.slice(base.length) // เช่น " awake"
  const keys = [name, en && en + suffix, suffix ? base : null, suffix && en ? en : null]
  for (const k of keys) if (k && IMAGES[k.toLowerCase()]) return IMAGES[k.toLowerCase()]
  return undefined
}

export const baseName = (name: string) => name.replace(/ awake.*$/, '')
export const isAwake = (name: string) => / awake/.test(name)

const uniq = (arr: string[]) => [...new Set(arr)]

export const HEROES: Unit[] = uniq([...catalog.heroes, ...EXTRA_HEROES]).map((name) => ({
  id: name,
  name,
  type: HERO_TYPE[baseName(name)],
  img: imageFor(name),
}))

export const PETS: Unit[] = uniq([...catalog.pets, ...EXTRA_PETS]).map((name) => ({ id: name, name, img: imageFor(name) }))

/** id แบบเก่า (เวอร์ชันแรก) → ชื่อใหม่ ข้อมูลที่เคยบันทึกไว้จะยังแสดงถูก */
const LEGACY: Record<string, string> = {
  soran: 'ซอรัน', 'soran-awake': 'ซอรัน awake', klemis: 'เคลมิส', 'klemis-awake': 'เคลมิส awake',
  aris: 'อาริส', 'aris-awake': 'อาริส awake', ludy: 'ลูดี้', 'ludy-awake': 'ลูดี้ awake',
  lipo: 'ลิโป้', 'karl-heron': 'คาร์ล เฮรอน', redcrit: 'แร็ดกริด', freyja: 'เฟรย่า', gale: 'เกล', mist: 'มิสต์',
  yungon: 'ยุนกอน', skuld: 'สกัลด์', doyoung: 'โดยอง', balista: 'บาลิสต้า', orka: 'ออร์ก้า', yushin: 'ยูชิน',
  kyle: 'ไคล์', 'sun-wukong': 'ซุนหงอคง', milia: 'มิเลีย', vanessa: 'วาเนสซา', palanos: 'พาลานอส',
  eileene: 'ไอลีน', rachel: 'เรเชล', dellons: 'เดลโลนส์', spike: 'สไปค์', jave: 'เจฟ', kris: 'คริส',
  teo: 'เทโอ', karma: 'คาร์มา', yeonhee: 'ยอนฮี', rudy: 'ลูดี้',
}

// แท็กสำเร็จรูปของทีมเป้าหมาย
export const PRESET_TAGS = ['เวทย์', 'โจมตี', 'ถึก', 'สปีด', 'ต้องการของดี']

// ---------------------------------------------------------------
const CUSTOM = 'custom:'
const all = new Map([...HEROES, ...PETS].map((u) => [u.id, u]))
for (const [old, name] of Object.entries(LEGACY)) if (!all.has(old)) all.set(old, all.get(name) ?? { id: name, name, type: HERO_TYPE[baseName(name)] })

export const customId = (name: string) => CUSTOM + name.trim()

export function getUnit(id: string | null | undefined): Unit | null {
  if (!id) return null
  return all.get(id) ?? (id.startsWith(CUSTOM) ? { id, name: id.slice(CUSTOM.length) } : { id, name: id })
}

/** ค้นได้ทั้งชื่อไทยและอังกฤษ */
export function matchUnit(u: Unit, q: string) {
  const s = q.trim().toLowerCase()
  if (!s) return true
  const en = EN_NAME[baseName(u.name)]?.toLowerCase() ?? ''
  return u.name.toLowerCase().includes(s) || en.includes(s)
}
