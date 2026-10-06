import { ChevronLeft, Eraser, LayoutGrid, Library, ListOrdered, Pencil, Plus, Trash2, Undo2, X } from 'lucide-react'
import { queueStyle } from '../lib/queue'
import { tagColor, tagStyle } from '../lib/tags'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import TeamPanel, { type SlotKind } from '../components/TeamPanel'
import UnitPicker from '../components/UnitPicker'
import { DndHub } from '../components/DndHub'
import HeroDock from '../components/HeroDock'
import CompLibrary, { type Comp } from '../components/CompLibrary'
import VsArena from '../components/VsArena'
import Modal from '../components/Modal'
import { useDragScroll } from '../lib/useDragScroll'
import { PRESET_TAGS, getUnit } from '../data/heroes'
import { api } from '../lib/api'
import { MAX_HEROES, addHeroToTeam, changeFormation, emptyTeam, heroCount, moveSlot, placeUnit, teamOps, SKILL_LABEL, type HeroNote, type SkillStep, type Team } from '../lib/types'
import { useGuild } from '../lib/useGuild'
import NotFound from './NotFound'
import { EquipmentNoteText } from '../components/EquipmentLoadout'
import HeroNotesTable from '../components/HeroNotesTable'

const copyNotes = (n?: HeroNote[]) => (n ?? []).map((x) => ({ ...x, sets: [...x.sets], rings: [...x.rings] }))

type Mode = 'view' | 'target' | 'counter'
type Picker = { side: 'target' | 'counter'; kind: SlotKind; index: number } | null

const clone = (t: Team): Team => JSON.parse(JSON.stringify(t))

export default function TargetPage() {
  const { gid = '', tid = '' } = useParams()
  const nav = useNavigate()
  const isNew = tid === 'new'
  const { data, error, canEdit, reload } = useGuild(gid)
  const target = data?.targets.find((t) => t.id === tid)

  const [sel, setSel] = useState(0)
  const [showAll, setShowAll] = useState(false) // หน้าต่างดูทีมแก้ทั้งหมด
  const allStrip = useRef<HTMLDivElement>(null)
  const allDrag = useDragScroll(allStrip)
  const [delAsk, setDelAsk] = useState<string | null>(null) // ทีมแก้ที่กดลบครั้งแรกแล้ว (รอกดยืนยัน)
  const [mode, setMode] = useState<Mode>('view')
  const [tDraft, setTDraft] = useState({ team: emptyTeam(), tags: [] as string[], note: '' })
  const [cDraft, setCDraft] = useState({ id: null as string | null, team: emptyTeam(), skills: [] as SkillStep[], note: '', heroNotes: [] as HeroNote[] })
  const [picker, setPicker] = useState<Picker>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [library, setLibrary] = useState<'target' | 'counter' | null>(null)

  useEffect(() => {
    if (isNew && canEdit) setMode('target')
  }, [isNew, canEdit])

  if (error) return <NotFound message={error} />
  if (!data) return <p className="py-24 text-center text-white/50">กำลังโหลด...</p>
  if (!isNew && !target) return <NotFound message="ไม่พบทีมเป้าหมายนี้" />
  if (isNew && !canEdit) return <NotFound message="ลิงก์นี้ไม่มีสิทธิ์แก้ไข" />

  const counters = target?.counters ?? []
  const current = counters[Math.min(sel, counters.length - 1)]

  // ---------- เริ่มแก้ไข ----------
  function editTarget() {
    if (!target) return
    setTDraft({ team: clone(target.team), tags: [...target.tags], note: target.note })
    setErr(null)
    setMode('target')
  }
  function editCounter(isAdd: boolean) {
    if (isAdd || !current) setCDraft({ id: null, team: emptyTeam(), skills: [], note: '', heroNotes: [] })
    else setCDraft({ id: current.id, team: clone(current.team), skills: [...current.skills], note: current.note, heroNotes: copyNotes(current.heroNotes) })
    setErr(null)
    setMode('counter')
  }
  function cancel() {
    setErr(null)
    if (isNew) nav(`/g/${gid}?tab=targets`)
    else setMode('view')
  }

  // ---------- เปลี่ยนค่าในทีม ----------
  const setTeam = (side: 'target' | 'counter', fn: (t: Team) => Team) => {
    if (side === 'target') setTDraft((d) => ({ ...d, team: fn(d.team) }))
    else
      setCDraft((d) => {
        const team = fn(d.team)
        return { ...d, team, skills: d.skills.filter((s) => team.slots[s.slot]) }
      })
  }
  function pick(id: string | null) {
    if (!picker) return
    const { side, kind, index } = picker
    setTeam(side, (t) => {
      const n = clone(t)
      if (kind === 'hero') n.slots[index] = id
      else if (kind === 'pet') n.pet = id
      else n.extras[index] = id
      if (n.skills) n.skills = n.skills.filter((k) => n.slots[k.slot])
      return n
    })
    setPicker(null)
  }
  const pickerTeam = picker?.side === 'target' ? tDraft.team : cDraft.team
  const pickerCurrent = !picker ? null : picker.kind === 'hero' ? pickerTeam.slots[picker.index] : picker.kind === 'pet' ? pickerTeam.pet : pickerTeam.extras[picker.index]
  const pickerUsed = [...pickerTeam.slots, pickerTeam.pet, ...pickerTeam.extras].filter(Boolean) as string[]

  // ---------- บันทึก / ลบ ----------
  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setErr(null)
    try {
      await fn()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const saveTarget = () =>
    run(async () => {
      if (heroCount(tDraft.team) === 0) throw new Error('ใส่ฮีโร่อย่างน้อย 1 ตัว')
      if (isNew) {
        const t = await api.createTarget(gid, tDraft)
        await reload()
        nav(`/g/${gid}/t/${t.id}`, { replace: true })
      } else {
        await api.updateTarget(gid, tid, tDraft)
        await reload()
      }
      setMode('view')
    })
  const deleteTarget = () => {
    if (!confirm('ลบทีมเป้าหมายนี้และทีมแก้ทั้งหมด?')) return
    run(async () => {
      await api.deleteTarget(gid, tid)
      await reload()
      nav(`/g/${gid}?tab=targets`, { replace: true })
    })
  }
  const saveCounter = () =>
    run(async () => {
      if (heroCount(cDraft.team) === 0) throw new Error('ใส่ฮีโร่อย่างน้อย 1 ตัว')
      const body = { team: cDraft.team, skills: cDraft.skills, note: cDraft.note, heroNotes: cDraft.heroNotes }
      if (cDraft.id) {
        await api.updateCounter(gid, cDraft.id, body)
        await reload()
      } else {
        await api.createCounter(gid, tid, body)
        await reload()
        setSel(counters.length) // ตัวใหม่อยู่ท้ายสุด
      }
      setMode('view')
    })
  const deleteCounter = () => {
    if (!cDraft.id || !confirm('ลบทีมแก้นี้?')) return
    run(async () => {
      await api.deleteCounter(gid, cDraft.id!)
      await reload()
      setSel(0)
      setMode('view')
    })
  }

  function pickComp(c: Comp) {
    if (library === 'target') setTDraft((d) => ({ ...d, team: clone(c.team), note: d.note || c.note }))
    else if (library === 'counter') {
      setCDraft((d) => ({ ...d, team: clone(c.team), skills: [...c.skills], note: c.note.slice(0, 500), heroNotes: copyNotes(c.heroNotes) }))
    }
    setLibrary(null)
  }

  function addTag(t: string) {
    const v = t.trim().slice(0, 20)
    if (!v || tDraft.tags.includes(v) || tDraft.tags.length >= 5) return
    setTDraft((d) => ({ ...d, tags: [...d.tags, v] }))
    setTagInput('')
  }

  // ---------- panels ----------
  const editingT = mode === 'target'
  const editingC = mode === 'counter'

  const leftTeam = editingC ? cDraft.team : current?.team ?? emptyTeam()
  const leftSkills = editingC ? cDraft.skills : current?.skills ?? []
  const leftTitle = editingC
    ? cDraft.id ? `แก้ไขทีมแก้ #${sel + 1}` : 'ทีมแก้ใหม่'
    : current ? `ทีมแก้ #${Math.min(sel, counters.length - 1) + 1}` : isNew ? 'ทีมแก้' : 'ยังไม่มีทีมแก้'

  const rightTeam = editingT ? tDraft.team : target?.team ?? emptyTeam()

  return (
    <DndHub>
    <div className={mode !== 'view' ? 'pb-56' : ''}>
      <Link to={`/g/${gid}?tab=targets`} className="inline-flex items-center gap-1 text-white/70 hover:text-white">
        <ChevronLeft className="h-5 w-5" /> {data.guild.name}
      </Link>

      {/* แถบเลือกทีมแก้ แบบปุ่มแคปซูลในเกม */}
      {!isNew && (
        <div className="mt-5 flex justify-center">
          <div className="scrollbar-thin pill flex max-w-full gap-1 overflow-x-auto p-1">
            {counters.map((c, i) => (
              <button
                key={c.id}
                disabled={mode !== 'view'}
                onClick={() => setSel(i)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm sm:text-base ${
                  i === Math.min(sel, counters.length - 1) && !(editingC && !cDraft.id)
                    ? 'bg-gradient-to-b from-[#fff1c9] to-[#e2bf72] font-semibold text-ink'
                    : 'text-white/70 hover:bg-white/10 disabled:hover:bg-transparent'
                }`}
              >
                ทีมแก้ #{i + 1}
              </button>
            ))}
            {canEdit && (
              <button
                disabled={mode !== 'view'}
                onClick={() => editCounter(true)}
                className={`flex shrink-0 items-center gap-1 rounded-full px-4 py-1.5 text-sm sm:text-base ${
                  editingC && !cDraft.id ? 'bg-gradient-to-b from-[#fff1c9] to-[#e2bf72] font-semibold text-ink' : 'text-gold hover:bg-white/10'
                }`}
              >
                <Plus className="h-4 w-4" /> เพิ่มทีมแก้
              </button>
            )}
          </div>
          {counters.length > 1 && (
            <button disabled={mode !== 'view'} onClick={() => setShowAll(true)}
              className="pill ml-2 flex shrink-0 items-center gap-1.5 px-4 py-1.5 text-sm text-gold hover:bg-white/10 disabled:opacity-40">
              <LayoutGrid className="h-4 w-4" /> ดูทั้งหมด
            </button>
          )}
        </div>
      )}

      {/* ดูทีมแก้ทั้งหมดพร้อมกัน (แบบ 7k-combo) · กดการ์ดเพื่อเปิดทีมนั้น */}
      <Modal open={showAll} title={`ทีมแก้ทั้งหมด (${counters.length})`} onClose={() => setShowAll(false)} wide>
        <div className="mb-5 flex justify-center">
          <div className="w-full max-w-md">
            <p className="mb-2 text-sm font-semibold text-red-300">ทีมเป้าหมาย</p>
            <TeamPanel variant="enemy" size="sm" team={target?.team ?? emptyTeam()} skills={target?.team.skills ?? []} />
          </div>
        </div>
        {/* แนวนอน เลื่อนซ้าย-ขวาได้ */}
        <div ref={allStrip} {...allDrag} className="scrollbar-thin -mx-1 flex cursor-grab gap-4 overflow-x-auto px-1 pb-3 select-none active:cursor-grabbing">
          {counters.map((c, i) => (
            <div key={c.id} role="button" tabIndex={0} onClick={() => { setSel(i); setShowAll(false) }}
              onKeyDown={(e) => e.key === 'Enter' && (setSel(i), setShowAll(false))}
              className={`flex w-[min(340px,85vw)] shrink-0 cursor-pointer flex-col rounded-2xl border border-white/10 p-3 text-left transition hover:bg-white/5 ${i === Math.min(sel, counters.length - 1) ? 'ring-1 ring-gold/60' : ''}`}>
              <span className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-gold">ทีมแก้ #{i + 1}</span>
                {canEdit && (
                  // กด 2 ครั้งถึงลบ กันกดพลาด
                  <button type="button" disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (delAsk !== c.id) return setDelAsk(c.id)
                      run(async () => {
                        await api.deleteCounter(gid, c.id)
                        await reload()
                        setSel(0)
                        setDelAsk(null)
                      })
                    }}
                    onBlur={() => setDelAsk((x) => (x === c.id ? null : x))}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${delAsk === c.id ? 'bg-red-600 font-semibold text-white' : 'text-white/45 hover:bg-red-500/15 hover:text-red-300'}`}>
                    <Trash2 className="h-3.5 w-3.5" /> {delAsk === c.id ? 'กดอีกครั้งเพื่อลบ' : 'ลบ'}
                  </button>
                )}
              </span>
              <span className="pointer-events-none block"><TeamPanel variant="ally" size="sm" team={c.team} skills={c.skills} heroNotes={c.heroNotes} /></span>
              {c.note && <span className="mt-2 line-clamp-2 text-sm text-white/80">{c.note}</span>}
              <span className="mt-2 self-end text-xs text-white/50">เปิดทีมนี้ ›</span>
            </div>
          ))}
        </div>
      </Modal>

      <div className="mt-8">
        <VsArena
          left={
            <TeamPanel
              variant="ally"
              team={leftTeam}
              heroNotes={editingC ? cDraft.heroNotes : current?.heroNotes ?? []}
              title={leftTitle}
              skills={leftSkills}
              editable={editingC}
              label="ทีมแก้"
              onSlotClick={(kind, index) => setPicker({ side: 'counter', kind, index })}
              onPlace={(ref, unit) => setCDraft((d) => {
                const r = placeUnit(d.team, d.skills, ref, unit)
                return r ? { ...d, ...r } : d
              })}
              onReset={() => setCDraft((d) => ({ ...d, team: emptyTeam(), skills: [] }))}
              onFormation={(f) => setCDraft((d) => ({ ...d, ...changeFormation(d.team, d.skills, f) }))}
              onMove={(from, to) => setCDraft((d) => ({ ...d, ...moveSlot(d.team, d.skills, from, to) }))}
              onSpeed={(s) => setTeam('counter', (t) => ({ ...t, speed: s }))}
              onSkills={(skills) => setCDraft((d) => ({ ...d, skills }))}
              className={isNew ? 'opacity-40' : ''}
            />
          }
          right={
            <TeamPanel
              variant="enemy"
              team={rightTeam}
              title={isNew ? 'ทีมเป้าหมายใหม่' : 'ทีมเป้าหมาย'}
              editable={editingT}
              label="ทีมเป้าหมาย"
              onSlotClick={(kind, index) => setPicker({ side: 'target', kind, index })}
              skills={rightTeam.skills ?? []}
              onSkills={(sk) => setTDraft((d) => ({ ...d, team: { ...d.team, skills: sk } }))}
              onPlace={(ref, unit) => setTDraft((d) => ({ ...d, team: teamOps.place(d.team, ref, unit) }))}
              onReset={() => setTDraft((d) => ({ ...d, team: emptyTeam() }))}
              onFormation={(f) => setTDraft((d) => ({ ...d, team: teamOps.formation(d.team, f) }))}
              onMove={(from, to) => setTDraft((d) => ({ ...d, team: teamOps.move(d.team, from, to) }))}
              onSpeed={(s) => setTeam('target', (t) => ({ ...t, speed: s }))}
            />
          }
        />
      </div>

      {/* ---------- แผงล่าง ---------- */}
      <div className="mx-auto mt-10 max-w-3xl">
        {err && <p className="mb-4 rounded-lg bg-red-500/15 px-4 py-2 text-red-200">{err}</p>}

        {editingC && (
          <div className="panel panel-gold p-5">
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setLibrary('counter')} className="flex items-center gap-1.5 rounded-full border border-sky-300/60 px-3 py-1.5 text-sm text-sky-100 hover:bg-sky-400/10">
                <Library className="h-4 w-4" /> เลือกจากคลังคอมพ์
              </button>
              <span className="text-xs text-white/50">กดวงกลมดาวล่างสุดเพื่อจองสกิล · กดตัวละคร 2 ครั้งเพื่อเอาออก</span>
            </div>
            <SkillOrder team={cDraft.team} skills={cDraft.skills} />
            <textarea
              value={cDraft.note}
              onChange={(e) => setCDraft((d) => ({ ...d, note: e.target.value }))}
              maxLength={500}
              rows={3}
              placeholder="โน้ต เช่น ทำช้า, ต้องมีของดี, แนะนำตัวนี้มากกว่าไคล์"
              className="mt-4 w-full rounded-xl border border-white/15 bg-black/20 p-3 outline-none focus:border-gold"
            />
            <div className="mt-4">
              <p className="mb-2 text-sm text-white/60">ของ/สเตตัสรายตัว</p>
              <HeroNotesTable notes={cDraft.heroNotes} editing team={cDraft.team.slots} onChange={(heroNotes) => setCDraft((d) => ({ ...d, heroNotes }))}
                onAddHero={(hero) => setCDraft((d) => ({ ...d, team: addHeroToTeam(d.team, hero) }))} />
            </div>
            <Actions busy={busy} onSave={saveCounter} onCancel={cancel} onDelete={cDraft.id ? deleteCounter : undefined} />
          </div>
        )}

        {editingT && (
          <div className="panel panel-enemy p-5">
            <div className="mb-4">
              <button onClick={() => setLibrary('target')} className="flex items-center gap-1.5 rounded-full border border-sky-300/60 px-3 py-1.5 text-sm text-sky-100 hover:bg-sky-400/10">
                <Library className="h-4 w-4" /> เลือกจากคลังคอมพ์
              </button>
            </div>
            <p className="text-sm text-white/60">แท็ก (สูงสุด 5)</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {tDraft.tags.map((t) => (
                <span key={t} className="flex items-center gap-1 rounded-full py-0.5 pl-3 pr-1 text-sm font-semibold" style={tagStyle(t)}>
                  {t}
                  <button onClick={() => setTDraft((d) => ({ ...d, tags: d.tags.filter((x) => x !== t) }))} className="rounded-full p-0.5 hover:bg-white/10">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              {PRESET_TAGS.filter((t) => !tDraft.tags.includes(t)).map((t) => (
                <button key={t} onClick={() => addTag(t)} className="rounded-full border border-dashed border-white/25 px-3 py-0.5 text-sm text-white/60 hover:border-sky-300 hover:text-sky-100">
                  + {t}
                </button>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput) } }}
                placeholder="แท็กอื่น + Enter"
                className="w-32 rounded-full border border-white/15 bg-black/20 px-3 py-0.5 text-sm outline-none focus:border-sky-300"
              />
            </div>
            <textarea
              value={tDraft.note}
              onChange={(e) => setTDraft((d) => ({ ...d, note: e.target.value }))}
              maxLength={500}
              rows={3}
              placeholder="โน้ตทีมเป้าหมาย เช่น เจอบ่อยในกิลด์ X, ตัวหลังสปีดสูง"
              className="mt-4 w-full rounded-xl border border-white/15 bg-black/20 p-3 outline-none focus:border-sky-300"
            />
            <Actions busy={busy} onSave={saveTarget} onCancel={cancel} onDelete={isNew ? undefined : deleteTarget} />
          </div>
        )}

        {mode === 'view' && target && (
          <div className="grid gap-5 md:grid-cols-2">
            <div className="panel panel-gold p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gold">{current ? `ทีมแก้ #${Math.min(sel, counters.length - 1) + 1}` : 'ทีมแก้'}</h3>
                {canEdit && (
                  // ยังไม่มีทีมแก้ = ปุ่มเพิ่ม (เหมือนกด "เพิ่มทีมแก้" ด้านบน)
                  <button onClick={() => editCounter(!current)} className="flex items-center gap-1 text-sm text-white/70 hover:text-gold">
                    {current ? <><Pencil className="h-4 w-4" /> แก้ไข</> : <><Plus className="h-4 w-4" /> เพิ่มทีมแก้</>}
                  </button>
                )}
              </div>
              {current ? (
                <>
                  <SkillOrder team={current.team} skills={current.skills} />
                  {current.note ? <EquipmentNoteText text={current.note} /> : <p className="mt-3 text-white/40">ไม่มีโน้ต</p>}
                </>
              ) : (
                <p className="mt-2 text-white/50">{canEdit ? 'กด “เพิ่มทีมแก้” เพื่อจดทีมที่ใช้ตีทีมนี้' : 'ยังไม่มีใครจดทีมแก้'}</p>
              )}
            </div>
            <div className="panel panel-enemy p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">ทีมเป้าหมาย</h3>
                {canEdit && (
                  <button onClick={editTarget} className="flex items-center gap-1 text-sm text-white/70 hover:text-gold">
                    <Pencil className="h-4 w-4" /> แก้ไข
                  </button>
                )}
              </div>
              {target.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {target.tags.map((t) => <span key={t} className="rounded-full px-3 py-0.5 text-sm font-semibold" style={tagStyle(t)}>{t}</span>)}
                </div>
              )}
              <p className="mt-3 whitespace-pre-wrap text-white/80">{target.note || <span className="text-white/40">ไม่มีโน้ต</span>}</p>
            </div>
            {current && (current.heroNotes?.length ?? 0) > 0 && (
              <div className="panel p-4 md:col-span-2 sm:p-5">
                <h3 className="mb-3 font-semibold text-gold">ของ/สเตตัสรายตัว · ทีมแก้ #{Math.min(sel, counters.length - 1) + 1}</h3>
                <HeroNotesTable notes={current.heroNotes!} />
              </div>
            )}
          </div>
        )}
      </div>

      <CompLibrary targets={data?.targets ?? []} guildName={data?.guild.name ?? ''} open={!!library} initialTab={library === 'counter' ? 'attack' : 'defense'} onPick={pickComp} onClose={() => setLibrary(null)} />

      <UnitPicker
        open={!!picker}
        kind={picker?.kind ?? 'hero'}
        index={picker?.index ?? 0}
        current={pickerCurrent}
        used={pickerUsed}
        full={heroCount(pickerTeam) >= MAX_HEROES}
        onPick={pick}
        onClose={() => setPicker(null)}
      />
      {mode !== 'view' && <HeroDock />}
    </div>
    </DndHub>
  )
}

function SkillOrder({ team, skills }: { team: Team; skills: SkillStep[] }) {
  if (!skills.length) return null
  return (
    <ol className="mt-3 flex flex-wrap items-center gap-1.5 text-sm">
      {skills.map((s, i) => (
        <li key={i} className="flex items-center gap-1.5">
          <span className="flex items-center gap-1.5 rounded-full bg-black/30 py-0.5 pl-0.5 pr-3">
            <span className="grid h-5 w-5 place-items-center rounded-full text-xs font-bold" style={queueStyle(i + 1)}>{i + 1}</span>
            {getUnit(team.slots[s.slot])?.name} · {SKILL_LABEL[s.skill]}
          </span>
          {i < skills.length - 1 && <span className="text-white/40">→</span>}
        </li>
      ))}
    </ol>
  )
}

function Actions({ busy, onSave, onCancel, onDelete }: { busy: boolean; onSave: () => void; onCancel: () => void; onDelete?: () => void }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button disabled={busy} onClick={onSave} className="btn-gold px-6 py-2">{busy ? 'กำลังบันทึก...' : 'บันทึก'}</button>
      <button disabled={busy} onClick={onCancel} className="pill px-5 py-2">ยกเลิก</button>
      {onDelete && (
        <button disabled={busy} onClick={onDelete} className="ml-auto flex items-center gap-1 rounded-full px-3 py-2 text-sm text-red-300 hover:bg-red-500/15">
          <Trash2 className="h-4 w-4" /> ลบ
        </button>
      )}
    </div>
  )
}
