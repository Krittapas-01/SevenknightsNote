import { equipmentNames, ringImage, setIcon, setImages } from '../data/equipment'

export default function EquipmentLoadout({ sets, rings }: { sets: string[]; rings: string[] }) {
  if (!sets.length && !rings.length) return null
  return (
    <div className="mt-2 flex flex-wrap items-start gap-2">
      {sets.map((name, index) => <SetBadge key={`set-${index}`} name={name} />)}
      {rings.map((name, index) => <EquipmentItem key={`ring-${index}`} name={name} kind="ring" />)}
    </div>
  )
}

/** เซ็ตที่ต้องใส่: โชว์แค่สัญลักษณ์เซ็ต (ชี้ค้างดูชื่อ) */
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
