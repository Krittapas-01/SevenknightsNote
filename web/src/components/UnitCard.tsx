import { Circle, HeartPulse, PawPrint, Shield, Sparkles, Swords } from 'lucide-react'
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
  const u = getUnit(id)
  if (!u) return null
  const color = u.type ? HERO_TYPES[u.type].color : shape === 'pet' ? '#c58b3d' : '#7c86a8'
  const Icon = u.type ? TYPE_ICON[u.type] : null
  const round = shape === 'round'
  const awake = isAwake(u.name)
  const label = baseName(u.name)

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${round ? 'rounded-full' : 'rounded-[10px]'} ${className}`}
      style={{
        border: `2px solid ${color}`,
        background: `radial-gradient(circle at 50% 30%, ${color}66, transparent 70%), linear-gradient(180deg, #3a4262, #1d2236)`,
        boxShadow: awake
          ? `0 0 0 1px #f4d58d, 0 0 10px rgba(244,213,141,.6), inset 0 0 12px ${color}33`
          : `0 0 0 1px rgba(0,0,0,.35), 0 3px 10px rgba(0,0,0,.35), inset 0 0 12px ${color}33`,
      }}
      title={u.name}
    >
      {u.img ? (
        <img src={u.img} alt={u.name} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      ) : (
        <div className="absolute inset-0 grid place-items-center pb-[18%] font-bold text-white/90"
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
        <div className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/90 via-black/60 to-transparent px-1 pb-0.5 pt-2 text-center text-[0.62em] font-medium leading-tight text-white">
          {label}
        </div>
      )}
    </div>
  )
}
