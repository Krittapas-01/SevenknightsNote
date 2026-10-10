import { Plus } from 'lucide-react'
import { baseName, getUnit, unitBase } from '../data/heroes'
import { tx } from '../lib/i18n'

/** ปุ่มเพิ่ม "อุปกรณ์/ค่าความสามารถรายตัว" ให้อัศวินในทีมที่ยังไม่มีแถว */
export default function AddHeroNote({ team, have, onAdd }: { team: (string | null)[]; have: string[]; onAdd: (hero: string) => void }) {
  const left = team.filter((h): h is string => !!h && !have.includes(h))
  if (!left.length || have.length >= 5) return null
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
      <span className="text-white/50">{tx('เพิ่มของรายตัว:')}</span>
      {left.map((h) => (
        <button key={h} type="button" onClick={() => onAdd(h)}
          className="flex items-center gap-1 rounded-full border border-dashed border-white/25 px-2.5 py-0.5 text-white/75 hover:border-gold hover:text-gold">
          <Plus className="h-3.5 w-3.5" /> {unitBase(h)}
        </button>
      ))}
    </div>
  )
}
