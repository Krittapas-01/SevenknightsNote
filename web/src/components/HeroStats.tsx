import { Camera, ClipboardPaste, Loader2, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { HEROES, baseName, englishOf, getUnit } from '../data/heroes'
import { readImageText } from '../lib/ocr'
import { STATS, fmtStat, hasStats, parseStats, type HeroStats, type StatKey } from '../lib/stats'
import { MAX_HEROES, type HeroNote } from '../lib/types'
import Modal from './Modal'
import UnitCard from './UnitCard'
import UnitPicker from './UnitPicker'

/** ไอคอนสเตตัสแบบในเกม (จาก 7K Atlas) */
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

/** ตารางสเตตัส 2 คอลัมน์แบบหน้าเกม (โชว์เฉพาะค่าที่มี) */
export function StatsGrid({ stats, className = '', size = 'sm' }: { stats?: HeroStats; className?: string; size?: 'sm' | 'lg' }) {
  if (!hasStats(stats)) return null
  const rows = STATS.filter((s) => stats![s.key] !== undefined)
  const lg = size === 'lg'
  return (
    <div className={`mt-2 ${className}`}>
      {/* lg = แบบหน้าข้อมูลฮีโร่ในเกม: แถวสูง ตัวใหญ่ ค่าชิดขวา */}
      <dl className={lg ? 'grid grid-flow-row-dense grid-cols-2 gap-x-2 gap-y-1' : 'grid grid-flow-row-dense grid-cols-2 gap-x-3 gap-y-1 text-[13px]'}>
        {rows.map((s) => (
          <div key={s.key} className={`${col(s.key)} ` + (lg
            ? 'flex items-center justify-between gap-2 rounded-full bg-black/35 px-3 py-1 ring-1 ring-white/5'
            : 'flex items-center justify-between gap-2 rounded-md bg-white/[.04] px-2 py-0.5')}>
            <dt className={`flex min-w-0 items-center ${lg ? 'gap-2 text-[15px] text-white/80' : 'gap-1.5 text-white/60'}`}>
              <StatIcon k={s.key} magic={stats!.magic} className={lg ? 'h-5 w-5' : 'h-4 w-4'} />
              <span className="truncate" title={s.key === 'atk' && stats!.magic ? 'โจมตีเวทย์' : s.th}>{s.key === 'atk' && stats!.magic ? 'โจมตีเวทย์' : s.th}</span>
            </dt>
            <dd className={lg ? 'text-base font-bold tabular-nums text-white' : 'font-semibold tabular-nums text-white'}>{fmtStat(s.key, stats![s.key]!)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/** ใส่สเตตัสลงโน้ตของฮีโร่ตัวนั้น (ไม่มีแถว = สร้างใหม่) */
export function upsertStats(notes: HeroNote[], hero: string, stats: HeroStats): HeroNote[] {
  const i = notes.findIndex((n) => baseName(getUnit(n.hero)?.name ?? n.hero) === baseName(getUnit(hero)?.name ?? hero))
  if (i >= 0) return notes.map((n, j) => (j === i ? { ...n, stats } : n))
  return [...notes, { hero, text: '', sets: [], rings: [], stats }].slice(0, 5)
}

/** ตัดสระบน/ล่าง/วรรณยุกต์ไทย + ช่องว่าง — OCR มักอ่านพวกนี้เพี้ยน (ซอรัน → ซอร์น) */
const thaiSkeleton = (x: string) => x.replace(/[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\s]/g, '').replace(/ช/g, 'ซ') // ช/ซ OCR สลับกันบ่อย

/** ชื่อในเกมที่ต่างจากชื่อในเว็บ (ชื่อเต็ม/สะกดต่าง) — ใช้หาฮีโร่จากภาพเท่านั้น */
const OCR_ALIASES: Record<string, string[]> = {
  'ทันจิโร่': ['คามาโดะ'],
  'เซนอิทสึ': ['อางาซึมะ', 'เซนอิทซึ', 'เซนอิท'],
}

/** ส่วนหัวของภาพ (ก่อนแถวโจมตี) — ชื่อฮีโร่อยู่ตรงนี้ ส่วนล่างของภาพมีชื่อฮีโร่ตัวอื่นในคลังปนอยู่ */
const header = (text: string) => {
  const i = text.search(/[กภ]ายภ|เวท|[พผ]ลังโจ|attack/i)
  return i > 0 ? text.slice(0, i) : text
}

/**
 * หาชื่อฮีโร่ในข้อความ (เทียบชื่ออังกฤษ/ไทย เลือกชื่อที่ยาวที่สุดที่เจอ)
 * loose = เทียบชื่อไทยแบบตัดสระ/วรรณยุกต์ (ใช้กับฮีโร่ในทีม) · ไม่ loose = ต้องตรงเป๊ะ (กันเตือนผิดตัว)
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
 * ปุ่ม "อ่านสเตตัสจากรูป": เลือกรูป / วางรูป (Ctrl+V) → อ่านตัวเลข → ตรวจทาน → ใส่ให้ฮีโร่ในทีม
 */
export function StatsImport({ team, onApply, onAddHero }: {
  team: (string | null)[]
  onApply: (hero: string, stats: HeroStats) => void
  /** เพิ่มฮีโร่เข้าทีม (ทีมยังไม่ครบ 3 ตัว) — ไม่ส่งมา = ไม่มีปุ่มเพิ่ม */
  onAddHero?: (hero: string) => void
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
  // ฮีโร่ในภาพไม่อยู่ในคอมพ์นี้ (ชื่อที่อ่านได้) / ไม่เจอชื่อฮีโร่ในทีมเลย
  const [mismatchId, setMismatchId] = useState<string | null>(null)
  const [noHero, setNoHero] = useState(false)
  // ภาพเป็นคนละตัว → กดใส่ครั้งแรก = ถามยืนยัน, ครั้งที่สอง = ใส่จริง
  const [confirming, setConfirming] = useState(false)
  const [picking, setPicking] = useState(false)
  const nameOf = (id: string) => baseName(getUnit(id)?.name ?? id)
  const mismatch = mismatchId ? nameOf(mismatchId) : null
  const canAdd = !!onAddHero && heroes.length < MAX_HEROES
  const addHero = (id: string) => {
    onAddHero?.(id)
    setHero(id)
    setMismatchId(null)
    setNoHero(false)
    setConfirming(false)
  }
  useEffect(() => setConfirming(false), [hero])

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
      // name = บรรทัดชื่อฮีโร่ที่ครอปมาอ่านแยก (แม่นกว่าอ่านจากทั้งภาพ)
      const { text, name } = await readImageText(file, setProgress)
      setRaw(name ? `ชื่อ: ${name}\n---\n${text}` : text)
      const s = parseStats(text)
      setStats(s)
      const found = detectHero([name, text], heroes)
      if (found) setHero(found)
      else {
        if (!hero && heroes[0]) setHero(heroes[0])
        // ภาพเป็นฮีโร่ตัวอื่นที่ไม่ได้อยู่ในคอมพ์ → เตือน
        // บรรทัดชื่อที่ครอปมามีแต่ชื่อ → เทียบแบบหลวมได้ · ข้อความทั้งภาพต้องตรงเป๊ะ (กันเตือนผิดตัว)
        const all = HEROES.map((h) => h.id)
        const other = detectHero([name], all) ?? detectHero([text], all, false)
        if (other) setMismatchId(other)
        else setNoHero(true)
      }
      if (!hasStats(s)) setErr('อ่านสเตตัสไม่เจอ — ใช้ภาพหน้าข้อมูลฮีโร่ในเกม (ภาษาไทยหรืออังกฤษ) หรือพิมพ์ค่าเองด้านล่าง')
    } catch (e) {
      setErr('อ่านรูปไม่สำเร็จ: ' + (e as Error).message)
    } finally {
      setProgress(null)
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
      <button type="button" onClick={() => { setOpen(true); setHero((h) => h || heroes[0]) }}
        className="mt-2 flex items-center gap-1.5 rounded-full border border-sky-300/50 px-3 py-1 text-sm text-sky-100 hover:bg-sky-400/10">
        <Camera className="h-4 w-4" /> อ่านสเตตัสจากรูป
      </button>
      <input ref={input} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) run(f); e.target.value = '' }} />

      <Modal open={open} title="อ่านสเตตัสจากรูป" onClose={() => setOpen(false)} wide>
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div>
            <button type="button" onClick={() => input.current?.click()}
              className="flex min-h-48 w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed border-white/20 bg-black/20 text-white/60 hover:border-gold hover:text-gold">
              {img ? <img src={img} alt="ภาพสเตตัส" className="max-h-80 w-full object-contain" /> : (
                <>
                  <Camera className="h-8 w-8" />
                  <span>เลือกรูปหน้าข้อมูลฮีโร่</span>
                  <span className="flex items-center gap-1 text-xs text-white/40"><ClipboardPaste className="h-3.5 w-3.5" /> หรือกด Ctrl+V วางภาพหน้าจอ</span>
                </>
              )}
            </button>
            {progress !== null && (
              <div className="mt-3">
                <div className="flex items-center gap-2 text-sm text-white/70"><Loader2 className="h-4 w-4 animate-spin" /> กำลังอ่านตัวเลข… {Math.round(progress * 100)}%</div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-gold transition-all" style={{ width: `${progress * 100}%` }} /></div>
                <p className="mt-1 text-xs text-white/40">ครั้งแรกต้องโหลดตัวอ่านประมาณ 8MB</p>
              </div>
            )}
            {err && <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-100">{err}</p>}
            {mismatch && (
              <p role="alert" className="mt-3 rounded-lg border border-red-400/50 bg-red-500/15 px-3 py-2 text-sm text-red-100">
                ⚠️ ภาพนี้เป็นสเตตัสของ <b>{mismatch}</b> ซึ่งไม่ได้อยู่ในคอมพ์นี้ — เช็กว่าใช้รูปถูกตัว ก่อนกดใส่ให้ {hero ? baseName(getUnit(hero)?.name ?? hero) : 'ฮีโร่ในทีม'}
              </p>
            )}
            {noHero && !err && (
              <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                ไม่เจอชื่อฮีโร่ในทีมนี้ในภาพ — เช็กว่าเลือกตัวถูกด้านขวาก่อนกดใส่
              </p>
            )}
          </div>

          <div>
            <label className="text-sm text-white/60">ของฮีโร่ตัวไหน</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {heroes.map((h) => (
                <button key={h} type="button" onClick={() => setHero(h)}
                  className={`flex items-center gap-2 rounded-full border py-0.5 pl-0.5 pr-3 text-sm ${hero === h ? 'border-gold bg-gold/15 text-gold' : 'border-white/15 text-white/70'}`}>
                  <span className="h-7 w-7" style={{ fontSize: 8 }}><UnitCard id={h} shape="round" /></span>
                  {baseName(getUnit(h)?.name ?? h)}
                </button>
              ))}
              {canAdd && mismatchId && (
                <button type="button" onClick={() => addHero(mismatchId)}
                  className="flex items-center gap-2 rounded-full border border-dashed border-emerald-300/60 py-0.5 pl-0.5 pr-3 text-sm text-emerald-100 hover:bg-emerald-400/10">
                  <span className="h-7 w-7" style={{ fontSize: 8 }}><UnitCard id={mismatchId} shape="round" /></span>
                  <Plus className="h-3.5 w-3.5" /> เพิ่ม {mismatch} เข้าทีม
                </button>
              )}
              {canAdd && (
                <button type="button" onClick={() => setPicking(true)}
                  className="flex items-center gap-1 rounded-full border border-dashed border-white/25 px-3 py-1 text-sm text-white/70 hover:border-gold hover:text-gold">
                  <Plus className="h-4 w-4" /> เพิ่มตัวละคร
                </button>
              )}
            </div>
            {canAdd && <p className="mt-1 text-xs text-white/40">ทีมนี้มี {heroes.length}/{MAX_HEROES} ตัว — เพิ่มตัวละครเข้าทีมได้จากตรงนี้</p>}
            <div className="mt-4 grid grid-flow-row-dense grid-cols-2 gap-x-3 gap-y-1.5">
              {STATS.map((s) => (
                <label key={s.key} className={`${col(s.key)} flex items-center justify-between gap-2 rounded-lg bg-black/20 px-2 py-1 text-sm`}>
                  <span className="flex min-w-0 items-center gap-1.5 text-white/65"><StatIcon k={s.key} magic={stats.magic} className="h-4 w-4" /><span className="truncate" title={s.key === 'atk' && stats.magic ? 'โจมตีเวทย์' : s.th}>{s.key === 'atk' && stats.magic ? 'โจมตีเวทย์' : s.th}</span></span>
                  <span className="flex items-center gap-0.5">
                    <input type="number" inputMode="decimal" value={stats[s.key] ?? ''} onChange={(e) => set(s.key, e.target.value)}
                      className="w-20 rounded-md border border-white/10 bg-black/30 px-1.5 py-0.5 text-right tabular-nums outline-none focus:border-gold" />
                    <span className="w-3 text-xs text-white/40">{s.pct ? '%' : ''}</span>
                  </span>
                </label>
              ))}
            </div>
            {raw && (
              <details className="mt-3 text-xs text-white/40">
                <summary className="cursor-pointer">ข้อความที่อ่านได้</summary>
                <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap">{raw}</pre>
              </details>
            )}
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <button disabled={!hero || !hasStats(stats) || progress !== null}
            onClick={() => {
              if (mismatch && !confirming) { setConfirming(true); return }
              onApply(hero, stats)
              setOpen(false)
            }} className={confirming
              ? 'flex-1 rounded-full border border-red-400/70 bg-red-500/25 py-2 font-semibold text-red-50 hover:bg-red-500/35'
              : 'btn-gold flex-1 py-2'}>
            {confirming
              ? `ยืนยัน: ใส่สเตตัสของ ${mismatch} ให้ ${hero ? nameOf(hero) : ''}`
              : `ใส่สเตตัสให้ ${hero ? nameOf(hero) : ''}`}
          </button>
          <button onClick={() => setOpen(false)} className="pill flex items-center gap-1 px-5 py-2"><X className="h-4 w-4" /> ยกเลิก</button>
        </div>
        <p className="mt-2 text-xs text-white/40">
          {confirming ? 'ภาพกับตัวที่เลือกไม่ตรงกัน — กดอีกครั้งเพื่อยืนยัน หรือเลือกตัวใหม่ด้านบน' : 'ตรวจตัวเลขก่อนกดใส่ · ยังไม่บันทึกจนกด "บันทึก" ของหน้านั้น'}
        </p>
      </Modal>
      <UnitPicker open={picking} kind="hero" index={0} current={null} used={heroes} full={!canAdd} allowCustom={false}
        onPick={(id) => { if (id) addHero(id); setPicking(false) }} onClose={() => setPicking(false)} />
    </>
  )
}
