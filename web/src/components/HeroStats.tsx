import { Camera, ChevronRight, CircleHelp, ClipboardPaste, History, Loader2, PencilLine, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { track } from '../lib/usage'
import { baseName, getUnit, unitBase } from '../data/heroes'
import { pickHero } from '../lib/heroPick'
import { readImageText } from '../lib/ocr'
import { STATS, fmtStat, hasStats, parseStats, type HeroStats, type StatKey, statLabel } from '../lib/stats'
import { MAX_HEROES, type HeroNote } from '../lib/types'
import Modal from './Modal'
import EquipmentEditor from './EquipmentEditor'
import UnitCard from './UnitCard'
import UnitPicker from './UnitPicker'
import StatsHelp, { helpSeen, markHelpSeen } from './StatsHelp'
import { tourSeen, useTour } from '../lib/tour'
import { agoText, recallNote } from '../lib/myStats'
import { tx, L } from '../lib/i18n'
import { motionOK } from '../lib/teamMotion'

/** ไอคอนค่าความสามารถแบบในเกม (จาก 7K Atlas) */
const ICON_FILES = import.meta.glob('../assets/stats/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const icon = (f: string) => ICON_FILES[`../assets/stats/${f}.webp`]
const ICON: Record<StatKey, string> = {
  atk: 'PATK', def: 'DEF', hp: 'HP', spd: 'Speed', critRate: 'Crit', critDmg: 'CritDMG', weak: 'WeaknessHit', block: 'Block',
  hit: 'EffectHit', resist: 'EffectRes', dtr: 'DmgTakenReduce', amp: 'DMGAmp', crush: 'Crush', resil: 'Resilience', rejuv: 'Rejuvenate',
}
export function StatIcon({ k, magic, className = 'h-5 w-5' }: { k: StatKey; magic?: boolean; className?: string }) {
  const src = icon(k === 'atk' && magic ? 'MATK' : ICON[k])
  return src ? <img src={src} alt="" aria-hidden draggable={false} className={`shrink-0 object-contain ${className}`} /> : null
}

/** หน้าเกมเรียงแนวตั้ง: ซ้าย = โจมตี→บล็อก, ขวา = เข้าเป้า→ฟื้นฟู */
const LEFT = new Set<StatKey>(['atk', 'def', 'hp', 'spd', 'critRate', 'critDmg', 'weak', 'block'])
const col = (k: StatKey) => (LEFT.has(k) ? 'col-start-1' : 'col-start-2')

/** ตารางค่าความสามารถ 2 คอลัมน์แบบหน้าเกม (โชว์เฉพาะค่าที่มี) */
export function StatsGrid({ stats, className = '', size = 'sm' }: { stats?: HeroStats; className?: string; size?: 'sm' | 'lg' }) {
  if (!hasStats(stats)) return null
  const rows = STATS.filter((s) => stats![s.key] !== undefined)
  const lg = size === 'lg'
  return (
    <div className={`mt-2 ${className}`}>
      {/* lg = แบบหน้าข้อมูลอัศวินในเกม: แถวสูง ตัวใหญ่ ค่าชิดขวา */}
      <dl className={lg ? 'grid grid-flow-row-dense grid-cols-2 gap-x-2 gap-y-1' : 'grid grid-flow-row-dense grid-cols-2 gap-x-3 gap-y-1 text-[13px]'}>
        {rows.map((s) => (
          <div key={s.key} className={`${col(s.key)} ` + (lg
            ? 'flex items-center justify-between gap-2 rounded-full bg-black/35 px-3 py-1 ring-1 ring-white/5'
            : 'flex items-center justify-between gap-2 rounded-md bg-white/[.04] px-2 py-0.5')}>
            <dt className={`flex min-w-0 items-center ${lg ? 'gap-2 text-[15px] text-white/80' : 'gap-1.5 text-white/60'}`}>
              <StatIcon k={s.key} magic={stats!.magic} className={lg ? 'h-5 w-5' : 'h-4 w-4'} />
              <span className="truncate" title={statLabel(s.key, stats!.magic)}>{statLabel(s.key, stats!.magic)}</span>
            </dt>
            <dd className={lg ? 'text-base font-bold tabular-nums text-white' : 'font-semibold tabular-nums text-white'}>{fmtStat(s.key, stats![s.key]!)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/** อุปกรณ์/คำอธิบายที่ใส่มาพร้อมค่าความสามารถ */
export type NoteExtra = { sets: string[]; rings: string[]; text: string }
const sameHero = (a: string, b: string) => baseName(getUnit(a)?.name ?? a) === baseName(getUnit(b)?.name ?? b)
const findNote = (notes: HeroNote[], hero: string) => notes.find((n) => sameHero(n.hero, hero))

/** ใส่ค่าความสามารถ (+ อุปกรณ์/คำอธิบาย) ลงโน้ตของอัศวินตัวนั้น (ไม่มีแถว = สร้างใหม่) · ค่าความสามารถว่าง = คงของเดิม */
export function upsertStats(notes: HeroNote[], hero: string, stats: HeroStats, extra?: NoteExtra): HeroNote[] {
  // รวมกับค่าเดิม (ช่องที่ไม่ได้ใส่/อ่านไม่ได้ = คงค่าเดิม) — เดิมแทนทั้งก้อน: พิมพ์แค่ความเร็วแล้วอีก 14 ค่าหาย
  const defined = Object.fromEntries(Object.entries(stats).filter(([, v]) => v !== undefined && !(typeof v === 'number' && Number.isNaN(v)))) as HeroStats
  const patch = (n: HeroNote): HeroNote => ({ ...n, ...(hasStats(stats) ? { stats: { ...(n.stats ?? {}), ...defined } } : {}), ...(extra ?? {}) })
  const i = notes.findIndex((n) => sameHero(n.hero, hero))
  if (i >= 0) return notes.map((n, j) => (j === i ? patch(n) : n))
  return [...notes, patch({ hero, text: '', sets: [], rings: [] })].slice(0, 5)
}


/**
 * ปุ่ม "อ่านค่าความสามารถจากรูป": เลือกรูป / วางรูป (Ctrl+V) → อ่านตัวเลข → ตรวจทาน → ใส่ให้อัศวินในทีม
 */
export function StatsImport({ team, notes, onApply, onAddHero, onAddWithStats, editRequest }: {
  team: (string | null)[]
  /** ปุ่ม "แก้ค่าความสามารถ" ในแถวของอัศวิน → เปิดหน้าต่างที่ช่องกรอกของตัวนั้นเลย (seq เปลี่ยน = เปิดใหม่) */
  editRequest?: { hero: string; seq: number } | null
  /** โน้ตเดิมของทีม — ส่งมา = ใส่เซต/เครื่องประดับ/คำอธิบายได้ด้วย (ดึงของเดิมของตัวที่เลือกมาให้แก้) */
  notes?: HeroNote[]
  onApply: (hero: string, stats: HeroStats, extra?: NoteExtra) => void
  /** เพิ่มอัศวินเข้าทีม (ทีมยังไม่ครบ 3 ตัว) — ไม่ส่งมา = ไม่มีปุ่มเพิ่ม */
  onAddHero?: (hero: string) => void
  /** เพิ่มเข้าทีม + ใส่ค่าความสามารถในครั้งเดียว (ที่ที่อัปเดตทีมกับโน้ตด้วย state ก้อนเดียว — เรียกแยกสองครั้งแล้วอันหลังทับอันแรก) */
  onAddWithStats?: (hero: string, stats: HeroStats, extra?: NoteExtra) => void
}) {
  const heroes = team.filter((h): h is string => !!h)
  const input = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [img, setImg] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [hero, setHero] = useState<string>('')
  const [stats, setStats] = useState<HeroStats>({})
  const [raw, setRaw] = useState('')
  // อัศวินในภาพไม่อยู่ในคอมพ์นี้ (ชื่อที่อ่านได้) / ไม่เจอชื่ออัศวินในทีมเลย
  const [mismatchId, setMismatchId] = useState<string | null>(null)
  const [noHero, setNoHero] = useState(false)
  // ภาพเป็นคนละตัว → กดใส่ครั้งแรก = ถามยืนยัน, ครั้งที่สอง = ใส่จริง
  const [confirming, setConfirming] = useState(false)
  // อ่านรูปแล้วเจออัศวินที่ยังไม่อยู่ในทีม (ทีมยังไม่เต็ม) → เด้งถามว่าจะเพิ่มเข้าทีมไหม
  const [askAdd, setAskAdd] = useState(false)
  const [picking, setPicking] = useState(false)
  const [help, setHelp] = useState(false)
  const [dragging, setDragging] = useState(false)
  // 2 ขั้น: เปิดมาเห็นแค่ที่ใส่รูป → อ่านรูปเสร็จ (หรือกดข้าม) ค่อยโชว์ช่องรายละเอียด
  const [step, setStep] = useState<'upload' | 'details'>('upload')
  const details = step === 'details'
  // เปิดหน้าต่างครั้งแรก (เบราว์เซอร์นี้) → โชว์วิธีใช้ให้เอง
  /** ค่าในช่องมาจากการอ่านรูปรอบนี้ (ไม่ใช่ค่าเดิมของตัวนั้น) → เปลี่ยนตัวแล้วไม่ดึงค่าเดิมมาทับ */
  const fromImage = useRef(false)
  const openImport = () => {
    // เปิดรอบใหม่ = เริ่มสะอาด (เดิม: ภาพ/ค่า/คำเตือนของรอบก่อนค้าง → เลือกตัวอื่นแล้วได้ค่าของตัวก่อนไป)
    fromImage.current = false
    setImg((old) => { if (old) URL.revokeObjectURL(old); return null })
    setStats({}); setRaw(''); setErr(null); setMismatchId(null); setNoHero(false); setConfirming(false); setAskAdd(false)
    setOpen(true)
    setStep('upload')
    setRecalledAt(null)
    setHero((h) => (h && heroes.includes(h) ? h : heroes[0] ?? ''))
    // ครั้งแรก: มีการสอนแบบส่องปุ่ม (lib/tours: stats-import) แล้ว → ไม่ต้องเด้งหน้าวิธีใช้ซ้อน
    if (!helpSeen() && tourSeen('stats-import')) { setHelp(true); markHelpSeen() }
  }
  useTour('stats-import', open, 600)
  useEffect(() => {
    if (!editRequest) return
    openImport()
    setHero(heroes.find((h) => sameHero(h, editRequest.hero)) ?? heroes[0] ?? '')
    setStep('details')
    // มือถือ (คอลัมน์เดียว): กรอบใส่รูปอยู่บน → เลื่อนลงมาที่ช่องกรอกให้เลย
    if (window.matchMedia('(max-width: 767px)').matches) {
      setTimeout(() => document.querySelector('[data-stats-details]')?.scrollIntoView({ block: 'start', behavior: motionOK() ? 'smooth' : 'auto' }), 80)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editRequest?.seq])
  const nameOf = (id: string) => unitBase(id)
  const mismatch = mismatchId ? nameOf(mismatchId) : null
  const canAdd = !!onAddHero && heroes.length < MAX_HEROES
  /** ตัวที่เลือกอยู่ในทีมจริงไหม (กันค่าเก่าค้างจากทีมก่อนหน้า) */
  const validHero = !!hero && heroes.includes(hero)
  /** ภาพเป็นตัวที่ไม่อยู่ในทีม แต่ทีมยังเพิ่มได้ → ปุ่มเพิ่มเข้าทีม + ใส่ค่าความสามารถ */
  const quickAdd = canAdd && !!mismatchId
  const addHero = (id: string) => {
    onAddHero?.(id)
    setHero(id)
    setMismatchId(null)
    setNoHero(false)
    setConfirming(false)
  }
  useEffect(() => setConfirming(false), [hero])
  // เซต/เครื่องประดับ/คำอธิบาย: เปลี่ยนตัว (หรือเปิดหน้าต่าง) = ดึงของเดิมของตัวนั้นมา
  const gear = !!notes
  const [extra, setExtra] = useState<NoteExtra>({ sets: [], rings: [], text: '' })
  // ใช้ของเดิมที่เครื่องนี้เคยจด: ตั้งตัว + เติมค่าพร้อมกัน (effect ด้านล่างจะไม่ดึงโน้ตเดิมมาทับ)
  const recallRef = useRef<{ hero: string; extra: NoteExtra } | null>(null)
  const [recalledAt, setRecalledAt] = useState<number | null>(null)
  useEffect(() => {
    if (!open || !notes) return
    if (recallRef.current && recallRef.current.hero === hero) { setExtra(recallRef.current.extra); recallRef.current = null; return }
    const n = hero ? findNote(notes, hero) : undefined
    setExtra({ sets: n?.sets ?? [], rings: n?.rings ?? [], text: n?.text ?? '' })
    // กรอกเอง/แก้ของเดิม (ไม่ได้อ่านจากรูป) → ช่องค่าความสามารถขึ้นค่าเดิมของตัวนั้นให้แก้ต่อ
    if (!fromImage.current) setStats({ ...(n?.stats ?? {}) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hero, open])
  const hasExtra = gear && (extra.sets.length > 0 || extra.rings.length > 0 || extra.text.trim() !== '')
  const canApply = hasStats(stats) || hasExtra
  const extraOut = gear ? extra : undefined
  /** ตัวในทีมที่เครื่องนี้เคยจดค่าความสามารถ/อุปกรณ์ไว้ (ล่าสุดก่อน) */
  const savedHeroes = heroes.map((h) => ({ h, saved: recallNote(h) })).filter((x): x is { h: string; saved: NonNullable<ReturnType<typeof recallNote>> } => !!x.saved)
    .sort((a, b) => b.saved.at - a.saved.at)
  const savedOfHero = validHero ? recallNote(hero) : null
  function applySaved(h: string) {
    const sv = recallNote(h)
    if (!sv) return
    const cur = notes ? findNote(notes, h) : undefined
    const ex: NoteExtra = { sets: sv.note.sets ?? [], rings: sv.note.rings ?? [], text: cur?.text?.trim() ? cur.text : sv.note.text ?? '' }
    recallRef.current = { hero: h, extra: ex }
    fromImage.current = true // ค่ามาจากที่เคยจด → effect ไม่ดึงค่าในโน้ตมาทับ
    if (h === hero) { setExtra(ex); recallRef.current = null }
    setHero(h)
    setStats({ ...(sv.note.stats ?? {}) })
    setErr(null); setMismatchId(null); setNoHero(false); setConfirming(false)
    setRecalledAt(sv.at)
    setStep('details')
  }

  async function run(file: Blob) {
    fromImage.current = true
    setOpen(true)
    setRecalledAt(null)
    setErr(null)
    setStats({})
    setRaw('')
    setMismatchId(null)
    setNoHero(false)
    setConfirming(false)
    setAskAdd(false)
    setImg((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(file) })
    setProgress(0)
    try {
      // name = บรรทัดชื่ออัศวินที่ครอปมาอ่านแยก (แม่นกว่าอ่านจากทั้งภาพ)
      const { text, name } = await readImageText(file, setProgress)
      track('ocr')
      setRaw(name ? `${L('ชื่อ', 'Name')}: ${name}\n---\n${text}` : text)
      const s = parseStats(text)
      setStats(s)
      const { found, other } = pickHero(name, text, heroes)
      if (found) setHero(found)
      else {
        if (!hero && heroes[0]) setHero(heroes[0])
        // ภาพเป็นอัศวินตัวอื่นที่ไม่ได้อยู่ในคอมพ์ → เตือน (ข้อความทั้งภาพต้องตรงเป๊ะ กันเตือนผิดตัว)
        if (other) { setMismatchId(other); if (canAdd) setAskAdd(true) }
        else setNoHero(true)
      }
      if (!hasStats(s)) setErr(tx('อ่านค่าความสามารถไม่เจอ — ใช้ภาพหน้าข้อมูลอัศวินในเกม (ภาษาไทยหรืออังกฤษ) หรือพิมพ์ค่าเองด้านล่าง'))
    } catch (e) {
      setErr(tx('อ่านรูปไม่สำเร็จ: ') + (e as Error).message)
    } finally {
      setProgress(null)
      setStep('details')
    }
  }

  // วางรูปจากคลิปบอร์ดได้ตอนหน้าต่างเปิดอยู่
  useEffect(() => {
    if (!open) return
    const onPaste = (e: ClipboardEvent) => {
      const f = [...(e.clipboardData?.files ?? [])].find((x) => x.type.startsWith('image/'))
      if (f) run(f)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!heroes.length && !onAddHero) return null
  const set = (k: StatKey, v: string) => setStats((s) => ({ ...s, [k]: v === '' ? undefined : Number(v) }))

  return (
    <>
      <button type="button" data-tour="stats-import" onClick={openImport}
        className="mt-2 flex items-center gap-1.5 rounded-full border border-sky-300/50 px-3 py-1 text-sm text-sky-100 hover:bg-sky-400/10">
        <Camera className="h-4 w-4" />{' '}{tx('อ่านค่าความสามารถจากรูป')}
      </button>
      <input ref={input} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) run(f); e.target.value = '' }} />

      <Modal open={open} title={tx('อ่านค่าความสามารถจากรูป')} onClose={() => setOpen(false)} wide>
        <div className={details ? 'grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]' : 'mx-auto max-w-xl'}>
          <div>
            <button type="button" data-tour="stats-help" onClick={() => setHelp(true)}
              className="mb-2 flex items-center gap-1.5 text-sm text-sky-200/80 hover:text-sky-100">
              <CircleHelp className="h-4 w-4" />{' '}{tx('วิธีใช้ / ต้องแคปหน้าไหน')}
            </button>
            <button type="button" data-tour="stats-drop" onClick={() => input.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                const f = [...e.dataTransfer.files].find((x) => x.type.startsWith('image/'))
                if (f) run(f)
              }}
              className={`flex ${details ? 'min-h-48' : 'min-h-56 sm:min-h-72'} w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed bg-black/20 hover:border-gold hover:text-gold ${dragging ? 'border-gold text-gold' : 'border-white/20 text-white/60'}`}>
              {img ? <img src={img} alt={tx('ภาพค่าความสามารถ')} className="max-h-80 w-full object-contain" /> : (
                <>
                  <Camera className="h-8 w-8" />
                  <span>{tx('เลือกรูปหน้าข้อมูลอัศวิน หรือลากไฟล์มาวาง')}</span>
                  <span className="flex items-center gap-1 text-xs text-white/40"><ClipboardPaste className="h-3.5 w-3.5" />{' '}{tx('หรือกด Ctrl+V วางภาพหน้าจอ')}</span>
                </>
              )}
            </button>
            {/* ทางเลือกไม่ใช้รูป — เดิมเป็นลิงก์ตัวเล็กด้านล่าง ผู้ใช้มองไม่เห็น → ปุ่มเต็มกว้างใต้กรอบรูป มีเส้น "หรือ" คั่น */}
            {!details && progress === null && (
              <>
                <div className="my-3 flex items-center gap-3 text-xs text-white/40" aria-hidden>
                  <span className="h-px flex-1 bg-white/15" />{L('หรือ', 'or')}<span className="h-px flex-1 bg-white/15" />
                </div>
                <button type="button" data-tour="stats-manual" onClick={() => setStep('details')}
                  className="flex w-full items-center gap-3 rounded-2xl border border-gold/50 bg-gold/10 px-4 py-3 text-left text-gold hover:border-gold hover:bg-gold/15">
                  <PencilLine className="h-6 w-6 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{L('กรอกค่าความสามารถเอง', 'Type stats yourself')}</span>
                    <span className="block text-xs text-white/55">{gear ? L('ไม่ต้องใช้รูป · แก้ตัวเลขที่จดไว้ · ใส่เซต เครื่องประดับ คำอธิบาย', 'No screenshot needed · fix saved numbers · add sets, accessories, a note') : L('ไม่ต้องใช้รูป · แก้ตัวเลขที่จดไว้ได้', 'No screenshot needed · fix saved numbers too')}</span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0" />
                </button>
              </>
            )}
            {progress !== null && (
              <div className="mt-3">
                <div className="flex items-center gap-2 text-sm text-white/70"><Loader2 className="h-4 w-4 animate-spin" />{' '}{tx('กำลังอ่านตัวเลข…')}{' '}{Math.round(progress * 100)}%</div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-gold transition-all" style={{ width: `${progress * 100}%` }} /></div>
                <p className="mt-1 text-xs text-white/40">{tx('ครั้งแรกต้องโหลดตัวอ่านประมาณ 8MB')}</p>
              </div>
            )}
            {err && <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-100">{err}</p>}
            {mismatch && (
              <p role="alert" className={`mt-3 rounded-lg border px-3 py-2 text-sm ${quickAdd ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100' : 'border-red-400/50 bg-red-500/15 text-red-100'}`}>
                {quickAdd
                  ? <>{tx('ภาพนี้เป็นค่าความสามารถของ')}{' '}<b>{mismatch}</b>{' '}{tx('ซึ่งยังไม่อยู่ในทีม — กดปุ่มสีทองด้านล่างเพื่อเพิ่มเข้าทีมแล้วใส่ค่าความสามารถได้เลย')}</>
                  : <>{tx('⚠️ ภาพนี้เป็นค่าความสามารถของ')}{' '}<b>{mismatch}</b>{' '}{tx('ซึ่งไม่ได้อยู่ในคอมพ์นี้ — เช็กว่าใช้รูปถูกตัว ก่อนกดใส่ให้')}{' '}{validHero ? nameOf(hero) : tx('อัศวินในทีม')}</>}
              </p>
            )}
            {!details && progress === null && savedHeroes.length > 0 && (
              <div data-tour="stats-recall" className="mt-4 rounded-xl border border-sky-300/25 bg-sky-400/5 p-3">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-sky-100"><History className="h-4 w-4" />{' '}{L('เคยจดไว้ในเครื่องนี้ — ใช้ของเดิมได้เลย ไม่ต้องแคปใหม่', 'Saved on this device — reuse it, no new screenshot needed')}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {savedHeroes.map(({ h, saved }) => (
                    <button key={h} type="button" onClick={() => applySaved(h)}
                      className="flex items-center gap-2 rounded-full border border-sky-300/40 py-0.5 pl-0.5 pr-3 text-sm text-sky-50 hover:border-gold hover:text-gold">
                      <span className="h-7 w-7" style={{ fontSize: 8 }}><UnitCard id={h} shape="round" small /></span>
                      {unitBase(h)}{' '}<span className="text-xs text-white/45">· {agoText(saved.at)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {noHero && !err && (
              <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                {tx('ไม่เจอชื่ออัศวินในทีมนี้ในภาพ — เช็กว่าเลือกตัวถูกด้านขวาก่อนกดใส่')}
              </p>
            )}
          </div>

          {details && <div data-stats-details className="scroll-mt-24">
            <label className="text-sm text-white/60">{tx('ของอัศวินตัวไหน')}</label>
            <div data-tour="stats-hero" className="mt-1 flex flex-wrap gap-2">
              {heroes.map((h) => (
                <button key={h} type="button" onClick={() => { setHero(h); setRecalledAt(null) }}
                  className={`flex items-center gap-2 rounded-full border py-0.5 pl-0.5 pr-3 text-sm ${hero === h ? 'border-gold bg-gold/15 text-gold' : 'border-white/15 text-white/70'}`}>
                  <span className="h-7 w-7" style={{ fontSize: 8 }}><UnitCard id={h} shape="round" small /></span>
                  {unitBase(h)}
                </button>
              ))}
              {canAdd && mismatchId && (
                <button type="button" onClick={() => addHero(mismatchId)}
                  className="flex items-center gap-2 rounded-full border border-dashed border-emerald-300/60 py-0.5 pl-0.5 pr-3 text-sm text-emerald-100 hover:bg-emerald-400/10">
                  <span className="h-7 w-7" style={{ fontSize: 8 }}><UnitCard id={mismatchId} shape="round" small /></span>
                  <Plus className="h-3.5 w-3.5" />{' '}{tx('เพิ่ม')}{' '}{mismatch}{' '}{tx('เข้าทีม')}
                </button>
              )}
              {canAdd && (
                <button type="button" onClick={() => setPicking(true)}
                  className="flex items-center gap-1 rounded-full border border-dashed border-white/25 px-3 py-1 text-sm text-white/70 hover:border-gold hover:text-gold">
                  <Plus className="h-4 w-4" />{' '}{tx('เพิ่มอัศวิน')}
                </button>
              )}
            </div>
            {recalledAt !== null && savedOfHero && (
              <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-sky-400/10 px-3 py-1.5 text-xs text-sky-100"><History className="h-3.5 w-3.5 shrink-0" />{' '}{L(`เติมจากที่เคยจดไว้ (${agoText(recalledAt)}) — ตรวจแล้วกดใส่ได้เลย`, `Filled from your saved data (${agoText(recalledAt)}) — check, then apply`)}</p>
            )}
            {recalledAt === null && savedOfHero && (
              <button type="button" onClick={() => applySaved(hero)}
                className="mt-2 flex items-center gap-1 rounded-full border border-sky-300/40 px-2.5 py-0.5 text-xs text-sky-100 hover:bg-sky-400/10">
                <History className="h-3.5 w-3.5" />{' '}{L(`ใช้ของเดิมของ ${nameOf(hero)} (${agoText(savedOfHero.at)})`, `Use my saved ${nameOf(hero)} (${agoText(savedOfHero.at)})`)}
              </button>
            )}
            {canAdd && <p className="mt-1 text-xs text-white/40">{tx('ทีมนี้มี')}{' '}{heroes.length}/{MAX_HEROES}{' '}{tx('ตัว — เพิ่มอัศวินเข้าทีมได้จากตรงนี้')}</p>}
            <div data-tour="stats-grid" className="mt-4 grid grid-flow-row-dense grid-cols-1 gap-x-3 gap-y-1.5 sm:grid-cols-2">
              {STATS.map((s) => (
                // มือถือ: คอลัมน์เดียว ชื่อค่าไม่โดนตัด · จอใหญ่: 2 คอลัมน์แบบในเกม
                <label key={s.key} className={`${LEFT.has(s.key) ? 'sm:col-start-1' : 'sm:col-start-2'} flex items-center justify-between gap-2 rounded-lg bg-black/20 px-2 py-1 text-sm`}>
                  <span className="flex min-w-0 items-center gap-1.5 text-white/65"><StatIcon k={s.key} magic={stats.magic} className="h-4 w-4" /><span className="truncate" title={statLabel(s.key, stats.magic)}>{statLabel(s.key, stats.magic)}</span></span>
                  <span className="flex items-center gap-0.5">
                    <input type="number" inputMode="decimal" value={stats[s.key] ?? ''} onChange={(e) => set(s.key, e.target.value)}
                      className="w-20 rounded-md border border-white/10 bg-black/30 px-1.5 py-0.5 text-right tabular-nums outline-none focus:border-gold" />
                    <span className="w-3 text-xs text-white/40">{s.pct ? '%' : ''}</span>
                  </span>
                </label>
              ))}
            </div>
            {gear && (
              <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-black/15 p-3">
                <p className="text-sm text-white/60">{tx('อุปกรณ์ · คำอธิบาย')}</p>
                <EquipmentEditor sets={extra.sets} rings={extra.rings} onChange={(sets, rings) => setExtra((x) => ({ ...x, sets, rings }))} />
                <textarea value={extra.text} onChange={(e) => setExtra((x) => ({ ...x, text: e.target.value }))} maxLength={300} rows={2}
                  placeholder={tx('คำอธิบายอัศวิน เช่น ใส่ความเร็วให้ออกก่อน, ใช้สกิล 2 ก่อน')}
                  className="block w-full resize-y rounded-lg border border-white/15 bg-black/20 p-2 text-sm outline-none focus:border-gold" />
              </div>
            )}
            {raw && (
              <details className="mt-3 text-xs text-white/40">
                <summary className="cursor-pointer">{tx('ข้อความที่อ่านได้')}</summary>
                <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap">{raw}</pre>
              </details>
            )}
          </div>}
        </div>
        {details && <>
        <div data-tour="stats-apply" className="mt-5 flex flex-wrap gap-2">
          {/* ภาพเป็นตัวที่ยังไม่อยู่ในทีม และทีมยังไม่ครบ → ปุ่มหลัก = เพิ่มเข้าทีมแล้วใส่ค่าความสามารถในคลิกเดียว */}
          {quickAdd && (
            <button disabled={!canApply || progress !== null}
              onClick={() => {
                // อุปกรณ์/คำอธิบายในฟอร์มเป็นของตัวที่เลือกอยู่ → ตัวใหม่ใช้ของตัวเอง (ถ้าเคยมี) ไม่เอาของอีกตัวไปใส่
                const own = notes ? findNote(notes, mismatchId!) : undefined
                const ex = gear ? { sets: own?.sets ?? [], rings: own?.rings ?? [], text: own?.text ?? '' } : undefined
                if (onAddWithStats) onAddWithStats(mismatchId!, stats, ex)
                else { addHero(mismatchId!); onApply(mismatchId!, stats, ex) }
                setOpen(false)
              }}
              className="btn-gold flex flex-1 items-center justify-center gap-1.5 py-2 font-semibold">
              <Plus className="h-4 w-4" />{' '}{tx('เพิ่ม')}{' '}{mismatch}{' '}{gear ? L('เข้าทีม แล้วใส่ข้อมูล', 'to team and fill info') : L('เข้าทีม แล้วใส่ค่าความสามารถ', 'to team and fill stats')}
            </button>
          )}
          {!(quickAdd && !validHero) && (
          <button disabled={!validHero || !canApply || progress !== null}
            onClick={() => {
              if (mismatch && !confirming) { setConfirming(true); return }
              onApply(hero, stats, extraOut)
              setOpen(false)
            }} className={confirming
              ? 'flex-1 rounded-full border border-red-400/70 bg-red-500/25 py-2 font-semibold text-red-50 hover:bg-red-500/35'
              : quickAdd ? 'pill px-4 py-2 text-sm text-white/75 hover:border-gold/60' : 'btn-gold flex-1 py-2'}>
            {confirming
              ? L(`ยืนยัน: ใส่ค่าความสามารถของ ${mismatch} ให้ ${nameOf(hero)}`, `Confirm: apply ${mismatch}'s stats to ${nameOf(hero)}`)
              : validHero ? L(`${quickAdd ? 'ใส่ให้' : gear ? 'ใส่ข้อมูลให้' : 'ใส่ค่าความสามารถให้'} ${nameOf(hero)}${quickAdd ? 'แทน' : ''}`, `${quickAdd ? 'Apply to' : gear ? 'Apply info to' : 'Apply stats to'} ${nameOf(hero)}${quickAdd ? ' instead' : ''}`) : tx('เลือกอัศวินก่อน')}
          </button>
          )}
          <button onClick={() => setOpen(false)} className="pill flex items-center gap-1 px-5 py-2"><X className="h-4 w-4" />{' '}{tx('ยกเลิก')}</button>
        </div>
        <p className="mt-2 text-xs text-white/40">
          {confirming ? tx('ภาพกับตัวที่เลือกไม่ตรงกัน — กดอีกครั้งเพื่อยืนยัน หรือเลือกตัวใหม่ด้านบน') : tx('ตรวจตัวเลขก่อนกดใส่ · ยังไม่บันทึกจนกด "บันทึก" ของหน้านั้น')}
        </p>
        </>}
      </Modal>
      <Modal open={askAdd && !!mismatchId} title={L('เพิ่มอัศวินเข้าทีม?', 'Add this hero to the team?')} onClose={() => setAskAdd(false)}>
        {mismatchId && (
          <div className="text-center">
            <div className="mx-auto h-28 w-28"><UnitCard id={mismatchId} /></div>
            <p className="mt-3 text-sm leading-relaxed text-white/80">
              {L('ภาพนี้เป็นค่าความสามารถของ', 'This image shows the stats of')}{' '}<b className="text-gold">{mismatch}</b>
              <br />{L('ซึ่งยังไม่อยู่ในทีม — จะเพิ่มเข้าทีมเลยไหม?', "who isn't on this team yet. Add them now?")}
            </p>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row">
              <button type="button" onClick={() => setAskAdd(false)} className="pill flex-1 px-4 py-2 text-sm text-white/75 hover:border-gold/60">
                {L('ไม่เพิ่ม', 'Not now')}
              </button>
              <button type="button" onClick={() => { addHero(mismatchId); setAskAdd(false) }} className="btn-gold flex flex-1 items-center justify-center gap-1.5 py-2">
                <Plus className="h-4 w-4" />{' '}{L(`เพิ่ม ${mismatch} เข้าทีม`, `Add ${mismatch}`)}
              </button>
            </div>
          </div>
        )}
      </Modal>
      <StatsHelp open={help} onClose={() => setHelp(false)} />
      <UnitPicker open={picking} kind="hero" index={0} current={null} used={heroes} full={!canAdd} allowCustom={false}
        onPick={(id) => { if (id) addHero(id); setPicking(false) }} onClose={() => setPicking(false)} />
    </>
  )
}
