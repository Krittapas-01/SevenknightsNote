import { Camera, Check, CircleHelp, ClipboardPaste, History, Images, Loader2, Plus, SkipForward, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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


/** ตัวเลขที่อ่านจากรูปชุดเดียวกัน (ครบ 5 ค่าขึ้นไปและตรงทุกช่อง) = รูปเดิม/ตัวเดิม */
function sameRead(a: HeroStats, b: HeroStats) {
  const ka = STATS.filter((s) => a[s.key] !== undefined)
  return ka.length >= 5 && STATS.every((s) => a[s.key] === b[s.key])
}

/**
 * ปุ่ม "อ่านค่าความสามารถจากรูป": เลือกรูป / วางรูป (Ctrl+V) → อ่านตัวเลข → ตรวจทาน → ใส่ให้อัศวินในทีม
 * ใส่ต่อหลายตัว: กดใส่แล้วหน้าต่างไม่ปิด → ลงรูปตัวถัดไปได้เลย (เลือก/ลากหลายรูปพร้อมกัน = เข้าคิวอ่านทีละรูป) · ครบทุกตัวแล้วปิดเอง หรือกด "เสร็จ"
 */
export function StatsImport({ team, notes, onApply, onAddHero, onAddWithStats }: {
  team: (string | null)[]
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
  const root = useRef<HTMLDivElement>(null)
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
  /** ค่าในช่องมาจากการอ่านรูปรอบนี้ (ไม่ใช่ค่าเดิมของตัวนั้น) → เปลี่ยนตัวแล้วไม่ดึงค่าเดิมมาทับ */
  const fromImage = useRef(false)
  // --- ใส่ต่อหลายตัวในหน้าต่างเดียว ---
  /** รูปที่รออ่าน (เลือก/ลากมาหลายรูป หรือวางรูปใหม่ระหว่างที่รูปเดิมยังไม่ได้กดใส่ — ไม่ทับค่าที่ยังไม่ได้ใส่) */
  const [queue, setQueue] = useState<Blob[]>([])
  /** ตัวที่กดใส่ไปแล้วรอบนี้ (เปิดหน้าต่างครั้งนี้) */
  const [done, setDone] = useState<string[]>([])
  /** ตัวเลขที่อ่านจากรูปของตัวที่ใส่ไปแล้ว → รูปใหม่ตัวเลขชุดเดิม = รูปซ้ำ (กด Ctrl+V ตอนคลิปบอร์ดยังเป็นรูปเก่า) */
  const doneReads = useRef(new Map<string, HeroStats>())
  const lastRead = useRef<HeroStats | null>(null)
  const [dupOf, setDupOf] = useState<string | null>(null)
  /** รอบการอ่านรูป: ปิดหน้าต่าง/ใส่แล้ว/อ่านรูปใหม่ = ผลของรูปเก่าที่อ่านเสร็จทีหลังจะไม่มาทับ */
  const runId = useRef(0)
  const reading = useRef(false)
  /** ล้างฟอร์ม → effect ด้านล่างดึงของเดิมของตัวที่เลือกมาใหม่ (แม้เป็นตัวเดิม) */
  const [round, setRound] = useState(0)
  const canAdd = !!onAddHero && heroes.length < MAX_HEROES
  /** ใส่ได้หลายตัว (หน้ารายละเอียดอัศวินมีตัวเดียว → ใส่แล้วปิดเหมือนเดิม) */
  const multi = heroes.length > 1 || canAdd
  const isDone = (h: string) => done.some((d) => sameHero(d, h))
  // ค่าล่าสุดสำหรับงานที่จบทีหลัง (อ่านรูปเสร็จ / วางรูปผ่าน window) — ไม่ใช้ค่าตอนเปิดหน้าต่างที่ค้างอยู่ใน closure
  const latest = useRef({ heroes, hero, canAdd, done })
  latest.current = { heroes, hero, canAdd, done }

  /** ล้างภาพ/ค่า/คำเตือนของรูปปัจจุบัน */
  function resetForm() {
    runId.current++
    reading.current = false
    fromImage.current = false
    lastRead.current = null
    recallRef.current = null
    setImg((old) => { if (old) URL.revokeObjectURL(old); return null })
    setStats({}); setRaw(''); setErr(null); setMismatchId(null); setNoHero(false); setConfirming(false); setAskAdd(false); setDupOf(null)
    setProgress(null)
    setRecalledAt(null)
    setRound((r) => r + 1)
  }
  const openImport = () => {
    // เปิดรอบใหม่ = เริ่มสะอาด (เดิม: ภาพ/ค่า/คำเตือนของรอบก่อนค้าง → เลือกตัวอื่นแล้วได้ค่าของตัวก่อนไป)
    resetForm()
    setQueue([]); setDone([]); doneReads.current.clear()
    setOpen(true)
    setStep('upload')
    setHero((h) => (h && heroes.includes(h) ? h : heroes[0] ?? ''))
    // เปิดหน้าต่างครั้งแรก (เบราว์เซอร์นี้) → โชว์วิธีใช้ให้เอง
    // ครั้งแรก: มีการสอนแบบส่องปุ่ม (lib/tours: stats-import) แล้ว → ไม่ต้องเด้งหน้าวิธีใช้ซ้อน
    if (!helpSeen() && tourSeen('stats-import')) { setHelp(true); markHelpSeen() }
  }
  /** ปิดหน้าต่าง: ตัวที่กดใส่แล้วอยู่ในหน้านั้นแล้ว · รูปที่กำลังอ่าน/รอคิวทิ้งไป */
  const close = () => {
    runId.current++
    reading.current = false
    setProgress(null)
    setQueue([])
    setOpen(false)
  }
  useTour('stats-import', open, 600)
  const nameOf = (id: string) => unitBase(id)
  const mismatch = mismatchId ? nameOf(mismatchId) : null
  /** ตัวที่เลือกอยู่ในทีมจริงไหม (กันค่าเก่าค้างจากทีมก่อนหน้า) */
  const validHero = !!hero && heroes.includes(hero)
  /** ภาพเป็นตัวที่ไม่อยู่ในทีม แต่ทีมยังเพิ่มได้ → ปุ่มเพิ่มเข้าทีม + ใส่ค่าความสามารถ */
  const quickAdd = canAdd && !!mismatchId
  /** ตัวเลขซ้ำกับตัวที่ใส่ไปแล้ว แต่ตัวที่เลือกเป็นอีกตัว → ต้องกดยืนยันก่อน (กันเอาค่าตัวแรกไปใส่ตัวที่สอง) */
  const dupOther = dupOf && !(validHero && sameHero(dupOf, hero)) ? nameOf(dupOf) : null
  /** ชื่อตัวที่ภาพน่าจะเป็นจริง ๆ (ไม่ใช่ตัวที่เลือก) → กดใส่ครั้งแรก = ถามยืนยัน */
  const suspect = mismatch ?? dupOther
  /** ตัวถัดไปที่ยังไม่ได้ใส่ */
  const nextUp = heroes.find((h) => !isDone(h))
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
  }, [hero, open, round])
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
    lastRead.current = null
    if (h === hero) { setExtra(ex); recallRef.current = null }
    setHero(h)
    setStats({ ...(sv.note.stats ?? {}) })
    setErr(null); setMismatchId(null); setNoHero(false); setConfirming(false); setDupOf(null)
    setRecalledAt(sv.at)
    setStep('details')
  }

  async function run(file: Blob) {
    const id = ++runId.current
    const live = () => runId.current === id
    reading.current = true
    fromImage.current = true
    lastRead.current = null
    setOpen(true)
    setRecalledAt(null)
    setErr(null)
    setStats({})
    setRaw('')
    setMismatchId(null)
    setNoHero(false)
    setConfirming(false)
    setAskAdd(false)
    setDupOf(null)
    setImg((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(file) })
    setProgress(0)
    try {
      // name = บรรทัดชื่ออัศวินที่ครอปมาอ่านแยก (แม่นกว่าอ่านจากทั้งภาพ)
      const { text, name } = await readImageText(file, (p) => { if (live()) setProgress(p) })
      // ระหว่างอ่าน ปิดหน้าต่าง/วางรูปใหม่ไปแล้ว → ทิ้งผลนี้
      if (!live()) return
      // ทีม/ตัวที่เลือก ณ ตอนอ่านเสร็จ (ระหว่างรอ อาจเพิ่มตัวเข้าทีมหรือเปลี่ยนตัวไปแล้ว)
      const cur = latest.current
      setRaw(name ? `${L('ชื่อ', 'Name')}: ${name}\n---\n${text}` : text)
      const s = parseStats(text)
      lastRead.current = s
      setStats(s)
      const { found, other } = pickHero(name, text, cur.heroes)
      if (found) setHero(found)
      else {
        // หาชื่อไม่เจอ: ยังไม่ได้เลือกตัว → ตัวแรกที่ยังไม่ได้ใส่ (ใส่ครบแล้ว = ไม่เลือกให้ ต้องเลือกเอง กันทับตัวที่ใส่ไปแล้ว)
        if (!cur.hero || !cur.heroes.includes(cur.hero)) setHero(cur.heroes.find((h) => !cur.done.some((d) => sameHero(d, h))) ?? '')
        // ภาพเป็นอัศวินตัวอื่นที่ไม่ได้อยู่ในคอมพ์ → เตือน (ข้อความทั้งภาพต้องตรงเป๊ะ กันเตือนผิดตัว)
        if (other) { setMismatchId(other); if (cur.canAdd) setAskAdd(true) }
        else setNoHero(true)
      }
      // ตัวเลขชุดเดียวกับตัวที่เพิ่งใส่ไป = น่าจะเป็นรูปเดิม
      const dup = [...doneReads.current].find(([, r]) => sameRead(r, s))
      if (dup) setDupOf(dup[0])
      if (!hasStats(s)) setErr(tx('อ่านค่าความสามารถไม่เจอ — ใช้ภาพหน้าข้อมูลอัศวินในเกม (ภาษาไทยหรืออังกฤษ) หรือพิมพ์ค่าเองด้านล่าง'))
    } catch (e) {
      if (live()) setErr(tx('อ่านรูปไม่สำเร็จ: ') + (e as Error).message)
    } finally {
      if (live()) {
        reading.current = false
        setProgress(null)
        setStep('details')
      }
    }
  }

  /** รับรูปเข้ามา (เลือกไฟล์ / ลากวาง / Ctrl+V) — หลายรูป = อ่านรูปแรก ที่เหลือเข้าคิว */
  function take(files: Blob[]) {
    const imgs = files.filter((f) => f.type.startsWith('image/'))
    if (!imgs.length) return
    if (!multi) { void run(imgs[0]); return }
    // รูปเดิมยังอ่านอยู่ หรืออ่านได้แล้วแต่ยังไม่ได้กดใส่ → รูปใหม่ต่อคิว ไม่ทับของเดิม
    const busy = reading.current || (!!img && hasStats(stats))
    const later = busy ? imgs : imgs.slice(1)
    if (later.length) setQueue((q) => [...q, ...later])
    if (!busy) void run(imgs[0])
  }
  const takeRef = useRef(take)
  takeRef.current = take

  /**
   * กดใส่แล้ว (applied = ตัวที่ใส่) หรือกดข้ามรูปนี้ (null) → ไปตัวถัดไป:
   * มีรูปรอคิว = อ่านต่อเลย · ไม่มี = กลับไปหน้าใส่รูป · ใส่ครบทุกตัวและเพิ่มตัวไม่ได้แล้ว = ปิด
   */
  function proceed(applied: string | null, added = false) {
    const doneNow = applied ? [...done.filter((h) => !sameHero(h, applied)), applied] : done
    if (applied) {
      setDone(doneNow)
      if (lastRead.current && hasStats(lastRead.current)) doneReads.current.set(applied, lastRead.current)
    }
    const teamNow = added && applied && !heroes.includes(applied) ? [...heroes, applied] : heroes
    const roomLeft = !!onAddHero && teamNow.length < MAX_HEROES
    const next = teamNow.find((h) => !doneNow.some((d) => sameHero(d, h)))
    const [first, ...rest] = queue
    if (applied && (!multi || (!next && !first && !roomLeft))) { close(); return }
    resetForm()
    if (applied) setHero(next ?? '')
    setQueue(rest)
    if (first) void run(first)
    else setStep('upload')
    // มือถือ: ปุ่มใส่อยู่ล่างสุด → กลับขึ้นไปดูรูป/ตัวถัดไป
    root.current?.closest('.overflow-y-auto')?.scrollTo({ top: 0 })
  }

  // วางรูปจากคลิปบอร์ดได้ตอนหน้าต่างเปิดอยู่ (ผ่าน ref = ใช้ทีม/สถานะล่าสุดเสมอ)
  useEffect(() => {
    if (!open) return
    const onPaste = (e: ClipboardEvent) => takeRef.current([...(e.clipboardData?.files ?? [])])
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [open])

  if (!heroes.length && !onAddHero) return null
  const set = (k: StatKey, v: string) => setStats((s) => ({ ...s, [k]: v === '' ? undefined : Number(v) }))

  return (
    <>
      <button type="button" data-tour="stats-import" onClick={openImport}
        className="mt-2 flex items-center gap-1.5 rounded-full border border-sky-300/50 px-3 py-1 text-sm text-sky-100 hover:bg-sky-400/10">
        <Camera className="h-4 w-4" />{' '}{tx('อ่านค่าความสามารถจากรูป')}
      </button>
      <input ref={input} type="file" accept="image/*" multiple={multi} className="hidden"
        onChange={(e) => { take([...(e.target.files ?? [])]); e.target.value = '' }} />

      <Modal open={open} title={tx('อ่านค่าความสามารถจากรูป')} onClose={close} wide>
        <div ref={root} className={details ? 'grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]' : 'mx-auto max-w-xl'}>
          <div>
            <button type="button" data-tour="stats-help" onClick={() => setHelp(true)}
              className="mb-2 flex items-center gap-1.5 text-sm text-sky-200/80 hover:text-sky-100">
              <CircleHelp className="h-4 w-4" />{' '}{tx('วิธีใช้ / ต้องแคปหน้าไหน')}
            </button>
            {/* ใส่ไปแล้วอย่างน้อย 1 ตัว: ใครเสร็จแล้ว · ตัวถัดไปคือใคร */}
            {!details && done.length > 0 && (
              <div className="mb-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  {heroes.map((h) => (
                    <span key={h} className={`flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2.5 ${isDone(h) ? 'border-emerald-300/50 text-emerald-100' : h === nextUp ? 'border-gold/70 text-gold' : 'border-white/15 text-white/60'}`}>
                      <span className="h-6 w-6" style={{ fontSize: 7 }}><UnitCard id={h} shape="round" small /></span>
                      {unitBase(h)}{isDone(h) && <Check className="h-3.5 w-3.5 text-emerald-300" aria-label={L('ใส่แล้ว', 'applied')} />}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-emerald-100/90">
                  {nextUp
                    ? L(`ใส่แล้ว ${done.length} ตัว · ต่อไป ${nameOf(nextUp)} — ลงรูปได้เลย`, `${done.length} applied · next up: ${nameOf(nextUp)} — add the screenshot`)
                    : L('ใส่ครบทุกตัวในทีมแล้ว — ลงรูปตัวใหม่เพื่อเพิ่มเข้าทีม หรือกด "เสร็จ"', 'Every hero on the team is filled in — add a screenshot of a new hero to add them, or press "Done"')}
                </p>
              </div>
            )}
            <button type="button" data-tour="stats-drop" onClick={() => input.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                take([...e.dataTransfer.files])
              }}
              className={`flex ${details ? 'min-h-48' : 'min-h-72'} w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl text-center border-2 border-dashed bg-black/20 hover:border-gold hover:text-gold ${dragging ? 'border-gold text-gold' : 'border-white/20 text-white/60'}`}>
              {img ? <img src={img} alt={tx('ภาพค่าความสามารถ')} className="max-h-80 w-full object-contain" /> : (
                <>
                  <Camera className="h-8 w-8" />
                  <span>{done.length ? L('เลือกรูปตัวถัดไป หรือลากไฟล์มาวาง', 'Pick the next screenshot, or drag it in') : tx('เลือกรูปหน้าข้อมูลอัศวิน หรือลากไฟล์มาวาง')}</span>
                  <span className="flex items-center gap-1 text-xs text-white/40"><ClipboardPaste className="h-3.5 w-3.5" />{' '}{tx('หรือกด Ctrl+V วางภาพหน้าจอ')}</span>
                  {multi && <span className="px-4 text-xs text-white/40">{L('เลือกหลายรูปพร้อมกันได้ — อ่านให้ทีละตัว', 'You can pick several at once — they are read one by one')}</span>}
                </>
              )}
            </button>
            {progress !== null && (
              <div className="mt-3">
                <div className="flex items-center gap-2 text-sm text-white/70"><Loader2 className="h-4 w-4 animate-spin" />{' '}{tx('กำลังอ่านตัวเลข…')}{' '}{Math.round(progress * 100)}%</div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-gold transition-all" style={{ width: `${progress * 100}%` }} /></div>
                <p className="mt-1 text-xs text-white/40">{tx('ครั้งแรกต้องโหลดตัวอ่านประมาณ 8MB')}</p>
              </div>
            )}
            {queue.length > 0 && (
              <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-sky-400/10 px-3 py-1.5 text-xs text-sky-100">
                <Images className="h-3.5 w-3.5 shrink-0" />{' '}
                {L(`รูปถัดไปรออยู่ ${queue.length} รูป — กดใส่ (หรือข้ามรูปนี้) แล้วจะอ่านต่อให้เอง`, `${queue.length} more screenshot${queue.length > 1 ? 's' : ''} waiting — apply (or skip this one) and the next is read automatically`)}
              </p>
            )}
            {err && <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-100">{err}</p>}
            {dupOf && (
              <p role="alert" className={`mt-3 rounded-lg border px-3 py-2 text-sm ${dupOther ? 'border-red-400/50 bg-red-500/15 text-red-100' : 'border-amber-400/40 bg-amber-500/10 text-amber-100'}`}>
                {L(`⚠️ ตัวเลขชุดนี้เหมือนของ ${nameOf(dupOf)} ที่เพิ่งใส่ไป — รูปซ้ำหรือเปล่า? (กด Ctrl+V ก่อนแคปรูปใหม่ จะได้รูปเดิม)`,
                  `⚠️ These numbers match ${nameOf(dupOf)}, which you just applied — same screenshot again? (Ctrl+V before taking a new screenshot pastes the old one)`)}
              </p>
            )}
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
            {!details && progress === null && (
              <button type="button" onClick={() => setStep('details')}
                className="mx-auto mt-4 block text-sm text-white/55 underline-offset-4 hover:text-gold hover:underline">
                {tx('ไม่มีรูป? ข้ามไปกรอกเอง / แก้ของเดิม →')}
              </button>
            )}
            {noHero && !err && (
              <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                {tx('ไม่เจอชื่ออัศวินในทีมนี้ในภาพ — เช็กว่าเลือกตัวถูกด้านขวาก่อนกดใส่')}
              </p>
            )}
          </div>

          {details && <div>
            <label className="text-sm text-white/60">{tx('ของอัศวินตัวไหน')}</label>
            <div data-tour="stats-hero" className="mt-1 flex flex-wrap gap-2">
              {heroes.map((h) => (
                <button key={h} type="button" onClick={() => { setHero(h); setRecalledAt(null) }}
                  className={`flex items-center gap-2 rounded-full border py-0.5 pl-0.5 pr-3 text-sm ${hero === h ? 'border-gold bg-gold/15 text-gold' : 'border-white/15 text-white/70'}`}>
                  <span className="h-7 w-7" style={{ fontSize: 8 }}><UnitCard id={h} shape="round" small /></span>
                  {unitBase(h)}
                  {isDone(h) && <Check className="h-3.5 w-3.5 text-emerald-300" aria-label={L('ใส่แล้ว', 'applied')} />}
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
                proceed(mismatchId!, true)
              }}
              className="btn-gold flex flex-1 items-center justify-center gap-1.5 py-2 font-semibold max-sm:basis-full">
              <Plus className="h-4 w-4" />{' '}{tx('เพิ่ม')}{' '}{mismatch}{' '}{gear ? L('เข้าทีม แล้วใส่ข้อมูล', 'to team and fill info') : L('เข้าทีม แล้วใส่ค่าความสามารถ', 'to team and fill stats')}
            </button>
          )}
          {!(quickAdd && !validHero) && (
          <button disabled={!validHero || !canApply || progress !== null}
            onClick={() => {
              if (suspect && !confirming) { setConfirming(true); return }
              onApply(hero, stats, extraOut)
              proceed(hero)
            }} className={confirming
              ? 'flex-1 rounded-full border border-red-400/70 bg-red-500/25 py-2 font-semibold text-red-50 hover:bg-red-500/35 max-sm:basis-full'
              : quickAdd ? 'pill px-4 py-2 text-sm text-white/75 hover:border-gold/60 max-sm:flex-1' : 'btn-gold flex-1 py-2 max-sm:basis-full'}>
            {confirming
              ? L(`ยืนยัน: ใส่ค่าความสามารถของ ${suspect} ให้ ${nameOf(hero)}`, `Confirm: apply ${suspect}'s stats to ${nameOf(hero)}`)
              : validHero ? L(`${quickAdd ? 'ใส่ให้' : gear ? 'ใส่ข้อมูลให้' : 'ใส่ค่าความสามารถให้'} ${nameOf(hero)}${quickAdd ? 'แทน' : ''}`, `${quickAdd ? 'Apply to' : gear ? 'Apply info to' : 'Apply stats to'} ${nameOf(hero)}${quickAdd ? ' instead' : ''}`) : tx('เลือกอัศวินก่อน')}
          </button>
          )}
          {/* มีรูปรอคิว: รูปนี้ไม่ใช้ (ผิดรูป/ตัวซ้ำ) → ข้ามไปอ่านรูปถัดไป */}
          {multi && img && queue.length > 0 && progress === null && (
            <button type="button" onClick={() => proceed(null)} className="pill flex items-center justify-center gap-1 px-4 py-2 text-sm text-white/75 hover:border-gold/60 max-sm:flex-1">
              <SkipForward className="h-4 w-4" />{' '}{L('ข้ามรูปนี้', 'Skip this one')}
            </button>
          )}
          {/* ใส่ไปแล้ว = ปิดไม่ได้ย้อนอะไร (ตัวที่ใส่อยู่ในหน้านั้นแล้ว) → ปุ่มเป็น "เสร็จ" แทน "ยกเลิก" */}
          <button onClick={close} className="pill flex items-center justify-center gap-1 px-5 py-2 max-sm:flex-1">
            {done.length
              ? <><Check className="h-4 w-4" />{' '}{L(`เสร็จ (ใส่แล้ว ${done.length})`, `Done (${done.length} applied)`)}</>
              : <><X className="h-4 w-4" />{' '}{tx('ยกเลิก')}</>}
          </button>
        </div>
        <p className="mt-2 text-xs text-white/40">
          {confirming ? tx('ภาพกับตัวที่เลือกไม่ตรงกัน — กดอีกครั้งเพื่อยืนยัน หรือเลือกตัวใหม่ด้านบน')
            : multi ? L('ตรวจตัวเลขก่อนกดใส่ · กดใส่แล้วลงรูปตัวถัดไปต่อได้เลย ไม่ต้องเปิดใหม่ · ยังไม่บันทึกจนกด "บันทึก" ของหน้านั้น',
              'Check the numbers before applying · after applying, add the next screenshot right here · nothing is saved until you press "Save" on that page')
            : tx('ตรวจตัวเลขก่อนกดใส่ · ยังไม่บันทึกจนกด "บันทึก" ของหน้านั้น')}
        </p>
        </>}
        {/* หน้าใส่รูปหลังใส่ไปแล้ว: ปุ่มจบ */}
        {!details && done.length > 0 && (
          <div className="mx-auto mt-5 flex max-w-xl flex-wrap items-center justify-end gap-x-3 gap-y-2">
            <p className="min-w-0 flex-1 basis-56 text-xs text-white/45">{L('ตัวที่ใส่แล้วอยู่ในตารางของหน้านั้นแล้ว · ยังไม่บันทึกจนกด "บันทึก" ของหน้านั้น', 'Applied heroes are already in that page\'s table · nothing is saved until you press "Save" on that page')}</p>
            <button type="button" onClick={close} className="btn-gold flex items-center gap-1.5 px-6 py-2"><Check className="h-4 w-4" />{' '}{L('เสร็จ', 'Done')}</button>
          </div>
        )}
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
