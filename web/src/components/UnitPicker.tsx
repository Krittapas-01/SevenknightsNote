import { Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { HEROES, HEROES_WITH_BASE, HERO_TYPES, PETS, customId, matchUnit, type HeroType } from '../data/heroes'
import Modal from './Modal'
import type { SlotKind } from './TeamPanel'
import UnitCard from './UnitCard'

type Props = {
  open: boolean
  kind: SlotKind
  index: number
  current: string | null
  /** id ที่ใช้อยู่แล้วในทีม (กันเลือกซ้ำ) */
  used: string[]
  /** ทีมเต็มแล้ว (ใช้กับช่องฮีโร่ว่าง) */
  full: boolean
  onPick: (id: string | null) => void
  onClose: () => void
  /** ให้พิมพ์ชื่อที่ไม่มีในรายการได้ (ค่าเริ่มต้น: ได้) */
  allowCustom?: boolean
  /** แสดงร่างปกติของตัวที่มีร่าง awake ด้วย */
  includeBaseForms?: boolean
}

export default function UnitPicker({ open, kind, index, current, used, full, onPick, onClose, allowCustom = true, includeBaseForms = false }: Props) {
  const [q, setQ] = useState('')
  const [type, setType] = useState<HeroType | 'all'>('all')
  useEffect(() => {
    if (open) { setQ(''); setType('all') }
  }, [open])

  const list = kind === 'hero' ? (includeBaseForms ? HEROES_WITH_BASE : HEROES) : PETS
  const title = kind === 'hero' ? 'เลือกฮีโร่' : kind === 'pet' ? 'เลือกสัตว์เลี้ยงหลัก' : `เลือกสัตว์เลี้ยงเสริม ${index + 1}`

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return list.filter((u) => (type === 'all' || u.type === type) && matchUnit(u, s))
  }, [list, q, type])

  const exact = list.some((u) => u.name === q.trim())
  const blocked = kind === 'hero' && full && !current

  return (
    <Modal open={open} title={title} onClose={onClose}>
      {blocked && (
        <p className="mb-3 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200">ทีมมีฮีโร่ครบ 3 ตัวแล้ว เอาตัวเดิมออกก่อนถึงจะเพิ่มได้</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <label className="pill flex flex-1 items-center gap-2 px-3 py-2">
          <Search className="h-4 w-4 text-white/60" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาชื่อ..."
            className="w-full bg-transparent outline-none placeholder:text-white/40"
          />
        </label>
        {current && (
          <button type="button" onClick={() => onPick(null)} className="pill flex items-center gap-1.5 px-3 py-2 text-sm text-red-200 hover:bg-red-500/20">
            <Trash2 className="h-4 w-4" /> เอาออก
          </button>
        )}
      </div>

      {kind === 'hero' && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(['all', ...Object.keys(HERO_TYPES)] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t as HeroType | 'all')}
              className={`rounded-full border px-3 py-0.5 text-sm ${type === t ? 'border-gold bg-gold/15 text-gold' : 'border-white/15 text-white/70 hover:bg-white/5'}`}
            >
              {t === 'all' ? 'ทั้งหมด' : HERO_TYPES[t as HeroType].label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6">
        {filtered.map((u) => {
          const taken = used.includes(u.id) && u.id !== current
          const dis = taken || blocked
          return (
            <button
              key={u.id}
              type="button"
              disabled={dis}
              onClick={() => onPick(u.id)}
              className={`aspect-square text-[13px] transition ${dis ? 'opacity-30' : 'hover:-translate-y-0.5'} ${u.id === current ? 'rounded-[12px] ring-2 ring-gold ring-offset-2 ring-offset-[#1f2640]' : ''}`}
            >
              <UnitCard id={u.id} shape={kind === 'pet' ? 'pet' : kind === 'extra' ? 'round' : 'hero'} small />
            </button>
          )
        })}
      </div>

      {allowCustom && q.trim() && !exact && !blocked && (
        <button
          type="button"
          onClick={() => onPick(customId(q))}
          className="btn-gold mt-4 w-full px-4 py-2.5"
        >
          ใช้ชื่อ “{q.trim()}” (ไม่มีในรายการ)
        </button>
      )}
      {filtered.length === 0 && !q.trim() && <p className="mt-4 text-center text-white/50">ไม่มีรายการ</p>}
    </Modal>
  )
}
