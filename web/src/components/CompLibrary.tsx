import { ArrowLeft, Search, Shield, Swords } from 'lucide-react'
import { houseLabel, tagText } from '../lib/tags'
import { useEffect, useMemo, useState } from 'react'
import { getUnit, unitLabel, unitBase } from '../data/heroes'
import type { HeroNote, SkillStep, Target, Team } from '../lib/types'
import Modal from './Modal'
import EquipmentLoadout from './EquipmentLoadout'
import TeamPanel from './TeamPanel'
import { tx, L } from '../lib/i18n'

export type Comp = { id: string; team: Team; skills: SkillStep[]; note: string; heroNotes: HeroNote[] }
export type Defense = Comp & { type: string; counters: Comp[] }
type Library = { defenses: Defense[] }

/** ประเภทบ้านจากแท็กของบ้านศัตรู (แท็กแรกที่เป็น กายภาพ/เวท/แทงก์ · กายภาพ = โจมตี) */
function houseType(tags: string[]) {
  for (const t of tags.map((x) => x.trim())) {
    if (t === 'โจมตี' || t === 'กายภาพ' || t === 'กาย') return 'โจมตี'
    if (t === 'เวทย์' || t === 'เวท') return 'เวทย์'
    if (t === 'ถึก') return 'ถึก'
  }
  return 'อื่นๆ'
}
/** ที่จดไว้ = ทีมที่กิลด์นี้จดไว้เอง (แยกกันทุกกิลด์ ไม่ใช้ข้อมูลกลาง) */
function libraryOf(targets: Target[]): Library {
  return {
    defenses: targets.map((t) => ({
      id: t.id, type: houseType(t.tags), team: t.team, skills: t.team.skills ?? [], note: t.note, heroNotes: [],
      counters: t.counters.map((c) => ({ id: c.id, team: c.team, skills: c.skills, note: c.note, heroNotes: c.heroNotes ?? [] })),
    })),
  }
}

type Props = {
  open: boolean
  /** บ้านศัตรู + ทีมแก้ของกิลด์นี้ */
  targets: Target[]
  guildName: string
  /** ไม้ → เปิดแท็บบ้านกันก่อน, ไม้ → เปิดแท็บทีมแก้ก่อน */
  initialTab: 'defense' | 'attack'
  onPick: (c: Comp) => void
  /** ถ้าส่งมา = โหมดเลือก "บ้านที่จะตี" (แสดงเฉพาะบ้านกัน ปุ่มเป็น "ตีบ้านนี้") */
  onPickDefense?: (d: Defense) => void
  /** เปิดมาที่ทีมแก้ของบ้านนี้เลย */
  focusDefenseId?: string
  onClose: () => void
}

const TYPES = ['ทั้งหมด', 'โจมตี', 'เวทย์', 'ถึก', 'อื่นๆ']
const PAGE = 24

/** ประเภทของทีมเอง (ดูจากอัศวินส่วนใหญ่): กายภาพ / เวท / แทงก์ — ซัพ/สมดุลไม่นับ */
const TEAM_TYPE: Record<string, string> = { attack: 'โจมตี', magic: 'เวทย์', defense: 'ถึก' }
export function teamType(t: Team) {
  const n: Record<string, number> = {}
  for (const id of t.slots) {
    const k = id ? TEAM_TYPE[getUnit(id)?.type ?? ''] : undefined
    if (k) n[k] = (n[k] ?? 0) + 1
  }
  const best = Object.entries(n).sort((a, b) => b[1] - a[1])
  return !best.length || (best[1] && best[1][1] === best[0][1]) ? 'อื่นๆ' : best[0][0]
}
/** บ้านกัน → "บ้านโจมตี", ทีมแก้ → "ทีมโจมตี" */
const typeLabel = (t: string, attack: boolean) => (t === 'ทั้งหมด' ? t : attack ? `ทีม${tagText(t)}` : houseLabel(t))

const teamText = (t: Team, extra = '') =>
  [...t.slots, t.pet, ...t.extras].map((id) => (id ? `${getUnit(id)?.name ?? ''} ${unitBase(id)}` : '')).join(' ') + ' ' + extra

export default function CompLibrary({ open, targets, guildName, initialTab, onPick, onPickDefense, focusDefenseId, onClose }: Props) {
  const pickMode = !!onPickDefense
  const [lib, setLib] = useState<Library | null>(null)
  const [tab, setTab] = useState<'defense' | 'attack'>(initialTab)
  const [q, setQ] = useState('')
  const [type, setType] = useState('ทั้งหมด')
  const [vs, setVs] = useState<Defense | null>(null) // ดูทีมแก้ของบ้านนี้
  const [limit, setLimit] = useState(PAGE)

  useEffect(() => {
    if (!open) return
    const l = libraryOf(targets)
    setLib(l)
    setVs(focusDefenseId ? l.defenses.find((d) => d.id === focusDefenseId) ?? null : null)
    setTab(pickMode ? 'defense' : initialTab)
    setQ('')
    setType('ทั้งหมด')
    setLimit(PAGE)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialTab, focusDefenseId, pickMode])

  const list = useMemo(() => {
    if (!lib) return []
    const s = q.trim().toLowerCase()
    // แท็บบ้านกัน: กรองตามประเภทบ้าน · แท็บทีมแก้: กรองตามประเภทของทีมแก้เอง (ไม่ใช่บ้านที่แก้)
    const defs = lib.defenses.filter((d) => type === 'ทั้งหมด' || tab === 'attack' || d.type === type)
    const items =
      vs ? vs.counters.map((c) => ({ comp: c, vs })) :
      tab === 'defense' ? defs.map((d) => ({ comp: d as Comp, vs: null as Defense | null, def: d })) :
      defs.flatMap((d) => d.counters.filter((c) => type === 'ทั้งหมด' || teamType(c.team) === type).map((c) => ({ comp: c, vs: d })))
    return items.filter((it) => !s || teamText(it.comp.team, it.comp.note).toLowerCase().includes(s))
  }, [lib, q, type, tab, vs])

  return (
    <Modal open={open} title={onPickDefense ? tx('เลือกบ้านที่จะตี') : tx('เลือกจากที่จดไว้')} onClose={onClose} wide>
      {!lib ? (
        <p className="py-10 text-center text-white/50">{tx('กำลังโหลด...')}</p>
      ) : (
        <>
          {onPickDefense ? null : vs ? (
            <button onClick={() => setVs(null)} className="mb-3 flex items-center gap-1 text-sm text-white/70 hover:text-white">
              <ArrowLeft className="h-4 w-4" />{' '}{tx('กลับ · ทีมแก้ของบ้าน')}{' '}{vs.team.slots.filter(Boolean).map((id) => unitLabel(id)).join(' · ')}
            </button>
          ) : (
            <div className="pill mb-3 inline-flex p-1">
              {([['defense', tx('บ้าน'), Shield], ['attack', tx('ทีมแก้'), Swords]] as const).map(([k, label, Icon]) => (
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
                placeholder={tx('ค้นหาชื่ออัศวิน / สัตว์เลี้ยง / โน้ต')}
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
                    {typeLabel(t, tab === 'attack')}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-white/45">
            {L(`${list.length} ทีม`, `${list.length} teams`)}{' '}{!vs && type !== 'ทั้งหมด' && `(${typeLabel(type, tab === 'attack')})`}{' '}{tx('· ทีมที่กิลด์')}{' '}{guildName}{' '}{tx('จดไว้ในแท็บ "บ้านศัตรู"')}
          </p>

          {lib.defenses.length === 0 && (
            <p className="mt-6 rounded-xl border border-dashed border-white/15 p-8 text-center text-white/55">
              {tx('กิลด์นี้ยังไม่ได้จดบ้านศัตรู — ไปเพิ่มบ้านศัตรูและทีมแก้ที่แท็บ "บ้านศัตรู" ก่อน แล้วจะมีให้เลือกที่นี่')}
            </p>
          )}
          <div className="mt-4 grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {list.slice(0, limit).map(({ comp, vs: against, def }: { comp: Comp; vs: Defense | null; def?: Defense }) => (
              <div key={comp.id} className="flex flex-col">
                <TeamPanel variant={tab === 'defense' && !vs ? 'enemy' : 'ally'} size="sm" team={comp.team} skills={comp.skills} heroNotes={comp.heroNotes} />
                {against && !vs && (
                  <p className="mt-3 truncate text-xs text-white/55">
                    {tx('แก้บ้าน:')}{' '}{against.team.slots.filter(Boolean).map((id) => unitLabel(id)).join(' · ')}
                  </p>
                )}
                {comp.note && <p className="mt-2 line-clamp-2 text-sm text-white/80">{comp.note}</p>}
                {comp.heroNotes.length > 0 && (
                  <details className="mt-3 rounded-xl border border-gold/15 bg-black/15 p-3">
                    <summary className="cursor-pointer text-sm text-gold">{tx('เครื่องประดับ / เซต / ค่าความสามารถรายตัว')}</summary>
                    <div className="mt-3 space-y-3">
                      {comp.heroNotes.map((note, index) => (
                        <div key={index}>
                          <p className="text-sm font-semibold text-gold">{unitLabel(note.hero)}</p>
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
                      {tx('ตีบ้านนี้')}{' '}{def.counters.length > 0 && L(`(+ทีมแก้ ${def.counters.length})`, `(+${def.counters.length} counters)`)}
                    </button>
                  ) : (
                    <button onClick={() => onPick(comp)} className="btn-gold flex-1 px-3 py-1.5 text-sm">{tx('ใช้ทีมนี้')}</button>
                  )}
                  {!onPickDefense && def && def.counters.length > 0 && (
                    <button onClick={() => setVs(def)} className="pill px-3 py-1.5 text-sm hover:border-gold">
                      {tx('ทีมแก้')}{' '}{def.counters.length}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {list.length > limit && (
            <button onClick={() => setLimit((l) => l + PAGE)} className="pill mx-auto mt-6 block px-6 py-2 text-sm hover:border-gold">
              {tx('แสดงเพิ่ม (')}{list.length - limit})
            </button>
          )}
          {list.length === 0 && <p className="py-10 text-center text-white/50">{tx('ไม่พบทีม')}</p>}
        </>
      )}
    </Modal>
  )
}
