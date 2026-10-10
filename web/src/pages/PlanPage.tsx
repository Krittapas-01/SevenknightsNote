import { AlertTriangle, Check, ChevronDown, ChevronLeft, ImageDown, Library, Pencil, Plus, Shield, Swords, Trash2, Wand2, X } from 'lucide-react'
import { houseLabel, isMainTag, tagStyle } from '../lib/tags'
import type { HeroNote, WarSlot } from '../lib/types'
import { hasStats } from '../lib/stats'
import { Fragment, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import TeamCardLite, { CARD_EXTRA, CARD_UNIT } from '../components/TeamCardLite'
import SkillSkipAsk, { skillShort } from '../components/SkillSkipAsk'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import CompLibrary, { type Comp, type Defense } from '../components/CompLibrary'
import TeamPanel from '../components/TeamPanel'
import { DndHub, DockAware, HideWhileDock, useListTarget } from '../components/DndHub'
import { findLogItems, findSyncItems, logToTargets, markLogged, syncToLibrary, type LogItem, type SyncItem } from '../lib/logTargets'
import Modal from '../components/Modal'
import TagEditor from '../components/TagEditor'
import { PresetPickerButton } from '../components/Presets'
import { rememberNotes } from '../lib/myStats'
import { autoSpeed } from '../lib/teamSpeed'
import HelpLink from '../components/HelpLink'
import { shakeScreen } from '../lib/shake'
import GuildOnboarding from '../components/GuildOnboarding'
import { EXPORT_ON, exportPng } from '../lib/exportImage'
import { autoAssign, blockedFor, conflictCount, conflictsOf, heroKey, heroUsage, heroesOf, mainIndex, mainOption } from '../lib/allocation'
import HeroDock from '../components/HeroDock'
import OptionCard from '../components/OptionCard'
import type { SlotKind } from '../components/TeamPanel'
import UnitCard from '../components/UnitCard'
import UnitPicker from '../components/UnitPicker'
import VsArena from '../components/VsArena'
import { baseName, getUnit, unitBase, unitLabel } from '../data/heroes'
import { api } from '../lib/api'
import {
  MAX_HEROES, MAX_HOUSES, MAX_OPTIONS, MAX_SKILL_QUEUE, changeFormation, emptyHouse, houseApply, houseView, emptyOption, emptyPlan, emptyTeam, heroCount, moveSlot, placeUnit, teamOps, type PlanData, type PlanKind, type Team, type WarOption, PLAN_KIND_LABEL, planKind, slotLabel } from '../lib/types'
import { useGuild } from '../lib/useGuild'
import { activePlanId } from '../lib/war'
import NotFound from './NotFound'
import { tx, L, LOCALE } from '../lib/i18n'
import { useSlideDir } from '../lib/slide'
import ConfirmDelete from '../components/ConfirmDelete'

type Picker =
  | { target: 'op' }
  | { target: 'banned'; g: number }
  | { target: 'opt'; s: number; o: number; kind: SlotKind; index: number }
  | { target: 'vs'; s: number; kind: SlotKind; index: number }
  | null

/**
 * แผนบุก: ใช้ที่จดไว้ (เลือกบ้าน/ทีมจากคลัง + ทีมแก้มาให้อัตโนมัติ) — ปิดไว้ก่อน ยังไม่ดีพอ (ต.ค. 2569)
 * เปิดกลับ = true · แผนกันไม่เกี่ยว · หน้าต่าง "จดลงบ้านศัตรู" หลังบันทึกยังทำงาน (สะสมข้อมูลเข้าคลัง)
 */
const ATTACK_LIBRARY = false

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
  const [search, setSearch] = useSearchParams()
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
  /** เปิดที่จดไว้ให้ไม้ s (o = ทางเลือกที่จะแทน, null = เพิ่มใหม่) */
  const [library, setLibrary] = useState<{ s: number; o: number | null } | null>(null)
  /** เปิดคลังเพื่อเลือกบ้านที่จะตีของไม้ s */
  const [vsLibrary, setVsLibrary] = useState<number | null>(null)
  /** ไม้ที่มีหลายบ้าน: บ้านที่กำลังดู/แก้ของแต่ละไม้ (0 = บ้านหลัก) */
  const [house, setHouse] = useState<Record<number, number>>({})
  /** ลบบ้าน = กด 2 ครั้ง (กันกดพลาด) · key = "ไม้-บ้าน" */
  const [delAsk, setDelAsk] = useState<string | null>(null)
  const houseOf = (slot: WarSlot | undefined, s: number) => Math.min(house[s] ?? 0, slot?.alts?.length ?? 0)
  /** ไม้ s ในมุมของบ้านที่เลือกอยู่ (ใช้ตอนแก้) */
  const curSlot = (s: number) => houseView(draft.slots[s], houseOf(draft.slots[s], s))
  const [toast, setToast] = useState<string | null>(null)
  // ถามหลังบันทึกแผน: จดทีมที่จัดเองลงบ้านศัตรูด้วยไหม
  /** บันทึกแผน: ทีมแก้ที่ค่าความสามารถความเร็วครบทุกตัว → ถามก่อนว่าจะใส่ผลรวมเป็นความเร็วทีมไหม */
  const [speedAsk, setSpeedAsk] = useState<{ items: { s: number; o: number; total: number; cur: number }[]; picked: boolean[] } | null>(null)
  const [logAsk, setLogAsk] = useState<{ items: LogItem[]; planId: string; body: { title: string; data: PlanData }; picked: boolean[] } | null>(null)
  const [logBusy, setLogBusy] = useState(false)
  // ถามหลังบันทึกแผน: ส่งอุปกรณ์/ค่าความสามารถที่แก้ในแผนกลับไปที่ทีมแก้ในคลังไหม (ถามก่อน "จดลงบ้านศัตรู")
  const [syncAsk, setSyncAsk] = useState<{ items: SyncItem[]; picked: boolean[]; next: (() => void) | null } | null>(null)
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
      await exportPng(exportRef.current, `${data?.guild.name ?? '7K Note'} - ${plan?.title ?? 'แผนสงคราม'}`)
    } catch (e) {
      flash(tx('สร้างรูปไม่สำเร็จ: ') + (e as Error).message)
    } finally {
      setExporting(false)
    }
  }
  // ไม้: ปกติโชว์แค่ทีมหลัก กดขยายถึงเห็นคอมพ์อื่น
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const toggleExpand = (s: number) => setExpanded((x) => { const n = new Set(x); if (n.has(s)) n.delete(s); else n.add(s); return n })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  // ตอนแก้: เปิดทีละไม้ (เริ่มไม้ 1) กดเพิ่มไม้ถัดไปเอง จะได้ไม่รกตั้งแต่แรก
  const [shownSlots, setShownSlots] = useState(1)
  useEffect(() => { if (editing) setShownSlots(1) }, [editing])
  // แผนบุก: ตั้งไม้ทีละขั้นในหน้าต่างเต็มจอ (ล็อกจนกด เสร็จ/ยกเลิก) — snap = ของเดิมไว้ย้อนตอนยกเลิก
  /** แผนบุกตอนดู: ไม้ที่เปิดดูรายละเอียด = หน้าใหม่ (?slot=N ใน URL · ย้อนกลับของเบราว์เซอร์ใช้ได้) */
  const slotParam = Number(search.get('slot'))
  const detail = Number.isInteger(slotParam) && slotParam >= 1 && slotParam <= 5 ? slotParam - 1 : null
  const setDetail = (s: number | null, replace = false) => {
    const next = new URLSearchParams(search)
    if (s === null) next.delete('slot')
    else next.set('slot', String(s + 1))
    setSearch(next, { replace })
  }
  /** กลับหน้าแผน: มาจากหน้าแผน = ย้อนประวัติ · เปิดลิงก์ตรง = เอา ?slot ออก */
  const closeDetail = () => ((window.history.state?.idx ?? 0) > 0 ? nav(-1) : setDetail(null))
  useEffect(() => { window.scrollTo(0, 0) }, [detail])
  // หน้ารายละเอียดไม้: เปลี่ยนไม้ด้วย ‹ › = เนื้อหาเลื่อนเข้าตามทิศ
  const detailSlide = useSlideDir(detail ?? -1)
  /** ออกจากขั้นทีมแก้ตอนตั้งลำดับการใช้สกิลยังไม่ครบ → ถามยืนยันก่อน (ไม่ตั้ง/ตั้งไม่ครบก็ได้) · เก็บ action ที่จะทำต่อ */
  const [skillAsk, setSkillAsk] = useState<{ items: [string, number][]; then: () => void; back: { s: number; o: number } } | null>(null)
  /** เปิดหน้าต่างลำดับการใช้สกิลของทีม (ไม้ s ทีม o) — n เปลี่ยน = สั่งเปิด */
  const [skillReq, setSkillReq] = useState<{ s: number; o: number; n: number } | null>(null)
  const backdropDown = useRef(false)
  const [exitAsk, setExitAsk] = useState(false)
  const [wiz, setWiz] = useState<{ s: number; step: 1 | 2 | 3; snap: WarSlot; isNew: boolean; skillOk?: boolean; vsSkillOk?: boolean } | null>(null)
  useEffect(() => { if (!editing) setWiz(null) }, [editing])
  useEffect(() => {
    if (!wiz) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [wiz])

  useEffect(() => {
    if (isNew && canEdit) {
      setTitle(PLAN_KIND_LABEL[newKind])
      setDraft(emptyPlan(newKind))
      setEditing(true)
    }
  }, [isNew, canEdit, newKind])

  if (error) return <NotFound message={error} />
  if (!data) return <p className="py-24 text-center text-white/50">{tx('กำลังโหลด...')}</p>
  if (!isNew && !plan) return <NotFound message="ไม่พบแผนนี้" />
  if (isNew && !canEdit) return <NotFound message="ลิงก์นี้ไม่มีสิทธิ์แก้ไข" />

  // หน้าใหม่: รอบแรกก่อน useEffect เปิดโหมดแก้ไข ยังไม่มี plan ให้ใช้ draft ไปก่อน
  const view: PlanData = editing || !plan ? draft : plan.data
  const atkPlan = planKind(view) === 'attack'
  /** บ้านทุกบ้านของไม้นี้: จัดเอง (ไม่มี vsId) + มีตัว → ต้องมีแท็กประเภทหลัก (กติกาเดียวกับหน้าบ้านศัตรู) */
  const houseTagged = (raw: WarSlot) => Array.from({ length: 1 + (raw.alts?.length ?? 0) }, (_, h) => houseView(raw, h)).every((x) =>
    !x.vs || !heroCount(x.vs) || !!x.vsId || (x.vsTags?.length ? x.vsTags : x.vsTag ? [x.vsTag] : []).some(isMainTag))
  /** ไม้นี้มีของไหม (ทีม/บ้าน/โน้ตบ้าน) */
  const slotUsed = (x: WarSlot) => !!(x.options.length || x.vs || x.alts?.length || x.vsNote)
  /** ลบไม้ s: ไม้หลังเลื่อนขึ้นมาแทน + เติมไม้ว่างท้ายสุด (แผนมี 5 ไม้เสมอ) · ชื่อเริ่มต้น "ไม้ N" เรียงเลขใหม่ */
  const removeSlot = (s: number) => {
    setDraft((d) => {
      const kind = planKind(d)
      const rest = d.slots.filter((_, i) => i !== s)
      const slots = [...rest, { name: '', kind, vs: null, vsTag: '', vsId: '', options: [] } as WarSlot]
        .map((x, i) => (!x.name.trim() || /^(ไม้|Slot)\s*\d+$/i.test(x.name.trim()) ? { ...x, name: `ไม้ ${i + 1}` } : x))
      return { ...d, slots }
    })
    setHouse({})
    setExpanded(new Set())
    setShownSlots((v) => Math.max(1, v - 1))
  }
  // ไม้ที่มีของแล้วต้องโชว์เสมอ (แผนเก่า/วางโน้ต/จัดอัตโนมัติ) + ไม้ที่กดเพิ่มเอง
  const lastUsed = view.slots.reduce((m, x, i) => (slotUsed(x) ? i : m), -1)
  const visibleSlots = Math.max(shownSlots, lastUsed + 1, 1)
  /** จัดให้อัตโนมัติ: เลือกทีมหลักทุกไม้ให้ตัวไม่ซ้ำ */
  function runAuto() {
    const { mains, unresolved } = autoAssign(draft.slots, draft.banned)
    if (!mains.size && !unresolved.length) return flash(tx('ยังไม่มีไม้ที่มีทีม — เพิ่มทีมแก้ก่อน'))
    setDraft((d) => ({ ...d, slots: d.slots.map((x, i) => (mains.has(i) ? { ...x, main: mains.get(i) } : x)) }))
    flash(unresolved.length
      ? `จัดได้ ${mains.size} ไม้ · ${unresolved.map((i) => `ไม้ ${i + 1}`).join(', ')} หาทีมที่ไม่ชนไม่ได้ — ลองเพิ่มทีมสำรอง`
      : L(`จัดครบ ${mains.size} ไม้ ไม่มีตัวซ้ำ ✓`, `All ${mains.size} slots assigned, no duplicates ✓`))
  }
  function flash(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4500)
  }
  // อัศวินที่ทีมหลักของแต่ละไม้ใช้ (ใช้ได้รอบเดียว)
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
  /** เพิ่ม/ลบ/ตั้งบ้านหลัก (ไม้) */
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
          if (!alts.length) return { ...x, vs: null, vsTag: '', vsId: '' }
          const [first, ...rest] = alts
          return { ...x, vs: first.vs ?? null, vsTag: first.vsTag ?? '', vsId: first.vsId ?? '', alts: rest }
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
        const old = { vs: x.vs ?? null, vsTag: x.vsTag ?? '', vsId: x.vsId ?? '' }
        return { ...x, vs: alt.vs ?? null, vsTag: alt.vsTag ?? '', vsId: alt.vsId ?? '', alts: x.alts.map((a, j) => (j === h - 1 ? old : a)) }
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
        const condition = slot.kind === 'defense' && slot.options.length ? tx('ถ้าไม่มีทีมบน') : ''
        return { ...slot, options: [...slot.options, optionFrom(c, condition)].slice(0, MAX_OPTIONS) }
      }
      return { ...slot, options: slot.options.map((x, i) => (i === o ? { ...optionFrom(c), condition: x.condition } : x)) }
    })
    setLibrary(null)
  }

  /** เลือกบ้านที่จะตี: ใส่บ้าน + ถ้ายังไม่มีทีมแก้ ใส่ทีมแก้ของบ้านนั้นมาให้ทั้งหมด */
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
      setToast(L(`ใส่ทีมแก้ ${Math.min(d.counters.length, MAX_OPTIONS)} ทีมให้แล้ว — ลบทีมที่ไม่ใช้ได้ที่ไอคอนถังขยะ`, `Added ${Math.min(d.counters.length, MAX_OPTIONS)} counters — remove unused ones with the trash icon`))
      setTimeout(() => setToast(null), 4000)
    }
  }

  // บ้านใหม่ที่ติ๊กจะจด ต้องมีประเภทหลัก (ดูที่รายการแรกของบ้านเดียวกัน — ช่องแท็กอยู่ที่นั่น)
  const logNeedsTag = !!logAsk && logAsk.items.some((it, i) => {
    if (it.target || !logAsk.picked[i]) return false
    const first = logAsk.items.find((x) => !x.target && teamNames(x.vs) === teamNames(it.vs))
    return !(first ?? it).tags.some(isMainTag)
  })
  async function answerLog(save: boolean) {
    if (!logAsk) return
    setLogBusy(true)
    const chosen = logAsk.items.filter((_, i) => logAsk.picked[i])
    let msg = ''
    if (save && chosen.length) {
      const r = await logToTargets(gid, chosen)
      msg = r.errors.length ? L(`จดแล้ว ${r.ok} ทีม · ไม่สำเร็จ: ${r.errors.join(' / ')}`, `Logged ${r.ok} teams · failed: ${r.errors.join(' / ')}`) : L(`จดลงบ้านศัตรูแล้ว ${r.ok} ทีม ✓`, `Logged ${r.ok} teams to enemy defenses ✓`)
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

  async function save(plan: PlanData = draft, askSpeed = true, skillOk = false) {
    // บ้านที่จัดเอง (ไม่ได้มาจากคลัง) ต้องมีประเภทหลัก เหมือนตอนบ้านศัตรู
    const noTag = plan.slots.findIndex((x) => x.kind === 'attack' && !houseTagged(x))
    if (noTag >= 0) {
      setErr(L(`ไม้ ${noTag + 1}: บ้านที่จัดเองต้องเลือกประเภทคอมพ์ก่อน (กายภาพ / เวท / แทงก์)`, `Slot ${noTag + 1}: custom defenses need a comp type first (Physical / Magic / Tank)`))
      shakeScreen()
      return
    }
    // แผนกัน: บ้านกันหลักแต่ละไม้ใช้อัศวิน/สัตว์เลี้ยงซ้ำกันไม่ได้ (ในเกมวางซ้ำไม่ได้)
    if (planKind(plan) === 'defense') {
      const u = heroUsage(plan.slots)
      const dupe = [...u.entries()].find(([, ss]) => ss.length > 1)
      if (dupe) {
        setErr(`${dupe[0]} อยู่ในบ้านกันหลายไม้ (${dupe[1].map((x) => `ไม้ ${x + 1}`).join(', ')}) — แต่ละไม้ใช้ตัว/สัตว์เลี้ยงซ้ำกันไม่ได้`)
        shakeScreen()
        return
      }
    }
    // ทุกทีม (ทีมเรา + บ้านที่จะตี) ต้องมีสัตว์เลี้ยง
    const noPet = plan.slots.findIndex((x) => Array.from({ length: 1 + (x.alts?.length ?? 0) }, (_, h) => houseView(x, h)).some((v) =>
      (v.vs && heroCount(v.vs) > 0 && !v.vs.pet) || v.options.some((o) => heroCount(o.team) > 0 && !o.team.pet)))
    if (noPet >= 0) {
      setErr(L(`ไม้ ${noPet + 1}: ยังมีทีมที่ไม่ได้เลือกสัตว์เลี้ยง`, `Slot ${noPet + 1}: some teams have no pet yet`))
      shakeScreen()
      return
    }
    // ทีมเราที่ตั้งลำดับการใช้สกิลไม่ครบ → ถามก่อน (แผนบุก: ทีมหลักถามไปแล้วในหน้าต่างตั้งไม้ → เช็คแค่ทีมสำรอง)
    if (!skillOk) {
      const short = plan.slots.flatMap((x, si) => x.options.map((o, oi) => {
        if (!skillShort(o.team, o.skills)) return null
        const isMain = x.kind === 'attack' && oi === mainIndex(x)
        if (isMain) return null
        return { label: `ไม้ ${si + 1} · ${oi === 0 ? 'บ้านกันหลัก' : `ทีมสำรอง ${oi}`}`, have: o.skills.length, s: si, o: oi }
      })).filter((v): v is { label: string; have: number; s: number; o: number } => !!v)
      if (short.length) return setSkillAsk({ items: short.map((x) => [x.label, x.have]), back: { s: short[0].s, o: short[0].o }, then: () => void save(plan, askSpeed, true) })
    }
    if (askSpeed) {
      const items = plan.slots.flatMap((slot, si) => slot.options.map((opt, oi) => {
        const spd = autoSpeed(opt.team, opt.heroNotes)
        return spd.full && spd.total !== (opt.team.speed || 0) ? { s: si, o: oi, total: spd.total, cur: opt.team.speed || 0 } : null
      })).filter((x): x is { s: number; o: number; total: number; cur: number } => !!x)
      if (items.length) return setSpeedAsk({ items, picked: items.map(() => true) })
    }
    setSpeedAsk(null)
    setBusy(true)
    setErr(null)
    try {
      // แถวอุปกรณ์/ค่าความสามารถที่ยังว่าง (เปิดไว้ให้กรอกในหน้าต่างตั้งไม้) ไม่ต้องบันทึก
      const filled = (n: HeroNote) => !!(n.text.trim() || n.sets.length || n.rings.length || hasStats(n.stats))
      const cleaned = { ...plan, slots: plan.slots.map((x) => ({ ...x, options: x.options.map((o) => (o.heroNotes ? { ...o, heroNotes: o.heroNotes.filter(filled) } : o)) })) }
      const body = { title: title.trim() || 'แผนสงคราม', data: { ...cleaned, banned: plan.banned.filter((g) => g.length) } }
      // ทีมที่จัดเองในแผน → เดี๋ยวถามว่าจะจดลงบ้านศัตรูด้วยไหม
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
      rememberNotes(body.data.slots.flatMap((x) => x.options.flatMap((o) => o.heroNotes ?? []))) // จำค่าความสามารถล่าสุดของเครื่องนี้
      const askLog = items.length ? () => setLogAsk({ items, planId, body, picked: items.map(() => true) }) : null
      const sync = findSyncItems(body.data, data?.targets ?? [], isNew ? undefined : data?.plans.find((p) => p.id === pid)?.data)
      if (sync.length) setSyncAsk({ items: sync, picked: sync.map(() => true), next: askLog })
      else askLog?.()
    } catch (e) {
      setErr((e as Error).message)
      shakeScreen()
    } finally {
      setBusy(false)
    }
  }
  async function answerSync(apply: boolean) {
    if (!syncAsk) return
    const next = syncAsk.next
    if (apply) {
      setLogBusy(true)
      const r = await syncToLibrary(gid, syncAsk.items.filter((_, i) => syncAsk.picked[i]))
      await reload()
      setLogBusy(false)
      flash(r.errors.length ? L(`อัปเดตบ้านศัตรูแล้ว ${r.ok} ทีม · ไม่สำเร็จ: ${r.errors.join(' / ')}`, `Updated enemy defenses: ${r.ok} teams · failed: ${r.errors.join(' / ')}`) : L(`อัปเดตทีมแก้ในบ้านศัตรูแล้ว ${r.ok} ทีม ✓`, `Updated ${r.ok} counters in enemy defenses ✓`))
    }
    setSyncAsk(null)
    next?.()
  }
  /** ตอบหน้าต่างถามความเร็ว: ใส่ผลรวมให้ทีมที่ติ๊กไว้ (หรือไม่ใส่เลย) แล้วบันทึก */
  function answerSpeed(apply: boolean) {
    if (!speedAsk) return
    let plan = draft
    if (apply) {
      const pick = new Map(speedAsk.items.filter((_, i) => speedAsk.picked[i]).map((it) => [`${it.s}:${it.o}`, it.total]))
      plan = { ...draft, slots: draft.slots.map((slot, si) => ({
        ...slot,
        options: slot.options.map((opt, oi) => {
          const sp = pick.get(`${si}:${oi}`)
          return sp === undefined ? opt : { ...opt, team: { ...opt.team, speed: sp } }
        }),
      })) }
      setDraft(plan)
    }
    void save(plan, false, true)
  }
  async function remove() {
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

  const teamAvatars = (t: Team | null | undefined, sm = false) => (
    <span className="flex -space-x-1.5">
      {(t?.slots ?? []).filter(Boolean).map((id, i) => (
        <span key={i} className={`${sm ? 'h-7 w-7' : 'h-9 w-9'} rounded-full ring-2 ring-[#121a2c]`} style={{ fontSize: 8 }}><UnitCard id={id!} shape="round" small /></span>
      ))}
    </span>
  )
  function openWiz(s: number, isNew = false) {
    const raw = draft.slots[s]
    setHouse((m) => ({ ...m, [s]: 0 }))
    // แผนกัน: ไม่มีบ้านที่จะตี → เริ่มที่ขั้นบ้านกัน (ขั้น 2) เลย
    const def = raw?.kind === 'defense'
    const step = def || (!isNew && raw?.vs && heroCount(raw.vs)) ? 2 : 1
    const snap = clone(raw)
    if (step === 2) ensureMain(s)
    // ไม่มีคลัง → เปิดการ์ดบ้านว่างให้จัดเลย (ไม่ต้องกด "จัดบ้านศัตรูเอง")
    if (!def && !ATTACK_LIBRARY && !raw?.vs) setDraft((d) => ({ ...d, slots: d.slots.map((x, i) => (i === s ? { ...x, vs: emptyTeam() } : x)) }))
    setWiz({ s, step, snap, isNew })
  }
  /** ขั้นอุปกรณ์/ค่าความสามารถ: เปิดแถวให้อัศวินทุกตัวในทีมหลัก (เห็นชัดว่ากรอกให้ตัวไหน · แถวที่ว่างไม่ถูกบันทึก) */
  function ensureNoteRows(s: number) {
    setDraft((d) => ({ ...d, slots: d.slots.map((x, i) => {
      if (i !== s) return x
      const m = mainIndex(x)
      const opt = x.options[m]
      if (!opt) return x
      const notes = opt.heroNotes ?? []
      const key = (id: string) => baseName(getUnit(id)?.name ?? id)
      const add = (opt.team.slots.filter(Boolean) as string[]).filter((h) => !notes.some((n) => key(n.hero) === key(h)))
      if (!add.length) return x
      const heroNotes = [...notes, ...add.map((hero) => ({ hero, text: '', sets: [], rings: [] }))].slice(0, 5)
      return { ...x, options: x.options.map((o, j) => (j === m ? { ...o, heroNotes } : o)) }
    }) }))
  }
  /** ขั้นทีมแก้: ยังไม่มีทีม → ใส่การ์ดทีมว่างให้กดช่อง + ได้เลย (แทนปุ่มใหญ่) */
  function ensureMain(s: number) {
    setDraft((d) => ({ ...d, slots: d.slots.map((x, i) => (i === s && !x.options.length ? { ...x, options: [{ ...emptyOption(), custom: true }], main: 0 } : x)) }))
  }
  function cancelWiz() {
    if (!wiz) return
    const { s, snap, isNew } = wiz
    setDraft((d) => ({ ...d, slots: d.slots.map((x, i) => (i === s ? snap : x)) }))
    if (isNew) setShownSlots((v) => Math.max(1, v - 1))
    setWiz(null)
  }

  /** ความสูงการ์ดไม้ในตาราง: ช่องอัศวิน 3 แถว + หัว/ความเร็ว/สัตว์เลี้ยงสำรอง — ล็อกเท่ากันทุกใบ (รวมการ์ดเพิ่มไม้) */
  // ช่องอัศวินย่อตามความกว้างการ์ด (จอกว้างวาง 5 ไม้แถวเดียว การ์ดแคบลง) · cqw = ความกว้างของการ์ดไม้นั้น
  const CARD_U = `min(${CARD_UNIT}, 26cqw)`
  const CARD_H = `calc(${CARD_U} * 3 + ${CARD_EXTRA}px)`
  /** การ์ดไม้ (แผนบุก) — โชว์แค่ทีมแก้หลัก · กดการ์ด = แก้ (หน้าต่างตั้งไม้) / ดูรายละเอียด */
  const slotCard = (raw: WarSlot, s: number) => {
    const u = slotUI(raw, s)
    const mainOpt = u.main >= 0 ? u.slot.options[u.main] : null
    const isDef = raw.kind === 'defense'
    const clash = mainOpt ? conflictsOf(mainOpt, s, use, isDef) : []
    const name = raw.name?.trim() && !/^(ไม้|Slot)\s*\d+$/i.test(raw.name.trim()) ? raw.name.trim() : ''
    if (editing && !slotUsed(raw)) {
      return (
        <div key={s} className="@container"><button type="button" onClick={() => openWiz(s, true)} style={{ height: CARD_H }}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-[18px] border-2 border-dashed border-gold/40 font-semibold text-gold transition hover:border-gold hover:bg-gold/5">
          <Plus className="h-7 w-7" />{' '}{tx('ตั้งไม้')}{' '}{s + 1}
        </button></div>
      )
    }
    const open = () => (editing ? openWiz(s) : setDetail(s))
    return (
      // หน้าตาเหมือนหน้าจัดทีมในเกม: การ์ดทีม (รูปแบบ/สัตว์เลี้ยง/ตั้งลำดับการใช้สกิล/ความเร็ว) + บ้านที่จะตีใต้การ์ด
      <div key={s} id={`slot-${s}`} role="button" tabIndex={0} onClick={open}
        onKeyDown={(e) => { if (e.key === 'Enter') open() }}
        className="group @container flex cursor-pointer flex-col transition hover:-translate-y-0.5">
        {mainOpt && heroCount(mainOpt.team) ? (
          <div style={{ height: CARD_H }}>
            <TeamCardLite variant="ally" team={mainOpt.team} skills={mainOpt.skills} unit={CARD_U}
              title={<span className="text-gold">{name || L(`ไม้ ${s + 1}`, `Slot ${s + 1}`)}</span>} className="h-full group-hover:border-gold/70" />
          </div>
        ) : (
          <div style={{ height: CARD_H }} className="panel panel-gold grid w-full place-items-center p-4 text-sm text-white/40">
            <span className="font-semibold text-gold">{name || L(`ไม้ ${s + 1}`, `Slot ${s + 1}`)}</span>{tx('ยังไม่มีทีมแก้')}
          </div>
        )}
        {!isDef && <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs">
          <span className="font-bold text-red-300">VS</span>
          {raw.vs && heroCount(raw.vs) ? teamAvatars(raw.vs, true) : <span className="text-white/40">{tx('ยังไม่ได้เลือกบ้าน')}</span>}
          {raw.vsTag && <span className="rounded-full px-2 py-0.5 font-semibold" style={tagStyle(raw.vsTag)}>{houseLabel(raw.vsTag)}</span>}
        </div>}
        {(u.slot.options.length > 1 || u.houses > 1 || clash.length > 0) && (
          <div className="mt-1.5 flex flex-wrap justify-center gap-1.5 text-[11px]">
            {u.slot.options.length > 1 && <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/70">+{u.slot.options.length - 1}{' '}{tx('สำรอง')}</span>}
            {u.houses > 1 && <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/70">{tx('ตีได้')}{' '}{u.houses}{' '}{tx('บ้าน')}</span>}
            {clash.length > 0 && <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 font-semibold text-red-200"><AlertTriangle className="h-3 w-3" />{' '}{tx('ตัวซ้ำ')}</span>}
          </div>
        )}
        <div className="mt-1.5 flex items-center justify-center gap-2 text-xs">
          <span className="text-white/40 group-hover:text-gold">{editing ? tx('กดเพื่อแก้ไม้นี้') : tx('กดดูรายละเอียด')}</span>
          {editing && <span onClick={(e) => e.stopPropagation()} className="[&_button]:px-2 [&_button]:py-0.5 [&_button]:text-xs">{u.deleteBtn}</span>}
        </div>
      </div>
    )
  }

  /** หน้าต่างตั้งไม้ทีละขั้น: ① บ้านที่จะตี › ② ทีมแก้ › ③ อุปกรณ์/ค่าความสามารถ */
  const renderWizard = (w: NonNullable<typeof wiz>) => {
    const raw = draft.slots[w.s]
    if (!raw) return null
    const u = slotUI(raw, w.s)
    const def = raw.kind === 'defense' // แผนกัน: มีแค่ บ้านกัน › อุปกรณ์/ค่าความสามารถ
    const ok1 = def || (!!raw.vs && heroCount(raw.vs) > 0 && !!raw.vs.pet && houseTagged(raw))
    const mainOpt = u.main >= 0 ? u.slot.options[u.main] : null
    const ok2 = !!mainOpt && heroCount(mainOpt.team) > 0 && !!mainOpt.team.pet
    const can = (st: 1 | 2 | 3) => st === 1 || (st === 2 ? ok1 : ok1 && ok2)
    const go = (st: 1 | 2 | 3) => {
      if (!can(st)) return
      if (st === 2) ensureMain(w.s)
      if (st === 3) ensureNoteRows(w.s)
      setWiz((x) => x && { ...x, step: st })
    }
    /** ออกจากขั้นทีมแก้: ตั้งลำดับการใช้สกิลยังไม่ครบ → ถามก่อน */
    // ทุกทางที่ออกจากขั้นทีมแก้/ปิดหน้าต่าง (ถัดไป · แถบขั้น · เสร็จเลย · เสร็จ) ผ่านตรงนี้ · ตอบ "ไม่จอง" แล้วไม่ถามซ้ำในรอบนี้
    const leaveTeam = (then: () => void) => {
      const have = Math.min(mainOpt?.skills.length ?? 0, MAX_SKILL_QUEUE)
      if (have < MAX_SKILL_QUEUE && !w.skillOk && ok2) setSkillAsk({ items: [[L(`ไม้ ${w.s + 1} · ${def ? 'บ้านกันหลัก' : 'ทีมแก้หลัก'}`, `Slot ${w.s + 1} · ${def ? 'main defense' : 'main counter'}`), have]], back: { s: w.s, o: u.main }, then: () => { setWiz((x) => x && { ...x, skillOk: true }); then() } })
      else then()
    }
    /** ออกจากขั้นบ้านที่จะตี: บ้านตั้งลำดับการใช้สกิลไม่ครบ → ถามก่อน (กดกลับ = เปิดหน้าต่างลำดับการใช้สกิลของบ้าน) */
    const leaveHouse = (then: () => void) => {
      const have = Math.min(raw.vs?.skills?.length ?? 0, MAX_SKILL_QUEUE)
      if (have < MAX_SKILL_QUEUE && !w.vsSkillOk && ok1)
        setSkillAsk({ items: [[L(`ไม้ ${w.s + 1} · บ้านที่จะตี`, `Slot ${w.s + 1} · defense to attack`), have]], back: { s: w.s, o: -1 }, then: () => { setWiz((x) => x && { ...x, vsSkillOk: true }); then() } })
      else then()
    }
    const STEPS: (readonly [1 | 2 | 3, string])[] = def ? [[2, tx('บ้านกัน')], [3, tx('อุปกรณ์/ค่าความสามารถ')]] : [[1, tx('บ้านที่จะตี')], [2, tx('ทีมแก้')], [3, tx('อุปกรณ์/ค่าความสามารถ')]]
    const nextOk = w.step === 1 ? ok1 : ok2
    return createPortal(
      // หน้าต่างกลางจอ (ไม่เต็มจอ) — พื้นหลังมืด ล็อกจนกด เสร็จ/ยกเลิก · pb เผื่อแถบอัศวินด้านล่าง
      // ขนาดหน้าต่างคงที่ทุกขั้น (ไม่ยืด/หดตอนเปลี่ยนขั้น) — เนื้อหาเลื่อนข้างใน
      // กดพื้นหลังนอกกรอบ = ยกเลิก (เหมือนกด "ยกเลิก") — ถ้าแถบอัศวินเปิดอยู่ ครั้งนั้นแค่ปิดแถบ/ยกเลิกช่องที่เลือก
      <div className="fixed inset-0 z-[45] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true"
        onPointerDown={(e) => { backdropDown.current = e.target === e.currentTarget && !document.querySelector('.hero-dock') }}
        onClick={(e) => {
          if (e.target === e.currentTarget && backdropDown.current) {
            // ยังไม่ได้แก้อะไร = ออกเลย · แก้แล้ว = ถามก่อน (กันกดพลาดแล้วงานหาย)
            if (JSON.stringify(draft.slots[w.s]) === JSON.stringify(w.snap)) cancelWiz()
            else setExitAsk(true)
          }
          backdropDown.current = false
        }}>
        <DockAware>{(dockOpen) => (
        // แถบอัศวินเปิด → หดหน้าต่างให้อยู่เหนือแถบ (ปุ่มล่างไม่โดนบัง)
        <div className={`panel panel-gold flex max-h-[920px] w-full max-w-6xl flex-col ${dockOpen ? 'mb-auto h-[calc(100dvh-15rem)]' : 'h-[calc(100dvh-1.5rem)] sm:h-[calc(100dvh-3rem)]'}`}>
        <div className="shrink-0 rounded-t-[18px] border-b border-white/10 bg-[var(--surface-wiz)]/95">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3">
            <span className="btn-gold rounded-lg px-3 py-1 text-sm">{tx('ไม้')}{' '}{w.s + 1}</span>
            <div className="flex flex-wrap items-center gap-1 text-sm">
              {STEPS.map(([n, label], i) => (
                <Fragment key={n}>
                  {i > 0 && <span className="text-white/25">›</span>}
                  <button type="button" disabled={!can(n)} onClick={() => (w.step === 1 && n > 1 ? leaveHouse(() => go(n)) : w.step === 2 && n === 3 ? leaveTeam(() => go(3)) : go(n))}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${w.step === n ? 'bg-gold font-semibold text-ink' : can(n) ? 'text-white/75 hover:bg-white/10' : 'text-white/30'}`}>
                    <span className={`grid h-5 w-5 place-items-center rounded-full text-xs ${w.step === n ? 'bg-ink/20' : 'border border-current'}`}>{i + 1}</span>{label}
                  </button>
                </Fragment>
              ))}
            </div>
          </div>
        </div>

        <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-6 pt-6">
          {w.step === 1 && (
            // ทุกอย่างกว้างเท่ากัน + จัดกลาง (ชื่อไม้ · คำอธิบาย · แท็บบ้าน · การ์ดบ้าน) ไม่ให้ซ้ายบ้างกลางบ้าง
            <div className="mx-auto my-auto w-full max-w-[400px] space-y-4 text-center">
              <div className="flex items-center gap-3 text-left">{u.nameInput}</div>
              <p className="text-sm text-white/55">{ATTACK_LIBRARY ? tx('เลือกบ้านจากที่จดไว้ แล้วทีมแก้ของบ้านนั้นจะถูกใส่เป็นทีมแก้ให้เลย') : tx('จัดทีมบ้านที่จะตี — กดช่อง + เพื่อเลือกตัว แล้วเลือกประเภทบ้าน')}</p>
              {/* แท็บบ้าน (เพิ่มบ้านอื่น) โผล่หลังเลือกบ้านแรกแล้ว — ตอนแรกไม่รก */}
              {(raw.vs || (raw.alts?.length ?? 0) > 0) && <div className="flex justify-center [&_.pill]:justify-center [&>div]:justify-center">{u.houseTabs}</div>}
              {raw.vs && heroCount(raw.vs) > 0 && !raw.vs.pet && <p className="text-center text-sm font-semibold text-amber-300">{tx('เลือกสัตว์เลี้ยงของบ้านนี้ก่อน (ช่องขวาบนของการ์ด)')}</p>}
              <div className="text-left">{u.enemy}</div>
              <div className="text-left">{u.enemyExtras}</div>
            </div>
          )}
          {w.step === 2 && (
            <>
              {/* ตัว (แผนกัน: + สัตว์เลี้ยง) ซ้ำกับไม้อื่น */}
              {mainOpt && (() => {
                const c = conflictsOf(mainOpt, w.s, use, def)
                return c.length > 0 && (
                  <p className="mb-2 flex items-center justify-center gap-1.5 text-center text-sm font-semibold text-red-300">
                    <AlertTriangle className="h-4 w-4" />{' '}{tx('ซ้ำกับไม้อื่น:')}{' '}{c.map((x) => `${x.name} (${x.slots.map((v) => L(`ไม้ ${v + 1}`, `Slot ${v + 1}`)).join(', ')})`).join(' · ')}
                  </p>
                )
              })()}
              {mainOpt && heroCount(mainOpt.team) > 0 && !mainOpt.team.pet && <p className="mb-2 text-center text-sm font-semibold text-amber-300">{def ? L('เลือกสัตว์เลี้ยงของบ้านกัน', 'Pick a pet for the defense') : L('เลือกสัตว์เลี้ยงของทีมแก้', 'Pick a pet for the counter')}{tx('ก่อน (ช่องขวาบนของการ์ด)')}</p>}
              <p className="mb-4 text-center text-sm text-white/55">{def ? L('จัดบ้านกันหลัก', 'Build the main defense') : L('จัดทีมแก้หลัก', 'Build the main counter')}{' '}{tx('— กดช่อง + เพื่อเลือกตัว (ดับเบิลคลิก = เปิดหน้าใหญ่) หรือใช้พรีเซต')}</p>
              {/* แผนกัน: การ์ดเดียวตรงกลาง (ไม่มีบ้านศัตรู/VS) */}
              {def ? <div className="mx-auto w-full max-w-[420px]">{mainOpt && u.card(mainOpt, u.main, 'panel')}</div> : <VsArena
                left={mainOpt ? u.card(mainOpt, u.main, 'panel') : <span />}
                right={
                  <div className="flex h-full flex-col">
                    <div className="mb-4 flex min-h-8 items-center justify-center gap-2">
                      <span className="text-lg font-semibold text-red-200">{tx('บ้านที่จะตี')}</span>
                      {raw.vsTag && <span className="rounded-full px-2.5 py-0.5 text-sm font-semibold" style={tagStyle(raw.vsTag)}>{houseLabel(raw.vsTag)}</span>}
                    </div>
                    {/* ขนาดช่องเท่าการ์ดทีมแก้ฝั่งซ้าย (TeamPanel md) */}
                    {raw.vs && <TeamCardLite team={raw.vs} skills={raw.vs.skills ?? []} title={teamNames(raw.vs)} unit="clamp(58px, 17vw, 84px)" fluid className="flex-1" />}
                  </div>
                }
              />}
              {/* เปลี่ยนทีมหลักทั้งทีม: จากคลัง / พรีเซต (แทนที่ทีมหลักเดิม) */}
              {mainOpt && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  {ATTACK_LIBRARY && (
                    <button type="button" onClick={() => setLibrary({ s: w.s, o: u.main })}
                      className="flex items-center gap-1.5 rounded-full border border-sky-300/60 px-3 py-1.5 text-sm text-sky-100 hover:bg-sky-400/10">
                      <Library className="h-4 w-4" />{' '}{tx('เลือกจากที่จดไว้')}
                    </button>
                  )}
                  <PresetPickerButton label={tx('ใช้พรีเซตของฉัน')}
                    onPick={(p) => patchOption(w.s, u.main, { ...optionFrom({ id: p.id, team: p.team, skills: p.skills, note: p.note, heroNotes: p.heroNotes }), custom: true, condition: mainOpt.condition })} />
                </div>
              )}
              {u.backups}
            </>
          )}
          {w.step === 3 && (
            // กว้างพอให้ตารางอุปกรณ์/ค่าความสามารถเป็น 2 คอลัมน์ (อัศวิน+ของ | คำอธิบาย+ค่าความสามารถ) แบบหน้าบ้านศัตรู
            <div className="mx-auto w-full max-w-4xl">
              <p className="mb-4 text-center text-sm text-white/55">{tx('ใส่อุปกรณ์ ค่าความสามารถ และคำอธิบายของแต่ละตัว (แถวละ 1 ตัว) — ข้ามได้ กด "เสร็จ" ได้เลย')}</p>
              {mainOpt && u.card(mainOpt, u.main, 'details')}
            </div>
          )}
        </div>
        {/* ปุ่มอยู่ล่าง (ซ้าย = ยกเลิก · ขวา = ย้อนกลับ/ถัดไป/เสร็จ) — ติดขอบล่างหน้าต่างเสมอ */}
        <div className="flex shrink-0 items-center gap-2 rounded-b-[18px] border-t border-white/10 bg-[var(--surface-wiz)]/95 px-4 py-3">
          <button type="button" onClick={cancelWiz} className="pill px-4 py-1.5 text-sm text-white/70 hover:text-white">{tx('ยกเลิก')}</button>
          <div className="ml-auto">
            <div className="flex items-center gap-2">
              {w.step > (def ? 2 : 1) && <button type="button" onClick={() => go((w.step - 1) as 1 | 2)} className="pill px-4 py-1.5 text-sm">{tx('ย้อนกลับ')}</button>}
              {w.step === 2 && <button type="button" disabled={!ok2} onClick={() => leaveTeam(() => setWiz(null))} className="pill px-4 py-1.5 text-sm text-gold disabled:opacity-40">{tx('เสร็จเลย')}</button>}
              {w.step < 3
                ? <button type="button" disabled={!nextOk} onClick={() => (w.step === 2 ? leaveTeam(() => go(3)) : leaveHouse(() => go(2)))} className="btn-gold px-5 py-1.5 text-sm font-semibold disabled:opacity-40">{tx('ถัดไป')}</button>
                : <button type="button" onClick={() => leaveTeam(() => setWiz(null))} className="btn-gold flex items-center gap-1.5 px-5 py-1.5 text-sm font-semibold"><Check className="h-4 w-4" />{' '}{tx('เสร็จ')}</button>}
            </div>
          </div>
        </div>
      </div>
        )}</DockAware>
      </div>,
      document.body,
    )
  }

  /** ชิ้นส่วน UI ของไม้ s (ใช้ทั้งในรายการไม้ และในหน้าต่างตั้งไม้ทีละขั้น) */
  const slotUI = (raw: WarSlot, s: number) => {
      const h = houseOf(raw, s)
      const houses = 1 + (raw.alts?.length ?? 0)
      const slot = houseView(raw, h)
      const Icon = slot.kind === 'attack' ? Swords : Shield
      const isAtk = slot.kind === 'attack'
      const main = mainIndex(slot)
      const others = slot.options.length - 1
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
          // ทีมแรก (ไม้ = ★ ทีมหลัก · ไม้ = ทางเลือกแรก) ลบไม่ได้ — ล้างทีมใช้ปุ่มรีเซตบนการ์ดแทน
          onRemove={(slot.kind === 'attack' ? o === mainIndex(slot) : o === 0) ? undefined : () => patchSlot(s, (x) => {
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
          skillsReq={skillReq && skillReq.s === s && skillReq.o === o ? skillReq.n : 0}
          onLibrary={slot.kind === 'attack' && !ATTACK_LIBRARY ? undefined : () => setLibrary({ s, o })}
          attack={slot.kind === 'attack'}
          main={slot.kind === 'attack' && o === mainIndex(slot)}
          onMakeMain={() => patchSlot(s, (x) => ({ ...x, main: o }))}
          // แผนบุก: ตัวซ้ำข้ามไม้ · แผนกัน: ตัว+สัตว์เลี้ยงซ้ำข้ามไม้ (เช็คเฉพาะบ้านกันหลัก)
          conflicts={slot.kind === 'attack' || o === mainIndex(slot) ? conflictsOf(opt, s, use, slot.kind === 'defense') : []}
          blocked={blockedFor(s, use)}
          shot={!editing && !isAtk ? { guild: data?.guild.name ?? '', plan: viewTitle, heading: /^(ไม้|Slot)\s*\d+$/i.test(slot.name?.trim() ?? '') || !slot.name?.trim() ? L(`บ้านกันที่ ${s + 1}`, `Defense ${s + 1}`) : slot.name.trim() } : undefined}
        />
      )
      const addBtns = editing && slot.options.length < MAX_OPTIONS ? (
        // สูงคงที่ ชิดบน — ไม่ยืดตามการ์ดทีมข้าง ๆ (ไม่ต้องเลื่อนลงไกล)
        <div className="grid h-56 grid-rows-[1fr_1fr_auto] gap-3 self-start">
          {(slot.kind !== 'attack' || ATTACK_LIBRARY) && <button
            onClick={() => setLibrary({ s, o: null })}
            title={slot.kind === 'attack' && slot.vsId ? tx('เปิดที่ทีมแก้ของบ้านนี้') : undefined}
            className="flex flex-col items-center justify-center gap-1 rounded-[18px] border-2 border-dashed border-sky-300/40 text-sky-100/80 hover:border-sky-300 hover:text-sky-100"
          >
            <Library className="h-7 w-7" />
            {slot.kind === 'attack'
              ? main >= 0 ? tx('เพิ่มทีมสำรองจากที่จดไว้') : tx('เพิ่มทีมแก้จากที่จดไว้')
              : slot.options.length ? tx('เลือกทีมสำรองจากที่จดไว้') : tx('เลือกจากที่จดไว้')}
          </button>}
          <button
            onClick={() =>
              patchSlot(s, (x) => ({
                ...x,
                options: [...x.options, { ...emptyOption(), custom: true, condition: x.kind === 'defense' && x.options.length ? tx('ถ้าไม่มีทีมบน') : '' }],
              }))
            }
            className="flex flex-col items-center justify-center gap-1 rounded-[18px] border-2 border-dashed border-white/20 text-white/60 hover:border-gold hover:text-gold"
          >
            <Plus className="h-7 w-7" />
            {tx('จัดทีมเอง')}
          </button>
          {slot.kind === 'attack' && (
            <PresetPickerButton className="justify-center" label={tx('ใช้พรีเซตของฉัน')}
              onPick={(p) => patchSlot(s, (x) => ({ ...x, options: [...x.options, { ...optionFrom({ id: p.id, team: p.team, skills: p.skills, note: p.note, heroNotes: p.heroNotes }), custom: true }].slice(0, MAX_OPTIONS) }))} />
          )}
        </div>
      ) : null
    const nameInput = (<label title={tx('กดเพื่อตั้งชื่อไม้')} className="group flex min-w-0 flex-1 cursor-text items-center gap-2 rounded-t-lg border-b border-dashed border-white/30 px-1 transition hover:bg-white/5 focus-within:border-solid focus-within:border-gold">
                      <input
                        // ชื่อเริ่มต้น "ไม้ N" ที่เก็บไว้ → โชว์ตามภาษา (ภาษาอังกฤษ = Slot N)
                        value={/^(ไม้|Slot)\s*\d+$/i.test(slot.name.trim()) ? slotLabel(slot.name, s) : slot.name}
                        onChange={(e) => patchSlot(s, (x) => ({ ...x, name: e.target.value }))}
                        maxLength={40}
                        placeholder={tx('ชื่อไม้ เช่น บ้านกันที่ 1 / ไม้กายภาพ')}
                        className="min-w-0 flex-1 bg-transparent py-1 text-xl font-semibold outline-none"
                      />
                      {/* ยังเป็นชื่อเริ่มต้น → ใบ้ว่าตั้งชื่อได้ */}
                      {(!slot.name.trim() || /^(ไม้|Slot)\s*\d+$/i.test(slot.name.trim())) && (
                        <span className="shrink-0 text-xs text-white/35 group-hover:text-white/60">{tx('ตั้งชื่อได้')}</span>
                      )}
                      <Pencil className="h-4 w-4 shrink-0 text-white/40 group-hover:text-gold" />
                    </label>)
    const deleteBtn = (<>{(visibleSlots > 1 || slotUsed(raw)) && (
                      // ลบไม้: มีของอยู่ = กด 2 ครั้ง · ไม้ว่าง = ลบเลย
                      <button type="button"
                        onClick={() => {
                          if (slotUsed(raw) && delAsk !== `slot-${s}`) return setDelAsk(`slot-${s}`)
                          setDelAsk(null)
                          removeSlot(s)
                        }}
                        onBlur={() => setDelAsk((x) => (x === `slot-${s}` ? null : x))}
                        title={tx('ลบไม้นี้')}
                        className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-sm ${delAsk === `slot-${s}` ? 'bg-red-600 font-semibold text-white' : 'text-red-300/80 hover:bg-red-500/15 hover:text-red-200'}`}>
                        <Trash2 className="h-4 w-4" /> {delAsk === `slot-${s}` ? tx('กดอีกครั้งเพื่อลบไม้นี้') : tx('ลบไม้')}
                      </button>
                    )}</>)
    const houseTabs = (<>{/* ไม้เข้าได้หลายบ้าน: แท็บเลือกบ้าน (บ้าน 1 = บ้านหลัก) */}
              {isAtk && (editing || houses > 1) && (
                <div className={`flex flex-wrap items-center gap-2 ${editing ? 'mb-3' : 'mb-5'}`}>
                  <div className="pill flex flex-wrap gap-1 p-1">
                    {Array.from({ length: houses }, (_, i) => {
                      const hv = houseView(raw, i)
                      const label = hv.vsTag ? houseLabel(hv.vsTag) : hv.vs ? teamNames(hv.vs) || L(`บ้าน ${i + 1}`, `Defense ${i + 1}`) : L(`บ้าน ${i + 1}`, `Defense ${i + 1}`)
                      return (
                        <button key={i} type="button" onClick={() => setHouse((m) => ({ ...m, [s]: i }))}
                          className={`max-w-[14rem] truncate rounded-full px-3 py-1 text-sm ${i === h ? 'bg-gradient-to-b from-[#fff1c9] to-[#e2bf72] font-semibold text-ink' : 'text-white/70 hover:bg-white/10'}`}>
                          {i === 0 && '★ '}{label}
                        </button>
                      )
                    })}
                    {editing && houses < MAX_HOUSES && (
                      <button type="button" onClick={() => addHouse(s)} className="flex items-center gap-1 rounded-full px-3 py-1 text-sm text-gold hover:bg-white/10">
                        <Plus className="h-4 w-4" />{' '}{tx('เพิ่มบ้าน')}
                      </button>
                    )}
                  </div>
                  {houses > 1 && <span className="text-xs text-white/45">{tx('ทีมนี้ตีได้')}{' '}{houses}{' '}{tx('บ้าน · ★ = บ้านหลัก')}</span>}
                  {editing && houses > 1 && (
                    <span className="ml-auto flex gap-2 text-sm">
                      {h > 0 && <button type="button" onClick={() => makeMainHouse(s, h)} className="text-gold hover:underline">{tx('ตั้งเป็นบ้านหลัก')}</button>}
                      <button type="button"
                        onClick={() => { if (delAsk !== `${s}-${h}`) return setDelAsk(`${s}-${h}`); setDelAsk(null); removeHouse(s, h) }}
                        onBlur={() => setDelAsk((x) => (x === `${s}-${h}` ? null : x))}
                        className={delAsk === `${s}-${h}` ? 'rounded-full bg-red-600 px-2.5 font-semibold text-white' : 'text-white/50 hover:text-red-300'}>
                        {delAsk === `${s}-${h}` ? tx('กดอีกครั้งเพื่อลบบ้าน') : tx('ลบบ้านนี้')}
                      </button>
                    </span>
                  )}
                </div>
              )}
</>)
    const enemy = (<div className="flex h-full flex-col">
                    <div className="mb-4 flex min-h-8 items-center justify-center gap-2">
                      <span className="text-lg font-semibold text-red-200">{tx('บ้านที่จะตี')}</span>
                      {slot.vsTag && <span className="rounded-full px-2.5 py-0.5 text-sm font-semibold" style={tagStyle(slot.vsTag)}>{houseLabel(slot.vsTag)}</span>}
                    </div>
                    {slot.vs ? (
                      <TeamPanel
                        variant="enemy"
                        className="flex-1"
                        team={slot.vs}
                        editable={editing}
                        title={teamNames(slot.vs) || tx('บ้านศัตรู')}
                        onSlotClick={(kind, index) => setPicker({ target: 'vs', s, kind, index })}
                        onReset={() => patchSlot(s, (x) => ({ ...x, vs: emptyTeam(), vsTag: '', vsId: '' }))}
                        skills={slot.vs.skills ?? []}
                        onSkills={(sk) => patchSlot(s, (x) => ({ ...x, vs: { ...x.vs!, skills: sk } }))}
                        onFormation={(f) => patchSlot(s, (x) => ({ ...x, vs: teamOps.formation(x.vs!, f) }))}
                        onSpeed={(sp) => patchSlot(s, (x) => ({ ...x, vs: { ...x.vs!, speed: sp } }))}
                        onMove={(from, to) => patchSlot(s, (x) => ({ ...x, vs: teamOps.move(x.vs!, from, to) }))}
                        label={L(`บ้านไม้ ${s + 1}`, `Slot ${s + 1} defense`)}
                        skillsReq={skillReq && skillReq.s === s && skillReq.o === -1 ? skillReq.n : 0}
                        onPlace={(ref, unit) => patchSlot(s, (x) => ({ ...x, vs: teamOps.place(x.vs ?? emptyTeam(), ref, unit) }))}
                      />
                    ) : editing ? (
                      <div className="grid gap-3">
                        {ATTACK_LIBRARY && <button
                          onClick={() => setVsLibrary(s)}
                          className="flex flex-col items-center justify-center gap-1 rounded-[18px] border-2 border-dashed border-red-300/50 py-8 text-red-100/90 hover:border-red-300"
                        >
                          <Library className="h-7 w-7" />{' '}{tx('เลือกจากบ้านศัตรูที่จดไว้')}
                          <span className="text-xs text-white/50">{tx('ทีมแก้ของบ้านนั้นจะถูกใส่มาให้ด้วย')}</span>
                        </button>}
                        <button
                          onClick={() => patchSlot(s, (x) => ({ ...x, vs: emptyTeam() }))}
                          className="rounded-[18px] border-2 border-dashed border-white/20 py-3 text-white/60 hover:border-gold hover:text-gold"
                        >
                          {tx('จัดบ้านศัตรูเอง')}
                        </button>
                      </div>
                    ) : (
                      <p className="text-center text-white/40">{tx('ยังไม่ได้ระบุบ้าน')}</p>
                    )}
                  </div>)
    const enemyExtras = (<>{/* บ้านที่จัดเอง (ไม่ได้มาจากคลัง): แท็ก + โน้ต → ใช้ตอนจดลงบ้านศัตรูเป็นบ้านใหม่ */}
                    {editing && slot.vs && !slot.vsId && (
                      <div className="mb-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <TagEditor
                          tags={slot.vsTags ?? (slot.vsTag ? [slot.vsTag] : [])}
                          onChange={(tags) => patchSlot(s, (x) => ({ ...x, vsTags: tags, vsTag: tags[0] ?? '' }))}
                        />
                        <textarea
                          value={slot.vsNote ?? ''}
                          onChange={(e) => patchSlot(s, (x) => ({ ...x, vsNote: e.target.value }))}
                          maxLength={500}
                          rows={2}
                          placeholder={tx('โน้ตบ้านนี้ เช่น เจอบ่อยในกิลด์ X, ตัวหลังความเร็วสูง')}
                          className="mt-3 w-full rounded-xl border border-white/15 bg-black/20 p-3 text-sm outline-none focus:border-sky-300"
                        />
                      </div>
                    )}
                    {!editing && slot.vsNote && <p className="mb-3 whitespace-pre-wrap text-center text-sm text-white/70">{slot.vsNote}</p>}
                    {editing && slot.vs && (
                      <div className="flex justify-center gap-2 text-sm">
                        {ATTACK_LIBRARY && <button onClick={() => setVsLibrary(s)} className="pill flex items-center gap-1 px-3 py-1 hover:border-gold">
                          <Library className="h-4 w-4" />{' '}{tx('เปลี่ยนบ้านจากที่จดไว้')}
                        </button>}
                        <button
                          onClick={() => {
                            if (delAsk !== `${s}-${h}-out`) return setDelAsk(`${s}-${h}-out`)
                            setDelAsk(null)
                            patchSlot(s, (x) => ({ ...x, vs: null, vsTag: '', vsId: '', vsTags: [], vsNote: '' }))
                          }}
                          onBlur={() => setDelAsk((x) => (x === `${s}-${h}-out` ? null : x))}
                          className={`flex items-center gap-1 rounded-full px-3 py-1 ${delAsk === `${s}-${h}-out` ? 'bg-red-600 font-semibold text-white' : 'text-red-300 hover:bg-red-500/15'}`}
                        >
                          <Trash2 className="h-4 w-4" /> {delAsk === `${s}-${h}-out` ? tx('กดอีกครั้งเพื่อเอาบ้านออก') : tx('เอาบ้านออก')}
                        </button>
                      </div>
                    )}</>)
    const backups = (<>{others > 0 && (
                    <div data-noexport className="mt-6 flex justify-center">
                      <button type="button" onClick={() => toggleExpand(s)}
                        className="pill flex items-center gap-1.5 px-4 py-1.5 text-sm text-white/80 hover:border-gold hover:text-gold">
                        <ChevronDown className={`h-4 w-4 transition ${expanded.has(s) ? 'rotate-180' : ''}`} />
                        {expanded.has(s) ? tx('ซ่อนคอมพ์อื่น') : L(`ดูคอมพ์อื่น (${others})`, `Other comps (${others})`)}
                      </button>
                    </div>
                  )}
                  {/* มีทีมหลักแล้ว ยังไม่มีคอมพ์อื่น → ปุ่มเล็กเปิดช่องเพิ่มทีมสำรอง (ไม่โชว์ปุ่มใหญ่ซ้ำ) */}
                  {editing && others === 0 && main >= 0 && addBtns && (
                    <div className="mt-6 flex justify-center">
                      <button type="button" onClick={() => toggleExpand(s)}
                        className="pill flex items-center gap-1.5 px-4 py-1.5 text-sm text-white/70 hover:border-gold hover:text-gold">
                        {expanded.has(s) ? <><ChevronDown className="h-4 w-4 rotate-180" />{' '}{tx('ซ่อน')}</> : <><Plus className="h-4 w-4" />{' '}{tx('เพิ่มทีมสำรอง')}</>}
                      </button>
                    </div>
                  )}
                  {expanded.has(s) && (
                    <div className="mt-8 grid gap-x-8 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
                      {slot.options.map((opt, o) => o !== main && card(opt, o))}
                      {main >= 0 && addBtns}
                    </div>
                  )}</>)
    const section = (
            <section key={s} id={`slot-${s}`} className="scroll-mt-28">
              <div className={`flex flex-wrap items-center gap-3 border-b border-white/10 ${editing ? 'mb-3 pb-2' : 'mb-6 pb-3'}`}>
                <span className="btn-gold rounded-lg px-3 py-1 text-sm">{tx('ไม้')}{' '}{s + 1}</span>
                {editing ? (
                  <>
                    {nameInput}
                    {deleteBtn}
                  </>
                ) : (
                  <>
                    {/* ชื่อเริ่มต้น (ไม้ N) ซ้ำกับป้ายด้านหน้า → ไม่ต้องโชว์ */}
                    {!/^(ไม้|Slot)\s*\d+$/i.test(slot.name?.trim() ?? '') && slot.name?.trim() && <h2 className="text-2xl font-semibold">{slot.name}</h2>}
                    <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm ${slot.kind === 'attack' ? 'bg-red-500/20 text-red-200' : 'bg-sky-400/20 text-sky-100'}`}>
                      <Icon className="h-4 w-4" /> {slot.kind === 'attack' ? tx('บุก') : tx('กัน')}
                    </span>
                    {slot.kind === 'defense' && slot.options.length > 1 && (
                      <span className="text-sm text-white/50">{tx('เลือกตั้ง 1 ใน')}{' '}{L(`${slot.options.length} แบบ ตามลำดับ`, `${slot.options.length} option${slot.options.length === 1 ? '' : 's'}, in order`)}</span>
                    )}
                  </>
                )}
              </div>

              {houseTabs}
              {isAtk ? (
                <>
                  {/* ซ้าย = ทีมหลักของเรา · กลาง VS · ขวา = บ้านที่จะตี */}
                  <VsArena
                    left={main >= 0 ? (
                      <>
                        {card(slot.options[main], main, 'panel')}
                        {/* มือถือ (ตอนดู): รายละเอียดทีมแก้อยู่ใต้ทีมแก้เลย ไม่ไปโผล่ใต้บ้านที่จะตี */}
                        {!editing && <div className="mt-3 lg:hidden">{card(slot.options[main], main, 'details')}</div>}
                      </>
                    ) : addBtns ?? <p className="py-10 text-center text-white/40">{tx('ยังไม่มีทีมแก้')}</p>}
                    right={enemy}
                  />
                  {/* รายละเอียด (โน้ต/อุปกรณ์/ปุ่มเปลี่ยนบ้าน) อยู่ใต้แถว VS — กางแล้ว VS ไม่เลื่อน */}
                  <div className="mt-4 flex flex-col items-center gap-4 lg:flex-row lg:items-start lg:justify-center lg:gap-0">
                    <div className={`w-full max-w-[400px] lg:w-[380px] ${editing ? '' : 'hidden lg:block'}`}>{main >= 0 && card(slot.options[main], main, 'details')}</div>
                    <div className="hidden lg:block lg:w-56 lg:shrink-0" />
                    <div className="w-full max-w-[400px] lg:w-[380px]">
                    {enemyExtras}
                    </div>
                  </div>
                  {backups}
                </>
              ) : (
                <div className="grid gap-x-8 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
                  {slot.options.map((opt, o) => card(opt, o))}
                  {addBtns}
                </div>
              )}
            </section>
    )
    return { slot, h, houses, isAtk, main, others, card, addBtns, nameInput, deleteBtn, houseTabs, enemy, enemyExtras, backups, section }
  }

  // ---------- หน้ารายละเอียดไม้ (แผนบุกตอนดู) ----------
  if (!editing && detail !== null && view.slots[detail]) {
    const shown = view.slots.map((x, i) => (x.options.length || x.vs || x.alts?.length ? i : -1)).filter((i) => i >= 0)
    const at = shown.indexOf(detail)
    const prev = at > 0 ? shown[at - 1] : null
    const next = at >= 0 && at < shown.length - 1 ? shown[at + 1] : null
    return (
      <DndHub>
      <div>
        <button type="button" onClick={closeDetail} className="inline-flex items-center gap-1 text-white/70 hover:text-white">
          <ChevronLeft className="h-5 w-5" />{' '}{tx('กลับไปที่แผน')}{' '}{viewTitle}
        </button>
        <div key={detail} className={`mt-6 ${detailSlide}`}>{slotUI(view.slots[detail], detail).section}</div>
        {/* ไม้ก่อนหน้า/ถัดไป */}
        <div className="mt-10 flex items-center justify-between gap-3 border-t border-white/10 pt-5">
          {prev !== null ? (
            <button type="button" onClick={() => setDetail(prev, true)} className="pill flex items-center gap-1 px-4 py-2 text-sm hover:border-gold">
              <ChevronLeft className="h-4 w-4" />{' '}{tx('ไม้')}{' '}{prev + 1}
            </button>
          ) : <span />}
          {next !== null ? (
            <button type="button" onClick={() => setDetail(next, true)} className="pill flex items-center gap-1 px-4 py-2 text-sm hover:border-gold">
              {tx('ไม้')}{' '}{next + 1} <ChevronLeft className="h-4 w-4 rotate-180" />
            </button>
          ) : <span />}
        </div>
      </div>
      </DndHub>
    )
  }

  return (
    <DndHub>
    <div ref={exportRef} className={editing ? 'pb-72' : ''}>
      <Link data-noexport to={`/g/${gid}`} className="inline-flex items-center gap-1 text-white/70 hover:text-white">
        <ChevronLeft className="h-5 w-5" /> {data.guild.name}
      </Link>
      <HelpLink section={['plans', 'team', 'stats']} className="float-right" />
      <GuildOnboarding gid={gid} data={data} canEdit={canEdit} />

      {/* ---------- หัวแผน ---------- */}
      {editing ? (
        // แก้ไข: หัวแผนแถวเดียว (ชื่อ · แผนบุก/กัน) — ไม่กินที่ ไม้ 1 ขึ้นมาเร็ว
        <header className="mt-4 flex flex-wrap items-center gap-3 border-b border-gold/15 pb-4">
          {/* ชื่อแก้ได้: ดินสอ + เส้นประ + ชี้แล้วสว่าง ให้รู้ว่าพิมพ์ได้ */}
          <label title={tx('กดเพื่อตั้งชื่อแผน')} className="group flex min-w-0 flex-1 basis-56 cursor-text items-center gap-2 rounded-t-lg border-b-2 border-dashed border-gold/50 px-1 transition hover:bg-white/5 focus-within:border-solid focus-within:border-gold">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={60}
              placeholder={tx('ชื่อแผน เช่น Update GVG')}
              className="min-w-0 flex-1 bg-transparent py-1 text-2xl font-bold outline-none sm:text-3xl"
            />
            <Pencil className="h-5 w-5 shrink-0 text-gold/60 group-hover:text-gold" />
          </label>
          {/* ชนิดแผนกำหนดตอนสร้าง เปลี่ยนไม่ได้ (แผนบุก/แผนกันแยกกันขาด) */}
          <span className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${planKind(draft) === 'attack' ? 'bg-red-500/20 text-red-200' : 'bg-sky-400/20 text-sky-100'}`}>
            {planKind(draft) === 'attack' ? <Swords className="h-4 w-4" /> : <Shield className="h-4 w-4" />} {PLAN_KIND_LABEL[planKind(draft)]}
          </span>
        </header>
      ) : (
      <header className="plan-heading mt-6 text-center">
        <p className="eyebrow mb-4">GUILD WAR · BATTLE PLAN</p>
        <h1 className="gold-title break-words text-4xl font-extrabold sm:text-6xl">{viewTitle}</h1>
        <div className="mt-3 flex justify-center">
          <span className={`flex items-center gap-1 rounded-full px-3 py-0.5 text-sm font-semibold ${planKind(view) === 'attack' ? 'bg-red-500/20 text-red-200' : 'bg-sky-400/20 text-sky-100'}`}>
            {planKind(view) === 'attack' ? <Swords className="h-4 w-4" /> : <Shield className="h-4 w-4" />} {PLAN_KIND_LABEL[planKind(view)]}
          </span>
        </div>
        {!editing && plan && activePlanId(data, planKind(plan.data)) === plan.id && (
          <p className="mt-3"><span className="rounded-full bg-gold px-3 py-0.5 text-sm font-semibold text-ink">{tx('แผนที่ใช้อยู่ตอนนี้')}</span></p>
        )}
        {!editing && plan && (
          <p className="mt-3 text-sm text-white/50">
            {tx('อัปเดต')}{' '}{new Date(plan.updatedAt).toLocaleString(LOCALE, { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        )}
        {!editing && (
          <div data-noexport className="mt-4 flex flex-wrap justify-center gap-2">
            {/* ปุ่มแก้ไขแผน: ลอยมุมล่างขวาตลอด (ข้างปุ่มติดต่อ) — ไม่ต้องเลื่อนขึ้นมาหา */}
            {canEdit && createPortal(
              // ห่อด้วย div fixed — .btn-gold ตั้ง position เอง ใส่ fixed ที่ปุ่มตรง ๆ แล้วโดนทับ (ไปโผล่ซ้ายล่าง)
              <div data-noexport className="fixed right-20 z-40 sm:right-24" style={{ bottom: 'calc(20px + env(safe-area-inset-bottom))' }}>
                <button onClick={startEdit} className="btn-gold flex items-center gap-1.5 px-5 py-3 text-sm font-semibold shadow-[0_6px_24px_rgba(0,0,0,.5)]">
                  <Pencil className="h-4 w-4" />{' '}{tx('แก้ไขแผน')}
                </button>
              </div>,
              document.body,
            )}
            {EXPORT_ON && <button onClick={saveImage} disabled={exporting} className="pill inline-flex items-center gap-1.5 px-4 py-1.5 text-sm hover:border-gold disabled:opacity-50">
              <ImageDown className="h-4 w-4" /> {exporting ? tx('กำลังสร้างรูป...') : planKind(view) === 'defense' && !editing ? tx('บันทึกรูปทุกทีม (1 รูป/ทีม)') : tx('บันทึกเป็นรูป')}
            </button>}
          </div>
        )}
      </header>
      )}

      {/* ---------- ประกาศ: OP / ยกเลิก ---------- */}
      {(editing || view.op.length > 0 || view.banned.length > 0 || view.note) && (
      <section className={`panel panel-gold mx-auto max-w-4xl ${editing ? 'mt-4 space-y-2.5 p-4' : 'mt-8 space-y-4 p-5 sm:p-6'}`}>
        <HeroRow
          icon={<span className="grid h-7 w-7 place-items-center rounded-md bg-green-500 text-white"><Check className="h-5 w-5" strokeWidth={3} /></span>}
          label={tx('ตัวที่ OP ที่สุดตอนนี้')}
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
            rows={draft.note.includes('\n') ? 3 : 1}
            placeholder={tx('ประกาศเพิ่มเติม (ถ้ามี)')}
            className="block min-h-10 w-full resize-y rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm outline-none transition-[min-height] focus:min-h-20 focus:border-gold"
          />
        ) : (
          view.note && <p className="whitespace-pre-wrap border-t border-white/10 pt-4 text-white/85">{view.note}</p>
        )}
      </section>
      )}

      {/* ---------- สรุปการจัดสรรอัศวิน (ไม้) ---------- */}
      <AllocationBar slots={view.slots} use={use} onAuto={editing ? runAuto : undefined} compact={editing} />

      {/* ---------- 5 ไม้ ---------- */}
      {/* แผนบุก: ตารางการ์ด 1 ใบ/ไม้ (โชว์แค่ทีมแก้ กดดูรายละเอียด) · แผนกัน: แบบเดิม */}
      {/* แผนกัน (ตอนดู): การ์ดเต็มของแต่ละไม้ซ่อนไว้ — ปุ่ม "บันทึกรูปทุกทีม" ใช้ปุ่มรูปในการ์ดเหล่านี้ */}
      {EXPORT_ON && !editing && !atkPlan && <div className="hidden">{view.slots.map((raw, s) => (raw.options.length ? <Fragment key={s}>{slotUI(raw, s).section}</Fragment> : null))}</div>}
      {/* ทั้งแผนบุกและแผนกัน: ตารางการ์ด 1 ใบ/ไม้ (กดดูรายละเอียด / กดแก้ = หน้าต่างตั้งไม้) */}
      <div className="mt-8 grid items-start gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {view.slots.map((raw, s) => {
          if (!editing && raw.options.length === 0 && !raw.vs && !raw.alts?.length) return null
          if (editing && s >= visibleSlots) return null
          return slotCard(raw, s)
        })}
        {editing && visibleSlots < view.slots.length && (true ? (
          <div className="@container"><button type="button" onClick={() => { setShownSlots(visibleSlots + 1); openWiz(visibleSlots, true) }} style={{ height: CARD_H }}
            className="flex w-full flex-col items-center justify-center gap-1 rounded-[18px] border-2 border-dashed border-white/20 text-white/55 transition hover:border-gold hover:text-gold">
            <Plus className="h-7 w-7" />{' '}{tx('เพิ่มไม้')}{' '}{visibleSlots + 1}
            <span className="text-xs text-white/40">({visibleSlots}/{view.slots.length})</span>
          </button></div>
        ) : (
          <button
            onClick={() => {
              setShownSlots(visibleSlots + 1)
              if (planKind(draft) === 'attack') openWiz(visibleSlots, true)
            }}
            className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gold/40 py-5 font-semibold text-gold transition hover:border-gold hover:bg-gold/5"
          >
            <Plus className="h-5 w-5" />{' '}{tx('เพิ่มไม้')}{' '}{visibleSlots + 1}
            <span className="text-sm font-normal text-white/50">({visibleSlots}/{view.slots.length})</span>
          </button>
        ))}
        {!editing && view.slots.every((s) => s.options.length === 0) && (
          <div className="panel col-span-full p-10 text-center text-white/60">{tx('แผนนี้ยังไม่มีทีม')}</div>
        )}
      </div>

      {/* ---------- แถบบันทึก ---------- */}
      {editing && (
        <HideWhileDock>
        <div data-bottom-bar className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[var(--surface)]/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
            <button disabled={busy} onClick={() => void save()} className="btn-gold px-6 py-2">{busy ? tx('กำลังบันทึก...') : tx('บันทึกแผน')}</button>
            <button disabled={busy} onClick={cancel} className="pill px-5 py-2">{tx('ยกเลิก')}</button>
            {err && <span data-error className="text-sm font-semibold text-red-300">{err}</span>}
            {!isNew && (
              // ลบแผน: กด 2 ครั้ง (ไม่ใช้หน้าต่างยืนยันของเบราว์เซอร์)
              <ConfirmDelete disabled={busy} onConfirm={() => void remove()} label={tx('ลบแผน')} className="ml-auto" />
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

      <Modal open={!!speedAsk} title={tx('ใส่ความเร็วทีมไหม?')} onClose={() => !busy && setSpeedAsk(null)}>
        <p className="mb-3 text-sm text-white/70">{tx('ทีมเหล่านี้มีความเร็วโจมตีครบทุกตัว — เลือกทีมที่จะใส่ผลรวมเป็นความเร็วทีม')}</p>
        <div className="space-y-2">
          {speedAsk?.items.map((it, i) => (
            <label key={i} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${speedAsk.picked[i] ? 'border-gold/60 bg-gold/10' : 'border-white/10 bg-black/20'}`}>
              <input type="checkbox" className="h-4 w-4 accent-[#f4d58d]" checked={speedAsk.picked[i]}
                onChange={() => setSpeedAsk((x) => x && { ...x, picked: x.picked.map((v, j) => (j === i ? !v : v)) })} />
              <span className="min-w-0 flex-1 text-sm">
                <span className="font-semibold text-gold">{draft.slots[it.s]?.name || L(`ไม้ ${it.s + 1}`, `Slot ${it.s + 1}`)}</span>
                <span className="text-white/50">{' '}{tx('· ทีม')}{' '}{it.o + 1}</span>
                <span className="block truncate text-xs text-white/60">{teamNames(draft.slots[it.s].options[it.o].team)}</span>
              </span>
              <span className="text-right tabular-nums">
                <span className="block text-lg font-bold text-gold">{it.total}</span>
                {!!it.cur && <span className="block text-xs text-white/45">{tx('เดิม')}{' '}{it.cur}</span>}
              </span>
            </label>
          ))}
        </div>
        <div className="mt-5 flex gap-2">
          <button disabled={busy || !speedAsk?.picked.some(Boolean)} onClick={() => answerSpeed(true)} className="btn-gold flex-1 py-2">{tx('ใส่แล้วบันทึก')}</button>
          <button disabled={busy} onClick={() => answerSpeed(false)} className="pill px-5 py-2">{tx('ไม่ใส่ บันทึกเลย')}</button>
        </div>
      </Modal>

      <Modal open={!!syncAsk} title={tx('อัปเดตทีมแก้ในบ้านศัตรูด้วยไหม?')} onClose={() => !logBusy && setSyncAsk(null)}>
        <p className="mb-3 text-sm text-white/70">{tx('อุปกรณ์/ค่าความสามารถที่ใส่ในแผนนี้ต่างจากทีมแก้เดียวกันในบ้านศัตรู — เลือกทีมที่จะส่งข้อมูลกลับไปอัปเดต (คนอื่นในกิลด์จะเห็นด้วย)')}</p>
        <div className="space-y-2">
          {syncAsk?.items.map((it, i) => (
            <label key={i} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${syncAsk.picked[i] ? 'border-gold/60 bg-gold/10' : 'border-white/10 bg-black/20'}`}>
              <input type="checkbox" className="mt-1 h-4 w-4 accent-[#f4d58d]" checked={syncAsk.picked[i]}
                onChange={() => setSyncAsk((x) => x && { ...x, picked: x.picked.map((v, j) => (j === i ? !v : v)) })} />
              <span className="min-w-0 text-sm">
                <span className="font-semibold text-gold">{tx('ไม้')}{' '}{it.s + 1}</span>{' '}
                <span>{teamNames(it.opt.team)}</span>
                <span className="mx-1.5 text-white/40">vs</span>
                <span className="text-red-200">{teamNames(it.vs)}</span>
                <span className="mt-0.5 block text-xs text-white/50">
                  {(it.opt.heroNotes ?? []).map((n) => unitBase(n.hero)).join(', ')}
                </span>
              </span>
            </label>
          ))}
        </div>
        <div className="mt-5 flex gap-2">
          <button disabled={logBusy || !syncAsk?.picked.some(Boolean)} onClick={() => answerSync(true)} className="btn-gold flex-1 py-2">
            {logBusy ? tx('กำลังอัปเดต...') : tx('อัปเดตบ้านศัตรู')}
          </button>
          <button disabled={logBusy} onClick={() => answerSync(false)} className="pill px-5 py-2">{tx('ไม่ต้อง')}</button>
        </div>
      </Modal>

      <Modal open={!!logAsk} title={tx('จดลงบ้านศัตรูด้วยไหม?')} onClose={() => !logBusy && setLogAsk(null)}>
        <p className="mb-3 text-sm text-white/70">{tx('ทีมที่จัดเองในแผนนี้ยังไม่มีในบ้านศัตรู — เลือกทีมที่จะจดเป็น "ทีมแก้" ของบ้านนั้น')}</p>
        <div className="space-y-2">
          {logAsk?.items.map((it, i) => (
            <Fragment key={i}>
            <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${logAsk.picked[i] ? 'border-gold/60 bg-gold/10' : 'border-white/10 bg-black/20'}`}>
              <input type="checkbox" className="mt-1 h-4 w-4 accent-[#f4d58d]" checked={logAsk.picked[i]}
                onChange={() => setLogAsk((x) => x && { ...x, picked: x.picked.map((v, j) => (j === i ? !v : v)) })} />
              <span className="min-w-0 text-sm">
                <span className="font-semibold text-gold">{tx('ไม้')}{' '}{it.s + 1}</span>{' '}
                <span>{teamNames(it.opt.team)}</span>
                <span className="mx-1.5 text-white/40">vs</span>
                <span className="text-red-200">{teamNames(it.vs)}</span>
                <span className="mt-0.5 block text-xs text-white/50">
                  {it.target ? tx('เพิ่มเป็นทีมแก้ของบ้านที่มีอยู่แล้ว') : tx('บ้านนี้ยังไม่มี → สร้างบ้านใหม่ + ทีมแก้')}
                </span>
              </span>
            </label>
            {/* บ้านใหม่ที่ติ๊กไว้: ตั้งแท็ก/โน้ตก่อนสร้าง (รายการแรกของบ้านเดียวกันเป็นตัวกำหนด) */}
            {!it.target && logAsk.picked[i] && logAsk.items.findIndex((x) => !x.target && teamNames(x.vs) === teamNames(it.vs)) === i && (
              <div className="ml-7 rounded-xl border border-white/10 bg-black/20 p-3">
                <TagEditor tags={it.tags} onChange={(tags) => setLogAsk((x) => x && { ...x, items: x.items.map((v, j) => (j === i ? { ...v, tags } : v)) })} />
                <textarea
                  value={it.note}
                  onChange={(e) => setLogAsk((x) => x && { ...x, items: x.items.map((v, j) => (j === i ? { ...v, note: e.target.value } : v)) })}
                  maxLength={500}
                  rows={2}
                  placeholder={tx('โน้ตบ้านนี้ (ไม่บังคับ)')}
                  className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 p-2 text-sm outline-none focus:border-sky-300"
                />
              </div>
            )}
            </Fragment>
          ))}
        </div>
        {logNeedsTag && <p className="mt-3 text-sm font-semibold text-red-300">{tx('เลือกประเภทคอมพ์ (กายภาพ / เวท / แทงก์) ให้บ้านใหม่ที่ติ๊กไว้ก่อน')}</p>}
        <div className="mt-5 flex gap-2">
          <button disabled={logBusy || !logAsk?.picked.some(Boolean) || logNeedsTag} onClick={() => answerLog(true)} className="btn-gold flex-1 py-2">
            {logBusy ? tx('กำลังจด...') : tx('จดลงบ้านศัตรู')}
          </button>
          <button disabled={logBusy} onClick={() => answerLog(false)} className="pill px-5 py-2">{tx('ไม่ต้อง')}</button>
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
      {editing && wiz && renderWizard(wiz)}
      <Modal open={exitAsk} title={tx('ออกจากการตั้งไม้นี้?')} onClose={() => setExitAsk(false)}>
        <p className="text-white/80">{tx('สิ่งที่แก้ในไม้นี้จะหายไป')}{wiz?.isNew ? tx(' และไม้นี้จะถูกเอาออก') : tx(' (กลับเป็นแบบก่อนเปิด)')}</p>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={() => setExitAsk(false)} className="btn-gold flex-1 py-2">{tx('อยู่ต่อ')}</button>
          <button type="button" onClick={() => { setExitAsk(false); cancelWiz() }} className="rounded-full border border-red-400/60 px-5 py-2 text-red-200 hover:bg-red-500/15">{tx('ออก ไม่บันทึก')}</button>
        </div>
      </Modal>
      <SkillSkipAsk items={skillAsk?.items ?? null} onCancel={() => setSkillAsk(null)} onBack={() => {
        // กลับไปตั้งลำดับการใช้สกิล = เปิดหน้าต่างลำดับการใช้สกิลของทีมนั้นให้เลย (แผนบุก: เปิดหน้าต่างตั้งไม้ + กางทีมสำรองก่อน)
        const b = skillAsk?.back
        setSkillAsk(null)
        if (!b) return
        if (planKind(draft) === 'attack' && wiz?.s !== b.s) openWiz(b.s)
        if (b.o === -1) setWiz((x) => x && { ...x, step: 1 }) // บ้านที่จะตี → กลับขั้น 1
        else if (b.o !== mainIndex(draft.slots[b.s])) setExpanded((x) => new Set(x).add(b.s))
        setSkillReq((r) => ({ s: b.s, o: b.o, n: (r?.n ?? 0) + 1 }))
        setTimeout(() => setSkillReq(null), 800) // ล้างคำสั่ง ไม่ให้การ์ดเปิดหน้าต่างซ้ำตอนโผล่ใหม่ทีหลัง
      }}
        onSkip={() => { const t = skillAsk?.then; setSkillAsk(null); t?.() }} />
      {editing && <HeroDock z={wiz ? 46 : undefined} />}
    </div>
    </DndHub>
  )
}

function teamNames(t: Team) {
  return t.slots.filter(Boolean).map((id) => unitBase(id)).join(' · ')
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
            <span className={danger ? 'text-red-100 line-through decoration-red-400/70' : ''}>{unitLabel(id)}</span>
            {editing && (
              <button onClick={() => onRemove(id)} className="-mr-1 rounded-full p-0.5 hover:bg-white/10" aria-label={tx('เอาออก')}>
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </span>
        ))}
        {editing && (
          <button onClick={dock.open} className={`flex items-center gap-1 rounded-full border border-dashed px-3 py-1 text-sm hover:border-gold hover:text-gold ${dock.active ? 'border-gold text-gold shadow-[0_0_12px_rgba(244,213,141,.6)]' : 'border-white/30 text-white/70'}`}>
            <Plus className="h-4 w-4" />{' '}{tx('เพิ่ม')}
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
    label: L(`ยกเลิกบ้าน ชุด ${cur + 1}`, `Remove banned set ${cur + 1}`), used: grp, full: grp.length >= 5, onAdd: (id) => onAddHero(cur, id),
  } : null)
  if (!editing && groups.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="grid h-7 w-7 place-items-center rounded-md bg-red-500 text-white"><X className="h-5 w-5" strokeWidth={3} /></span>
      <span className="text-lg font-semibold">{tx('ยกเลิกบ้าน')}</span>
      <div className="flex flex-wrap items-center gap-2">
        {groups.map((g, gi) => (
          <span key={gi} className={`flex flex-wrap items-center gap-1 rounded-full border bg-red-500/10 py-0.5 pl-0.5 pr-2 ${dock.active && cur === gi ? 'border-gold shadow-[0_0_12px_rgba(244,213,141,.5)]' : 'border-red-400/40'}`}>
            {g.map((id, i) => (
              <span key={id} className="flex items-center gap-1">
                {i > 0 && <span className="text-red-300/70">+</span>}
                <span className="h-7 w-7" style={{ fontSize: 8 }}><UnitCard id={id} shape="round" /></span>
                <span className="text-red-100 line-through decoration-red-400/70">{unitLabel(id)}</span>
                {editing && (
                  <button onClick={() => onRemoveHero(gi, id)} className="rounded-full p-0.5 hover:bg-white/10" aria-label={tx('เอาออก')}>
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
            {editing && g.length < 5 && (
              <button onClick={() => { setCur(gi); dock.open() }} className="ml-1 rounded-full border border-dashed border-red-300/50 px-2 text-xs text-red-200 hover:bg-red-500/20">
                {tx('+ ตัว')}
              </button>
            )}
            {editing && (
              <button onClick={() => { onRemoveGroup(gi); if (cur >= gi && cur > 0) setCur(cur - 1) }} className="ml-1 rounded-full p-1 text-red-300 hover:bg-red-500/20" title={tx('ลบชุดนี้')}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </span>
        ))}
        {editing && (
          <button onClick={() => { if (groups.length >= 10) return; setCur(groups.length); onAddGroup(); dock.open() }} className="flex items-center gap-1 rounded-full border border-dashed border-white/30 px-3 py-1 text-sm text-white/70 hover:border-gold hover:text-gold">
            <Plus className="h-4 w-4" />{' '}{tx('เพิ่มชุดที่ยกเลิก')}
          </button>
        )}
      </div>
    </div>
  )
}

/** แถบสรุป: ไม้แต่ละไม้ใช้ทีมไหน ตัวไหนซ้ำ */
function AllocationBar({ slots, use, onAuto, compact }: { slots: WarSlot[]; use: Map<string, number[]>; onAuto?: () => void; compact?: boolean }) {
  const attacks = slots.map((slot, s) => ({ slot, s })).filter(({ slot }) => slot.kind === 'attack' && (slot.options.length > 0 || slot.vs))
  const total = use.size
  const dup = conflictCount(use)
  // ตอนแก้: พับไว้เป็นแถบสรุป (มีตัวซ้ำ = กางให้เอง)
  const [open, setOpen] = useState(false)
  const shown = !compact || open || dup > 0
  if (!attacks.length) return null
  return (
    <section className={`panel mx-auto max-w-4xl ${compact ? 'mt-4 p-3' : 'mt-8 p-4 sm:p-5'}`}>
      <div className={`flex flex-wrap items-center gap-2 ${shown ? 'mb-3' : ''}`}>
        <Swords className="h-5 w-5 text-gold" />
        <span className={compact ? 'font-semibold' : 'text-lg font-semibold'}>{tx('จัดสรรอัศวิน')}</span>
        {compact && (
          <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-0.5 text-xs text-white/50 hover:text-gold">
            {shown ? tx('ซ่อน') : tx('ดูรายไม้')} <ChevronDown className={`h-3.5 w-3.5 transition ${shown ? 'rotate-180' : ''}`} />
          </button>
        )}
        <span className="text-sm text-white/50">{tx('ใช้ไป')}{' '}{total}{' '}{tx('ตัว')}</span>
        {onAuto && (
          <button type="button" onClick={onAuto} title={tx('เลือกทีมหลักทุกไม้ให้ตัวไม่ซ้ำ (เลือกทีมลำดับต้นก่อน)')}
            className="btn-gold ml-auto flex items-center gap-1 px-3 py-1 text-sm">
            <Wand2 className="h-4 w-4" />{' '}{tx('จัดให้อัตโนมัติ')}
          </button>
        )}
        <span className={`${onAuto ? '' : 'ml-auto '}flex items-center gap-1 rounded-full px-3 py-0.5 text-sm font-semibold ${dup ? 'bg-red-500/25 text-red-100' : 'bg-green-500/20 text-green-100'}`}>
          {dup ? <><AlertTriangle className="h-4 w-4" />{' '}{tx('ตัวซ้ำ')}{' '}{dup}{' '}{tx('ตัว')}</> : <><Check className="h-4 w-4" />{' '}{tx('ไม่มีตัวซ้ำ')}</>}
        </span>
      </div>
      {shown && <div className="space-y-1.5">
        {attacks.map(({ slot, s }) => {
          const heroes = heroesOf(mainOption(slot))
          return (
            <a key={s} href={`#slot-${s}`} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-white/5">
              <span className="w-12 shrink-0 text-sm font-semibold text-gold">{tx('ไม้')}{' '}{s + 1}</span>
              <span className="w-24 shrink-0 sm:w-auto sm:min-w-24">
                {slot.vsTag && <span title={tx('ประเภทบ้านศัตรูที่ไม้นี้จะไปตี')} className="whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold" style={tagStyle(slot.vsTag)}>vs {houseLabel(slot.vsTag)}</span>}
              </span>
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                {heroes.length ? heroes.map((id) => {
                  const clash = (use.get(heroKey(id))?.length ?? 0) > 1
                  return (
                    <span key={id} className={`flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2.5 text-sm ${clash ? 'bg-red-500/25 text-red-100 ring-1 ring-red-400' : 'bg-white/5'}`}>
                      <span className="h-7 w-7" style={{ fontSize: 8 }}><UnitCard id={id} shape="round" /></span>
                      {unitBase(id)}
                    </span>
                  )
                }) : <span className="text-sm text-white/40">{tx('ยังไม่ได้เลือกทีม')}</span>}
              </span>
            </a>
          )
        })}
      </div>}
    </section>
  )
}
