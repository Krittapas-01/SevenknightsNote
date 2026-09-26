import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { RING_NAMES, SET_NAMES, ringImage, setImages } from '../data/equipment'
import Modal from './Modal'

const MAX_SETS = 3
const MAX_RINGS = 3

/** แก้เซ็ต/แหวนของฮีโร่ 1 ตัว: กดไอคอน = เอาออก · กด + = เลือกเพิ่ม */
export default function EquipmentEditor({ sets, rings, onChange }: {
  sets: string[]
  rings: string[]
  onChange: (sets: string[], rings: string[]) => void
}) {
  const [pick, setPick] = useState<'set' | 'ring' | null>(null)
  const options = pick === 'set' ? SET_NAMES.filter((x) => !sets.includes(x)) : RING_NAMES
  const add = (name: string) => {
    if (pick === 'set') onChange([...sets, name].slice(0, MAX_SETS), rings)
    else onChange(sets, [...rings, name].slice(0, MAX_RINGS))
    const full = pick === 'set' ? sets.length + 1 >= MAX_SETS : rings.length + 1 >= MAX_RINGS
    if (full) setPick(null)
  }
  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <Group label="เซ็ต" items={sets.map((s) => ({ name: `ชุด${s}`, src: setImages(s)[0] }))} max={MAX_SETS}
        onRemove={(i) => onChange(sets.filter((_, j) => j !== i), rings)} onAdd={() => setPick('set')} />
      <Group label="แหวน" items={rings.map((r) => ({ name: r, src: ringImage(r) }))} max={MAX_RINGS}
        onRemove={(i) => onChange(sets, rings.filter((_, j) => j !== i))} onAdd={() => setPick('ring')} />

      <Modal open={pick !== null} title={pick === 'set' ? 'เลือกเซ็ตไอเทม' : 'เลือกแหวน (เลือกซ้ำได้)'} onClose={() => setPick(null)}>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {options.map((name) => {
            const src = pick === 'set' ? setImages(name)[0] : ringImage(name)
            return (
              <button key={name} type="button" onClick={() => add(name)} title={pick === 'set' ? `ชุด${name}` : name}
                className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-black/20 p-1.5 hover:border-gold">
                {src ? <img src={src} alt={name} className="h-12 w-12 object-contain" draggable={false} /> : <span className="grid h-12 w-12 place-items-center text-[10px]">{name}</span>}
                <span className="line-clamp-2 text-center text-[10px] leading-tight text-white/70">{pick === 'set' ? name : name.replace(/^แหวน(แห่ง)?/, '')}</span>
              </button>
            )
          })}
        </div>
      </Modal>
    </div>
  )
}

function Group({ label, items, max, onRemove, onAdd }: {
  label: string
  items: { name: string; src?: string }[]
  max: number
  onRemove: (i: number) => void
  onAdd: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="mr-0.5 text-[11px] text-white/45">{label}</span>
      {items.map((it, i) => (
        <button key={i} type="button" onClick={() => onRemove(i)} title={`${it.name} — กดเพื่อเอาออก`}
          className="group relative grid h-10 w-10 place-items-center overflow-hidden rounded-lg border border-gold/30 bg-black/30">
          {it.src ? <img src={it.src} alt={it.name} className="h-full w-full object-contain" draggable={false} /> : <span className="px-0.5 text-[8px] leading-tight">{it.name}</span>}
          <span className="absolute inset-0 hidden place-items-center bg-black/60 group-hover:grid"><X className="h-4 w-4 text-red-300" /></span>
        </button>
      ))}
      {items.length < max && (
        <button type="button" onClick={onAdd} title={`เพิ่ม${label}`}
          className="grid h-10 w-10 place-items-center rounded-lg border border-dashed border-white/25 text-white/60 hover:border-gold hover:text-gold">
          <Plus className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
