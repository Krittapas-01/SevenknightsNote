import { AlertTriangle, Check, ChevronDown, ChevronLeft, ClipboardPaste, ImageDown, Library, Pencil, Plus, Shield, Swords, Trash2, Wand2, X } from 'lucide-react'
import { houseLabel, tagStyle } from '../lib/tags'
import type { WarSlot } from '../lib/types'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import CompLibrary, { type Comp, type Defense } from '../components/CompLibrary'
import TeamPanel from '../components/TeamPanel'
import { DndHub, HideWhileDock, useListTarget } from '../components/DndHub'
import { findLogItems, logToTargets, markLogged, type LogItem } from '../lib/logTargets'
import Modal from '../components/Modal'
import PasteNotesModal from '../components/PasteNotesModal'
import { applyNotes } from '../lib/pasteNotes'
import { exportPng } from '../lib/exportImage'
import { autoAssign, blockedFor, conflictCount, conflictsOf, heroKey, heroUsage, heroesOf, mainIndex, mainOption } from '../lib/allocation'
import HeroDock from '../components/HeroDock'
import OptionCard from '../components/OptionCard'
import type { SlotKind } from '../components/TeamPanel'
import UnitCard from '../components/UnitCard'
import UnitPicker from '../components/UnitPicker'
import VsArena from '../components/VsArena'
import { baseName, getUnit } from '../data/heroes'
import { api } from '../lib/api'
import {
  MAX_HEROES, MAX_HOUSES, MAX_OPTIONS, changeFormation, emptyHouse, houseApply, houseView, emptyOption, emptyPlan, emptyTeam, heroCount, moveSlot, placeUnit, teamOps, type PlanData, type PlanKind, type Team, type WarOption, PLAN_KIND_LABEL, planKind, withPlanKind,
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
  const [search] = useSearchParams()
  const newKind: PlanKind = search.get('kind') === 'defense' ? 'defense' : 'attack'
  const nav = useNavigate()
  const isNew = pid === 'new'
  const { data, error, canEdit, reload } = useGuild(gid)
  const plan = data?.plans.find((p) => p.id === pid)
  const editBase = useRef<number | null>(null)

  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [draft, setDraft] = useState<PlanData>(emptyPlan)
  const [picker, setPicker] = useState<Picker>(null)
  /** เปิดคลังคอมพ์ให้ไม้ s (o = ทางเลือกที่จะแทน, null = เพิ่มใหม่) */
  const [library, setLibrary] = useState<{ s: number; o: number | null } | null>(null)
  /** เปิดคลังเพื่อเลือกบ้านที่จะตีของไม้ s */
  const [vsLibrary, setVsLibrary] = useState<number | null>(null)
  /** ไม้บุกที่มีหลายบ้าน: บ้านที่กำลังดู/แก้ของแต่ละไม้ (0 = บ้านหลัก) */
  const [house, setHouse] = useState<Record<number, number>>({})
  const houseOf = (slot: WarSlot | undefined, s: number) => Math.min(house[s] ?? 0, slot?.alts?.length ?? 0)
  /** ไม้ s ในมุมของบ้านที่เลือกอยู่ (ใช้ตอนแก้) */
  const curSlot = (s: number) => houseView(draft.slots[s], houseOf(draft.slots[s], s))
  const [toast, setToast] = useState<string | null>(null)
  // ถามหลังบันทึกแผน: จดทีมที่จัดเองลงจดทีมศัตรูด้วยไหม
  const [logAsk, setLogAsk] = useState<{ items: LogItem[]; planId: string; body: { title: string; data: PlanData }; picked: boolean[] } | null>(null)
  const [logBusy, setLogBusy] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)
  // บันทึกแผนเป็นรูป (ส่งเข้ากลุ่มไลน์/ดิสคอร์ด)
  const exportRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  async function saveImage() {
    if (!exportRef.current) return
    setExporting(true)
    // แผนกัน: บันทึกทีละคอมพ์ (1 รูป/ทีม) ด้วยปุ่มรูปของแต่ละการ์ด
    const shots = [...exportRef.current.querySelectorAll<HTMLButtonElement>('button[data-shot]')]
    if (shots.length) {
      try {
        for (const b of shots) {
          b.click()
          await new Promise((r) => setTimeout(r, 50))
          while (b.disabled) await new Promise((r) => setTimeout(r, 100))
        }
      } finally {
        setExporting(false)
      }
      return
    }
    try {
      await exportPng(exportRef.current, `${data?.guild.name ?? '7K Note'} - ${plan?.title ?? 'แผนวอร์'}`)
    } catch (e) {
      flash('สร้างรูปไม่สำเร็จ: ' + (e as Error).message)
    } finally {
      setExporting(false)
    }
  }
  // ไม้บุก: ปกติโชว์แค่ทีมหลัก กดขยายถึงเห็นคอมพ์อื่น
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const toggleExpand = (s: number) => setExpanded((x) => { const n = new Set(x); if (n.has(s)) n.delete(s); else n.add(s); return n })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (isNew && canEdit) {
      setTitle(PLAN_KIND_LABEL[newKind])
      setDraft(emptyPlan(newKind))
      setEditing(true)
    }
  }, [isNew, canEdit, newKind])

  if (error) return <NotFound message={error} />
  if (!data) return <p className="py-24 text-center text-white/50">กำลังโหลด...</p>
  if (!isNew && !plan) return <NotFound message="ไม่พบแผนนี้" />
  if (isNew && !canEdit) return <NotFound message="ลิงก์นี้ไม่มีสิทธิ์แก้ไข" />

  // หน้าใหม่: รอบแรกก่อน useEffect เปิดโหมดแก้ไข ยังไม่มี plan ให้ใช้ draft ไปก่อน
  const view: PlanData = editing || !plan ? draft : plan.data
  /** จัดให้อัตโนมัติ: เลือกทีมหลักทุกไม้บุกให้ตัวไม่ซ้ำ */
  function runAuto() {
    const { mains, unresolved } = autoAssign(draft.slots, draft.banned)
    if (!mains.size && !unresolved.length) return flash('ยังไม่มีไม้บุกที่มีทีม — เพิ่มทีมบุกก่อน')
    setDraft((d) => ({ ...d, slots: d.slots.map((x, i) => (mains.has(i) ? { ...x, main: mains.get(i) } : x)) }))
    flash(unresolved.length
      ? `จัดได้ ${mains.size} ไม้ · ${unresolved.map((i) => `ไม้ ${i + 1}`).join(', ')} หาทีมที่ไม่ชนไม่ได้ — ลองเพิ่มทีมสำรอง`
      : `จัดครบ ${mains.size} ไม้ ไม่มีตัวซ้ำ ✓`)
  }
  function flash(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4500)
  }
  // ตัวละครที่ทีมหลักของแต่ละไม้บุกใช้ (ใช้ได้รอบเดียว)
  const use = heroUsage(view.slots)
  const viewTitle = editing || !plan ? title : plan.title

  // ---------- edit helpers ----------
  function startEdit() {
    editBase.current = plan!.updatedAt // กันแก้ทับกัน (ถ้ามีคนบันทึกไปก่อน API ตอบ 409)
    setTitle(plan!.title)
    setDraft(clone(plan!.data))
    setErr(null)
    setEditing(true)
  }
  function cancel() {
    if (isNew) nav(`/g/${gid}`)
    else setEditing(false)
  }
  // แก้ไม้ s = แก้บ้านที่เลือกอยู่ของไม้นั้น (ชื่อไม้ใช้ร่วมกันทุกบ้าน)
  const patchSlot = (s: number, fn: (slot: PlanData['slots'][number]) => PlanData['slots'][number]) =>
    setDraft((d) => ({
      ...d,
      slots: d.slots.map((x, i) => {
        if (i !== s) return x
        const h = houseOf(x, s)
        return houseApply(x, h, fn(clone(houseView(x, h))))
      }),
    }))
  /** เพิ่ม/ลบ/ตั้งบ้านหลัก (ไม้บุก) */
  const addHouse = (s: number) => {
    const n = draft.slots[s].alts?.length ?? 0
    if (n + 1 >= MAX_HOUSES) return
    setDraft((d) => ({ ...d, slots: d.slots.map((x, i) => (i === s ? { ...x, alts: [...(x.alts ?? []), emptyHouse()] } : x)) }))
    setHouse((m) => ({ ...m, [s]: n + 1 }))
  }
  const removeHouse = (s: number, h: number) => {
    setDraft((d) => ({
      ...d,
      slots: d.slots.map((x, i) => {
        if (i !== s) return x
        const alts = x.alts ?? []
        if (h === 0) { // ลบบ้านหลัก → บ้านถัดไปขึ้นเป็นหลัก
          if (!alts.length) return { ...x, vs: null, vsTag: '', vsId: '', main: 0, options: [] }
          const [first, ...rest] = alts
          return { ...x, ...first, vs: first.vs ?? null, alts: rest }
        }
        return { ...x, alts: alts.filter((_, j) => j !== h - 1) }
      }),
    }))
    setHouse((m) => ({ ...m, [s]: Math.max(0, h - 1) }))
  }
  const makeMainHouse = (s: number, h: number) => {
    if (h <= 0) return
    setDraft((d) => ({
      ...d,
      slots: d.slots.map((x, i) => {
        if (i !== s || !x.alts?.[h - 1]) return x
        const alt = x.alts[h - 1]
        const old = { vs: x.vs ?? null, vsTag: x.vsTag ?? '', vsId: x.vsId ?? '', main: x.main ?? 0, options: x.options }
        return { ...x, vs: alt.vs ?? null, vsTag: alt.vsTag ?? '', vsId: alt.vsId ?? '', main: alt.main ?? 0, options: alt.options, alts: x.alts.map((a, j) => (j === h - 1 ? old : a)) }
      }),
    }))
    setHouse((m) => ({ ...m, [s]: 0 }))
  }
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
      const opt = clone(curSlot(s).options[o])
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
    picker?.target === 'opt' ? curSlot(picker.s).options[picker.o]
    : picker?.target === 'vs' ? { team: curSlot(picker.s).vs ?? emptyTeam() }
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
    const addAll = curSlot(s).options.length === 0
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

  async function answerLog(save: boolean) {
    if (!logAsk) return
    setLogBusy(true)
    const chosen = logAsk.items.filter((_, i) => logAsk.picked[i])
    let msg = ''
    if (save && chosen.length) {
      const r = await logToTargets(gid, chosen)
      msg = r.errors.length ? `จดแล้ว ${r.ok} ทีม · ไม่สำเร็จ: ${r.errors.join(' / ')}` : `จดลงจดทีมศัตรูแล้ว ${r.ok} ทีม ✓`
    }
    // ถามแล้ว = ไม่ถามซ้ำ (ทั้งที่จดและไม่จด)
    try {
      await api.updatePlan(gid, logAsk.planId, { ...logAsk.body, data: markLogged(logAsk.body.data, logAsk.items) })
    } catch { /* ไม่เป็นไร รอบหน้าถามใหม่ */ }
    await reload()
    setLogBusy(false)
    setLogAsk(null)
    if (msg) flash(msg)
  }

  async function save() {
    setBusy(true)
    setErr(null)
    try {
      const body = { title: title.trim() || 'แผนวอร์', data: { ...draft, banned: draft.banned.filter((g) => g.length) } }
      // ทีมที่จัดเองในแผน → เดี๋ยวถามว่าจะจดลงจดทีมศัตรูด้วยไหม
      const items = findLogItems(body.data, data?.targets ?? [])
      let planId = pid
      if (isNew) {
        const p = await api.createPlan(gid, body)
        planId = p.id
        await reload()
        nav(`/g/${gid}/p/${p.id}`, { replace: true })
      } else {
        await api.updatePlan(gid, pid, { ...body, baseUpdatedAt: editBase.current ?? undefined })
        await reload()
      }
      setEditing(false)
      if (items.length) setLogAsk({ items, planId, body, picked: items.map(() => true) })
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
    <div ref={exportRef} className={editing ? 'pb-72' : ''}>
      <Link data-noexport to={`/g/${gid}`} className="inline-flex items-center gap-1 text-white/70 hover:text-white">
        <ChevronLeft className="h-5 w-5" /> {data.guild.name}
      </Link>

      {/* ---------- หัวแผน ---------- */}
      <header className="plan-heading mt-6 text-center">
        <p className="eyebrow mb-4">GUILD WAR · BATTLE PLAN</p>
        {editing ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
            placeholder="ชื่อแผน เช่น Update GVG"
            className="w-full max-w-xl border-b-2 border-gold/60 bg-transparent text-center text-4xl font-bold outline-none focus:border-gold sm:text-5xl"
          />
        ) : (
          <h1 className="gold-title break-words text-4xl font-extrabold sm:text-6xl">{viewTitle}</h1>
        )}
        <div className="mt-3 flex justify-center">
          {editing ? (
            <div className="pill flex p-0.5 text-sm">
              {(['attack', 'defense'] as const).map((k) => (
                <button key={k} type="button" onClick={() => setDraft((d) => withPlanKind(d, k))}
                  className={`flex items-center gap-1 rounded-full px-4 py-1 ${planKind(draft) === k ? 'bg-gold font-semibold text-ink' : 'text-white/70'}`}>
                  {k === 'attack' ? <Swords className="h-4 w-4" /> : <Shield className="h-4 w-4" />} {PLAN_KIND_LABEL[k]}
                </button>
              ))}
            </div>
          ) : (
            <span className={`flex items-center gap-1 rounded-full px-3 py-0.5 text-sm font-semibold ${planKind(view) === 'attack' ? 'bg-red-500/20 text-red-200' : 'bg-sky-400/20 text-sky-100'}`}>
              {planKind(view) === 'attack' ? <Swords className="h-4 w-4" /> : <Shield className="h-4 w-4" />} {PLAN_KIND_LABEL[planKind(view)]}
            </span>
          )}
        </div>
        {!editing && plan && activePlanId(data) === plan.id && (
          <p className="mt-3"><span className="rounded-full bg-gold px-3 py-0.5 text-sm font-semibold text-ink">แผนที่ใช้อยู่ตอนนี้</span></p>
        )}
        {!editing && plan && (
          <p className="mt-3 text-sm text-white/50">
            อัปเดต {new Date(plan.updatedAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        )}
        {!editing && (
          <div data-noexport className="mt-4 flex flex-wrap justify-center gap-2">
            {canEdit && (
              <button onClick={startEdit} className="pill inline-flex items-center gap-1.5 px-4 py-1.5 text-sm hover:border-gold">
                <Pencil className="h-4 w-4" /> แก้ไขแผน
              </button>
            )}
            <button onClick={saveImage} disabled={exporting} className="pill inline-flex items-center gap-1.5 px-4 py-1.5 text-sm hover:border-gold disabled:opacity-50">
              <ImageDown className="h-4 w-4" /> {exporting ? 'กำลังสร้างรูป...' : planKind(view) === 'defense' && !editing ? 'บันทึกรูปทุกทีม (1 รูป/ทีม)' : 'บันทึกเป็นรูป'}
            </button>
          </div>
        )}
      </header>

      {editing && (
        <div className="mt-6 flex justify-center">
          <button type="button" onClick={() => setPasteOpen(true)} className="pill flex items-center gap-1.5 px-4 py-1.5 text-sm hover:border-gold hover:text-gold">
            <ClipboardPaste className="h-4 w-4" /> วางโน้ตจากข้อความ
          </button>
        </div>
      )}
      <PasteNotesModal open={pasteOpen} onClose={() => setPasteOpen(false)}
        onApply={(p) => { setDraft((d) => applyNotes(d, p)); setPasteOpen(false); flash(`ใส่โน้ต ${p.teams.filter((t) => t.index <= 5).length} ไม้แล้ว — อย่าลืมกดบันทึกแผน`) }} />

      {/* ---------- ประกาศ: OP / ยกเลิก ---------- */}
      {(editing || view.op.length > 0 || view.banned.length > 0 || view.note) && (
      <section className="panel panel-gold mx-auto mt-8 max-w-4xl space-y-4 p-5 sm:p-6">
        <HeroRow
          icon={<span className="grid h-7 w-7 place-items-center rounded-md bg-green-500 text-white"><Check className="h-5 w-5" strokeWidth={3} /></span>}
          label="ตัวที่ OP ที่สุดตอนนี้"
          ids={view.op}
          editing={editing}
          onAdd={(id) => setDraft((d) => ({ ...d, op: d.op.includes(id) ? d.op : [...d.op, id].slice(0, 20) }))}
          onRemove={(id) => setDraft((d) => ({ ...d, op: d.op.filter((x) => x !== id) }))}
        />
        <BannedRow
          groups={view.banned}
          editing={editing}
          onAddGroup={() => setDraft((d) => ({ ...d, banned: [...d.banned, []].slice(0, 10) }))}
          onAddHero={(g, id) =>
            setDraft((d) => ({ ...d, banned: d.banned.map((grp, i) => (i === g && !grp.includes(id) ? [...grp, id].slice(0, 5) : grp)) }))
          }
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

      {/* ---------- สรุปการจัดสรรตัวละคร (ไม้บุก) ---------- */}
      <AllocationBar slots={view.slots} use={use} onAuto={editing ? runAuto : undefined} />

      {/* ---------- 5 ไม้ ---------- */}
      <div className="mt-12 space-y-14">
        {view.slots.map((raw, s) => {
          if (!editing && raw.options.length === 0 && !raw.vs && !raw.alts?.length) return null
          const h = houseOf(raw, s)
          const houses = 1 + (raw.alts?.length ?? 0)
          const slot = houseView(raw, h)
          const Icon = slot.kind === 'attack' ? Swords : Shield
          const isAtk = slot.kind === 'attack'
          const main = mainIndex(slot)
          const others = isAtk ? slot.options.length - 1 : 0
          const card = (opt: WarOption, o: number, part: 'all' | 'panel' | 'details' = 'all') => (
            <OptionCard
              key={o}
              part={part}
              option={opt}
              index={o}
              total={slot.options.length}
              editing={editing}
              banned={view.banned}
              onChange={(n) => patchOption(s, o, n)}
              onRemove={() => patchSlot(s, (x) => {
                const m = mainIndex(x)
                return { ...x, options: x.options.filter((_, i) => i !== o), main: o < m ? m - 1 : o === m ? 0 : m }
              })}
              onMove={(dir) =>
                patchSlot(s, (x) => {
                  const arr = [...x.options]
                  const j = o + dir
                  ;[arr[o], arr[j]] = [arr[j], arr[o]]
                  const m = mainIndex(x)
                  return { ...x, options: arr, main: m === o ? j : m === j ? o : m }
                })
              }
              onPick={(kind, index) => setPicker({ target: 'opt', s, o, kind, index })}
              onLibrary={() => setLibrary({ s, o })}
              attack={slot.kind === 'attack'}
              main={slot.kind === 'attack' && o === mainIndex(slot)}
              onMakeMain={() => patchSlot(s, (x) => ({ ...x, main: o }))}
              conflicts={slot.kind === 'attack' ? conflictsOf(opt, s, use) : []}
              blocked={slot.kind === 'attack' ? blockedFor(s, use) : undefined}
              shot={!editing && !isAtk ? { guild: data?.guild.name ?? '', plan: viewTitle, heading: /^ไม้\s*\d+$/.test(slot.name?.trim() ?? '') || !slot.name?.trim() ? `บ้านกันทีมที่ ${s + 1}` : slot.name.trim() } : undefined}
            />
          )
          const addBtns = editing && slot.options.length < MAX_OPTIONS ? (
            // สูงคงที่ ชิดบน — ไม่ยืดตามการ์ดทีมข้าง ๆ (ไม่ต้องเลื่อนลงไกล)
            <div className="grid h-56 grid-rows-2 gap-3 self-start">
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
                    options: [...x.options, { ...emptyOption(), custom: true, condition: x.kind === 'defense' && x.options.length ? 'ถ้าไม่มีทีมบน' : '' }],
                  }))
                }
                className="flex flex-col items-center justify-center gap-1 rounded-[18px] border-2 border-dashed border-white/20 text-white/60 hover:border-gold hover:text-gold"
              >
                <Plus className="h-7 w-7" />
                จัดทีมเอง
              </button>
            </div>
          ) : null
          return (
            <section key={s} id={`slot-${s}`} className="scroll-mt-28">
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

              {/* ไม้บุกเข้าได้หลายบ้าน: แท็บเลือกบ้าน (บ้าน 1 = บ้านหลัก) */}
              {isAtk && (editing || houses > 1) && (
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <div className="pill flex flex-wrap gap-1 p-1">
                    {Array.from({ length: houses }, (_, i) => {
                      const hv = houseView(raw, i)
                      const label = hv.vsTag ? houseLabel(hv.vsTag) : hv.vs ? teamNames(hv.vs) || `บ้าน ${i + 1}` : `บ้าน ${i + 1}`
                      return (
                        <button key={i} type="button" onClick={() => setHouse((m) => ({ ...m, [s]: i }))}
                          className={`max-w-[14rem] truncate rounded-full px-3 py-1 text-sm ${i === h ? 'bg-gradient-to-b from-[#fff1c9] to-[#e2bf72] font-semibold text-ink' : 'text-white/70 hover:bg-white/10'}`}>
                          {i === 0 && '★ '}{label}
                        </button>
                      )
                    })}
                    {editing && houses < MAX_HOUSES && (
                      <button type="button" onClick={() => addHouse(s)} className="flex items-center gap-1 rounded-full px-3 py-1 text-sm text-gold hover:bg-white/10">
                        <Plus className="h-4 w-4" /> เพิ่มบ้าน
                      </button>
                    )}
                  </div>
                  {houses > 1 && <span className="text-xs text-white/45">★ = บ้านหลัก · บ้านอื่นเป็นทางเลือกถ้าบ้านหลักโดนตีไปแล้ว</span>}
                  {editing && houses > 1 && (
                    <span className="ml-auto flex gap-2 text-sm">
                      {h > 0 && <button type="button" onClick={() => makeMainHouse(s, h)} className="text-gold hover:underline">ตั้งเป็นบ้านหลัก</button>}
                      <button type="button" onClick={() => removeHouse(s, h)} className="text-white/50 hover:text-red-300">ลบบ้านนี้</button>
                    </span>
                  )}
                </div>
              )}

              {isAtk ? (
                <>
                  {/* ซ้าย = ทีมหลักของเรา · กลาง VS · ขวา = บ้านที่จะตี */}
                  <VsArena
                    left={main >= 0 ? card(slot.options[main], main, 'panel') : addBtns ?? <p className="py-10 text-center text-white/40">ยังไม่มีทีมบุก</p>}
                    right={
                  <div className="flex h-full flex-col">
                    <div className="mb-4 flex min-h-8 items-center justify-center gap-2">
                      <span className="text-lg font-semibold text-red-200">บ้านที่จะตี</span>
                      {slot.vsTag && <span className="rounded-full px-2.5 py-0.5 text-sm font-semibold" style={tagStyle(slot.vsTag)}>{houseLabel(slot.vsTag)}</span>}
                    </div>
                    {slot.vs ? (
                      <TeamPanel
                        variant="enemy"
                        className="flex-1"
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
                  </div>
                    }
                  />
                  {/* รายละเอียด (โน้ต/ของ/ปุ่มเปลี่ยนบ้าน) อยู่ใต้แถว VS — กางแล้ว VS ไม่เลื่อน */}
                  <div className="mt-4 flex flex-col items-center gap-4 lg:flex-row lg:items-start lg:justify-center lg:gap-0">
                    <div className="w-full max-w-[400px] lg:w-[380px]">{main >= 0 && card(slot.options[main], main, 'details')}</div>
                    <div className="hidden lg:block lg:w-56 lg:shrink-0" />
                    <div className="w-full max-w-[400px] lg:w-[380px]">
                    {editing && slot.vs && (
                      <div className="flex justify-center gap-2 text-sm">
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
                  </div>
                  {others > 0 && (
                    <div data-noexport className="mt-6 flex justify-center">
                      <button type="button" onClick={() => toggleExpand(s)}
                        className="pill flex items-center gap-1.5 px-4 py-1.5 text-sm text-white/80 hover:border-gold hover:text-gold">
                        <ChevronDown className={`h-4 w-4 transition ${expanded.has(s) ? 'rotate-180' : ''}`} />
                        {expanded.has(s) ? 'ซ่อนคอมพ์อื่น' : `ดูคอมพ์อื่น (${others})`}
                      </button>
                    </div>
                  )}
                  {(expanded.has(s) || (editing && others === 0 && main >= 0)) && (
                    <div className="mt-8 grid gap-x-8 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
                      {slot.options.map((opt, o) => o !== main && card(opt, o))}
                      {main >= 0 && addBtns}
                    </div>
                  )}
                </>
              ) : (
                <div className="grid gap-x-8 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
                  {slot.options.map((opt, o) => card(opt, o))}
                  {addBtns}
                </div>
              )}
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
        targets={data?.targets ?? []}
        guildName={data?.guild.name ?? ''}
        open={vsLibrary !== null}
        initialTab="defense"
        onPick={() => {}}
        onPickDefense={pickDefense}
        onClose={() => setVsLibrary(null)}
      />

      <Modal open={!!logAsk} title="จดลงจดทีมศัตรูด้วยไหม?" onClose={() => !logBusy && answerLog(false)}>
        <p className="mb-3 text-sm text-white/70">ทีมที่จัดเองในแผนนี้ยังไม่มีในจดทีมศัตรู — เลือกทีมที่จะจดเป็น "ทีมแก้" ของบ้านนั้น</p>
        <div className="space-y-2">
          {logAsk?.items.map((it, i) => (
            <label key={i} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${logAsk.picked[i] ? 'border-gold/60 bg-gold/10' : 'border-white/10 bg-black/20'}`}>
              <input type="checkbox" className="mt-1 h-4 w-4 accent-[#f4d58d]" checked={logAsk.picked[i]}
                onChange={() => setLogAsk((x) => x && { ...x, picked: x.picked.map((v, j) => (j === i ? !v : v)) })} />
              <span className="min-w-0 text-sm">
                <span className="font-semibold text-gold">ไม้ {it.s + 1}</span>{' '}
                <span>{teamNames(it.opt.team)}</span>
                <span className="mx-1.5 text-white/40">vs</span>
                <span className="text-red-200">{teamNames(it.vs)}</span>
                <span className="mt-0.5 block text-xs text-white/50">
                  {it.target ? 'เพิ่มเป็นทีมแก้ของบ้านที่มีอยู่แล้ว' : 'บ้านนี้ยังไม่มี → สร้างบ้านใหม่ + ทีมแก้'}
                </span>
              </span>
            </label>
          ))}
        </div>
        <div className="mt-5 flex gap-2">
          <button disabled={logBusy || !logAsk?.picked.some(Boolean)} onClick={() => answerLog(true)} className="btn-gold flex-1 py-2">
            {logBusy ? 'กำลังจด...' : 'จดลงจดทีมศัตรู'}
          </button>
          <button disabled={logBusy} onClick={() => answerLog(false)} className="pill px-5 py-2">ไม่ต้อง</button>
        </div>
      </Modal>

      {toast && (
        <div data-noexport className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink shadow-lg">{toast}</div>
      )}

      <CompLibrary
        targets={data?.targets ?? []}
        guildName={data?.guild.name ?? ''}
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
  onAdd: (id: string) => void
  onRemove: (id: string) => void
  danger?: boolean
}) {
  const dock = useListTarget('list:op', editing ? { label, used: ids, full: ids.length >= 20, onAdd } : null)
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
          <button onClick={dock.open} className={`flex items-center gap-1 rounded-full border border-dashed px-3 py-1 text-sm hover:border-gold hover:text-gold ${dock.active ? 'border-gold text-gold shadow-[0_0_12px_rgba(244,213,141,.6)]' : 'border-white/30 text-white/70'}`}>
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
  onAddHero: (g: number, id: string) => void
  onRemoveHero: (g: number, id: string) => void
  onRemoveGroup: (g: number) => void
}) {
  const [cur, setCur] = useState(0)
  const grp = groups[cur] ?? []
  const dock = useListTarget('list:banned', editing ? {
    label: `ยกเลิกบ้าน ชุด ${cur + 1}`, used: grp, full: grp.length >= 5, onAdd: (id) => onAddHero(cur, id),
  } : null)
  if (!editing && groups.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="grid h-7 w-7 place-items-center rounded-md bg-red-500 text-white"><X className="h-5 w-5" strokeWidth={3} /></span>
      <span className="text-lg font-semibold">ยกเลิกบ้าน</span>
      <div className="flex flex-wrap items-center gap-2">
        {groups.map((g, gi) => (
          <span key={gi} className={`flex flex-wrap items-center gap-1 rounded-full border bg-red-500/10 py-0.5 pl-0.5 pr-2 ${dock.active && cur === gi ? 'border-gold shadow-[0_0_12px_rgba(244,213,141,.5)]' : 'border-red-400/40'}`}>
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
              <button onClick={() => { setCur(gi); dock.open() }} className="ml-1 rounded-full border border-dashed border-red-300/50 px-2 text-xs text-red-200 hover:bg-red-500/20">
                + ตัว
              </button>
            )}
            {editing && (
              <button onClick={() => { onRemoveGroup(gi); if (cur >= gi && cur > 0) setCur(cur - 1) }} className="ml-1 rounded-full p-1 text-red-300 hover:bg-red-500/20" title="ลบชุดนี้">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </span>
        ))}
        {editing && (
          <button onClick={() => { if (groups.length >= 10) return; setCur(groups.length); onAddGroup(); dock.open() }} className="flex items-center gap-1 rounded-full border border-dashed border-white/30 px-3 py-1 text-sm text-white/70 hover:border-gold hover:text-gold">
            <Plus className="h-4 w-4" /> เพิ่มชุดที่ยกเลิก
          </button>
        )}
      </div>
    </div>
  )
}

/** แถบสรุป: ไม้บุกแต่ละไม้ใช้ทีมไหน ตัวไหนซ้ำ */
function AllocationBar({ slots, use, onAuto }: { slots: WarSlot[]; use: Map<string, number[]>; onAuto?: () => void }) {
  const attacks = slots.map((slot, s) => ({ slot, s })).filter(({ slot }) => slot.kind === 'attack' && (slot.options.length > 0 || slot.vs))
  if (!attacks.length) return null
  const total = use.size
  const dup = conflictCount(use)
  return (
    <section className="panel mx-auto mt-8 max-w-4xl p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Swords className="h-5 w-5 text-gold" />
        <span className="text-lg font-semibold">จัดสรรตัวละคร</span>
        <span className="text-sm text-white/50">ใช้ไป {total} ตัว</span>
        {onAuto && (
          <button type="button" onClick={onAuto} title="เลือกทีมหลักทุกไม้ให้ตัวไม่ซ้ำ (เลือกทีมลำดับต้นก่อน)"
            className="btn-gold ml-auto flex items-center gap-1 px-3 py-1 text-sm">
            <Wand2 className="h-4 w-4" /> จัดให้อัตโนมัติ
          </button>
        )}
        <span className={`${onAuto ? '' : 'ml-auto '}flex items-center gap-1 rounded-full px-3 py-0.5 text-sm font-semibold ${dup ? 'bg-red-500/25 text-red-100' : 'bg-green-500/20 text-green-100'}`}>
          {dup ? <><AlertTriangle className="h-4 w-4" /> ตัวซ้ำ {dup} ตัว</> : <><Check className="h-4 w-4" /> ไม่มีตัวซ้ำ</>}
        </span>
      </div>
      <div className="space-y-1.5">
        {attacks.map(({ slot, s }) => {
          const heroes = heroesOf(mainOption(slot))
          return (
            <a key={s} href={`#slot-${s}`} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-white/5">
              <span className="w-12 shrink-0 text-sm font-semibold text-gold">ไม้ {s + 1}</span>
              <span className="w-24 shrink-0">
                {slot.vsTag && <span title="ประเภทบ้านศัตรูที่ไม้นี้จะไปตี" className="whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold" style={tagStyle(slot.vsTag)}>vs {houseLabel(slot.vsTag)}</span>}
              </span>
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                {heroes.length ? heroes.map((id) => {
                  const clash = (use.get(heroKey(id))?.length ?? 0) > 1
                  return (
                    <span key={id} className={`flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2.5 text-sm ${clash ? 'bg-red-500/25 text-red-100 ring-1 ring-red-400' : 'bg-white/5'}`}>
                      <span className="h-7 w-7" style={{ fontSize: 8 }}><UnitCard id={id} shape="round" /></span>
                      {heroKey(id)}
                    </span>
                  )
                }) : <span className="text-sm text-white/40">ยังไม่ได้เลือกทีม</span>}
              </span>
            </a>
          )
        })}
      </div>
    </section>
  )
}
