import { baseName, getUnit } from '../data/heroes'
import type { HeroNote } from '../lib/types'
import EquipmentLoadout from './EquipmentLoadout'
import Modal from './Modal'
import UnitCard from './UnitCard'
import { StatsGrid } from './HeroStats'
import { hasStats } from '../lib/stats'

/** Match old notes by base name only when they do not specify another form. */
function noteFor(hero: string, notes: HeroNote[]) {
  const name = getUnit(hero)?.name ?? hero
  return notes.find((note) => note.hero === hero || (getUnit(note.hero)?.name ?? note.hero) === name)
    ?? notes.find((note) => (getUnit(note.hero)?.name ?? note.hero) === baseName(name))
}

export default function HeroDetailModal({ hero, notes, onClose }: {
  hero: string
  notes: HeroNote[]
  onClose: () => void
}) {
  const name = getUnit(hero)?.name ?? hero
  const note = noteFor(hero, notes)
  return (
    <Modal open title="รายละเอียดตัวละคร" onClose={onClose}>
      <div className="flex items-center gap-4 border-b border-gold/15 pb-5">
        <div className="h-24 w-24 shrink-0 text-base sm:h-28 sm:w-28">
          <UnitCard id={hero} showName={false} />
        </div>
        <div className="min-w-0">
          <h3 className="break-words text-2xl font-semibold text-gold">{name}</h3>
          <p className="mt-1 text-sm text-white/50">สเตตัสและของที่จดไว้ในคอมพ์นี้</p>
        </div>
      </div>
      <section className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
        <h4 className="text-sm font-semibold text-gold">สเตตัส / วิธีจัดของ</h4>
        <p className={`mt-3 whitespace-pre-wrap break-words text-base leading-relaxed ${note?.text.trim() ? 'text-white/90' : 'text-white/45'}`}>
          {note?.text.trim() ? note.text : hasStats(note?.stats) ? '' : 'ยังไม่ได้ระบุสเตตัสในคอมพ์นี้'}
        </p>
        <StatsGrid stats={note?.stats} className="mt-3" />
      </section>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <section className="rounded-2xl border border-gold/15 bg-black/20 p-4">
          <h4 className="text-sm font-semibold text-gold">แหวน</h4>
          {note?.rings.length ? <EquipmentLoadout rings={note.rings} sets={[]} />
            : <p className="mt-3 text-sm text-white/45">ยังไม่ได้ระบุแหวน</p>}
        </section>
        <section className="rounded-2xl border border-gold/15 bg-black/20 p-4">
          <h4 className="text-sm font-semibold text-gold">เซ็ตอุปกรณ์</h4>
          {note?.sets.length ? <EquipmentLoadout sets={note.sets} rings={[]} />
            : <p className="mt-3 text-sm text-white/45">ยังไม่ได้ระบุเซ็ตอุปกรณ์</p>}
        </section>
      </div>
      <button type="button" onClick={onClose} className="btn-gold mt-5 w-full">ปิดรายละเอียด</button>
    </Modal>
  )
}
