import { Camera, ClipboardPaste, Loader2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { baseName, englishOf, getUnit } from '../data/heroes'
import { readImageText } from '../lib/ocr'
import { STATS, fmtStat, hasStats, parseStats, type HeroStats, type StatKey } from '../lib/stats'
import type { HeroNote } from '../lib/types'
import Modal from './Modal'
import UnitCard from './UnitCard'

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

/** ตารางสเตตัส 2 คอลัมน์แบบหน้าเกม (โชว์เฉพาะค่าที่มี) */
export function StatsGrid({ stats, className = '', size = 'sm' }: { stats?: HeroStats; className?: string; size?: 'sm' | 'lg' }) {
  if (!hasStats(stats)) return null
  const rows = STATS.filter((s) => stats![s.key] !== undefined)
  const lg = size === 'lg'
  return (
    <div className={`mt-2 ${className}`}>
      {/* lg = แบบหน้าข้อมูลฮีโร่ในเกม: แถวสูง ตัวใหญ่ ค่าชิดขวา */}
      <dl className={lg ? 'grid grid-cols-2 gap-x-2 gap-y-1' : 'grid grid-cols-2 gap-x-3 gap-y-1 text-[13px]'}>
        {rows.map((s) => (
          <div key={s.key} className={lg
            ? 'flex items-center justify-between gap-2 rounded-full bg-black/35 px-3 py-1 ring-1 ring-white/5'
            : 'flex items-center justify-between gap-2 rounded-md bg-white/[.04] px-2 py-0.5'}>
            <dt className={`flex min-w-0 items-center ${lg ? 'gap-2 text-[15px] text-white/80' : 'gap-1.5 text-white/60'}`}>
              <StatIcon k={s.key} magic={stats!.magic} className={lg ? 'h-5 w-5' : 'h-4 w-4'} />
              <span className="truncate">{s.key === 'atk' && stats!.magic ? 'โจมตีเวทย์' : s.th}</span>
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

/** หาชื่อฮีโร่ในข้อความ (เทียบชื่ออังกฤษ เลือกชื่อที่ยาวที่สุดที่เจอ) */
function detectHero(text: string, team: string[]) {
  const t = text.toLowerCase()
  let best: { id: string; len: number } | null = null
  for (const id of team) {
    const en = englishOf(id)?.toLowerCase()
    if (en && new RegExp(`\\b${en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(t) && (!best || en.length > best.len)) best = { id, len: en.length }
  }
  return best?.id ?? null
}

/**
 * ปุ่ม "อ่านสเตตัสจากรูป": เลือกรูป / วางรูป (Ctrl+V) → อ่านตัวเลข → ตรวจทาน → ใส่ให้ฮีโร่ในทีม
 */
export function StatsImport({ team, onApply }: { team: (string | null)[]; onApply: (hero: string, stats: HeroStats) => void }) {
  const heroes = team.filter((h): h is string => !!h)
  const input = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [img, setImg] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [hero, setHero] = useState<string>('')
  const [stats, setStats] = useState<HeroStats>({})
  const [raw, setRaw] = useState('')

  async function run(file: Blob) {
    setOpen(true)
    setErr(null)
    setStats({})
    setRaw('')
    setImg((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(file) })
    setProgress(0)
    try {
      const text = await readImageText(file, setProgress)
      setRaw(text)
      const s = parseStats(text)
      setStats(s)
      const found = detectHero(text, heroes)
      if (found) setHero(found)
      else if (!hero && heroes[0]) setHero(heroes[0])
      if (!hasStats(s)) setErr('อ่านสเตตัสไม่เจอ — ใช้ภาพหน้าข้อมูลฮีโร่ในเกม (ภาษาอังกฤษ) หรือพิมพ์ค่าเองด้านล่าง')
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

  if (!heroes.length) return null
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
                <p className="mt-1 text-xs text-white/40">ครั้งแรกต้องโหลดตัวอ่านประมาณ 7MB</p>
              </div>
            )}
            {err && <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-100">{err}</p>}
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
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5">
              {STATS.map((s) => (
                <label key={s.key} className="flex items-center justify-between gap-2 rounded-lg bg-black/20 px-2 py-1 text-sm">
                  <span className="flex min-w-0 items-center gap-1.5 text-white/65"><StatIcon k={s.key} magic={stats.magic} className="h-4 w-4" /><span className="truncate">{s.key === 'atk' && stats.magic ? 'โจมตีเวทย์' : s.th}</span></span>
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
          <button disabled={!hero || !hasStats(stats) || progress !== null} onClick={() => { onApply(hero, stats); setOpen(false) }} className="btn-gold flex-1 py-2">
            ใส่สเตตัสให้ {hero ? baseName(getUnit(hero)?.name ?? hero) : ''}
          </button>
          <button onClick={() => setOpen(false)} className="pill flex items-center gap-1 px-5 py-2"><X className="h-4 w-4" /> ยกเลิก</button>
        </div>
        <p className="mt-2 text-xs text-white/40">ตรวจตัวเลขก่อนกดใส่ · ยังไม่บันทึกจนกด "บันทึก" ของหน้านั้น</p>
      </Modal>
    </>
  )
}
