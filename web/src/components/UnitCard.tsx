import { Circle, HeartPulse, PawPrint, Shield, Sparkles, Swords } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { HERO_TYPES, baseName, getUnit, isAwake, type HeroType } from '../data/heroes'

const TYPE_ICON: Record<HeroType, typeof Swords> = {
  attack: Swords,
  magic: Sparkles,
  defense: Shield,
  support: HeartPulse,
  universal: Circle,
}

const seg = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter('th', { granularity: 'grapheme' }) : null
function initials(name: string) {
  const g = seg ? Array.from(seg.segment(name.replace(/\s+/g, '')), (s) => s.segment) : Array.from(name)
  return g.slice(0, 2).join('')
}

type Props = {
  id: string
  /** 'hero' = การ์ดสี่เหลี่ยมมีชื่อ, 'pet' = สี่เหลี่ยมมีไอคอนเท้า, 'round' = วงกลม */
  shape?: 'hero' | 'pet' | 'round'
  className?: string
  showName?: boolean
}

export default function UnitCard({ id, shape = 'hero', className = '', showName = true }: Props) {
  const [failedImage, setFailedImage] = useState<string | null>(null)
  const u = getUnit(id)
  if (!u) return null
  const color = u.type ? HERO_TYPES[u.type].color : shape === 'pet' ? '#c58b3d' : '#7c86a8'
  const Icon = u.type ? TYPE_ICON[u.type] : null
  const round = shape === 'round'
  const awake = isAwake(u.name)
  const label = baseName(u.name)

  return (
    <div
      className={`unit-card relative h-full w-full overflow-hidden ${awake ? 'unit-awake' : ''} ${round ? 'rounded-full' : 'rounded-[10px]'} ${className}`}
      style={{ '--unit-color': color } as CSSProperties}
      title={u.name}
    >
      {u.img && failedImage !== u.img ? (
        <img src={u.img} alt={u.name} className="absolute inset-0 h-full w-full object-cover" draggable={false} loading="lazy" decoding="async" onError={() => setFailedImage(u.img!)} />
      ) : (
        <div className="unit-monogram absolute inset-0 grid place-items-center pb-[18%] font-bold text-white/90"
          style={{ fontSize: round ? '0.8em' : '1.15em', textShadow: '0 2px 4px rgba(0,0,0,.6)' }}>
          {shape === 'pet' ? <PawPrint className="h-[40%] w-[40%] opacity-80" /> : initials(label)}
        </div>
      )}

      {Icon && !round && (
        <div className="absolute left-0.5 top-0.5 grid h-[22%] w-[22%] min-h-3 min-w-3 place-items-center rounded-[4px]"
          style={{ background: color }}>
          <Icon className="h-[70%] w-[70%] text-white" strokeWidth={2.5} />
        </div>
      )}

      {awake && !round && (
        <div className="absolute right-0.5 top-0.5 rounded-[4px] bg-gradient-to-b from-[#fff1c9] to-[#c9a35a] px-1 text-[0.55em] font-bold leading-[1.5] text-[#2a2213]" title="awake">
          AW
        </div>
      )}

      {showName && !round && (
        <div className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-[#080d19] via-[#080d19]/85 to-transparent px-1 pb-1 pt-3 text-center text-[0.68em] font-medium leading-tight text-white">
          {label}
        </div>
      )}
    </div>
  )
}
