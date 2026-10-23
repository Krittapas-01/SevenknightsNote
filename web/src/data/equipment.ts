import { EN } from '../lib/i18n'
const files = import.meta.glob('../assets/equipment/*.webp', { eager: true, query: '?url&no-inline', import: 'default' }) as Record<string, string>
const images = Object.fromEntries(Object.entries(files).map(([path, url]) => [path.split('/').pop()!.replace(/\.webp$/, ''), url]))

const SETS: Record<string, string> = {
  นักฆ่า: 'Assassin', นายประตู: 'Gatekeeper', ผู้พิทักษ์: 'Guardian',
  ผู้ล้างแค้น: 'Avenger', ผู้ปรับสมดุล: 'Orchestrator', หมอผี: 'Spellweaver',
  ผู้บัญชาการ: 'Vanguard', ผู้ไล่ล่า: 'Bounty', อัศวินศักดิ์สิทธิ์: 'Paladin',
}
const RING_ALIASES: Record<string, string> = { แหวนแห่งการคืนชีพ: 'แหวนแห่งการคีนชีพ' }
/** ชื่อเซตภาษาอังกฤษ (ตาม 7K Atlas) — ไฟล์รูปของ "ผู้ไล่ล่า" ชื่อ Bounty แต่ชื่อเต็มคือ Bounty Tracker */
const SET_EN: Record<string, string> = { ...SETS, ผู้ไล่ล่า: 'Bounty Tracker' }
/**
 * ชื่อแหวนภาษาอังกฤษ (ตามชื่อในเกมเวอร์ชันอังกฤษ — GameWith) · key = ชื่อไฟล์รูป
 * คุ้มครอง/พิทักษ์ ในเกมอังกฤษชื่อเดียวกันทั้งคู่ (ป้องกัน % / บล็อก %)
 */
const RING_EN: Record<string, string> = {
  แหวนแห่งการคีนชีพ: 'Ring of Resurrection', แหวนอมตะ: 'Ring of Immortality', แหวนแห่งอำนาจ: 'Ring of Authority',
  แหวนแห่งพลังกายใจ: 'Ring of Roar', แหวนกำแพงเหล็ก: 'Ring of Bulwark', แหวนแห่งสุขภาพ: 'Ring of Health',
  แหวนแห่งการปราบปราม: 'Ring of Subjugation', แหวนช่วงชิงปราสาท: 'Ring of Siege', แหวนแห่งการทำลายล้าง: 'Ring of Annihilation',
  แหวนเลือดนักสู้: 'Ring of Tenacity', แหวนเวทย์มน: 'Ring of Magic', แหวนกาลเวลา: 'Ring of Time', แหวนแห่งโอกาส: 'Ring of Chance',
  แหวนต้องสาป: 'Ring of Curses', แหวนแห่งความตาย: 'Ring of Death', แหวนแห่งหายนะ: 'Ring of Doom', แหวนเปล่งประกาย: 'Ring of Brilliance',
  แหวนแห่งความหวาดกลัว: 'Ring of Horror', แหวนแห่งทุ่งหิมะ: 'Ring of the Snow', แหวนเมดูซา: 'Ring of Medusa', แหวนแห่งความฝัน: 'Ring of Dreams',
  แหวนหนาม: 'Ring of Thorns', แหวนซาลาแมนเดอร์: 'Ring of the Salamander', แหวนพิษ: 'Ring of the Viper', แหวนล้างแค้น: 'Ring of Vengeance',
  แหวนคุ้มครอง: 'Ring of Protection', แหวนนำโชค: 'Ring of Fortune', แหวนพิทักษ์: 'Ring of Protection', แหวนแห่งสมาธิ: 'Ring of Concentration',
  แหวนธรรมชาติ: 'Ring of Nature', แหวนแม่นยำ: 'Ring of Accuracy', แหวนต้านทาน: 'Ring of Resistance',
}
/** ชื่อที่โชว์ (ข้อมูลที่เก็บยังเป็นชื่อไทยเหมือนเดิม): "ชุดนักฆ่า" / "Assassin set" */
export const setLabel = (name: string) => (EN && SET_EN[name] ? `${SET_EN[name]} set` : `ชุด${name}`)
/** ชื่อเซตแบบสั้น (ในหน้าต่างเลือก) */
export const setShort = (name: string) => (EN ? SET_EN[name] ?? name : name)
export const ringLabel = (name: string) => (EN ? RING_EN[RING_ALIASES[name] ?? name] ?? name : name)
/** ชื่อแหวนแบบสั้น ตัด "แหวน(แห่ง)" / "Ring of (the)" ออก */
export const ringShort = (name: string) => ringLabel(name).replace(EN ? /^Ring of (the )?/ : /^แหวน(แห่ง)?/, '')

export const ringImage = (name: string) => images[`ring-${RING_ALIASES[name] ?? name}`]
/** สัญลักษณ์เซต (ป้ายชมพูมุมซ้ายล่างของชิ้นอุปกรณ์ในเกม) */
export const setIcon = (name: string): string | undefined => (SETS[name] ? images[`set-${SETS[name]}`] : undefined)
export const setImages = (name: string) => SETS[name] ? [1, 2, 3].map((piece) => images[`${SETS[name]}${piece}`]) : []
export const equipmentNames = [
  ...Object.keys(SETS).map((name) => `ชุด${name}`),
  ...Object.keys(images).filter((name) => name.startsWith('ring-')).map((name) => name.slice(5)),
  ...Object.keys(RING_ALIASES),
].sort((a, b) => b.length - a.length)

/** รายชื่อสำหรับเลือก (หน้าแก้ของรายตัว) */
export const SET_NAMES = Object.keys(SETS)
const RING_BACK = Object.fromEntries(Object.entries(RING_ALIASES).map(([name, file]) => [file, name]))
/** ลำดับตามสมุดภาพอุปกรณ์ในเกม (Equipment Codex → Accessories) · ชื่อตามไฟล์รูป */
const RING_ORDER = [
  'การคีนชีพ', 'อมตะ', 'แห่งอำนาจ', 'แห่งพลังกายใจ', 'กำแพงเหล็ก', 'แห่งสุขภาพ', 'แห่งการปราบปราม', 'ช่วงชิงปราสาท', 'แห่งการทำลายล้าง',
  'เลือดนักสู้', 'เวทย์มน', 'กาลเวลา', 'แห่งโอกาส', 'ต้องสาป', 'แห่งความตาย', 'แห่งหายนะ', 'เปล่งประกาย', 'แห่งความหวาดกลัว',
  'แห่งทุ่งหิมะ', 'เมดูซา', 'แห่งความฝัน', 'หนาม', 'ซาลาแมนเดอร์', 'พิษ', 'ล้างแค้น', 'คุ้มครอง', 'นำโชค',
  'พิทักษ์', 'แห่งสมาธิ', 'ธรรมชาติ', 'แม่นยำ', 'ต้านทาน',
].map((n) => `แหวน${n === 'การคีนชีพ' ? 'แห่งการคีนชีพ' : n}`)
const ringRank = (file: string) => { const i = RING_ORDER.indexOf(file); return i < 0 ? RING_ORDER.length : i }
export const RING_NAMES = Object.keys(images)
  .filter((name) => name.startsWith('ring-'))
  .map((name) => name.slice(5))
  // แหวนใหม่ที่ยังไม่อยู่ในลำดับ ต่อท้ายเรียงตามตัวอักษร
  .sort((a, b) => ringRank(a) - ringRank(b) || a.localeCompare(b, 'th'))
  .map((file) => RING_BACK[file] ?? file)
