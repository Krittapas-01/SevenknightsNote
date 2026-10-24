import { equipmentNames, ringImage, setIcon, setImages } from '../data/equipment'
import { tx } from '../lib/i18n'

/** เครื่องประดับ 1 แถว + เซต 1 แถว (มีหัวข้อ ช่องว่างเติมให้ครบ 3 ช่อง) — เรียงเป็นระเบียบแบบช่องในเกม */
export default function EquipmentLoadout({ sets, rings }: { sets: string[]; rings: string[] }) {
  if (!sets.length && !rings.length) return null
  return (
    <div className="mt-2 space-y-1.5">
      <RingRow rings={rings} label />
      <SetRow sets={sets} label />
    </div>
  )
}

export function RingRow({ rings, label }: { rings: string[]; label?: boolean }) {
  return <SlotRow label={label ? tx('เครื่องประดับ') : undefined} items={rings.map((r) => ({ name: r, src: ringImage(r) }))} />
}
export function SetRow({ sets, label }: { sets: string[]; label?: boolean }) {
  return <SlotRow label={label ? tx('เซต') : undefined} items={sets.map((s) => ({ name: `ชุด${s}`, src: setIcon(s) ?? setImages(s)[0] }))} />
}

/** ช่องของ 3 ช่องขึ้นไป (ไม่มีรูป = ขึ้นชื่อแทน, ชี้ค้างดูชื่อ) */
function SlotRow({ label, items }: { label?: string; items: { name: string; src?: string }[] }) {
  const cells = [...items, ...Array.from({ length: Math.max(0, 3 - items.length) }, () => null)]
  return (
    <div>
      {label && <div className="mb-0.5 text-[11px] text-white/45">{label}</div>}
      <div className="flex flex-wrap gap-1">
        {cells.map((it, k) => (
          <span key={k} title={it?.name}
            className={`grid h-10 w-10 place-items-center overflow-hidden rounded-lg border ${it ? 'border-gold/30 bg-black/30' : 'border-white/10 bg-white/[.03]'}`}>
            {it && (it.src
              ? <img src={it.src} alt={it.name} width={40} height={40} className="h-full w-full object-contain" loading="lazy" decoding="async" draggable={false} />
              : <span className="px-0.5 text-center text-[8px] leading-tight text-white/70">{it.name}</span>)}
          </span>
        ))}
      </div>
    </div>
  )
}

/** เซตที่ต้องใส่: โชว์แค่สัญลักษณ์เซต (ชี้ค้างดูชื่อ) */
function SetBadge({ name }: { name: string }) {
  const src = setIcon(name)
  if (!src) return <EquipmentItem name={name} kind="set" />
  return (
    <img src={src} alt={`ชุด${name}`} title={`ชุด${name}`} width={40} height={40} loading="lazy" decoding="async" draggable={false}
      className="h-10 w-10 rounded-lg ring-1 ring-gold/30" />
  )
}

function EquipmentItem({ name, kind }: { name: string; kind: 'set' | 'ring' }) {
  const images = kind === 'set' ? setImages(name) : [ringImage(name)].filter(Boolean)
  const label = kind === 'set' ? `ชุด${name}` : name
  if (!images.length) return <span className="rounded-lg bg-white/10 px-2 py-1 text-xs text-white/80">{label}</span>
  const slots = ['อาวุธกายภาพ', 'อาวุธเวทย์', 'เกราะ']
  return (
    // มีรูปแล้วไม่ต้องโชว์ชื่อ (ทุกคนรู้จากรูป) — ชี้เมาส์ค้างดูชื่อได้
    <span className="inline-flex items-center rounded-lg border border-gold/20 bg-black/20 p-1 align-middle" title={label}>
      <span className="flex gap-1">
        {images.map((src, index) => (
          <img key={src} src={src} alt={kind === 'set' ? `${label} · ${slots[index]}` : label}
            width={40} height={40} loading="lazy" decoding="async" draggable={false}
            className="h-10 w-10 rounded-md object-contain" />
        ))}
      </span>
    </span>
  )
}

// Older counter notes store equipment names as plain text. Render those names
// as artwork without changing the saved note or its free-form instructions.
const equipmentPattern = new RegExp(`(${equipmentNames.join('|')})`, 'g')
export function EquipmentNoteText({ text }: { text: string }) {
  return <div className="mt-3 whitespace-pre-wrap text-white/80">{text.split(equipmentPattern).map((part, index) =>
    equipmentNames.includes(part)
      ? part.startsWith('ชุด') ? <SetBadge key={index} name={part.slice(3)} /> : <EquipmentItem key={index} name={part} kind="ring" />
      : part,
  )}</div>
}
