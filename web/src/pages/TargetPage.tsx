import { ChevronLeft, ChevronRight, Crown, LayoutGrid, Library, Pencil, Plus, ThumbsUp, Trash2, X } from 'lucide-react'
import { ImgPriority } from '../components/UnitCard'
import PageSkeleton from '../components/PageSkeleton'
import { isMainTag, tagStyle, tagText } from '../lib/tags'
import { startTransition, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import SkillSkipAsk, { skillShort } from '../components/SkillSkipAsk'
import ConfirmDelete from '../components/ConfirmDelete'
import { Link, useNavigate, useParams } from 'react-router'
import TeamPanel, { type SlotKind } from '../components/TeamPanel'
import UnitPicker from '../components/UnitPicker'
import { DndHub } from '../components/DndHub'
import HeroDock from '../components/HeroDock'
import CompLibrary, { type Comp } from '../components/CompLibrary'
import VsArena from '../components/VsArena'
import Modal from '../components/Modal'
import { useDragScroll } from '../lib/useDragScroll'
import { getUnit, unitLabel } from '../data/heroes'
import { api } from '../lib/api'
import { MAX_HEROES, addHeroToTeam, changeFormation, compKey, emptyTeam, heroCount, moveSlot, placeUnit, teamOps, type HeroNote, type SkillStep, type Team } from '../lib/types'
import { useGuild } from '../lib/useGuild'
import { notifyGuildChanged } from '../lib/usePulse'
import NotFound from './NotFound'

/** "เมื่อสักครู่" / "5 นาทีที่แล้ว" / "3 ชม. ที่แล้ว" / "2 วันที่แล้ว" */
function edited(ts: number) {
  const m = Math.floor((Date.now() - ts) / 60_000)
  if (m < 1) return tx('เมื่อสักครู่')
  if (m < 60) return L(`${m} นาทีที่แล้ว`, `${m} min ago`)
  if (m < 1440) return L(`${Math.floor(m / 60)} ชม. ที่แล้ว`, `${Math.floor(m / 60)}h ago`)
  return L(`${Math.floor(m / 1440)} วันที่แล้ว`, `${Math.floor(m / 1440)}d ago`)
}
const RECENT_MS = 24 * 3600_000
import { EquipmentNoteText } from '../components/EquipmentLoadout'
import HeroNotesTable from '../components/HeroNotesTable'
import { TeamGearButton } from '../components/OptionCard'
import TagEditor from '../components/TagEditor'
import LikeButton from '../components/LikeButton'
import { PresetPickerButton, SavePresetButton } from '../components/Presets'
import { rememberNotes } from '../lib/myStats'
import { autoSpeed } from '../lib/teamSpeed'
import HelpLink from '../components/HelpLink'
import { shakeScreen } from '../lib/shake'
import { useMediaQuery } from '../lib/useMediaQuery'
import { useSlideDir, useSlidePill } from '../lib/slide'
import { useTabReorder } from '../lib/useTabReorder'
import GuildOnboarding from '../components/GuildOnboarding'
import { tx, L } from '../lib/i18n'
import { tourSeen, useTour } from '../lib/tour'
import { flashSaved, savedToast } from '../lib/celebrate'
import { isDemo } from '../lib/demo'

const copyNotes = (n?: HeroNote[]) => (n ?? []).map((x) => ({ ...x, sets: [...x.sets], rings: [...x.rings] }))

type Mode = 'view' | 'target' | 'counter'
type Picker = { side: 'target' | 'counter'; kind: SlotKind; index: number } | null

const clone = (t: Team): Team => JSON.parse(JSON.stringify(t))

export default function TargetPage() {
  const { gid = '', tid = '' } = useParams()
  const nav = useNavigate()
  const isNew = tid === 'new'
  const { data, error, canEdit, reload, patch } = useGuild(gid)
  const [dropOver, setDropOver] = useState(false)
  const [editMenu, setEditMenu] = useState(false) // ลากคอมพ์เป้าหมายมาวางบนทีมแก้
  const wide = useMediaQuery('(min-width: 1024px)') // จอคอม: ฟอร์มบ้านศัตรูอยู่ข้างคอมพ์
  const target = data?.targets.find((t) => t.id === tid)

  const [sel, setSel] = useState(0)
  const [showAll, setShowAll] = useState(false) // หน้าต่างดูทีมแก้ทั้งหมด
  // ทีมแก้ตั้งลำดับการใช้สกิลไม่ครบ → ถามก่อนบันทึก · skillOk = ตอบ "ไม่จอง" แล้วในรอบแก้นี้ · skillsReq = สั่งเปิดหน้าต่างลำดับการใช้สกิล
  const [skillAsk, setSkillAsk] = useState<{ which: 'counter' | 'target'; have: number } | null>(null)
  const skillOk = useRef(false)
  const tSkillOk = useRef(false)
  const [skillsReq, setSkillsReq] = useState(0)
  const [tSkillsReq, setTSkillsReq] = useState(0)
  const [speedAsk, setSpeedAsk] = useState<{ total: number; need: number } | null>(null) // ถามใส่ความเร็วรวมตอนบันทึกทีมแก้
  const allStrip = useRef<HTMLDivElement>(null)
  const allDrag = useDragScroll(allStrip)
  const [delAsk, setDelAsk] = useState<string | null>(null) // ทีมแก้ที่กดลบครั้งแรกแล้ว (รอกดยืนยัน)
  const [mode, setMode] = useState<Mode>('view')
  const [tDraft, setTDraft] = useState({ team: emptyTeam(), tags: [] as string[], note: '' })
  const [cDraft, setCDraft] = useState({ id: null as string | null, team: emptyTeam(), skills: [] as SkillStep[], note: '', heroNotes: [] as HeroNote[] })
  const counterPill = useSlidePill(mode === 'counter' && !cDraft.id ? 'add' : sel)
  // ดูทีมแก้: สลับทีมแก้ = การ์ดเลื่อนเข้าตามทิศ
  const counterSlide = useSlideDir(sel)
  const [picker, setPicker] = useState<Picker>(null)
  const [busy, setBusy] = useState(false)
  const bgSaves = useRef(0)
  /** กันแก้ทับกัน: เวอร์ชันของบ้าน/ทีมแก้ตอนเริ่มแก้ */
  const tBase = useRef<number | undefined>(undefined)
  const cBase = useRef<number | undefined>(undefined) // บันทึกเบื้องหลังที่ยังไม่เสร็จ
  const [retry, setRetry] = useState<{ msg: string; reopen: () => void } | null>(null) // บันทึกเบื้องหลังไม่ผ่าน
  const [err, setErr] = useState<string | null>(null)
  // เรียงลำดับทีมแก้: กดค้างที่แท็บ ทีมแก้ #n แล้วลาก (#1 = แนะนำให้ใช้ก่อน) · ลากอยู่ = แท็บที่เลือกตามไปด้วย
  const serverCounters = target?.counters ?? []
  const selId = useRef<string | null>(null)
  const [reordered, setReordered] = useState(false) // ใช้เช็กขั้น "ลองลากเรียง" ในการสอน
  const commitOrder = async (ids: string[]) => {
    try {
      await api.orderCounters(gid, tid, ids)
      setReordered(true)
      await reload()
    } catch (e) {
      setErr((e as Error).message)
      reorder.cancelPreview()
    }
  }
  const reorder = useTabReorder(serverCounters.map((c) => c.id), canEdit && mode === 'view', commitOrder,
    (ids) => { const i = selId.current ? ids.indexOf(selId.current) : -1; if (i >= 0) setSel(i) })
  const [library, setLibrary] = useState<'target' | 'counter' | null>(null)

  useEffect(() => {
    if (isNew && canEdit) setMode('target')
  }, [isNew, canEdit])
  // สอนใช้ตามสิ่งที่ทำอยู่: ดูทีมแก้ / จดบ้านศัตรูครั้งแรก / จัดทีมแก้ครั้งแรก
  const live = !!data && canEdit && !isDemo(gid)
  useTour('target-view', live && mode === 'view' && !isNew && serverCounters.length > 0)
  useTour('target-new', live && mode === 'target')
  useTour('counter-edit', live && mode === 'counter')
  // สอนเรียงทีมแก้ (คนที่เคยดูการสอนหน้านี้ไปแล้วก็ได้เห็น) — เมื่อมีทีมแก้ 2 ทีมขึ้นไป
  useTour('counter-order', live && mode === 'view' && !isNew && serverCounters.length > 1 && tourSeen('target-view'))

  if (error) return <NotFound message={error} />
  if (!data) return <PageSkeleton kind="target" />
  if (!isNew && !target) return <NotFound message={L('ไม่พบบ้านศัตรูนี้', 'Enemy defense not found')} />
  if (isNew && !canEdit) return <NotFound message={L('ลิงก์นี้ไม่มีสิทธิ์แก้ไข', "This link can't edit")} />

  const counters = reorder.order.map((id) => serverCounters.find((c) => c.id === id)).filter((c): c is NonNullable<typeof c> => !!c)
  const current = counters[Math.min(sel, counters.length - 1)]
  if (!reorder.dragId) selId.current = current?.id ?? null
  // ไลค์มากก่อน (เท่ากัน = ลำดับเดิม) — ปุ่มลัด "เรียงตามไลค์" โชว์เมื่อมีไลค์และลำดับยังไม่ตรง
  const byLikes = [...counters].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0)).map((c) => c.id)
  const canSortByLikes = canEdit && counters.length > 1 && counters.some((c) => c.likes) && byLikes.join('|') !== counters.map((c) => c.id).join('|')

  // ---------- เริ่มแก้ไข ----------
  function editTarget() {
    if (busy) return // ยังบันทึกรอบก่อนไม่เสร็จ
    setRetry(null)
    tSkillOk.current = false
    if (!target) return
    setTDraft({ team: clone(target.team), tags: [...target.tags], note: target.note })
    tBase.current = target.editedAt // กันแก้ทับกัน (เริ่มแก้จากเวอร์ชันไหน)
    setErr(null)
    setMode('target')
  }
  function editCounter(isAdd: boolean) {
    if (busy) return // ยังบันทึกรอบก่อนไม่เสร็จ (ทีมใหม่ยังเป็น id ชั่วคราว)
    setRetry(null)
    skillOk.current = false
    if (isAdd || !current) setCDraft({ id: null, team: emptyTeam(), skills: [], note: '', heroNotes: [] })
    else setCDraft({ id: current.id, team: clone(current.team), skills: [...current.skills], note: current.note, heroNotes: copyNotes(current.heroNotes) })
    cBase.current = isAdd || !current ? undefined : current.updatedAt
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
      shakeScreen()
    } finally {
      setBusy(bgSaves.current > 0) // ยังมีบันทึกเบื้องหลังค้างอยู่ = ยังล็อกปุ่มไว้
    }
  }
  /**
   * บันทึกแบบหน้าเปลี่ยนทันที: แก้ข้อมูลบนจอ + กลับโหมดดูเลย แล้วค่อยส่งไปเซิร์ฟเวอร์เบื้องหลัง
   * (เดิมรอเซิร์ฟเวอร์ตอบแล้วหน้าค่อยเปลี่ยน → หน้ากระโดดทีหลังโดยไม่ได้กดอะไร = CLS)
   * ไม่ผ่าน → ข้อมูลบนจอกลับเป็นก่อนแก้ + ป้ายลอย "บันทึกไม่สำเร็จ · กลับไปแก้" (กดแล้วเปิดหน้าแก้พร้อมงานเดิม)
   *   ไม่เปิดหน้าแก้เองทันที — หน้าจะกระโดดโดยที่ไม่ได้กดอะไร
   */
  function saveInBackground<R>(undo: () => void, fn: () => Promise<R>, onFail: () => void, onOk?: (r: R) => void) {
    bgSaves.current++
    setBusy(true)
    setErr(null)
    // สำเร็จ → แจ้งทุกหน้าที่เปิดอยู่ (หน้านี้เอง/หน้ากิลด์ที่ย้อนกลับไป) ให้โหลดของจริงจากเซิร์ฟเวอร์
    fn().then((r) => { onOk?.(r); notifyGuildChanged(gid) }, (e) => {
      undo() // ข้อมูลบนจอกลับเป็นก่อนแก้
      setRetry({ msg: (e as Error).message, reopen: onFail })
      shakeScreen()
    }).finally(() => { bgSaves.current--; setBusy(bgSaves.current > 0) })
  }
  // บันทึกสำเร็จ: ป้าย "บันทึกแล้ว" + การ์ดที่เพิ่งบันทึกเรืองทอง (รอหน้ากลับไปโหมดดูก่อน)
  const celebrate = (which: 'ally' | 'enemy') => {
    savedToast()
    window.setTimeout(() => flashSaved(document.querySelector(`[data-flash="${which}"] > .team-panel`)), 120)
  }
  const saveTarget = () => {
    // บ้านศัตรูตั้งลำดับการใช้สกิลไม่ครบ → ถามก่อน (เช็คหลังมีตัว+สัตว์เลี้ยงแล้ว)
    const tSkills = tDraft.team.skills ?? []
    if (!tSkillOk.current && tDraft.team.pet && skillShort(tDraft.team, tSkills)) { setSkillAsk({ which: 'target', have: tSkills.length }); return }
    return run(async () => {
      if (heroCount(tDraft.team) === 0) throw new Error(tx('ใส่อัศวินอย่างน้อย 1 ตัว'))
      if (!tDraft.team.pet) throw new Error(tx('เลือกสัตว์เลี้ยงก่อน'))
      // ทุกบ้านต้องมีประเภทหลัก (ใช้กรอง/สีการ์ด)
      if (!tDraft.tags.some(isMainTag)) throw new Error(tx('เลือกประเภทคอมพ์ก่อน: กายภาพ / เวท / แทงก์'))
      // คอมพ์ซ้ำ (อัศวินชุดเดียวกัน) ห้ามจดซ้ำ — ไปเพิ่มทีมแก้ที่บ้านเดิมแทน
      const key = compKey(tDraft.team)
      const dup = data?.targets.find((t) => t.id !== tid && compKey(t.team) === key)
      if (dup) {
        const tags = dup.tags.length ? ` (${dup.tags.map(tagText).join(', ')})` : ''
        throw new Error(L(`คอมพ์นี้จดไว้แล้ว${tags} — เปิดบ้านเดิมแล้วเพิ่มทีมแก้ที่นั่นแทน`, `This comp is already saved${tags} — open that defense and add counters there instead`))
      }
      if (isNew) {
        const t = await api.createTarget(gid, tDraft)
        await reload()
        nav(`/g/${gid}/t/${t.id}`, { replace: true })
        setMode('view')
        celebrate('enemy')
        return
      }
      // แก้บ้านเดิม: หน้าเปลี่ยนทันที แล้วค่อยบันทึกเบื้องหลัง
      const draft = { ...tDraft, team: clone(tDraft.team) }
      const undo = patch((d) => ({ ...d, targets: d.targets.map((t) => (t.id === tid ? { ...t, team: draft.team, tags: draft.tags, note: draft.note, updatedAt: Date.now() } : t)) }))
      setMode('view')
      celebrate('enemy')
      const base = tBase.current
      saveInBackground(undo, () => api.updateTarget(gid, tid, { ...draft, baseEditedAt: base }), () => { setTDraft(draft); setMode('target') },
        // เวอร์ชันใหม่ของบ้านนี้ → แก้รอบถัดไปก่อนข้อมูลโหลดกลับมาก็ไม่ชนกับของตัวเอง
        (r) => { if (r.editedAt) patch((d) => ({ ...d, targets: d.targets.map((t) => (t.id === tid ? { ...t, editedAt: r.editedAt } : t)) })) })
    })
  }
  const deleteTarget = () => {
    run(async () => {
      await api.deleteTarget(gid, tid)
      await reload()
      nav(`/g/${gid}?tab=targets`, { replace: true })
    })
  }
  // จัดทีมเสร็จ (กดบันทึก) แล้วทุกตัวมีความเร็วโจมตีในค่าความสามารถ → ถามก่อนว่าจะใส่ผลรวมเป็นความเร็วทีมไหม (state speedAsk อยู่ด้านบน)
  const saveCounter = (speed?: number) => {
    // ทุกทีมต้องมีสัตว์เลี้ยง (เช็คก่อนถามความเร็ว)
    if (heroCount(cDraft.team) > 0 && !cDraft.team.pet) { setErr(tx('เลือกสัตว์เลี้ยงก่อน')); shakeScreen(); return }
    if (!skillOk.current && skillShort(cDraft.team, cDraft.skills)) { setSkillAsk({ which: 'counter', have: cDraft.skills.length }); return }
    if (speed === undefined && heroCount(cDraft.team) > 0) {
      const spd = autoSpeed(cDraft.team, cDraft.heroNotes)
      if (spd.full && spd.total !== cDraft.team.speed) return setSpeedAsk({ total: spd.total, need: spd.need })
    }
    setSpeedAsk(null)
    const team = speed === undefined ? cDraft.team : { ...cDraft.team, speed }
    return run(async () => {
      if (heroCount(team) === 0) throw new Error(tx('ใส่อัศวินอย่างน้อย 1 ตัว'))
      // ทีมแก้ซ้ำในบ้านเดียวกัน (อัศวินชุดเดียวกัน) ห้ามจดซ้ำ
      const dupC = counters.findIndex((c) => c.id !== cDraft.id && compKey(c.team) === compKey(team))
      if (dupC >= 0) throw new Error(L(`ทีมแก้นี้มีอยู่แล้ว (ทีมแก้ #${dupC + 1}) — แก้ที่ทีมเดิมแทน`, `This counter already exists (Counter #${dupC + 1}) — edit that one instead`))
      const body = { team, skills: cDraft.skills, note: cDraft.note, heroNotes: cDraft.heroNotes }
      rememberNotes(cDraft.heroNotes) // จำค่าความสามารถล่าสุดของเครื่องนี้
      // หน้าเปลี่ยนทันที (ทีมแก้ขึ้นจอเลย) แล้วค่อยบันทึกเบื้องหลัง — ทีมใหม่ใช้ id ชั่วคราวจนโหลดข้อมูลจริงกลับมา
      const draft = { ...cDraft, team: clone(cDraft.team) }
      const now = Date.now()
      const editId = cDraft.id
      const undo = patch((d) => ({ ...d, targets: d.targets.map((t) => (t.id !== tid ? t : {
        ...t,
        counters: editId
          ? t.counters.map((c) => (c.id === editId ? { ...c, ...body, updatedAt: now } : c))
          : [...t.counters, { id: `tmp-${now}`, targetId: tid, ...body, likes: 0, createdAt: now, updatedAt: now }],
      })) }))
      if (!editId) setSel(counters.length) // ตัวใหม่อยู่ท้ายสุด
      setMode('view')
      celebrate('ally')
      const base = cBase.current
      saveInBackground<{ updatedAt?: number }>(
        undo,
        () => (editId ? api.updateCounter(gid, editId, { ...body, baseUpdatedAt: base }) : api.createCounter(gid, tid, body)),
        () => { setCDraft(draft); setMode('counter') },
        (r) => { if (editId && r.updatedAt) patch((d) => ({ ...d, targets: d.targets.map((t) => (t.id !== tid ? t : { ...t, counters: t.counters.map((c) => (c.id === editId ? { ...c, updatedAt: r.updatedAt! } : c)) })) })) },
      )
    })
  }
  const deleteCounter = () => {
    if (!cDraft.id) return
    const draft = { ...cDraft }
    const id = cDraft.id
    const undo = patch((d) => ({ ...d, targets: d.targets.map((t) => (t.id !== tid ? t : { ...t, counters: t.counters.filter((c) => c.id !== id) })) }))
    setSel(0)
    setMode('view')
    saveInBackground(undo, () => api.deleteCounter(gid, id), () => { setCDraft(draft); setMode('counter') })
  }

  function pickComp(c: Comp) {
    if (library === 'target') setTDraft((d) => ({ ...d, team: clone(c.team), note: d.note || c.note }))
    else if (library === 'counter') {
      setCDraft((d) => ({ ...d, team: clone(c.team), skills: [...c.skills], note: c.note.slice(0, 500), heroNotes: copyNotes(c.heroNotes) }))
    }
    setLibrary(null)
  }


  // ---------- panels ----------
  const editingT = mode === 'target'
  const editingC = mode === 'counter'

  const leftTeam = editingC ? cDraft.team : current?.team ?? emptyTeam()
  const leftSkills = editingC ? cDraft.skills : current?.skills ?? []
  const leftTitle = editingC
    ? cDraft.id ? L(`แก้ไขทีมแก้ #${sel + 1}`, `Edit counter #${sel + 1}`) : tx('ทีมแก้ใหม่')
    : current ? L(`ทีมแก้ #${Math.min(sel, counters.length - 1) + 1}`, `Counter #${Math.min(sel, counters.length - 1) + 1}`) : isNew ? tx('ทีมแก้') : tx('ยังไม่มีทีมแก้')

  const rightTeam = editingT ? tDraft.team : target?.team ?? emptyTeam()

  // ทีมแก้ (ฝั่งซ้ายของ VS)
  const allyPanel = (
    <ImgPriority value>
    <TeamPanel
        variant="ally"
        team={leftTeam}
        heroNotes={editingC ? cDraft.heroNotes : current?.heroNotes ?? []}
        title={undefined}
        skills={leftSkills}
        editable={editingC}
        label={tx('ทีมแก้')}
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
        skillsReq={skillsReq}
        className={isNew ? 'opacity-40' : ''}
      />
    </ImgPriority>
  )

  // บ้านศัตรู (ฝั่งขวาของ VS)
  const enemyPanel = (
    <ImgPriority value>
    <TeamPanel
        variant="enemy"
        team={rightTeam}
        title={undefined}
        editable={editingT}
        label={tx('บ้านศัตรู')}
        skillsReq={tSkillsReq}
        onSlotClick={(kind, index) => setPicker({ side: 'target', kind, index })}
        skills={rightTeam.skills ?? []}
        onSkills={(sk) => setTDraft((d) => ({ ...d, team: { ...d.team, skills: sk } }))}
        onPlace={(ref, unit) => setTDraft((d) => ({ ...d, team: teamOps.place(d.team, ref, unit) }))}
        onReset={() => setTDraft((d) => ({ ...d, team: emptyTeam() }))}
        onFormation={(f) => setTDraft((d) => ({ ...d, team: teamOps.formation(d.team, f) }))}
        onMove={(from, to) => setTDraft((d) => ({ ...d, team: teamOps.move(d.team, from, to) }))}
        onSpeed={(s) => setTeam('target', (t) => ({ ...t, speed: s }))}
      />
    </ImgPriority>
  )

  // ลากทั้งคอมพ์บ้านศัตรูมาเป็นจุดเริ่มทีมแก้ (คัดลอก บ้านศัตรูไม่เปลี่ยน · ไม่เอาลำดับสกิล/ความเร็วของศัตรู)
  const TEAM_MIME = 'application/x-7knote-team'
  // ลากได้ทั้งตอนแก้ทีมแก้ และตอนดูเฉย ๆ (ยังไม่ได้กด "เพิ่มทีมแก้" = เปิดทีมแก้ใหม่ให้เลย)
  const canCopy = canEdit && !isNew && !editingT && heroCount(rightTeam) > 0
  const copyTarget = () => {
    if (!editingC) editCounter(true)
    setCDraft((d) => ({ ...d, team: { ...clone(rightTeam), skills: undefined, speed: 0 }, skills: [] }))
  }
  const allyBlock = (
    <div key={mode === 'view' ? `v${sel}` : 'edit'} className={`flex h-full flex-col ${mode === 'view' ? counterSlide : editingC ? 'edit-arrive' : ''}`}>
      <p className="mb-2 text-center text-lg font-semibold text-gold">{leftTitle}</p>
      <div
        onDragOver={(e) => { if (canCopy && e.dataTransfer.types.includes(TEAM_MIME)) { e.preventDefault(); setDropOver(true) } }}
        onDragLeave={() => setDropOver(false)}
        onDrop={(e) => { e.preventDefault(); setDropOver(false); if (canCopy && e.dataTransfer.types.includes(TEAM_MIME)) copyTarget() }}
        className={`flex-1 rounded-[20px] transition [&>*]:h-full ${dropOver ? 'ring-2 ring-gold ring-offset-4 ring-offset-[var(--surface-deep)]' : ''}`}
      >
        <div data-flash="ally" className="relative [&>*]:h-full">
          {allyPanel}
          {/* ยังไม่มีทีมแก้ → กดตรงกลางการ์ดเพื่อเริ่มจดทีมแก้ */}
          {canEdit && !isNew && mode === 'view' && !current && (
            <button
              data-onboard="add-counter"
              onClick={() => editCounter(true)}
              className="group absolute inset-0 flex items-center justify-center rounded-[20px] transition hover:bg-gold/5"
            >
              <span className="flex items-center gap-1.5 rounded-full border border-gold/50 bg-ink/80 px-5 py-2.5 font-semibold text-gold shadow-lg backdrop-blur transition group-hover:scale-105 group-hover:border-gold">
                <Plus className="h-5 w-5" />{' '}{tx('เพิ่มทีมแก้')}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
  const enemyBlock = (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-center gap-2">
        <span className="text-lg font-semibold text-red-200">{isNew ? tx('บ้านศัตรูใหม่') : tx('บ้านศัตรู')}</span>
      </div>
      {/* ทั้งการ์ดลากได้ (คัดลอกทั้งคอมพ์) */}
      <div
        draggable={canCopy}
        onDragStart={(e) => { if (!canCopy) return; e.dataTransfer.setData(TEAM_MIME, '1'); e.dataTransfer.effectAllowed = 'copy' }}
        data-flash="enemy"
        className={`flex-1 [&>*]:h-full ${canCopy ? 'cursor-grab active:cursor-grabbing' : ''}`}
      >
        {enemyPanel}
      </div>
    </div>
  )

  // ฟอร์มทีมแก้ — จอคอมวางข้างการ์ดทีมแก้ เหมือนฟอร์มบ้านศัตรู
  const counterForm = (
    <div className="edit-arrive panel panel-gold flex h-full flex-col p-5">
      {!wide && <p className="mb-3 text-sm font-semibold text-gold">{tx('รายละเอียดทีมแก้')}</p>}
      {/* บ้านศัตรูย่อ ไว้ดูเทียบตอนกำลังแก้ */}
      {heroCount(rightTeam) > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2">
          <span className="shrink-0 text-xs font-semibold text-red-200">{tx('ศัตรู')}</span>
          <div className="flex min-w-0 flex-1 gap-1.5">
            {rightTeam.slots.filter(Boolean).map((id, i) => {
              const u = getUnit(id)
              return u?.thumb || u?.img
                ? <img key={i} src={u.thumb ?? u.img} alt={unitLabel(id)} title={unitLabel(id)} className="h-9 w-9 rounded-lg object-cover ring-1 ring-white/15" />
                : <span key={i} title={unitLabel(id)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-[10px]">{unitLabel(id).slice(0, 3)}</span>
            })}
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button data-tour="library" onClick={() => setLibrary('counter')} className="flex items-center gap-1.5 rounded-full border border-sky-300/60 px-3 py-1.5 text-sm text-sky-100 hover:bg-sky-400/10">
          <Library className="h-4 w-4" />{' '}{tx('เลือกจากที่จดไว้')}
        </button>
        <PresetPickerButton onPick={(p) => setCDraft((d) => ({ ...d, team: clone(p.team), skills: [...p.skills], note: d.note || p.note.slice(0, 500), heroNotes: copyNotes(p.heroNotes) }))} />
      </div>
      <textarea
        value={cDraft.note}
        onChange={(e) => setCDraft((d) => ({ ...d, note: e.target.value }))}
        maxLength={500}
        rows={3}
        placeholder={tx('โน้ต เช่น ทำช้า, ต้องมีอุปกรณ์ดี, แนะนำตัวนี้มากกว่าไคล์')}
        className="mt-4 w-full rounded-xl border border-white/15 bg-black/20 p-3 outline-none focus:border-gold"
      />
      <div className="mt-4">
        <p className="mb-2 text-sm text-white/60">{tx('อุปกรณ์/ค่าความสามารถรายตัว')}</p>
        <HeroNotesTable notes={cDraft.heroNotes} editing team={cDraft.team.slots} onChange={(heroNotes) => setCDraft((d) => ({ ...d, heroNotes }))}
          onAddHero={(hero) => setCDraft((d) => ({ ...d, team: addHeroToTeam(d.team, hero) }))} />
      </div>
      <Actions busy={busy} onSave={() => saveCounter()} onCancel={cancel} onDelete={cDraft.id ? deleteCounter : undefined} />
    </div>
  )

  // ฟอร์มบ้านศัตรู (คลัง · แท็ก · โน้ต · บันทึก) — จอคอมวางข้างคอมพ์ ไม่ต้องเลื่อนลงไปหา
  const targetForm = (
    <div className="edit-arrive panel panel-enemy flex h-full flex-col p-5">
      {!wide && <p className="mb-3 text-sm font-semibold text-red-200">{tx('รายละเอียดบ้านศัตรู')}</p>}
      <div className="mb-4">
        <button onClick={() => setLibrary('target')} className="flex items-center gap-1.5 rounded-full border border-sky-300/60 px-3 py-1.5 text-sm text-sky-100 hover:bg-sky-400/10">
          <Library className="h-4 w-4" />{' '}{tx('เลือกจากที่จดไว้')}
        </button>
      </div>
      <div data-tour="tag-editor"><TagEditor tags={tDraft.tags} onChange={(tags) => setTDraft((d) => ({ ...d, tags }))} /></div>
      <textarea
        value={tDraft.note}
        onChange={(e) => setTDraft((d) => ({ ...d, note: e.target.value }))}
        maxLength={500}
        rows={4}
        placeholder={tx('โน้ตบ้านศัตรู เช่น เจอบ่อยในกิลด์ X, ตัวหลังความเร็วสูง')}
        className="mt-4 min-h-24 w-full flex-1 rounded-xl border border-white/15 bg-black/20 p-3 outline-none focus:border-sky-300"
      />
      <Actions busy={busy} onSave={saveTarget} onCancel={cancel} onDelete={isNew ? undefined : deleteTarget} />
    </div>
  )

  return (
    <DndHub>
    <div className={mode !== 'view' ? 'pb-56' : ''}>
      <Link to={`/g/${gid}?tab=targets`} className="inline-flex items-center gap-1 text-white/70 hover:text-white">
        <ChevronLeft className="h-5 w-5" /> {data.guild.name}
      </Link>
      <HelpLink section={['targets', 'team', 'stats']} className="float-right" />
      <GuildOnboarding gid={gid} data={data} canEdit={canEdit} />

      {/* แถบเลือกทีมแก้ แบบปุ่มแคปซูลในเกม */}
      {!isNew && (counters.length > 0 || editingC) && (
        <div className="mt-5 flex justify-center">
          <div ref={counterPill.box} data-tour="counter-tabs" data-reordered={reordered || undefined} className="scrollbar-thin pill relative flex max-w-full gap-1 overflow-x-auto p-1">
            <span aria-hidden className="slide-pill" style={counterPill.pill} />
            {counters.map((c, i) => (
              <button
                key={c.id}
                {...reorder.bind(c.id)}
                ref={(el) => { counterPill.item(i)(el); reorder.bind(c.id).ref(el) }}
                disabled={mode !== 'view'}
                // เปลี่ยนแท็บแบบไม่บล็อกจอ (การ์ดทีมแก้หนัก: รูป/ของ/ค่าความสามารถ) → กดแล้วตอบสนองทันที (INP)
                onClick={() => startTransition(() => setSel(i))}
                title={canEdit && counters.length > 1 && mode === 'view' ? tx('กดค้างแล้วลากเพื่อเรียงลำดับ (#1 = แนะนำให้ใช้ก่อน)') : undefined}
                className={`relative z-10 shrink-0 select-none rounded-full px-4 py-1.5 text-sm transition-[color,background-color,transform,opacity] sm:text-base ${
                  reorder.dragId === c.id ? 'scale-105 cursor-grabbing opacity-80 ring-2 ring-gold/70' : canEdit && counters.length > 1 && mode === 'view' ? 'cursor-grab' : ''
                } ${
                  i === Math.min(sel, counters.length - 1) && !(editingC && !cDraft.id)
                    ? 'font-semibold text-ink'
                    : 'text-white/70 hover:bg-white/10 disabled:hover:bg-transparent'
                }`}
              >
                {i === 0 && counters.length > 1 && (
                  // ขยับที่ span (HTML) ไม่ใช่ที่ svg — แอนิเมชันบน svg ไม่ได้ใช้ GPU ทำให้หน้าเว็บคำนวณใหม่ทุกเฟรม
                  <span className="crown-1 -mt-0.5 mr-1 inline-block align-middle" aria-hidden title={tx('ทีมแนะนำ (ใช้ก่อน)')}>
                    <Crown className={`h-3.5 w-3.5 ${i === Math.min(sel, counters.length - 1) && !(editingC && !cDraft.id) ? 'text-ink' : 'text-gold'}`} fill="currentColor" />
                  </span>
                )}
                {tx('ทีมแก้ #')}{i + 1}
                {!!c.likes && (
                  <span className={`ml-1.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-px align-middle text-xs font-bold tabular-nums ${
                    i === Math.min(sel, counters.length - 1) && !(editingC && !cDraft.id) ? 'bg-ink/85 text-sky-200' : 'bg-sky-400/20 text-sky-200'
                  }`}>
                    <ThumbsUp className="h-3 w-3" fill="currentColor" />{c.likes}
                  </span>
                )}
                {/* เพิ่มภายใน 24 ชม. → ป้าย "ใหม่" · แก้ภายใน 24 ชม. → จุดเขียว (คนในกิลด์รู้ว่าทีมไหนเพิ่งมา / ทีมไหนเพิ่งเปลี่ยน) */}
                {Date.now() - c.createdAt < RECENT_MS ? (
                  <span title={L(`เพิ่มเมื่อ ${edited(c.createdAt)}`, `Added ${edited(c.createdAt)}`)} className={`ml-1.5 inline-block rounded-full px-1.5 py-px align-middle text-xs font-bold ${
                    i === Math.min(sel, counters.length - 1) && !(editingC && !cDraft.id) ? 'bg-ink/85 text-emerald-300' : 'bg-emerald-400/20 text-emerald-300'
                  }`}>{tx('ใหม่')}</span>
                ) : c.updatedAt > c.createdAt && Date.now() - c.updatedAt < RECENT_MS && (
                  <span title={L(`แก้ล่าสุด ${edited(c.updatedAt)}`, `Edited ${edited(c.updatedAt)}`)} className="ml-1.5 inline-block h-1.5 w-1.5 -translate-y-0.5 rounded-full bg-emerald-400 align-middle" />
                )}
              </button>
            ))}
            {/* มีทีมแก้แล้ว = ปุ่ม + เล็ก ๆ ท้ายแถบ (ยังไม่มี = กดที่การ์ดตรงกลางแทน) */}
            {canEdit && counters.length > 0 && (
              <button
                ref={counterPill.item('add')}
                disabled={mode !== 'view'}
                data-onboard="add-counter"
                onClick={() => editCounter(true)}
                title={tx('เพิ่มทีมแก้')}
                aria-label={tx('เพิ่มทีมแก้')}
                className={`relative z-10 flex shrink-0 items-center rounded-full px-3 py-1.5 transition-colors ${
                  editingC && !cDraft.id ? 'font-semibold text-ink' : 'text-gold hover:bg-white/10'
                }`}
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
          {canSortByLikes && (
            <button disabled={mode !== 'view' || busy} onClick={() => void commitOrder(byLikes)}
              title={tx('เรียงทีมแก้ตามจำนวนไลค์ (มากไปน้อย) · ลากปรับต่อเองได้')}
              className="pill ml-2 flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-sm text-sky-200 hover:bg-white/10 disabled:opacity-40">
              <ThumbsUp className="h-4 w-4" />{' '}{tx('เรียงตามไลค์')}
            </button>
          )}
          {counters.length > 1 && (
            <button data-tour="counter-all" disabled={mode !== 'view'} onClick={() => startTransition(() => setShowAll(true))}
              className="pill ml-2 flex shrink-0 items-center gap-1.5 px-4 py-1.5 text-sm text-gold hover:bg-white/10 disabled:opacity-40">
              <LayoutGrid className="h-4 w-4" />{' '}{tx('ดูทั้งหมด')}
            </button>
          )}
        </div>
      )}

      {!isNew && current && mode === 'view' && (
        <p className="mt-2 text-center text-xs text-white/45">
          {current.updatedAt > current.createdAt ? L(`แก้ล่าสุด ${edited(current.updatedAt)}`, `Edited ${edited(current.updatedAt)}`) : L(`เพิ่มเมื่อ ${edited(current.createdAt)}`, `Added ${edited(current.createdAt)}`)}
        </p>
      )}

      <Modal open={!!speedAsk} title={tx('ใส่ความเร็วทีมไหม?')} onClose={() => setSpeedAsk(null)}>
        {speedAsk && (
          <div className="text-center">
            <p className="text-white/80">{tx('ความเร็วโจมตีของ')}{' '}{speedAsk.need}{' '}{tx('ตัวรวมกัน')}</p>
            <p className="mt-1 text-4xl font-bold tabular-nums text-gold">{speedAsk.total}</p>
            {!!cDraft.team.speed && <p className="mt-1 text-sm text-white/50">{tx('ตอนนี้ใส่ไว้')}{' '}{cDraft.team.speed}</p>}
            <div className="mt-5 flex justify-center gap-2">
              <button className="pill px-4 py-2 text-sm text-white/80 hover:bg-white/10" disabled={busy} onClick={() => saveCounter(cDraft.team.speed)}>
                {tx('ไม่ใส่ บันทึกเลย')}
              </button>
              <button className="btn-gold px-5 py-2" disabled={busy} onClick={() => saveCounter(speedAsk.total)}>
                {tx('ใส่')}{' '}{speedAsk.total}{' '}{tx('แล้วบันทึก')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ดูทีมแก้ทั้งหมดพร้อมกัน (แบบ 7k-combo) · กดการ์ดเพื่อเปิดทีมนั้น */}
      <Modal open={showAll} title={L(`ทีมแก้ทั้งหมด (${counters.length})`, `All counters (${counters.length})`)} onClose={() => setShowAll(false)} wide>
        <div className="mb-5 flex justify-center">
          <div className="w-full max-w-md">
            <p className="mb-2 text-sm font-semibold text-red-300">{tx('บ้านศัตรู')}</p>
            <TeamPanel variant="enemy" size="sm" team={target?.team ?? emptyTeam()} skills={target?.team.skills ?? []} />
          </div>
        </div>
        {/* แนวนอน เลื่อนซ้าย-ขวาได้ */}
        <div ref={allStrip} {...allDrag} className="scrollbar-thin -mx-1 flex cursor-grab gap-4 overflow-x-auto px-1 pb-3 select-none">
          {counters.map((c, i) => (
            <div key={c.id} role="button" tabIndex={0} onClick={() => { setSel(i); setShowAll(false) }}
              onKeyDown={(e) => e.key === 'Enter' && (setSel(i), setShowAll(false))}
              className={`flex w-[min(340px,85vw)] shrink-0 cursor-pointer flex-col rounded-2xl border border-white/10 p-3 text-left transition hover:bg-white/5 ${i === Math.min(sel, counters.length - 1) ? 'ring-1 ring-gold/60' : ''}`}>
              <span className="mb-2 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-sm font-semibold text-gold">{i === 0 && <Crown className="h-4 w-4" />}{tx('ทีมแก้ #')}{i + 1}</span>
                {canEdit && counters.length > 1 && (
                  // เรียงลำดับในหน้าดูทั้งหมด: ซ้าย/ขวาทีละช่อง · มงกุฎ = ขึ้นเป็น #1 (แถวนี้ลากเพื่อเลื่อนดูอยู่แล้ว เลยใช้ปุ่มแทนการลาก)
                  <span data-tour={i === 0 ? 'all-order' : undefined} className="ml-auto flex items-center gap-0.5" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    {([
                      [<ChevronLeft key="l" className="h-4 w-4" />, L('ย้ายไปทางซ้าย', 'Move left'), i - 1],
                      [<ChevronRight key="r" className="h-4 w-4" />, L('ย้ายไปทางขวา', 'Move right'), i + 1],
                      [<Crown key="c" className="h-4 w-4" />, L('ตั้งเป็น #1', 'Make #1'), 0],
                    ] as const).map(([icon, label, to]) => (
                      <button key={label} type="button" title={label} aria-label={label}
                        disabled={busy || to < 0 || to >= counters.length || to === i}
                        onClick={() => {
                          const ids = counters.map((x) => x.id)
                          const keep = current?.id
                          ids.splice(i, 1); ids.splice(to, 0, c.id)
                          // ทีมที่เปิดอยู่ยังเป็นทีมเดิมหลังเรียง
                          run(async () => { await commitOrder(ids); if (keep) setSel(Math.max(0, ids.indexOf(keep))) })
                        }}
                        className="grid h-7 w-7 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-gold disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-white/60">
                        {icon}
                      </button>
                    ))}
                  </span>
                )}
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
                    <Trash2 className="h-3.5 w-3.5" /> {delAsk === c.id ? tx('กดอีกครั้งเพื่อลบ') : tx('ลบ')}
                  </button>
                )}
              </span>
              <span className="pointer-events-none block"><TeamPanel variant="ally" size="sm" team={c.team} skills={c.skills} heroNotes={c.heroNotes} /></span>
              {c.note && <span className="mt-2 line-clamp-2 text-sm text-white/80">{c.note}</span>}
              <span className="mt-2 self-end text-xs text-white/50">{tx('เปิดทีมนี้ ›')}</span>
            </div>
          ))}
        </div>
      </Modal>

      <div className="mt-8" data-tour="vs-arena">
        {editingT && wide ? (
          // จอคอม แก้บ้านศัตรู: คอมพ์ศัตรู + ฟอร์มรายละเอียดอยู่ข้างกัน (ไม่มีทีมแก้/VS มาเกะกะ)
          <div className="flex items-stretch justify-center gap-6">
            <div className="w-[380px] [&>*]:h-full">{enemyBlock}</div>
            <div className="flex w-[380px] flex-col">
              <p className="mb-2 text-center text-lg font-semibold text-red-200">{tx('รายละเอียดบ้านศัตรู')}</p>
              <div className="flex-1 [&>*]:h-full">{targetForm}</div>
            </div>
          </div>
        ) : editingC && wide ? (
          // จอคอม แก้ทีมแก้: การ์ดทีมแก้ + ฟอร์มรายละเอียดอยู่ข้างกัน
          <div className="flex items-stretch justify-center gap-6">
            {/* การ์ดทีมไม่ยืดตามฟอร์มขวา (โน้ตรายตัวยาว → การ์ดยาวตาม ทีมไปอยู่กลางจอ) · ติดจอตอนเลื่อนลงไปแก้โน้ต */}
            <div className="sticky top-[8.5rem] w-[380px] self-start">{allyBlock}</div>
            <div className="flex w-[460px] flex-col">
              <p className="mb-2 text-center text-lg font-semibold text-gold">{tx('รายละเอียดทีมแก้')}</p>
              <div className="flex-1 [&>*]:h-full">{counterForm}</div>
            </div>
          </div>
        ) : (
          <VsArena left={allyBlock} right={enemyBlock} />
        )}
      </div>

      {/* ---------- แผงล่าง ---------- */}
      <div className="mx-auto mt-10 max-w-3xl">
        {err && <p data-error className="mb-4 rounded-lg border border-red-400/40 bg-red-500/15 px-4 py-2 font-semibold text-red-200">{err}</p>}

        {/* มือถือ: ฟอร์มทีมแก้อยู่ใต้ทีม · จอคอมย้ายไปข้างการ์ด */}
        {editingC && !wide && counterForm}

        {/* มือถือ: ฟอร์มบ้านศัตรูอยู่ใต้ทีม · จอคอมย้ายไปข้างคอมพ์ (ช่องซ้ายของ VS) */}
        {editingT && !wide && targetForm}

        {mode === 'view' && target && (
          <div className="grid gap-5 md:grid-cols-2">
            <div key={sel} className={`panel panel-gold p-5 ${counterSlide}`}>
              <div className="flex items-center justify-between">
                <h3 data-tour="counter-head" className="flex items-center gap-2 font-semibold text-gold">
                  {current ? L(`ทีมแก้ #${Math.min(sel, counters.length - 1) + 1}`, `Counter #${Math.min(sel, counters.length - 1) + 1}`) : tx('ทีมแก้')}
                  {current && <LikeButton key={current.id} gid={gid} cid={current.id} count={current.likes ?? 0} onChanged={reload} />}
                  {current && <SavePresetButton team={current.team} skills={current.skills} note={current.note} heroNotes={current.heroNotes} className="font-normal" />}
                </h3>
              </div>
              {current ? (
                <>
                  {current.note ? <EquipmentNoteText text={current.note} /> : <p className="mt-3 text-white/40">{tx('ไม่มีโน้ต')}</p>}
                  {/* อยู่ในการ์ดทีมแก้ → รู้ว่าดูรายละเอียดของทีมไหน */}
                  {(current.heroNotes?.length ?? 0) > 0 && (
                    <TeamGearButton className="mt-4" team={current.team} skills={current.skills} heroNotes={current.heroNotes!}
                      label={L(`ดูรายละเอียดทีมแก้ #${Math.min(sel, counters.length - 1) + 1}`, `View counter #${Math.min(sel, counters.length - 1) + 1} details`)}
                      title={L(`ทีมแก้ #${Math.min(sel, counters.length - 1) + 1} · รายละเอียดทั้งทีม`, `Counter #${Math.min(sel, counters.length - 1) + 1} · full team details`)} />
                  )}
                </>
              ) : (
                <p className="mt-2 text-white/50">{canEdit ? tx('กดที่การ์ดทีมแก้ด้านบน หรือลากบ้านศัตรูมาวาง เพื่อจดทีมที่ใช้ตีทีมนี้') : tx('ยังไม่มีใครจดทีมแก้')}</p>
              )}
            </div>
            <div className="panel panel-enemy p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{tx('บ้านศัตรู')}</h3>
              </div>
              {target.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {target.tags.map((t) => <span key={t} className="rounded-full px-3 py-0.5 text-sm font-semibold" style={tagStyle(t)}>{tagText(t)}</span>)}
                </div>
              )}
              <p className="mt-3 whitespace-pre-wrap text-white/80">{target.note || <span className="text-white/40">{tx('ไม่มีโน้ต')}</span>}</p>
            </div>
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
      <SkillSkipAsk items={skillAsk === null ? null : [[skillAsk.which === 'target' ? tx('บ้านศัตรู') : cDraft.id ? L(`ทีมแก้ #${sel + 1}`, `Counter #${sel + 1}`) : tx('ทีมแก้ใหม่'), skillAsk.have]]}
        onCancel={() => setSkillAsk(null)}
        onBack={() => {
          const set = skillAsk?.which === 'target' ? setTSkillsReq : setSkillsReq
          setSkillAsk(null); set((n) => n + 1); setTimeout(() => set(0), 800)
        }}
        onSkip={() => {
          const w = skillAsk?.which
          setSkillAsk(null)
          if (w === 'target') { tSkillOk.current = true; saveTarget() } else { skillOk.current = true; saveCounter() }
        }} />
      {/* ปุ่มแก้ไขลอยมุมล่างขวา (ข้างปุ่มติดต่อ) — กดแล้วเลือกว่าจะแก้อะไร ไม่ต้องเลื่อนลงไปหาในการ์ด */}
      {retry && createPortal(
        <div role="alert" data-testid="save-failed" className="fixed inset-x-3 bottom-24 z-50 mx-auto flex max-w-md flex-wrap items-center gap-2 rounded-2xl border border-red-400/50 bg-[var(--alert-bg)] px-4 py-3 text-sm text-red-200 shadow-xl">
          <span className="min-w-0 flex-1"><b>{tx('บันทึกไม่สำเร็จ')}</b> · {retry.msg}</span>
          <button type="button" onClick={() => { retry.reopen(); setErr(retry.msg); setRetry(null) }} className="rounded-full bg-red-400/90 px-3 py-1 font-semibold text-ink hover:bg-red-300">{tx('กลับไปแก้')}</button>
          <button type="button" onClick={() => setRetry(null)} aria-label={tx('ปิด')} className="rounded-full p-1 text-red-200/70 hover:text-white"><X className="h-4 w-4" /></button>
        </div>,
        document.body,
      )}
      {canEdit && !isNew && mode === 'view' && createPortal(
        <div data-noexport className="fixed right-20 z-40 flex flex-col items-end gap-2 sm:right-24" style={{ bottom: 'calc(20px + env(safe-area-inset-bottom))' }}>
          {editMenu && (
            <div data-tour="edit-menu" className="panel panel-gold flex w-56 flex-col p-1.5 text-sm shadow-[0_6px_24px_rgba(0,0,0,.5)]">
              {current && (
                <button type="button" onClick={() => { setEditMenu(false); editCounter(false) }} className="flex items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-white/10">
                  <Pencil className="h-4 w-4 text-gold" />{' '}{tx('แก้ไขทีมแก้ #')}{Math.min(sel, counters.length - 1) + 1}
                </button>
              )}
              <button type="button" onClick={() => { setEditMenu(false); editCounter(true) }} className="flex items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-white/10">
                <Plus className="h-4 w-4 text-gold" />{' '}{tx('เพิ่มทีมแก้')}
              </button>
              <button type="button" onClick={() => { setEditMenu(false); editTarget() }} className="flex items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-white/10">
                <Pencil className="h-4 w-4 text-red-300" />{' '}{tx('แก้ไขบ้านศัตรู')}
              </button>
            </div>
          )}
          {/* บันทึกเบื้องหลังยังไม่เสร็จ → ยังแก้ต่อไม่ได้ (ทีมใหม่ยังไม่มี id จริง) */}
          <button type="button" data-tour="edit-fab" disabled={busy} onClick={() => setEditMenu((v) => !v)} aria-expanded={editMenu}
            className="btn-gold flex items-center gap-1.5 px-5 py-3 text-sm font-semibold shadow-[0_6px_24px_rgba(0,0,0,.5)] disabled:opacity-70">
            {editMenu ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}{' '}{busy ? tx('กำลังบันทึก...') : tx('แก้ไข')}
          </button>
        </div>,
        document.body,
      )}
    </div>
    </DndHub>
  )
}

function Actions({ busy, onSave, onCancel, onDelete }: { busy: boolean; onSave: () => void; onCancel: () => void; onDelete?: () => void }) {
  return (
    <div data-tour="save-actions" className="mt-4 flex flex-wrap items-center gap-2">
      <button disabled={busy} onClick={onSave} className="btn-gold px-6 py-2">{busy ? tx('กำลังบันทึก...') : tx('บันทึก')}</button>
      <button disabled={busy} onClick={onCancel} className="pill px-5 py-2">{tx('ยกเลิก')}</button>
      {onDelete && (
        <ConfirmDelete disabled={busy} onConfirm={onDelete} className="ml-auto" />
      )}
    </div>
  )
}
