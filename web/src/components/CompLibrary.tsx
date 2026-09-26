import { ArrowLeft, Search, Shield, Swords } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getUnit } from '../data/heroes'
import type { HeroNote, SkillStep, Team } from '../lib/types'
import Modal from './Modal'
import EquipmentLoadout from './EquipmentLoadout'
import TeamPanel from './TeamPanel'

export type Comp = { id: string; team: Team; skills: SkillStep[]; note: string; heroNotes: HeroNote[] }
export type Defense = Comp & { type: string; counters: Comp[] }
type Library = { source: { name: string; url: string; fetchedAt: string; sample?: boolean }; defenses: Defense[] }

let cache: Promise<Library> | null = null
// โหลดไฟล์คลังตอนเปิดครั้งแรก (ไฟล์ใหญ่ ไม่ให้หน้าเว็บหลักช้า)
const load = () => (cache ??= import('../data/comps.json').then((m) => m.default as unknown as Library))

type Props = {
  open: boolean
  /** ไม้กัน → เปิดแท็บทีมกันก่อน, ไม้บุก → เปิดแท็บทีมแก้ก่อน */
  initialTab: 'defense' | 'attack'
  onPick: (c: Comp) => void
  /** ถ้าส่งมา = โหมดเลือก "บ้านที่จะตี" (แสดงเฉพาะทีมกัน ปุ่มเป็น "ตีบ้านนี้") */
  onPickDefense?: (d: Defense) => void
  /** เปิดมาที่ทีมแก้ของบ้านนี้เลย */
  focusDefenseId?: string
  onClose: () => void
}

const TYPES = ['ทั้งหมด', 'กายภาพ', 'เวทย์', 'ถึก', 'อื่นๆ']
const PAGE = 24

const teamText = (t: Team, extra = '') =>
  [...t.slots, t.pet, ...t.extras].map((id) => getUnit(id)?.name ?? '').join(' ') + ' ' + extra

export default function CompLibrary({ open, initialTab, onPick, onPickDefense, focusDefenseId, onClose }: Props) {
  const pickMode = !!onPickDefense
  const [lib, setLib] = useState<Library | null>(null)
  const [tab, setTab] = useState<'defense' | 'attack'>(initialTab)
  const [q, setQ] = useState('')
  const [type, setType] = useState('ทั้งหมด')
  const [vs, setVs] = useState<Defense | null>(null) // ดูทีมแก้ของบ้านนี้
  const [limit, setLimit] = useState(PAGE)

  useEffect(() => {
    if (!open) return
    load().then((l) => {
      setLib(l)
      setVs(focusDefenseId ? l.defenses.find((d) => d.id === focusDefenseId) ?? null : null)
    })
    setTab(pickMode ? 'defense' : initialTab)
    setQ('')
    setType('ทั้งหมด')
    setVs(null)
    setLimit(PAGE)
  }, [open, initialTab, focusDefenseId, pickMode])

  const list = useMemo(() => {
    if (!lib) return []
    const s = q.trim().toLowerCase()
    const defs = lib.defenses.filter((d) => type === 'ทั้งหมด' || d.type === type)
    const items =
      vs ? vs.counters.map((c) => ({ comp: c, vs })) :
      tab === 'defense' ? defs.map((d) => ({ comp: d as Comp, vs: null as Defense | null, def: d })) :
      defs.flatMap((d) => d.counters.map((c) => ({ comp: c, vs: d })))
    return items.filter((it) => !s || teamText(it.comp.team, it.comp.note).toLowerCase().includes(s))
  }, [lib, q, type, tab, vs])

  return (
    <Modal open={open} title={onPickDefense ? 'เลือกบ้านที่จะตี' : 'คลังคอมพ์'} onClose={onClose} wide>
      {!lib ? (
        <p className="py-10 text-center text-white/50">กำลังโหลด...</p>
      ) : (
        <>
          {onPickDefense ? null : vs ? (
            <button onClick={() => setVs(null)} className="mb-3 flex items-center gap-1 text-sm text-white/70 hover:text-white">
              <ArrowLeft className="h-4 w-4" /> กลับ · ทีมแก้ของบ้าน {vs.team.slots.filter(Boolean).map((id) => getUnit(id)?.name).join(' · ')}
            </button>
          ) : (
            <div className="pill mb-3 inline-flex p-1">
              {([['defense', 'ทีมกัน (บ้าน)', Shield], ['attack', 'ทีมบุก (ทีมแก้)', Swords]] as const).map(([k, label, Icon]) => (
                <button
                  key={k}
                  onClick={() => { setTab(k); setLimit(PAGE) }}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm ${tab === k ? 'bg-gold font-semibold text-ink' : 'text-white/70 hover:bg-white/10'}`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <label className="pill flex min-w-52 flex-1 items-center gap-2 px-3 py-2">
              <Search className="h-4 w-4 text-white/60" />
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setLimit(PAGE) }}
                placeholder="ค้นหาชื่อฮีโร่ / สัตว์เลี้ยง / โน้ต"
                className="w-full bg-transparent outline-none placeholder:text-white/40"
              />
            </label>
            {!vs && (
              <div className="flex flex-wrap gap-1.5">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => { setType(t); setLimit(PAGE) }}
                    className={`rounded-full border px-3 py-0.5 text-sm ${type === t ? 'border-gold bg-gold/15 text-gold' : 'border-white/15 text-white/70 hover:bg-white/5'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-white/45">
            {list.length} ทีม {tab === 'attack' && !vs && type !== 'ทั้งหมด' && `(ที่ใช้แก้บ้าน${type})`} · ข้อมูลจากกิลด์ {lib.source.name} บน 7k-combo
            {lib.source.sample && ' (ตัวอย่าง — รันสคริปต์ import เพื่อดึงข้อมูลทั้งหมด)'}
          </p>

          <div className="mt-4 grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {list.slice(0, limit).map(({ comp, vs: against, def }: { comp: Comp; vs: Defense | null; def?: Defense }) => (
              <div key={comp.id} className="flex flex-col">
                <TeamPanel variant={tab === 'defense' && !vs ? 'enemy' : 'ally'} size="sm" team={comp.team} skills={comp.skills} />
                {against && !vs && (
                  <p className="mt-3 truncate text-xs text-white/55">
                    แก้บ้าน: {against.team.slots.filter(Boolean).map((id) => getUnit(id)?.name).join(' · ')}
                  </p>
                )}
                {comp.note && <p className="mt-2 line-clamp-2 text-sm text-white/80">{comp.note}</p>}
                {comp.heroNotes.length > 0 && (
                  <details className="mt-3 rounded-xl border border-gold/15 bg-black/15 p-3">
                    <summary className="cursor-pointer text-sm text-gold">แหวน / เซ็ต / สเตตัสรายตัว</summary>
                    <div className="mt-3 space-y-3">
                      {comp.heroNotes.map((note, index) => (
                        <div key={index}>
                          <p className="text-sm font-semibold text-gold">{getUnit(note.hero)?.name ?? note.hero}</p>
                          {note.text && <p className="mt-1 text-xs text-white/75">{note.text}</p>}
                          <EquipmentLoadout sets={note.sets} rings={note.rings} />
                        </div>
                      ))}
                    </div>
                  </details>
                )}
                <div className="mt-auto flex gap-2 pt-3">
                  {onPickDefense && def ? (
                    <button onClick={() => onPickDefense(def)} className="btn-gold flex-1 px-3 py-1.5 text-sm">
                      ตีบ้านนี้ {def.counters.length > 0 && `(+ทีมแก้ ${def.counters.length})`}
                    </button>
                  ) : (
                    <button onClick={() => onPick(comp)} className="btn-gold flex-1 px-3 py-1.5 text-sm">ใช้ทีมนี้</button>
                  )}
                  {!onPickDefense && def && def.counters.length > 0 && (
                    <button onClick={() => setVs(def)} className="pill px-3 py-1.5 text-sm hover:border-gold">
                      ทีมแก้ {def.counters.length}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {list.length > limit && (
            <button onClick={() => setLimit((l) => l + PAGE)} className="pill mx-auto mt-6 block px-6 py-2 text-sm hover:border-gold">
              แสดงเพิ่ม ({list.length - limit})
            </button>
          )}
          {list.length === 0 && <p className="py-10 text-center text-white/50">ไม่พบทีม</p>}
        </>
      )}
    </Modal>
  )
}
