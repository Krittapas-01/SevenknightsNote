import {
  Coins, Diamond, FlaskConical, Gem, Hexagon, KeyRound, Layers, Package, PackageOpen, Skull, Sparkle, Star, Sun, TestTube, Ticket, type LucideIcon,
} from 'lucide-react'
import ruby from '../assets/ui/ruby.webp'
import { itemName, type PackItemKey } from '../lib/packs'
import { L } from '../lib/i18n'

/** ไอคอน + สีของแต่ละชนิด (วาดเอง ไม่ใช้รูปไอเท็มจากเกม) */
const ICON: Record<PackItemKey, [LucideIcon, string]> = {
  rubies: [Gem, '#f0436a'], chests: [Package, '#e0a64a'], keys: [KeyRound, '#f2c45a'], gold: [Coins, '#f5c542'],
  pickup: [Ticket, '#ff9a3c'], collab: [Ticket, '#f25f6b'], permanent: [Ticket, '#a78bfa'], pet: [Ticket, '#4fd18b'],
  petWish: [Ticket, '#5bb8ff'], equip: [Ticket, '#f472b6'], card23: [Layers, '#8b9cff'], card3: [Layers, '#b7c2ff'],
  chaos: [FlaskConical, '#f3d34a'], oblivion: [FlaskConical, '#ff5a6e'], memories: [TestTube, '#e8577a'],
  awakening: [Gem, '#b48cff'], crystal: [Sparkle, '#ff8fb8'], rankUp: [PackageOpen, '#6cb6ff'], spark: [Sun, '#a99bff'],
  skillStone: [Diamond, '#7ee0ff'], raid: [Skull, '#f87171'], ore: [Hexagon, '#ffab3d'], star: [Star, '#ff8fd0'],
}

const short = (n: number) => n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 100_000 ? `${Math.round(n / 1000)}K` : n.toLocaleString('en-US')

/** ช่องของ 1 ชิ้นแบบในร้านเกม: กล่องมืด ไอคอนกลาง จำนวนมุมล่าง ป้าย BONUS มุมขวาบน · muted = ไม่นับมูลค่า */
export default function PackTile({ k, n, bonus, muted, size = 'md', noCount }: { k: PackItemKey; n: number; bonus?: boolean; muted?: boolean; size?: 'sm' | 'md'; noCount?: boolean }) {
  const [Icon, color] = ICON[k]
  const box = size === 'sm' ? 'h-11 w-11' : 'h-[52px] w-[52px]'
  return (
    <span title={`${itemName(k)}${noCount ? '' : ` ×${n.toLocaleString('en-US')}`}${muted ? L(' (ไม่นับ)', ' (not counted)') : ''}`}
      className={`pack-tile relative grid shrink-0 place-items-center rounded-lg ${box} ${muted ? 'is-muted' : ''}`}>
      {k === 'rubies'
        ? <img src={ruby} alt="" className={size === 'sm' ? 'h-6 w-6' : 'h-7 w-7'} draggable={false} />
        : <Icon className={size === 'sm' ? 'h-5 w-5' : 'h-6 w-6'} style={{ color }} strokeWidth={1.8} aria-hidden />}
      {bonus && <span className="pack-tile-bonus absolute -top-1 right-0.5 rounded-sm px-1 text-[8px] font-bold leading-[11px] tracking-wide">BONUS</span>}
      {!noCount && <span className="pack-tile-n absolute bottom-0 inset-x-0 text-center text-[11px] font-bold leading-4 tabular-nums">{short(n)}</span>}
      <span className="sr-only">{itemName(k)}</span>
    </span>
  )
}
