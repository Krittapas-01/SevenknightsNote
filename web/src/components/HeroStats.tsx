import { Camera, CircleHelp, ClipboardPaste, Loader2, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { HEROES, baseName, englishOf, getUnit, unitBase } from '../data/heroes'
import { matchHeroName, type HeroCandidate } from '../lib/heroMatch'
import { readImageText } from '../lib/ocr'
import { STATS, fmtStat, hasStats, parseStats, type HeroStats, type StatKey, statLabel } from '../lib/stats'
import { MAX_HEROES, type HeroNote } from '../lib/types'
import Modal from './Modal'
import EquipmentEditor from './EquipmentEditor'
import UnitCard from './UnitCard'
import UnitPicker from './UnitPicker'
import StatsHelp, { helpSeen, markHelpSeen } from './StatsHelp'
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
  const patch = (n: HeroNote): HeroNote => ({ ...n, ...(hasStats(stats) ? { stats } : {}), ...(extra ?? {}) })
  const i = notes.findIndex((n) => sameHero(n.hero, hero))
  if (i >= 0) return notes.map((n, j) => (j === i ? patch(n) : n))
  return [...notes, patch({ hero, text: '', sets: [], rings: [] })].slice(0, 5)
}

/** ตัดสระบน/ล่าง/วรรณยุกต์ไทย + ช่องว่าง — OCR มักอ่านพวกนี้เพี้ยน (ซอรัน → ซอร์น) */
const thaiSkeleton = (x: string) => x.replace(/[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\s]/g, '').replace(/ช/g, 'ซ') // ช/ซ OCR สลับกันบ่อย

/** ชื่อในเกมที่ต่างจากชื่อในเว็บ (ชื่อเต็ม/สะกดต่าง) — ใช้หาอัศวินจากภาพเท่านั้น */
const OCR_ALIASES: Record<string, string[]> = {
  'ทันจิโร่': ['คามาโดะ'],
  'เซนอิทสึ': ['อางาซึมะ', 'เซนอิทซึ', 'เซนอิท'],
}

/** ชื่อที่ใช้จับคู่ของอัศวิน 1 ตัว: ชื่อไทย + ชื่อเต็ม/สะกดในเกม + ชื่ออังกฤษ */
const candidate = (id: string): HeroCandidate => {
  const base = baseName(getUnit(id)?.name ?? id)
  const en = englishOf(id)
  return { id, names: [base, ...(OCR_ALIASES[base] ?? []), ...(en ? [en] : [])] }
}
const ALL_CANDIDATES = HEROES.map((h) => candidate(h.id))

/** ส่วนหัวของภาพ (ก่อนแถวโจมตี) — ชื่ออัศวินอยู่ตรงนี้ ส่วนล่างของภาพมีชื่ออัศวินตัวอื่นในคลังปนอยู่ */
const header = (text: string) => {
  const i = text.search(/[กภ]ายภ|เวท|[พผ]ลังโจ|attack/i)
  return i > 0 ? text.slice(0, i) : text
}

/**
 * หาชื่ออัศวินในข้อความ (เทียบชื่ออังกฤษ/ไทย เลือกชื่อที่ยาวที่สุดที่เจอ)
 * loose = เทียบชื่อไทยแบบตัดสระ/วรรณยุกต์ (ใช้กับอัศวินในทีม) · ไม่ loose = ต้องตรงเป๊ะ (กันเตือนผิดตัว)
 */
function detectHero(texts: string[], team: string[], loose = true) {
  const text = texts.map(header).join('\n')
  const t = text.toLowerCase()
  const flat = text.replace(/\s+/g, '')
  const skel = thaiSkeleton(text)
  let best: { id: string; len: number } | null = null
  const hit = (id: string, len: number) => { if (!best || len > best.len) best = { id, len } }
  for (const id of team) {
    const en = englishOf(id)?.toLowerCase()
    if (en && new RegExp(`\\b${en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(t)) hit(id, en.length)
    // ชื่อไทย (ภาพเกมภาษาไทย) — ชื่อสั้นเกินไปข้าม กันไปตรงกับคำอื่นในภาพ
    const base = baseName(getUnit(id)?.name ?? '')
    for (const name of [base, ...(OCR_ALIASES[base] ?? [])]) {
      const th = name.replace(/\s+/g, '')
      if (th.length >= 3 && flat.includes(th)) hit(id, th.length)
      else if (loose) {
        const k = thaiSkeleton(th)
        if (k.length >= 3 && skel.includes(k)) hit(id, k.length)
      }
    }
  }
  return (best as { id: string } | null)?.id ?? null
}

/**
 * ปุ่ม "อ่านค่าความสามารถจากรูป": เลือกรูป / วางรูป (Ctrl+V) → อ่านตัวเลข → ตรวจทาน → ใส่ให้อัศวินในทีม
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
  const [picking, setPicking] = useState(false)
  const [help, setHelp] = useState(false)
  const [dragging, setDragging] = useState(false)
  // 2 ขั้น: เปิดมาเห็นแค่ที่ใส่รูป → อ่านรูปเสร็จ (หรือกดข้าม) ค่อยโชว์ช่องรายละเอียด
  const [step, setStep] = useState<'upload' | 'details'>('upload')
  const details = step === 'details'
  // เปิดหน้าต่างครั้งแรก (เบราว์เซอร์นี้) → โชว์วิธีใช้ให้เอง
  const openImport = () => {
    setOpen(true)
    setStep('upload')
    setHero((h) => h || heroes[0])
    if (!helpSeen()) { setHelp(true); markHelpSeen() }
  }
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
  useEffect(() => {
    if (!open || !notes) return
    const n = hero ? findNote(notes, hero) : undefined
    setExtra({ sets: n?.sets ?? [], rings: n?.rings ?? [], text: n?.text ?? '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hero, open])
  const hasExtra = gear && (extra.sets.length > 0 || extra.rings.length > 0 || extra.text.trim() !== '')
  const canApply = hasStats(stats) || hasExtra
  const extraOut = gear ? extra : undefined

  async function run(file: Blob) {
    setOpen(true)
    setErr(null)
    setStats({})
    setRaw('')
    setMismatchId(null)
    setNoHero(false)
    setConfirming(false)
    setImg((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(file) })
    setProgress(0)
    try {
      // name = บรรทัดชื่ออัศวินที่ครอปมาอ่านแยก (แม่นกว่าอ่านจากทั้งภาพ)
      const { text, name } = await readImageText(file, setProgress)
      setRaw(name ? `ชื่อ: ${name}\n---\n${text}` : text)
      const s = parseStats(text)
      setStats(s)
      // 1) บรรทัดชื่อ → เทียบกับชื่ออัศวินทุกตัวแบบยอมเพี้ยน (ในทีมได้ก่อนถ้าใกล้เท่ากัน)
      // บรรทัดชื่ออ่านพลาด (ครอปไม่โดนชื่อ เช่นภาพแคปจากหน้าจัดทีม) → ลองหาชื่อในบรรทัดก่อนแถวค่าความสามารถของภาพทั้งภาพ
      // รับเฉพาะที่ตรงเป๊ะเมื่อตัดสระ/วรรณยุกต์ (อารส = อาริส) กันจับคำอื่นผิดเป็นชื่ออัศวิน
      const head = header(text)
      const exact = (m: ReturnType<typeof matchHeroName>) => (m && m.dist === 0 ? m : null)
      const inTeam = (name ? matchHeroName(name, heroes.map(candidate)) : null) ?? exact(matchHeroName(head, heroes.map(candidate)))
      const anyHero = (name ? matchHeroName(name, ALL_CANDIDATES) : null) ?? exact(matchHeroName(head, ALL_CANDIDATES))
      const byName = inTeam && (!anyHero || inTeam.dist <= anyHero.dist) ? inTeam.id : null
      // 2) สำรอง: หาจากข้อความทั้งภาพแบบเดิม
      const found = byName ?? detectHero([name, text], heroes)
      if (found) setHero(found)
      else {
        if (!hero && heroes[0]) setHero(heroes[0])
        // ภาพเป็นอัศวินตัวอื่นที่ไม่ได้อยู่ในคอมพ์ → เตือน (ข้อความทั้งภาพต้องตรงเป๊ะ กันเตือนผิดตัว)
        const other = anyHero?.id ?? detectHero([text], HEROES.map((h) => h.id), false)
        if (other) setMismatchId(other)
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
      <button type="button" onClick={openImport}
        className="mt-2 flex items-center gap-1.5 rounded-full border border-sky-300/50 px-3 py-1 text-sm text-sky-100 hover:bg-sky-400/10">
        <Camera className="h-4 w-4" />{' '}{tx('อ่านค่าความสามารถจากรูป')}
      </button>
      <input ref={input} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) run(f); e.target.value = '' }} />

      <Modal open={open} title={tx('อ่านค่าความสามารถจากรูป')} onClose={() => setOpen(false)} wide>
        <div className={details ? 'grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]' : 'mx-auto max-w-xl'}>
          <div>
            <button type="button" onClick={() => setHelp(true)}
              className="mb-2 flex items-center gap-1.5 text-sm text-sky-200/80 hover:text-sky-100">
              <CircleHelp className="h-4 w-4" />{' '}{tx('วิธีใช้ / ต้องแคปหน้าไหน')}
            </button>
            <button type="button" onClick={() => input.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                const f = [...e.dataTransfer.files].find((x) => x.type.startsWith('image/'))
                if (f) run(f)
              }}
              className={`flex ${details ? 'min-h-48' : 'min-h-72'} w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed bg-black/20 hover:border-gold hover:text-gold ${dragging ? 'border-gold text-gold' : 'border-white/20 text-white/60'}`}>
              {img ? <img src={img} alt={tx('ภาพค่าความสามารถ')} className="max-h-80 w-full object-contain" /> : (
                <>
                  <Camera className="h-8 w-8" />
                  <span>{tx('เลือกรูปหน้าข้อมูลอัศวิน หรือลากไฟล์มาวาง')}</span>
                  <span className="flex items-center gap-1 text-xs text-white/40"><ClipboardPaste className="h-3.5 w-3.5" />{' '}{tx('หรือกด Ctrl+V วางภาพหน้าจอ')}</span>
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
            {err && <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-100">{err}</p>}
            {mismatch && (
              <p role="alert" className={`mt-3 rounded-lg border px-3 py-2 text-sm ${quickAdd ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100' : 'border-red-400/50 bg-red-500/15 text-red-100'}`}>
                {quickAdd
                  ? <>{tx('ภาพนี้เป็นค่าความสามารถของ')}{' '}<b>{mismatch}</b>{' '}{tx('ซึ่งยังไม่อยู่ในทีม — กดปุ่มสีทองด้านล่างเพื่อเพิ่มเข้าทีมแล้วใส่ค่าความสามารถได้เลย')}</>
                  : <>{tx('⚠️ ภาพนี้เป็นค่าความสามารถของ')}{' '}<b>{mismatch}</b>{' '}{tx('ซึ่งไม่ได้อยู่ในคอมพ์นี้ — เช็กว่าใช้รูปถูกตัว ก่อนกดใส่ให้')}{' '}{validHero ? nameOf(hero) : tx('อัศวินในทีม')}</>}
              </p>
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
            <div className="mt-1 flex flex-wrap gap-2">
              {heroes.map((h) => (
                <button key={h} type="button" onClick={() => setHero(h)}
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
            {canAdd && <p className="mt-1 text-xs text-white/40">{tx('ทีมนี้มี')}{' '}{heroes.length}/{MAX_HEROES}{' '}{tx('ตัว — เพิ่มอัศวินเข้าทีมได้จากตรงนี้')}</p>}
            <div className="mt-4 grid grid-flow-row-dense grid-cols-1 gap-x-3 gap-y-1.5 sm:grid-cols-2">
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
        <div className="mt-5 flex flex-wrap gap-2">
          {/* ภาพเป็นตัวที่ยังไม่อยู่ในทีม และทีมยังไม่ครบ → ปุ่มหลัก = เพิ่มเข้าทีมแล้วใส่ค่าความสามารถในคลิกเดียว */}
          {quickAdd && (
            <button disabled={!canApply || progress !== null}
              onClick={() => {
                if (onAddWithStats) onAddWithStats(mismatchId!, stats, extraOut)
                else { addHero(mismatchId!); onApply(mismatchId!, stats, extraOut) }
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
      <StatsHelp open={help} onClose={() => setHelp(false)} />
      <UnitPicker open={picking} kind="hero" index={0} current={null} used={heroes} full={!canAdd} allowCustom={false}
        onPick={(id) => { if (id) addHero(id); setPicking(false) }} onClose={() => setPicking(false)} />
    </>
  )
}
