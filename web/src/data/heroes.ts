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
  /** รูปย่อ 256px (assets/units/thumb — สร้างด้วย scripts/make-thumbs.py) ใช้บนการ์ดเล็ก */
  thumb?: string
}

export const HERO_TYPES: Record<HeroType, { label: string; color: string }> = {
  attack: { label: EN ? 'Attack' : 'โจมตี', color: '#e5484d' },
  magic: { label: EN ? 'Magic' : 'เวท', color: '#3e8ef7' },
  defense: { label: EN ? 'Defense' : 'ป้องกัน', color: '#d9a23b' },
  support: { label: EN ? 'Support' : 'สนับสนุน', color: '#e7bd35' },
  universal: { label: EN ? 'Universal' : 'สมดุล', color: '#8e4ec6' },
}

// รายชื่อฮีโร่/สัตว์เลี้ยงหลักมาจาก catalog.json (สร้างโดย scripts/import-7k-combo.mjs เรียงตามความนิยม)
// ชื่อ = id เลย (ใช้ชื่อไทยในเกม เช่น "ซอรัน awake") จะได้เข้ากับที่จดไว้
import catalog from './catalog.json'
import { RELEASE } from './release'
import { EN } from '../lib/i18n'

/** ฮีโร่ที่ยังไม่มีในคลัง — เพิ่มชื่อเองได้ที่นี่ */
const EXTRA_HEROES: string[] = ['กิยู', 'ชิโนบุ', 'ทันจิโร่', 'เซนอิทสึ', 'ซอรัน', 'เคลมิส', 'อาริส', 'ยุนกอน', 'โดยอง', 'สกัลด์', 'เดลโลนส์', 'ออร์ก้า', 'ยูชิน', 'เรเชล', 'ไอลีน', 'คาร์มา']
const EXTRA_PETS: string[] = []

/** ประเภทฮีโร่ (ชื่อไม่รวม awake) — ดูจากไอคอนในเกม ใส่เพิ่มได้ ถ้าไม่ใส่จะเป็นสีเทา */
/** ฮีโร่ทองทั้งหมดในเกม (Legendary, L+, L++) จาก 7K Atlas */
const GOLD_HEROES: string[] = ['ไพร์', 'เกลลิดัส', 'จูริ', 'มิเลีย', 'โรซี่', 'กิยู awake', 'ชิโนบุ awake', 'ทันจิโร่ awake', 'เซนอิทสึ awake', 'เอซ', 'อากีลา', 'อาริส awake', 'บิสกิต', 'บรันซ์ & บรันเซล', 'เคลมิส awake', 'โคลท์', 'เดลโลนส์ awake', 'เดลโลนส์', 'โดยอง awake', 'ไอลีน', 'เอลิเซีย', 'เฟรย่า', 'ฮายอน', 'เจฟ', 'คางุระ', 'คาร์ล เฮรอน', 'คาร์มา', 'คลาฮาน', 'คริส', 'ไคล์', 'คิริเอล', 'ลิโป้', 'เมลคีร์', 'มิสต์', 'นาจา', 'โอม๊ก', 'ออร์ก้า awake', 'ออร์ลี่', 'พาลานอส', 'เพลตัน', 'เรเชล', 'แร็ดกริด', 'แรนด์กริด', 'เรกินเลฟ', 'ริน', 'ลูดี้ awake', 'ลูดี้', 'ไรอัน', 'ซิลเวสตา awake', 'ซิลเวสตา', 'สกัลด์ awake', 'สไปค์', 'ซุนหงอคง', 'ซองจินอู', 'ซอรัน awake', 'แทโอ', 'ธรูด', 'วาเนสซา', 'ยอนฮี', 'ยุนกอน awake', 'อลิซ', 'เอมิเลีย', 'อารากอน', 'ไป๋เจียว', 'ไป่หลง', 'บาลิสต้า', 'พีดัม', 'ชาแฮอิน', 'ชานชะเลอร์', 'เดซี่', 'แทอู๊ด', 'เตียวเสี้ยน', 'เอสปาด้า', 'กวนอู', 'น็อกซ์ awake', 'น็อกซ์', 'รีน่า', 'มิโฮะ', 'เนีย', 'ปาสคาล', 'ลุค', 'ลูลี่', 'เซอิน', 'ซีค', 'ทากะ', 'เบลลีก้า awake', 'เบลลีก้า', 'เสี่ยวเฉียว', 'ยูชิน']

/** ธาตุตาม 7K Atlas */
const GOLD_TYPE: Record<string, HeroType> = {
  'ไพร์': 'attack',
  'เกลลิดัส': 'universal',
  'จูริ': 'magic',
  'มิเลีย': 'magic',
  'โรซี่': 'support',
  'เอซ': 'universal',
  'อากีลา': 'defense',
  'อาริส': 'universal',
  'บิสกิต': 'support',
  'บรันซ์ & บรันเซล': 'attack',
  'เคลมิส': 'support',
  'โคลท์': 'attack',
  'เดลโลนส์': 'attack',
  'โดยอง': 'magic',
  'ไอลีน': 'universal',
  'เอลิเซีย': 'universal',
  'เฟรย่า': 'magic',
  'ฮายอน': 'support',
  'เจฟ': 'universal',
  'คางุระ': 'attack',
  'คาร์ล เฮรอน': 'attack',
  'คาร์มา': 'universal',
  'คลาฮาน': 'attack',
  'คริส': 'universal',
  'ไคล์': 'attack',
  'คิริเอล': 'magic',
  'ลิโป้': 'attack',
  'เมลคีร์': 'magic',
  'มิสต์': 'universal',
  'นาจา': 'magic',
  'โอม๊ก': 'magic',
  'ออร์ก้า': 'attack',
  'ออร์ลี่': 'support',
  'พาลานอส': 'universal',
  'เพลตัน': 'support',
  'เรเชล': 'universal',
  'แร็ดกริด': 'defense',
  'แรนด์กริด': 'attack',
  'เรกินเลฟ': 'magic',
  'ริน': 'magic',
  'ลูดี้': 'defense',
  'ไรอัน': 'attack',
  'ซิลเวสตา': 'magic',
  'สกัลด์': 'magic',
  'สไปค์': 'universal',
  'ซุนหงอคง': 'universal',
  'ซองจินอู': 'magic',
  'ซอรัน': 'attack',
  'กิยู': 'universal',
  'ชิโนบุ': 'magic',
  'ทันจิโร่': 'attack',
  'เซนอิทสึ': 'attack',
  'แทโอ': 'attack',
  'ธรูด': 'universal',
  'วาเนสซา': 'magic',
  'ยอนฮี': 'magic',
  'ยุนกอน': 'magic',
  'อลิซ': 'support',
  'เอมิเลีย': 'attack',
  'อารากอน': 'defense',
  'ไป๋เจียว': 'universal',
  'ไป่หลง': 'attack',
  'บาลิสต้า': 'attack',
  'พีดัม': 'attack',
  'ชาแฮอิน': 'attack',
  'ชานชะเลอร์': 'universal',
  'เดซี่': 'magic',
  'แทอู๊ด': 'attack',
  'เตียวเสี้ยน': 'support',
  'เอสปาด้า': 'magic',
  'กวนอู': 'universal',
  'น็อกซ์': 'defense',
  'รีน่า': 'support',
  'มิโฮะ': 'magic',
  'เนีย': 'universal',
  'ปาสคาล': 'magic',
  'ลุค': 'defense',
  'ลูลี่': 'magic',
  'เซอิน': 'attack',
  'ซีค': 'universal',
  'ทากะ': 'attack',
  'เบลลีก้า': 'magic',
  'เสี่ยวเฉียว': 'magic',
  'ยูชิน': 'magic',
}
const GOLD_EN: Record<string, string> = {
  'ไพร์': "Fai",
  'เกลลิดัส': "Gelidus",
  'จูริ': "Juri",
  'มิเลีย': "Melia",
  'โรซี่': "Rosie",
  'เอซ': "Ace",
  'อากีลา': "Aquila",
  'อาริส': "Aris",
  'บิสกิต': "Biscuit",
  'บรันซ์ & บรันเซล': "Branze & Bransel",
  'เคลมิส': "Clemyth",
  'โคลท์': "Colt",
  'เดลโลนส์': "Dellons",
  'โดยอง': "Dongyoung",
  'ไอลีน': "Eileene",
  'เอลิเซีย': "Elysia",
  'เฟรย่า': "Freyja",
  'ฮายอน': "Hayeon",
  'เจฟ': "Jave",
  'คางุระ': "Kagura",
  'คาร์ล เฮรอน': "Karl Heron",
  'คาร์มา': "Karma",
  'คลาฮาน': "Klahan",
  'คริส': "Kris",
  'ไคล์': "Kyle",
  'คิริเอล': "Kyrielle",
  'ลิโป้': "Lu Bu",
  'เมลคีร์': "Mercure",
  'มิสต์': "Mist",
  'นาจา': "Nezha",
  'โอม๊ก': "O'Mok",
  'ออร์ก้า': "Orkah",
  'ออร์ลี่': "Orly",
  'พาลานอส': "Pallanus",
  'เพลตัน': "Platin",
  'เรเชล': "Rachel",
  'แร็ดกริด': "Radgrid",
  'แรนด์กริด': "Randgrid",
  'เรกินเลฟ': "Reginleif",
  'ริน': "Rin",
  'ลูดี้': "Rudy",
  'ไรอัน': "Ryan",
  'ซิลเวสตา': "Silvesta",
  'สกัลด์': "Skuld",
  'สไปค์': "Spike",
  'ซุนหงอคง': "Sun Wukong",
  'ซองจินอู': "Sung Jinwoo",
  'ซอรัน': "Sunran",
  'กิยู': "Giyu",
  'ชิโนบุ': "Shinobu",
  'ทันจิโร่': "Tanjiro",
  'เซนอิทสึ': "Zenitsu",
  'แทโอ': "Teo",
  'ธรูด': "Trude",
  'วาเนสซา': "Vanessa",
  'ยอนฮี': "Yeonhee",
  'ยุนกอน': "Yoongun",
  'อลิซ': "Alice",
  'เอมิเลีย': "Amelia",
  'อารากอน': "Aragon",
  'ไป๋เจียว': "Bai Jiao",
  'ไป่หลง': "Bai Long",
  'บาลิสต้า': "Ballista",
  'พีดัม': "Bi Dam",
  'ชาแฮอิน': "Cha Hae-in",
  'ชานชะเลอร์': "Chancellor",
  'เดซี่': "Daisy",
  'แทอู๊ด': "Deo",
  'เตียวเสี้ยน': "Diaochan",
  'เอสปาด้า': "Espada",
  'กวนอู': "Guan Yu",
  'น็อกซ์': "Knox",
  'รีน่า': "Lina",
  'มิโฮะ': "Miho",
  'เนีย': "Nia",
  'ปาสคาล': "Pascal",
  'ลุค': "Rook",
  'ลูลี่': "Ruri",
  'เซอิน': "Shane",
  'ซีค': "Sieg",
  'ทากะ': "Taka",
  'เบลลีก้า': "Velika",
  'เสี่ยวเฉียว': "Xiao Qiao",
  'ยูชิน': "Yu Shin",
}

const HERO_TYPE: Record<string, HeroType> = {
  // ธาตุตามในเกม (ไอคอนมุมซ้ายล่างของการ์ด)
  // Attack ⚔
  ไพร์: 'attack', ซอรัน: 'attack', เดลโลนส์: 'attack', ออร์ก้า: 'attack', ลิโป้: 'attack', แทโอ: 'attack', เทโอ: 'attack',
  ไคล์: 'attack', 'บรันซ์ & บรันเซล': 'attack', แรนด์กริด: 'attack', 'คาร์ล เฮรอน': 'attack', บาลิสต้า: 'attack',
  คางุระ: 'attack', เอมิเลีย: 'attack', ไรอัน: 'attack', โคลท์: 'attack', คลาฮาน: 'attack', ทากะ: 'attack',
  // Magic 🔍
  มิเลีย: 'magic', จูริ: 'magic', ซิลเวสตา: 'magic', สกัลด์: 'magic', ยุนกอน: 'magic', โดยอง: 'magic',
  วาเนสซา: 'magic', ยอนฮี: 'magic', เฟรย่า: 'magic', ริน: 'magic', เรกินเลฟ: 'magic', โอม๊ก: 'magic',
  คิริเอล: 'magic', เมลคีร์: 'magic', มิโฮะ: 'magic',
  // Defense 🛡
  ลูดี้: 'defense', แร็ดกริด: 'defense', อากีลา: 'defense', น็อกซ์: 'defense', เฮเลเนีย: 'defense',
  // Support ✚
  โรซี่: 'support', เคลมิส: 'support', ฮายอน: 'support', อีจูฉี: 'support', เพลตัน: 'support', ออร์ลี่: 'support',
  // Universal ☆
  เกลลิดัส: 'universal', ไอลีน: 'universal', เรเชล: 'universal', สไปค์: 'universal', เจฟ: 'universal', คริส: 'universal',
  พาลานอส: 'universal', เอซ: 'universal', ซุนหงอคง: 'universal', คาร์มา: 'universal', เอลิเซีย: 'universal',
  ธรูด: 'universal', มิสต์: 'universal', อาริส: 'universal',
}

/** ชื่ออังกฤษในเกม (ใช้ค้นหา + จับคู่ชื่อไฟล์รูป) */
export const EN_NAME: Record<string, string> = {
  ไพร์: 'Fai', เกลลิดัส: 'Gelidus', มิเลีย: 'Melia', จูริ: 'Juri', โรซี่: 'Rosie', ซอรัน: 'Sunran', ลูดี้: 'Rudy', ไอลีน: 'Eileene',
  อาริส: 'Aris', ซิลเวสตา: 'Silvesta', สกัลด์: 'Skuld', ยุนกอน: 'Yoongun', เคลมิส: 'Clemyth', เดลโลนส์: 'Dellons',
  ออร์ก้า: 'Orkah', โดยอง: 'Dongyoung', ฮายอน: 'Hayeon', อีจูฉี: 'Hayeon', แร็ดกริด: 'Radgrid', ลิโป้: 'Lu Bu', น็อกซ์: 'Knox',
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
const thumbFiles = import.meta.glob('../assets/units/thumb/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const keyOf = (path: string) => decodeURIComponent(path.split('/').pop()!.replace(/\.[^.]+$/, '')).normalize('NFC').trim().toLowerCase()
const IMAGES: Record<string, string> = {}
for (const [path, url] of Object.entries(files)) IMAGES[keyOf(path)] = url
const THUMBS: Record<string, string> = {}
for (const [path, url] of Object.entries(thumbFiles)) THUMBS[keyOf(path)] = url
const imageFor = (name: string, map = IMAGES) => {
  const base = name.replace(/ awake.*$/, '')
  const en = EN_NAME[base] ?? GOLD_EN[base] ?? PURPLE_EN[base]
  const suffix = name.slice(base.length) // เช่น " awake"
  // Match the exact form: a base portrait must not stand in for an awakened one.
  const keys = [name, en && en + suffix]
  for (const k of keys) if (k && map[k.toLowerCase()]) return map[k.toLowerCase()]
  return undefined
}

export const baseName = (name: string) => name.replace(/ awake.*$/, '')
// Eileene and Hayeon use awakened portraits while preserving their saved IDs.
export const isAwake = (name: string) => ['ไอลีน', 'ฮายอน', 'อีจูฉี'].includes(name) || / awake/.test(name)

const uniq = (arr: string[]) => [...new Set(arr)]

/** O7K = Seven Knights of Old — ขึ้นหน้าสุดตามลำดับนี้ */
export const O7K = ['ไพร์', 'โรซี่', 'จูริ', 'มิเลีย', 'เกลลิดัส'] // Seven Knights of Old: Fai, Rosie, Juri, Melia, Gelidus
const TYPE_ORDER: HeroType[] = ['attack', 'magic', 'defense', 'support', 'universal']

/** ฮีโร่ม่วง (Rare) ทั้งหมดในเกม จาก 7K Atlas */
const PURPLE_HEROES: string[] = ['เอเรียล', 'อสุรา', 'เบน', 'แบล็คโรส', 'แคทตี้', 'โคลอี้', 'คลีโอ', 'อีวาน', 'เฟิงเยี่ยน', 'เฮฟเว่นเนีย awake', 'เฮเลเนีย', 'โฮกิ้น', 'เจน', 'จิน', 'โจ๊กเกอร์', 'จูพี้', 'คาริน', 'คารอน', 'ลาเนีย', 'อีจูฮี', 'ลีโอ', 'ลี', 'หลิงหลิง', 'ลูซี่', 'เมย์', 'โนโฮ', 'แรคคูน', 'เรย์', 'ซาร่า', 'เซร่า', 'สนิปเปอร์', 'โซอี', 'ซิลเวีย', 'วิคตอเรีย', 'เสี่ยว', 'ยูจินโฮ', 'ยูอิ', 'ยูริ', 'จูล่ง']
const PURPLE_TYPE: Record<string, HeroType> = {
  'เอเรียล': 'magic', 'อสุรา': 'universal', 'เบน': 'magic', 'แบล็คโรส': 'attack', 'แคทตี้': 'attack', 'โคลอี้': 'support', 'คลีโอ': 'magic', 'อีวาน': 'defense', 'เฟิงเยี่ยน': 'attack', 'เฮฟเว่นเนีย': 'attack', 'เฮเลเนีย': 'defense', 'โฮกิ้น': 'attack', 'เจน': 'attack', 'จิน': 'attack', 'โจ๊กเกอร์': 'magic', 'จูพี้': 'attack', 'คาริน': 'support', 'คารอน': 'support', 'ลาเนีย': 'universal', 'อีจูฮี': 'support', 'ลีโอ': 'attack', 'ลี': 'defense', 'หลิงหลิง': 'magic', 'ลูซี่': 'support', 'เมย์': 'attack', 'โนโฮ': 'magic', 'แรคคูน': 'defense', 'เรย์': 'attack', 'ซาร่า': 'support', 'เซร่า': 'magic', 'สนิปเปอร์': 'attack', 'โซอี': 'attack', 'ซิลเวีย': 'magic', 'วิคตอเรีย': 'universal', 'เสี่ยว': 'attack', 'ยูจินโฮ': 'defense', 'ยูอิ': 'support', 'ยูริ': 'magic', 'จูล่ง': 'attack',
}
const PURPLE_EN: Record<string, string> = {
  'เอเรียล': 'Ariel', 'อสุรา': 'Asura', 'เบน': 'Bane', 'แบล็คโรส': 'Black Rose', 'แคทตี้': 'Catty', 'โคลอี้': 'Chloe', 'คลีโอ': 'Cleo', 'อีวาน': 'Evan', 'เฟิงเยี่ยน': 'Feng Yan', 'เฮฟเว่นเนีย': 'Heavenia', 'เฮเลเนีย': 'Hellenia', 'โฮกิ้น': 'Hokin', 'เจน': 'Jane', 'จิน': 'Jin', 'โจ๊กเกอร์': 'Joker', 'จูพี้': 'Jupy', 'คาริน': 'Karin', 'คารอน': 'Karon', 'ลาเนีย': 'Lania', 'อีจูฮี': 'Lee Joohee', 'ลีโอ': 'Leo', 'ลี': 'Li', 'หลิงหลิง': 'Ling Ling', 'ลูซี่': 'Lucy', 'เมย์': 'May', 'โนโฮ': 'Noho', 'แรคคูน': 'Rahkun', 'เรย์': 'Rei', 'ซาร่า': 'Sarah', 'เซร่า': 'Sera', 'สนิปเปอร์': 'Snipper', 'โซอี': 'Soi', 'ซิลเวีย': 'Sylvia', 'วิคตอเรีย': 'Victoria', 'เสี่ยว': 'Xiao', 'ยูจินโฮ': 'Yoo Jinho', 'ยูอิ': 'Yui', 'ยูริ': 'Yuri', 'จูล่ง': 'Zhao Yun',
}
/** ชื่อฐานของฮีโร่ม่วง (ใช้ทำกรอบม่วง) */
export const RARE = new Set(Object.keys(PURPLE_TYPE))

/** Tier ในเกม: O7K (L++) / ทองบน (L+) / ทองล่าง (L) / ม่วง (Rare) — ตาม 7K Atlas */
export type Tier = 'o7k' | 'lp' | 'l' | 'r'
export const TIERS: Record<Tier, { label: string; color: string }> = {
  o7k: { label: 'O7K', color: '#ff9f43' },
  lp: { label: EN ? 'L+' : 'ทองบน', color: '#f4d58d' },
  l: { label: EN ? 'L' : 'ทองล่าง', color: '#c9a35a' },
  r: { label: EN ? 'Rare' : 'ม่วง', color: '#9b7fd6' },
}
const TIER_ORDER: Tier[] = ['o7k', 'lp', 'l', 'r']
const TIER = new Map<string, Tier>()
{
  // GOLD_HEROES เรียงตาม Atlas: L++ (5 ตัวแรก) → L+ → L (เริ่มที่ อลิซ)
  const lStart = GOLD_HEROES.indexOf('อลิซ')
  GOLD_HEROES.forEach((n, i) => {
    const b = baseName(n)
    if (!TIER.has(b)) TIER.set(b, O7K.includes(b) ? 'o7k' : i < lStart ? 'lp' : 'l')
  })
  for (const b of Object.keys(PURPLE_TYPE)) if (!TIER.has(b)) TIER.set(b, 'r')
}
export const tierOf = (name: string): Tier | undefined => TIER.get(baseName(name))

const allHeroes: Unit[] = uniq([...catalog.heroes, ...GOLD_HEROES, ...EXTRA_HEROES, ...PURPLE_HEROES]).map((name) => ({
  id: name,
  name,
  type: GOLD_TYPE[baseName(name)] ?? PURPLE_TYPE[baseName(name)] ?? HERO_TYPE[baseName(name)],
  img: imageFor(name),
  thumb: imageFor(name, THUMBS),
}))

/**
 * เรียง: O7K ก่อน (ตามลำดับ ร่าง awake ก่อนร่างปกติ)
 * → ที่เหลือเรียงตามธาตุ โจมตี / เวทย์ / ป้องกัน / สนับสนุน / สมดุล / ยังไม่ระบุ
 * → ในธาตุเดียวกันเรียงตามความนิยม (ลำดับเดิมใน catalog)
 */
/** วันที่เข้าเกม: ร่าง awake ใช้วันได้ awake / ไม่รู้วันที่ = ท้ายสุด */
export const releaseOf = (name: string) => {
  const r = RELEASE[baseName(name)]
  return r ? (isAwake(name) ? r[1] ?? r[0] : r[0]) : ''
}
const rank = (u: Unit) => {
  const o = O7K.indexOf(baseName(u.name))
  if (o >= 0) return o
  const t = tierOf(u.name)
  return 100 + (t ? TIER_ORDER.indexOf(t) : TIER_ORDER.length)
}
// เรียง: tier (O7K → ทองบน → ทองล่าง → ม่วง) → ใหม่สุดก่อน (ตามวันเข้าเกม) → วันเดียวกันเรียงตามธาตุ → ความนิยม
const typeRank = (u: Unit) => (u.type ? TYPE_ORDER.indexOf(u.type) : TYPE_ORDER.length)
// ตัวที่มีร่าง awake แล้ว → ไม่ต้องโชว์ร่างปกติ (ในเกมเหลือแต่ร่าง awake)
const awakened = new Set(allHeroes.filter((u) => isAwake(u.name)).map((u) => baseName(u.name)))
const sortUnits = (list: Unit[]) => list
  .map((u, i) => ({ u, i, d: releaseOf(u.name) }))
  .sort((a, b) => rank(a.u) - rank(b.u) || b.d.localeCompare(a.d) || typeRank(a.u) - typeRank(b.u) || a.i - b.i)
  .map((x) => x.u)
export const HEROES: Unit[] = sortUnits(allHeroes.filter((u) => isAwake(u.name) || !awakened.has(u.name)))
/** รวมร่างปกติของตัวที่มีร่าง awake ด้วย (หน้าบิสกิต: คนที่ยังไม่ awake ค่า base ต่างกัน) */
export const HEROES_WITH_BASE: Unit[] = sortUnits(allHeroes)

export const PETS: Unit[] = uniq([...catalog.pets, ...EXTRA_PETS]).map((name) => ({ id: name, name, img: imageFor(name), thumb: imageFor(name, THUMBS) }))

/** id แบบเก่า (เวอร์ชันแรก) → ชื่อใหม่ ข้อมูลที่เคยบันทึกไว้จะยังแสดงถูก */
const LEGACY: Record<string, string> = {
  เทโอ: 'แทโอ',
  อีจูฉี: 'ฮายอน',
  soran: 'ซอรัน', 'soran-awake': 'ซอรัน awake', klemis: 'เคลมิส', 'klemis-awake': 'เคลมิส awake',
  aris: 'อาริส', 'aris-awake': 'อาริส awake', ludy: 'ลูดี้', 'ludy-awake': 'ลูดี้ awake',
  lipo: 'ลิโป้', 'karl-heron': 'คาร์ล เฮรอน', redcrit: 'แร็ดกริด', freyja: 'เฟรย่า', gale: 'เกลลิดัส', เกล: 'เกลลิดัส', mist: 'มิสต์',
  yungon: 'ยุนกอน', skuld: 'สกัลด์', doyoung: 'โดยอง', balista: 'บาลิสต้า', orka: 'ออร์ก้า', yushin: 'ยูชิน',
  kyle: 'ไคล์', 'sun-wukong': 'ซุนหงอคง', milia: 'มิเลีย', vanessa: 'วาเนสซา', palanos: 'พาลานอส',
  eileene: 'ไอลีน', rachel: 'เรเชล', dellons: 'เดลโลนส์', spike: 'สไปค์', jave: 'เจฟ', kris: 'คริส',
  giyu: 'กิยู', 'giyu-awake': 'กิยู awake', shinobu: 'ชิโนบุ', 'shinobu-awake': 'ชิโนบุ awake',
  tanjiro: 'ทันจิโร่', 'tanjiro-awake': 'ทันจิโร่ awake', zenitsu: 'เซนอิทสึ', 'zenitsu-awake': 'เซนอิทสึ awake',
  teo: 'เทโอ', karma: 'คาร์มา', yeonhee: 'ยอนฮี', rudy: 'ลูดี้',
}

// แท็กสำเร็จรูปของบ้านศัตรู
export const PRESET_TAGS = ['เวทย์', 'โจมตี', 'ถึก', 'สปีด', 'ต้องการของดี']

// ---------------------------------------------------------------
const CUSTOM = 'custom:'
const all = new Map([...allHeroes, ...PETS].map((u) => [u.id, u]))
for (const [old, name] of Object.entries(LEGACY)) if (!all.has(old)) all.set(old, all.get(name) ?? { id: name, name, type: HERO_TYPE[baseName(name)] })

export const customId = (name: string) => CUSTOM + name.trim()

export function getUnit(id: string | null | undefined): Unit | null {
  if (!id) return null
  return all.get(id) ?? (id.startsWith(CUSTOM) ? { id, name: id.slice(CUSTOM.length) } : { id, name: id })
}

/** ค้นได้ทั้งชื่อไทยและอังกฤษ */
/** ชื่ออังกฤษของฮีโร่ (ใช้จับชื่อจากภาพหน้าจอเกม) */
export const englishOf = (id: string) => {
  const b = baseName(getUnit(id)?.name ?? id)
  return EN_NAME[b] ?? GOLD_EN[b] ?? PURPLE_EN[b]
}
/** ชื่อสัตว์เลี้ยงภาษาอังกฤษ (ชื่อในเกมเวอร์ชันอังกฤษ) */
const PET_EN: Record<string, string> = {
  ยอนจี: 'Yeonji', เจโอ: 'Jeo', ยู: 'Yu', อีรีน: 'Eirin', ลู: 'Ruu', คารัม: 'Karam', โยรัง: 'Yorang', ไพค์: 'Pike',
  เมลแปร์โรว์: 'Merparrow', วินดี้: 'Windy', รีเซล: 'Rizel', ครี: 'Kree', จีฟ: 'Jeb', เดลโล่: 'Dello',
}
/** ชื่อที่โชว์ (ไม่มี awake) ตามภาษาที่ตั้ง — id/ชื่อไทยยังเป็นคีย์ข้อมูลเหมือนเดิม */
export const unitBase = (id: string | null | undefined) => {
  if (!id) return ''
  const b = baseName(getUnit(id)?.name ?? id)
  return EN ? (englishOf(id) ?? PET_EN[b] ?? b) : b
}
/** ชื่อเต็มที่โชว์ (ร่าง awake ต่อท้าย) */
export const unitLabel = (id: string | null | undefined) => {
  if (!id) return ''
  const name = getUnit(id)?.name ?? id
  // ตัวที่มีตรา awake แต่ id ไม่มีคำว่า awake (ไอลีน, ฮายอน) → เติมให้เหมือนตัวอื่น
  if (!EN) return isAwake(name) && !/ awake/.test(name) ? `${name} awake` : name
  return isAwake(name) ? `${unitBase(id)} (Awakened)` : unitBase(id)
}

export function matchUnit(u: Unit, q: string) {
  const s = q.trim().toLowerCase()
  if (!s) return true
  const en = (EN_NAME[baseName(u.name)] ?? GOLD_EN[baseName(u.name)] ?? PURPLE_EN[baseName(u.name)] ?? PET_EN[baseName(u.name)])?.toLowerCase() ?? ''
  return u.name.toLowerCase().includes(s) || en.includes(s)
}
