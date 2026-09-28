const files = import.meta.glob('../assets/equipment/*.webp', { eager: true, query: '?url&no-inline', import: 'default' }) as Record<string, string>
const images = Object.fromEntries(Object.entries(files).map(([path, url]) => [path.split('/').pop()!.replace(/\.webp$/, ''), url]))

const SETS: Record<string, string> = {
  นักฆ่า: 'Assassin', นายประตู: 'Gatekeeper', ผู้พิทักษ์: 'Guardian',
  ผู้ล้างแค้น: 'Avenger', ผู้ปรับสมดุล: 'Orchestrator', หมอผี: 'Spellweaver',
  ผู้บัญชาการ: 'Vanguard', ผู้ไล่ล่า: 'Bounty', อัศวินศักดิ์สิทธิ์: 'Paladin',
}
const RING_ALIASES: Record<string, string> = { แหวนแห่งการคืนชีพ: 'แหวนแห่งการคีนชีพ' }

export const ringImage = (name: string) => images[`ring-${RING_ALIASES[name] ?? name}`]
/** สัญลักษณ์เซ็ต (ป้ายชมพูมุมซ้ายล่างของชิ้นอุปกรณ์ในเกม) */
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
export const RING_NAMES = Object.keys(images)
  .filter((name) => name.startsWith('ring-'))
  .map((name) => RING_BACK[name.slice(5)] ?? name.slice(5))
  .sort((a, b) => a.localeCompare(b, 'th'))
