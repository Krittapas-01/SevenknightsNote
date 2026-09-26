import { equipmentNames, ringImage, setImages } from '../data/equipment'

export default function EquipmentLoadout({ sets, rings }: { sets: string[]; rings: string[] }) {
  if (!sets.length && !rings.length) return null
  return (
    <div className="mt-2 flex flex-wrap items-start gap-2">
      {sets.map((name, index) => <EquipmentItem key={`set-${index}`} name={name} kind="set" />)}
      {rings.map((name, index) => <EquipmentItem key={`ring-${index}`} name={name} kind="ring" />)}
    </div>
  )
}

function EquipmentItem({ name, kind }: { name: string; kind: 'set' | 'ring' }) {
  const images = kind === 'set' ? setImages(name) : [ringImage(name)].filter(Boolean)
  const label = kind === 'set' ? `ชุด${name}` : name
  if (!images.length) return <span className="rounded-lg bg-white/10 px-2 py-1 text-xs text-white/80">{label}</span>
  const slots = ['อาวุธกายภาพ', 'อาวุธเวทย์', 'เกราะ']
  return (
    <span className={`inline-flex flex-col items-center gap-1 rounded-lg border border-gold/20 bg-black/20 p-1.5 align-middle ${kind === 'set' ? 'w-36' : 'w-20'}`} title={label}>
      <span className="flex gap-1">
        {images.map((src, index) => (
          <img key={src} src={src} alt={kind === 'set' ? `${label} · ${slots[index]}` : label}
            width={40} height={40} loading="lazy" decoding="async" draggable={false}
            className="h-10 w-10 rounded-md object-contain" />
        ))}
      </span>
      <span className="w-full break-words text-center text-[11px] leading-snug text-gold">{label}</span>
    </span>
  )
}

// Older counter notes store equipment names as plain text. Render those names
// as artwork without changing the saved note or its free-form instructions.
const equipmentPattern = new RegExp(`(${equipmentNames.join('|')})`, 'g')
export function EquipmentNoteText({ text }: { text: string }) {
  return <div className="mt-3 whitespace-pre-wrap text-white/80">{text.split(equipmentPattern).map((part, index) =>
    equipmentNames.includes(part)
      ? <EquipmentItem key={index} name={part.startsWith('ชุด') ? part.slice(3) : part} kind={part.startsWith('ชุด') ? 'set' : 'ring'} />
      : part,
  )}</div>
}
