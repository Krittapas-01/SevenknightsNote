import { X } from 'lucide-react'
import { StatsGrid, StatsImport, upsertStats } from './HeroStats'
import { baseName, getUnit } from '../data/heroes'
import { ringImage, setIcon, setImages } from '../data/equipment'
import type { HeroNote } from '../lib/types'
import UnitCard from './UnitCard'
import EquipmentEditor from './EquipmentEditor'
import AddHeroNote from './AddHeroNote'
import RecallStats from './RecallStats'

/**
 * ของ/สเตตัสรายตัว แบบตารางใน 7k-combo:
 * [ตัวละคร] [แหวน 3 ช่อง / เซ็ตไอเทม 3 ช่อง] [รายละเอียด]
 * editing = แก้ข้อความรายละเอียดได้ + ลบแถวได้ (แหวน/เซ็ตมาจากคลังคอมพ์)
 */
export default function HeroNotesTable({ notes, editing, onChange, team, onAddHero }: {
  notes: HeroNote[]
  editing?: boolean
  onChange?: (n: HeroNote[]) => void
  /** ทีม (ใช้ปุ่มเพิ่มแถวตอนแก้ไข) */
  team?: (string | null)[]
  /** เพิ่มฮีโร่เข้าทีมจากหน้าต่างอ่านสเตตัส (ทีมยังไม่ครบ 3) */
  onAddHero?: (hero: string) => void
}) {
  const addRow = editing && team && (
    <div className="flex flex-wrap items-center gap-x-3">
      <StatsImport team={team} onApply={(hero, stats) => onChange?.(upsertStats(notes, hero, stats))} onAddHero={onAddHero} />
      <AddHeroNote team={team} have={notes.map((n) => n.hero)} onAdd={(hero) => onChange?.([...notes, { hero, text: '', sets: [], rings: [] }].slice(0, 5))} />
    </div>
  )
  if (!notes.length) return addRow || null
  return (
    <>
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <div className="grid grid-cols-[auto_1fr] bg-white/5 text-sm font-semibold text-white/70 sm:grid-cols-[minmax(0,17rem)_1fr]">
        <div className="border-r border-white/10 px-4 py-2 text-center">ตัวละคร</div>
        <div className="px-4 py-2 text-center">รายละเอียด</div>
      </div>
      {notes.map((n, i) => (
        <div key={i} className="grid grid-cols-1 border-t border-white/10 sm:grid-cols-[minmax(0,17rem)_1fr]">
          <div className="flex gap-3 border-white/10 p-3 sm:border-r">
            <div className="w-16 shrink-0 text-center">
              <div className="aspect-[4/5] w-16 text-[12px]"><UnitCard id={n.hero} /></div>
              <div className="mt-1 truncate text-xs text-white/60">{baseName(getUnit(n.hero)?.name ?? n.hero)}</div>
            </div>
            {editing ? (
              <div className="min-w-0">
                <EquipmentEditor sets={n.sets} rings={n.rings}
                  onChange={(sets, rings) => onChange?.(notes.map((x, j) => (j === i ? { ...x, sets, rings } : x)))} />
                <RecallStats note={n} onApply={(v) => onChange?.(notes.map((x, j) => (j === i ? v : x)))} />
              </div>
            ) : (
              <div className="min-w-0 space-y-1.5">
                <Slots label="เซ็ต" items={n.sets.map((s) => ({ name: `ชุด${s}`, src: setIcon(s) ?? setImages(s)[0] }))} />
                <Slots label="แหวน" items={n.rings.map((r) => ({ name: r, src: ringImage(r) }))} />
              </div>
            )}
          </div>
          <div className="relative p-3 text-[15px] leading-relaxed text-white/85">
            {editing ? (
              <>
                <textarea
                  value={n.text}
                  onChange={(e) => onChange?.(notes.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                  maxLength={300}
                  rows={3}
                  className="block min-h-20 w-full resize-y rounded-lg border border-white/15 bg-black/20 p-2 pr-8 text-sm outline-none focus:border-gold"
                />
                <button type="button" onClick={() => onChange?.(notes.filter((_, j) => j !== i))} title="ลบแถวนี้"
                  className="absolute right-4 top-4 rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-red-300">
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <p className="whitespace-pre-wrap">{n.text || <span className="text-white/35">—</span>}</p>
            )}
            <StatsGrid stats={n.stats} />
          </div>
        </div>
      ))}
    </div>
    {addRow}
    </>
  )
}

/** ช่องของ 3 ช่องขึ้นไป (ไม่มีรูป = ขึ้นชื่อแทน, ชี้ค้างดูชื่อ) */
function Slots({ label, items }: { label: string; items: { name: string; src?: string }[] }) {
  const cells = [...items, ...Array.from({ length: Math.max(0, 3 - items.length) }, () => null)]
  return (
    <div>
      <div className="mb-0.5 text-[11px] text-white/45">{label}</div>
      <div className="flex flex-wrap gap-1">
        {cells.map((it, k) => (
          <span key={k} title={it?.name}
            className={`grid h-10 w-10 place-items-center overflow-hidden rounded-lg border ${it ? 'border-gold/30 bg-black/30' : 'border-white/10 bg-white/[.03]'}`}>
            {it && (it.src
              ? <img src={it.src} alt={it.name} className="h-full w-full object-contain" loading="lazy" draggable={false} />
              : <span className="px-0.5 text-center text-[8px] leading-tight text-white/70">{it.name}</span>)}
          </span>
        ))}
      </div>
    </div>
  )
}
