import { Check, ChevronLeft, Library, Pencil, Plus, Shield, Swords, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import CompLibrary, { type Comp, type Defense } from '../components/CompLibrary'
import TeamPanel from '../components/TeamPanel'
import { DndHub, HideWhileDock } from '../components/DndHub'
import HeroDock from '../components/HeroDock'
import OptionCard from '../components/OptionCard'
import type { SlotKind } from '../components/TeamPanel'
import UnitCard from '../components/UnitCard'
import UnitPicker from '../components/UnitPicker'
import { baseName, getUnit } from '../data/heroes'
import { api } from '../lib/api'
import {
  MAX_HEROES, MAX_OPTIONS, changeFormation, emptyOption, emptyPlan, emptyTeam, heroCount, moveSlot, placeUnit, teamOps, type PlanData, type Team, type WarOption,
} from '../lib/types'
import { useGuild } from '../lib/useGuild'
import { activePlanId } from '../lib/war'
import NotFound from './NotFound'

type Picker =
  | { target: 'op' }
  | { target: 'banned'; g: number }
  | { target: 'opt'; s: number; o: number; kind: SlotKind; index: number }
  | { target: 'vs'; s: number; kind: SlotKind; index: number }
  | null

const optionFrom = (c: Comp, condition = ''): WarOption => ({
  condition,
  team: JSON.parse(JSON.stringify(c.team)),
  skills: [...c.skills],
  notes: c.note,
  heroNotes: JSON.parse(JSON.stringify(c.heroNotes)),
})
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

export default function PlanPage() {
  const { gid = '', pid = '' } = useParams()
  const nav = useNavigate()
  const isNew = pid === 'new'
  const { data, error, canEdit, reload } = useGuild(gid)
  const plan = data?.plans.find((p) => p.id === pid)

  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [draft, setDraft] = useState<PlanData>(emptyPlan)
  const [picker, setPicker] = useState<Picker>(null)
  /** เปิดคลังคอมพ์ให้ไม้ s (o = ทางเลือกที่จะแทน, null = เพิ่มใหม่) */
  const [library, setLibrary] = useState<{ s: number; o: number | null } | null>(null)
  /** เปิดคลังเพื่อเลือกบ้านที่จะตีของไม้ s */
  const [vsLibrary, setVsLibrary] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (isNew && canEdit) {
      setTitle('Update GVG')
      setDraft(emptyPlan())
      setEditing(true)
    }
  }, [isNew, canEdit])

  if (error) return <NotFound message={error} />
  if (!data) return <p className="py-24 text-center text-white/50">กำลังโหลด...</p>
  if (!isNew && !plan) return <NotFound message="ไม่พบแผนนี้" />
  if (isNew && !canEdit) return <NotFound message="ลิงก์นี้ไม่มีสิทธิ์แก้ไข" />

  // หน้าใหม่: รอบแรกก่อน useEffect เปิดโหมดแก้ไข ยังไม่มี plan ให้ใช้ draft ไปก่อน
  const view: PlanData = editing || !plan ? draft : plan.data
  const viewTitle = editing || !plan ? title : plan.title

  // ---------- edit helpers ----------
  function startEdit() {
    setTitle(plan!.title)
    setDraft(clone(plan!.data))
    setErr(null)
    setEditing(true)
  }
  function cancel() {
    if (isNew) nav(`/g/${gid}`)
    else setEditing(false)
  }
  const patchSlot = (s: number, fn: (slot: PlanData['slots'][number]) => PlanData['slots'][number]) =>
    setDraft((d) => ({ ...d, slots: d.slots.map((x, i) => (i === s ? fn(clone(x)) : x)) }))
  const patchOption = (s: number, o: number, opt: WarOption) =>
    patchSlot(s, (slot) => ({ ...slot, options: slot.options.map((x, i) => (i === o ? opt : x)) }))

  function pick(id: string | null) {
    if (!picker) return
    if (picker.target === 'op') {
      if (id) setDraft((d) => ({ ...d, op: d.op.includes(id) ? d.op : [...d.op, id].slice(0, 20) }))
    } else if (picker.target === 'banned') {
      const g = picker.g
      if (id)
        setDraft((d) => ({
          ...d,
          banned: d.banned.map((grp, i) => (i === g && !grp.includes(id) ? [...grp, id].slice(0, 5) : grp)),
        }))
    } else if (picker.target === 'vs') {
      const { s, kind, index } = picker
      patchSlot(s, (slot) => {
        const t: Team = clone(slot.vs ?? emptyTeam())
        if (kind === 'hero') t.slots[index] = id
        else if (kind === 'pet') t.pet = id
        else t.extras[index] = id
        if (t.skills) t.skills = t.skills.filter((k) => t.slots[k.slot])
        return { ...slot, vs: t }
      })
    } else {
      const { s, o, kind, index } = picker
      const opt = clone(draft.slots[s].options[o])
      if (kind === 'hero') opt.team.slots[index] = id
      else if (kind === 'pet') opt.team.pet = id
      else opt.team.extras[index] = id
      opt.skills = opt.skills.filter((k) => opt.team.slots[k.slot])
      patchOption(s, o, opt)
    }
    setPicker(null)
  }

  // ข้อมูลสำหรับ picker
  const pOpt =
    picker?.target === 'opt' ? draft.slots[picker.s].options[picker.o]
    : picker?.target === 'vs' ? { team: draft.slots[picker.s].vs ?? emptyTeam() }
    : null
  const pickerCurrent =
    (picker?.target === 'opt' || picker?.target === 'vs') && pOpt
      ? picker.kind === 'hero' ? pOpt.team.slots[picker.index] : picker.kind === 'pet' ? pOpt.team.pet : pOpt.team.extras[picker.index] ?? null
      : null
  const pickerUsed = pOpt
    ? ([...pOpt.team.slots, pOpt.team.pet, ...pOpt.team.extras].filter(Boolean) as string[])
    : picker?.target === 'op' ? draft.op : picker?.target === 'banned' ? draft.banned[picker.g] ?? [] : []

  function pickComp(c: Comp) {
    if (!library) return
    const { s, o } = library
    patchSlot(s, (slot) => {
      if (o === null) {
        const condition = slot.kind === 'defense' && slot.options.length ? 'ถ้าไม่มีทีมบน' : ''
        return { ...slot, options: [...slot.options, optionFrom(c, condition)].slice(0, MAX_OPTIONS) }
      }
      return { ...slot, options: slot.options.map((x, i) => (i === o ? { ...optionFrom(c), condition: x.condition } : x)) }
    })
    setLibrary(null)
  }

  /** เลือกบ้านที่จะตี: ใส่บ้าน + ถ้ายังไม่มีทีมบุก ใส่ทีมแก้ของบ้านนั้นมาให้ทั้งหมด */
  function pickDefense(d: Defense) {
    if (vsLibrary === null) return
    const s = vsLibrary
    const addAll = draft.slots[s].options.length === 0
    patchSlot(s, (slot) => ({
      ...slot,
      vs: clone(d.team),
      vsTag: d.type,
      vsId: d.id,
      options: addAll ? d.counters.slice(0, MAX_OPTIONS).map((c) => optionFrom(c)) : slot.options,
    }))
    setVsLibrary(null)
    if (addAll && d.counters.length) {
      setToast(`ใส่ทีมบุก ${Math.min(d.counters.length, MAX_OPTIONS)} ทีมให้แล้ว — ลบทีมที่ไม่ใช้ได้ที่ไอคอนถังขยะ`)
      setTimeout(() => setToast(null), 4000)
    }
  }

  async function save() {
    setBusy(true)
    setErr(null)
    try {
      const body = { title: title.trim() || 'แผนวอร์', data: { ...draft, banned: draft.banned.filter((g) => g.length) } }
      if (isNew) {
        const p = await api.createPlan(gid, body)
        await reload()
        nav(`/g/${gid}/p/${p.id}`, { replace: true })
      } else {
        await api.updatePlan(gid, pid, body)
        await reload()
      }
      setEditing(false)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  async function remove() {
    if (!confirm('ลบแผนนี้?')) return
    setBusy(true)
    try {
      await api.deletePlan(gid, pid)
      await reload()
      nav(`/g/${gid}`, { replace: true })
    } catch (e) {
      setErr((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <DndHub>
    <div className={editing ? 'pb-72' : ''}>
      <Link to={`/g/${gid}`} className="inline-flex items-center gap-1 text-white/70 hover:text-white">
        <ChevronLeft className="h-5 w-5" /> {data.guild.name}
      </Link>

      {/* ---------- หัวแผน ---------- */}
      <header className="mt-6 text-center">
        {editing ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
            placeholder="ชื่อแผน เช่น Update GVG"
            className="w-full max-w-xl border-b-2 border-gold/60 bg-transparent text-center text-4xl font-bold outline-none focus:border-gold sm:text-5xl"
          />
        ) : (
          <h1 className="vs-text inline-block pr-3 text-5xl sm:text-6xl">{viewTitle}</h1>
        )}
        {!editing && plan && activePlanId(data) === plan.id && (
          <p className="mt-3"><span className="rounded-full bg-gold px-3 py-0.5 text-sm font-semibold text-ink">แผนที่ใช้อยู่ตอนนี้</span></p>
        )}
        {!editing && plan && (
          <p className="mt-3 text-sm text-white/50">
            อัปเดต {new Date(plan.updatedAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        )}
        {!editing && canEdit && (
          <button onClick={startEdit} className="pill mt-4 inline-flex items-center gap-1.5 px-4 py-1.5 text-sm hover:border-gold">
            <Pencil className="h-4 w-4" /> แก้ไขแผน
          </button>
        )}
      </header>

      {/* ---------- ประกาศ: OP / ยกเลิก ---------- */}
      {(editing || view.op.length > 0 || view.banned.length > 0 || view.note) && (
      <section className="panel panel-gold mx-auto mt-8 max-w-4xl space-y-4 p-5 sm:p-6">
        <HeroRow
          icon={<span className="grid h-7 w-7 place-items-center rounded-md bg-green-500 text-white"><Check className="h-5 w-5" strokeWidth={3} /></span>}
          label="ตัวที่ OP ที่สุดตอนนี้"
          ids={view.op}
          editing={editing}
          onAdd={() => setPicker({ target: 'op' })}
          onRemove={(id) => setDraft((d) => ({ ...d, op: d.op.filter((x) => x !== id) }))}
        />
        <BannedRow
          groups={view.banned}
          editing={editing}
          onAddGroup={() => {
            setDraft((d) => ({ ...d, banned: [...d.banned, []].slice(0, 10) }))
            setPicker({ target: 'banned', g: draft.banned.length })
          }}
          onAddHero={(g) => setPicker({ target: 'banned', g })}
          onRemoveHero={(g, id) => setDraft((d) => ({ ...d, banned: d.banned.map((x, i) => (i === g ? x.filter((y) => y !== id) : x)) }))}
          onRemoveGroup={(g) => setDraft((d) => ({ ...d, banned: d.banned.filter((_, i) => i !== g) }))}
        />
        {editing ? (
          <textarea
            value={draft.note}
            onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
            maxLength={1000}
            rows={2}
            placeholder="ประกาศเพิ่มเติม (ถ้ามี)"
            className="w-full rounded-xl border border-white/15 bg-black/20 p-3 outline-none focus:border-gold"
          />
        ) : (
          view.note && <p className="whitespace-pre-wrap border-t border-white/10 pt-4 text-white/85">{view.note}</p>
        )}
      </section>
      )}

      {/* ---------- 5 ไม้ ---------- */}
      <div className="mt-12 space-y-14">
        {view.slots.map((slot, s) => {
          if (!editing && slot.options.length === 0 && !slot.vs) return null
          const Icon = slot.kind === 'attack' ? Swords : Shield
          return (
            <section key={s}>
              <div className="mb-6 flex flex-wrap items-center gap-3 border-b border-white/10 pb-3">
                <span className="btn-gold rounded-lg px-3 py-1 text-sm">ไม้ {s + 1}</span>
                {editing ? (
                  <>
                    <input
                      value={slot.name}
                      onChange={(e) => patchSlot(s, (x) => ({ ...x, name: e.target.value }))}
                      maxLength={40}
                      placeholder="ชื่อไม้ เช่น บ้านกันทีมที่ 1 / ไม้กายภาพ"
                      className="min-w-0 flex-1 border-b border-white/20 bg-transparent py-1 text-xl font-semibold outline-none focus:border-gold"
                    />
                    <div className="pill flex p-0.5 text-sm">
                      {(['defense', 'attack'] as const).map((k) => (
                        <button
                          key={k}
                          onClick={() => patchSlot(s, (x) => ({ ...x, kind: k }))}
                          type="button"
                          className={`flex items-center gap-1 rounded-full px-3 py-1 ${slot.kind === k ? 'bg-gold font-semibold text-ink' : 'text-white/70'}`}
                        >
                          {k === 'defense' ? <Shield className="h-4 w-4" /> : <Swords className="h-4 w-4" />}
                          {k === 'defense' ? 'ไม้กัน' : 'ไม้บุก'}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-semibold">{slot.name || `ไม้ ${s + 1}`}</h2>
                    <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm ${slot.kind === 'attack' ? 'bg-red-500/20 text-red-200' : 'bg-sky-400/20 text-sky-100'}`}>
                      <Icon className="h-4 w-4" /> {slot.kind === 'attack' ? 'ไม้บุก' : 'ไม้กัน'}
                    </span>
                    {slot.kind === 'defense' && slot.options.length > 1 && (
                      <span className="text-sm text-white/50">เลือกตั้ง 1 ใน {slot.options.length} แบบ ตามลำดับ</span>
                    )}
                  </>
                )}
              </div>

              {slot.kind === 'attack' && (
                <div className="mb-10">
                  <div className="mx-auto max-w-sm">
                    <div className="mb-3 flex items-center justify-center gap-2">
                      <span className="text-lg font-semibold text-red-200">บ้านที่จะตี</span>
                      {slot.vsTag && <span className="rounded-full bg-sky-400/20 px-2.5 py-0.5 text-sm text-sky-100">{slot.vsTag}</span>}
                    </div>
                    {slot.vs ? (
                      <TeamPanel
                        variant="enemy"
                        team={slot.vs}
                        editable={editing}
                        title={teamNames(slot.vs) || 'ทีมศัตรู'}
                        onSlotClick={(kind, index) => setPicker({ target: 'vs', s, kind, index })}
                        onReset={() => patchSlot(s, (x) => ({ ...x, vs: emptyTeam(), vsTag: '', vsId: '' }))}
                        skills={slot.vs.skills ?? []}
                        onSkills={(sk) => patchSlot(s, (x) => ({ ...x, vs: { ...x.vs!, skills: sk } }))}
                        onFormation={(f) => patchSlot(s, (x) => ({ ...x, vs: teamOps.formation(x.vs!, f) }))}
                        onSpeed={(sp) => patchSlot(s, (x) => ({ ...x, vs: { ...x.vs!, speed: sp } }))}
                        onMove={(from, to) => patchSlot(s, (x) => ({ ...x, vs: teamOps.move(x.vs!, from, to) }))}
                        label={`บ้านไม้ ${s + 1}`}
                        onPlace={(ref, unit) => patchSlot(s, (x) => ({ ...x, vs: teamOps.place(x.vs ?? emptyTeam(), ref, unit) }))}
                      />
                    ) : editing ? (
                      <div className="grid gap-3">
                        <button
                          onClick={() => setVsLibrary(s)}
                          className="flex flex-col items-center justify-center gap-1 rounded-[18px] border-2 border-dashed border-red-300/50 py-8 text-red-100/90 hover:border-red-300"
                        >
                          <Library className="h-7 w-7" /> เลือกบ้านจากคลังคอมพ์
                          <span className="text-xs text-white/50">ทีมแก้ของบ้านนั้นจะถูกใส่มาให้ด้วย</span>
                        </button>
                        <button
                          onClick={() => patchSlot(s, (x) => ({ ...x, vs: emptyTeam() }))}
                          className="rounded-[18px] border-2 border-dashed border-white/20 py-3 text-white/60 hover:border-gold hover:text-gold"
                        >
                          จัดทีมศัตรูเอง
                        </button>
                      </div>
                    ) : (
                      <p className="text-center text-white/40">ยังไม่ได้ระบุบ้าน</p>
                    )}
                    {editing && slot.vs && (
                      <div className="mt-4 flex justify-center gap-2 text-sm">
                        <button onClick={() => setVsLibrary(s)} className="pill flex items-center gap-1 px-3 py-1 hover:border-gold">
                          <Library className="h-4 w-4" /> เปลี่ยนบ้านจากคลัง
                        </button>
                        <button
                          onClick={() => patchSlot(s, (x) => ({ ...x, vs: null, vsTag: '', vsId: '' }))}
                          className="flex items-center gap-1 rounded-full px-3 py-1 text-red-300 hover:bg-red-500/15"
                        >
                          <Trash2 className="h-4 w-4" /> เอาบ้านออก
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="vs-text mt-6 text-center text-5xl">VS</div>
                  <h3 className="mt-2 text-center text-lg font-semibold">
                    <Swords className="mr-1 inline h-5 w-5 text-gold" /> ทีมที่ใช้ตีได้
                    {slot.options.length > 1 && <span className="ml-2 text-sm font-normal text-white/50">เลือกใช้ 1 จาก {slot.options.length} ทีม</span>}
                  </h3>
                </div>
              )}

              <div className="grid gap-x-8 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
                {slot.options.map((opt, o) => (
                  <OptionCard
                    key={o}
                    option={opt}
                    index={o}
                    total={slot.options.length}
                    editing={editing}
                    banned={view.banned}
                    onChange={(n) => patchOption(s, o, n)}
                    onRemove={() => patchSlot(s, (x) => ({ ...x, options: x.options.filter((_, i) => i !== o) }))}
                    onMove={(dir) =>
                      patchSlot(s, (x) => {
                        const arr = [...x.options]
                        const j = o + dir
                        ;[arr[o], arr[j]] = [arr[j], arr[o]]
                        return { ...x, options: arr }
                      })
                    }
                    onPick={(kind, index) => setPicker({ target: 'opt', s, o, kind, index })}
                    onLibrary={() => setLibrary({ s, o })}
                    attack={slot.kind === 'attack'}
                  />
                ))}
                {editing && slot.options.length < MAX_OPTIONS && (
                  <div className="grid min-h-60 grid-rows-2 gap-3">
                    <button
                      onClick={() => setLibrary({ s, o: null })}
                      title={slot.kind === 'attack' && slot.vsId ? 'เปิดที่ทีมแก้ของบ้านนี้' : undefined}
                      className="flex flex-col items-center justify-center gap-1 rounded-[18px] border-2 border-dashed border-sky-300/40 text-sky-100/80 hover:border-sky-300 hover:text-sky-100"
                    >
                      <Library className="h-7 w-7" />
                      {slot.kind === 'attack'
                        ? 'เพิ่มทีมบุกจากคลังคอมพ์'
                        : slot.options.length ? 'เลือกทางเลือกสำรองจากคลังคอมพ์' : 'เลือกจากคลังคอมพ์'}
                    </button>
                    <button
                      onClick={() =>
                        patchSlot(s, (x) => ({
                          ...x,
                          options: [...x.options, { ...emptyOption(), condition: x.kind === 'defense' && x.options.length ? 'ถ้าไม่มีทีมบน' : '' }],
                        }))
                      }
                      className="flex flex-col items-center justify-center gap-1 rounded-[18px] border-2 border-dashed border-white/20 text-white/60 hover:border-gold hover:text-gold"
                    >
                      <Plus className="h-7 w-7" />
                      จัดทีมเอง
                    </button>
                  </div>
                )}
              </div>
            </section>
          )
        })}
        {!editing && view.slots.every((s) => s.options.length === 0) && (
          <div className="panel p-10 text-center text-white/60">แผนนี้ยังไม่มีทีม</div>
        )}
      </div>

      {/* ---------- แถบบันทึก ---------- */}
      {editing && (
        <HideWhileDock>
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#161c2e]/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
            <button disabled={busy} onClick={save} className="btn-gold px-6 py-2">{busy ? 'กำลังบันทึก...' : 'บันทึกแผน'}</button>
            <button disabled={busy} onClick={cancel} className="pill px-5 py-2">ยกเลิก</button>
            {err && <span className="text-sm text-red-300">{err}</span>}
            {!isNew && (
              <button disabled={busy} onClick={remove} className="ml-auto flex items-center gap-1 rounded-full px-3 py-2 text-sm text-red-300 hover:bg-red-500/15">
                <Trash2 className="h-4 w-4" /> ลบแผน
              </button>
            )}
          </div>
        </div>
        </HideWhileDock>
      )}

      <CompLibrary
        open={vsLibrary !== null}
        initialTab="defense"
        onPick={() => {}}
        onPickDefense={pickDefense}
        onClose={() => setVsLibrary(null)}
      />

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink shadow-lg">{toast}</div>
      )}

      <CompLibrary
        open={!!library}
        focusDefenseId={library ? draft.slots[library.s].vsId || undefined : undefined}
        initialTab={library ? draft.slots[library.s].kind : 'defense'}
        onPick={pickComp}
        onClose={() => setLibrary(null)}
      />

      <UnitPicker
        open={!!picker}
        kind={picker?.target === 'opt' ? picker.kind : 'hero'}
        index={picker?.target === 'opt' ? picker.index : 0}
        current={pickerCurrent}
        used={pickerUsed}
        full={!!pOpt && heroCount(pOpt.team) >= MAX_HEROES}
        onPick={pick}
        onClose={() => setPicker(null)}
      />
      {editing && <HeroDock />}
    </div>
    </DndHub>
  )
}

function teamNames(t: Team) {
  return t.slots.filter(Boolean).map((id) => baseName(getUnit(id)!.name)).join(' · ')
}

function HeroRow({
  icon, label, ids, editing, onAdd, onRemove, danger,
}: {
  icon: React.ReactNode
  label: string
  ids: string[]
  editing: boolean
  onAdd: () => void
  onRemove: (id: string) => void
  danger?: boolean
}) {
  if (!editing && ids.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-3">
      {icon}
      <span className="text-lg font-semibold">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        {ids.map((id) => (
          <span key={id} className={`flex items-center gap-2 rounded-full border py-0.5 pl-0.5 pr-3 ${danger ? 'border-red-400/40 bg-red-500/10' : 'border-green-400/40 bg-green-500/10'}`}>
            <span className="h-8 w-8 text-[9px]">
              <UnitCard id={id} shape="round" />
            </span>
            <span className={danger ? 'text-red-100 line-through decoration-red-400/70' : ''}>{getUnit(id)?.name}</span>
            {editing && (
              <button onClick={() => onRemove(id)} className="-mr-1 rounded-full p-0.5 hover:bg-white/10" aria-label="เอาออก">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </span>
        ))}
        {editing && (
          <button onClick={onAdd} className="flex items-center gap-1 rounded-full border border-dashed border-white/30 px-3 py-1 text-sm text-white/70 hover:border-gold hover:text-gold">
            <Plus className="h-4 w-4" /> เพิ่ม
          </button>
        )}
      </div>
    </div>
  )
}

function BannedRow({
  groups, editing, onAddGroup, onAddHero, onRemoveHero, onRemoveGroup,
}: {
  groups: string[][]
  editing: boolean
  onAddGroup: () => void
  onAddHero: (g: number) => void
  onRemoveHero: (g: number, id: string) => void
  onRemoveGroup: (g: number) => void
}) {
  if (!editing && groups.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="grid h-7 w-7 place-items-center rounded-md bg-red-500 text-white"><X className="h-5 w-5" strokeWidth={3} /></span>
      <span className="text-lg font-semibold">ยกเลิกบ้าน</span>
      <div className="flex flex-wrap items-center gap-2">
        {groups.map((g, gi) => (
          <span key={gi} className="flex flex-wrap items-center gap-1 rounded-full border border-red-400/40 bg-red-500/10 py-0.5 pl-0.5 pr-2">
            {g.map((id, i) => (
              <span key={id} className="flex items-center gap-1">
                {i > 0 && <span className="text-red-300/70">+</span>}
                <span className="h-7 w-7" style={{ fontSize: 8 }}><UnitCard id={id} shape="round" /></span>
                <span className="text-red-100 line-through decoration-red-400/70">{getUnit(id)?.name}</span>
                {editing && (
                  <button onClick={() => onRemoveHero(gi, id)} className="rounded-full p-0.5 hover:bg-white/10" aria-label="เอาออก">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
            {editing && g.length < 5 && (
              <button onClick={() => onAddHero(gi)} className="ml-1 rounded-full border border-dashed border-red-300/50 px-2 text-xs text-red-200 hover:bg-red-500/20">
                + ตัว
              </button>
            )}
            {editing && (
              <button onClick={() => onRemoveGroup(gi)} className="ml-1 rounded-full p-1 text-red-300 hover:bg-red-500/20" title="ลบชุดนี้">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </span>
        ))}
        {editing && (
          <button onClick={onAddGroup} className="flex items-center gap-1 rounded-full border border-dashed border-white/30 px-3 py-1 text-sm text-white/70 hover:border-gold hover:text-gold">
            <Plus className="h-4 w-4" /> เพิ่มชุดที่ยกเลิก
          </button>
        )}
      </div>
    </div>
  )
}
