import { PawPrint } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import awakeningMedal from '../assets/ui/awakening-medal.webp'
import magicRole from '../assets/ui/magic-role.webp'
import attackRole from '../assets/ui/attack-role.webp'
import defenseRole from '../assets/ui/defense-role.webp'
import supportRole from '../assets/ui/support-role.webp'
import universalRole from '../assets/ui/universal-role.webp'
import { HERO_TYPES, baseName, getUnit, isAwake, type HeroType, RARE } from '../data/heroes'

const ROLE_BADGE: Record<HeroType, { image: string; tone: string }> = {
  attack: { image: attackRole, tone: '#a82d30' },
  magic: { image: magicRole, tone: '#245c98' },
  defense: { image: defenseRole, tone: '#79512f' },
  support: { image: supportRole, tone: '#b68a18' },
  universal: { image: universalRole, tone: '#643897' },
}

const seg = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter('th', { granularity: 'grapheme' }) : null
/** Game slots: rounded top-left/bottom-right, near-square opposite corners. */
export const UNIT_SLOT_RADIUS = '24% 4% 24% 4%'
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
  const roleBadge = u.type ? ROLE_BADGE[u.type] : null
  const round = shape === 'round'
  const awake = isAwake(u.name)
  const label = baseName(u.name)

  return (
    <div
      className={`unit-card relative h-full w-full overflow-hidden ${awake ? 'unit-awake' : RARE.has(label) ? 'unit-rare' : ''} ${round ? 'rounded-full' : ''} ${className}`}
      style={{ '--unit-color': color, ...(!round ? { borderRadius: UNIT_SLOT_RADIUS } : {}) } as CSSProperties}
      title={u.name}
    >
      {u.img && failedImage !== u.img ? (
        <img src={u.img} alt={u.name} className={`absolute inset-0 h-full w-full object-cover ${shape === 'hero' ? 'origin-[50%_24%] scale-[1.6]' : ''}`} draggable={false} loading="lazy" decoding="async" onError={() => setFailedImage(u.img!)} />
      ) : (
        <div className="unit-monogram absolute inset-0 grid place-items-center pb-[18%] font-bold text-white/90"
          style={{ fontSize: round ? '0.8em' : '1.15em', textShadow: '0 2px 4px rgba(0,0,0,.6)' }}>
          {shape === 'pet' ? <PawPrint className="h-[40%] w-[40%] opacity-80" /> : initials(label)}
        </div>
      )}

      {u.type && roleBadge && !round && (
        <div className="unit-role-badge" style={{ '--role-tone': roleBadge.tone } as CSSProperties}
          title={HERO_TYPES[u.type].label}>
          <img src={roleBadge.image} alt={HERO_TYPES[u.type].label} draggable={false} />
        </div>
      )}

      {awake && !round && (
        <img src={awakeningMedal} alt="อเวค" title="อเวค"
          className="pointer-events-none absolute right-0.5 top-0.5 h-auto w-[28%] min-w-4 drop-shadow-sm"
          draggable={false} />
      )}

      {showName && !round && (
        <div className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-[#080d19] via-[#080d19]/85 to-transparent px-1 pb-1 pt-3 text-center text-[0.68em] font-medium leading-tight text-white">
          {label}
        </div>
      )}
    </div>
  )
}
