import { itemName, type PackItemKey } from '../lib/packs'
import { L } from '../lib/i18n'
import prism from '../assets/packs/items/prism.webp'

/** รูปไอเท็มจาก 7K Atlas (ที่มาใน assets/packs/SOURCES.md) · ชื่อไฟล์ = key ของไอเท็ม */
const ART = Object.fromEntries(
  Object.entries(import.meta.glob<string>('../assets/packs/items/*.webp', { eager: true, import: 'default' }))
    .map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -5), url]),
) as Partial<Record<PackItemKey, string>>

/** ไอคอนปริซึม (สกุลเงินแพ็คในเกม) ขนาดเท่าตัวอักษร */
export function Prism({ className = '' }: { className?: string }) {
  return <img src={prism} alt={L('ปริซึม', 'Prism')} draggable={false} className={`inline-block h-[1.1em] w-[1.1em] -translate-y-px align-middle ${className}`} />
}

const short = (n: number) => n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 100_000 ? `${Math.round(n / 1000)}K` : n.toLocaleString('en-US')

/** ช่องของ 1 ชิ้นแบบในร้านเกม: กล่องมืด รูปไอเท็มกลาง จำนวนมุมล่าง ป้าย BONUS มุมขวาบน · muted = ไม่นับมูลค่า */
export default function PackTile({ k, n, bonus, muted, size = 'md', noCount }: { k: PackItemKey; n: number; bonus?: boolean; muted?: boolean; size?: 'sm' | 'md'; noCount?: boolean }) {
  const box = size === 'sm' ? 'h-11 w-11' : 'h-[52px] w-[52px]'
  return (
    <span title={`${itemName(k)}${noCount ? '' : ` ×${n.toLocaleString('en-US')}`}${muted ? L(' (ไม่นับ)', ' (not counted)') : ''}`}
      className={`pack-tile relative grid shrink-0 place-items-center rounded-lg ${box} ${muted ? 'is-muted' : ''}`}>
      {ART[k] && <img src={ART[k]} alt="" loading="lazy" decoding="async" draggable={false}
        className={`${size === 'sm' ? 'h-9 w-9' : 'h-11 w-11'} -translate-y-0.5 object-contain`} />}
      {bonus && <span className="pack-tile-bonus absolute -top-1 right-0.5 rounded-sm px-1 text-[8px] font-bold leading-[11px] tracking-wide">BONUS</span>}
      {!noCount && <span className="pack-tile-n absolute bottom-0 inset-x-0 text-center text-[11px] font-bold leading-4 tabular-nums">{short(n)}</span>}
      <span className="sr-only">{itemName(k)}</span>
    </span>
  )
}
