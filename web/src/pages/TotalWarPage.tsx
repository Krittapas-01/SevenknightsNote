import { Clock, Target } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import RankEmblem from '../components/RankEmblem'
import './TotalWarPage.css'
import profileFrame from '../assets/totalwar-ranks/profile-frame.webp'
import ruby from '../assets/ui/ruby.webp'
import {
  TOTAL_WAR_PHASES, TOTAL_WAR_RANKS, TOTAL_WAR_ROUNDS, totalWarFights, totalWarNow, totalWarPlan, totalWarRankIndex, totalWarResult,
} from '../../../shared/game'
import { tx, L, LOCALE, EN } from '../lib/i18n'

const STORE_KEY = '7k-note:totalwar'
const fmt = (n: number) => n.toLocaleString('en-US')
const signed = (n: number) => (n > 0 ? `+${fmt(n)}` : fmt(n))
const pct = (n: number) => `${Number(n.toFixed(2))}%`
const short = (ms: number) => {
  const m = Math.max(0, Math.round(ms / 60000))
  if (m >= 1440) return `${Math.ceil(m / 1440)}D`
  if (m >= 60) return `${Math.floor(m / 60)}H ${m % 60}M`
  return `${m}M`
}
/** วันเวลาจบแบบเวลาไทย เช่น "อ. 13 ต.ค. 07:00" */
const endText = (ts: number) => new Date(ts).toLocaleString(LOCALE, { timeZone: 'Asia/Bangkok', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const STEPS = EN
  ? ['Season Prep', 'Round Prep', 'Battle Progress', 'Round Results', 'Season Results']
  : [tx('เตรียมซีซัน'), ...TOTAL_WAR_PHASES.map((p) => p.name.replace(/ \(.*\)/, '')), tx('สรุปซีซัน')]
/** ชื่อแรงค์ (ภาษาอังกฤษตามเกม) */
const RANK_EN: Record<string, string> = { normal: 'Normal', high: 'Elite', rare: 'Superb', legend: 'Legendary', god: 'Mythic' }
const rankName = (r: { key: string; name: string }) => (EN ? RANK_EN[r.key] ?? r.name : r.name)
const COUNTDOWN: Record<string, string> = { prep: tx('เวลาเริ่มการต่อสู้'), fight: tx('เวลาสิ้นสุดการต่อสู้'), result: tx('เวลาประกาศผลรอบ') }

/** นาฬิกาจับเวลา (แบบในเกม) */
function Stopwatch() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M10 2h4M12 2v3" /><circle cx="12" cy="14" r="8" />
      <line x1="12" y1="14" x2="12" y2="9" />
    </svg>
  )
}

/** ป้ายแบบในเกม: ✦ หัวข้อ ........ ค่า */
function Pill({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-full border border-white/10 bg-[var(--tw-bar)] px-4 py-1.5 ${className}`}>
      <span className="whitespace-nowrap text-sm text-white/70"><span className="text-white/50">✦</span> {label}</span>
      <span className="flex items-center gap-1 font-semibold tabular-nums">{children}</span>
    </div>
  )
}

/** สงครามเบ็ดเสร็จ — หน้าตาแบบหน้าในเกม: แถบเฟส · เวทีตราแรงค์ · แถบล่าง (รอบ/แรงค์/คะแนน/อัตราชนะ) */
export default function TotalWarPage() {
  const [score, setScore] = useState(() => { try { return localStorage.getItem(STORE_KEY) ?? '' } catch { return '' } })
  const [rate, setRate] = useState('')
  const [target, setTarget] = useState(3)
  const [now, setNow] = useState(Date.now())
  useEffect(() => { try { localStorage.setItem(STORE_KEY, score) } catch { /* ไม่มี storage ก็ไม่เป็นไร */ } }, [score])
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t) }, [])

  const tw = totalWarNow(now)
  const s = score === '' ? 0 : Math.max(0, Math.floor(Number(score)) || 0)
  const rankIndex = totalWarRankIndex(s)
  const rank = TOTAL_WAR_RANKS[rankIndex]
  const nextRank = TOTAL_WAR_RANKS[rankIndex + 1]
  const fights = totalWarFights(rank.teams)
  const r = rate === '' ? NaN : Number(rate)
  const validRate = Number.isFinite(r) && r >= 0 && r <= 100
  const w = validRate ? Math.round((r / 100) * fights) : NaN
  const res = validRate ? totalWarResult(s, w) : null
  const shown = res ? res.next : s
  const shownRank = totalWarRankIndex(shown)
  const progress = nextRank ? Math.min(1, (s - rank.min) / (nextRank.min - rank.min)) : 1
  const progressAfter = res && nextRank && !res.promoted ? Math.min(1, Math.max(0, (res.next - rank.min) / (nextRank.min - rank.min))) : res?.promoted ? 1 : progress
  const step = tw.state === 'before' ? 0 : tw.state === 'ended' ? 4 : 1 + TOTAL_WAR_PHASES.findIndex((p) => p.key === tw.phase.key)
  const goal = TOTAL_WAR_RANKS[target]
  const plan = totalWarPlan(s, goal.min, tw.resultsLeft)

  return (
    <div className="total-war-page mx-auto max-w-5xl">
      <header className="tw-heading">
        <span className="tw-eyebrow">SEVEN KNIGHTS · TOTAL WAR</span>
        <h1 className="text-3xl font-extrabold sm:text-4xl">{L('สงคราม', 'Total ')}<span className="text-gold">{L('เบ็ดเสร็จ', 'War')}</span></h1>
        <p>{tx('ติดตามอันดับ วางแผนคะแนน และเช็กเป้าหมายของซีซัน')}</p>
      </header>

      {/* ===== หน้าหลักแบบในเกม ===== */}
      <section className="tw-arena panel panel-gold relative mt-5 overflow-hidden rounded-3xl p-3 sm:p-5">
        {/* นับถอยหลังเฟส */}
        <div className="tw-countdown-row flex justify-center">
          <span className="tw-countdown rounded-full border px-4 py-1.5 text-sm">
            <span className="tw-countdown-spark" aria-hidden="true">✦</span>
            <span className="tw-countdown-label">{tw.state === 'running' ? COUNTDOWN[tw.phase.key] : tw.state === 'before' ? tx('ซีซันเริ่มใน') : tx('สรุปซีซัน')}</span>
            {tw.state !== 'ended' && <span className="tw-countdown-time"><Stopwatch /><b className="tabular-nums">{short(tw.state === 'running' ? tw.phaseLeft : tw.startsIn)}</b></span>}
          </span>
        </div>
        {/* แถบเฟส (แบบในเกม: ปลายแหลม + เพชร) */}
        <div className="tw-phase-scroll scrollbar-thin mt-4 overflow-x-auto">
          <div className="tw-phase-frame relative mx-auto w-max sm:w-full">
            <span className="tw-phase-gem tw-phase-gem-l" aria-hidden="true" />
            <span className="tw-phase-gem tw-phase-gem-r" aria-hidden="true" />
            <div className="tw-phase-track flex">
              {STEPS.map((name, i) => (
                <div key={name} aria-current={i === step ? 'step' : undefined}
                  className={`tw-phase relative flex-1 px-5 py-2 text-xs font-semibold sm:px-3 sm:text-base ${i === step ? 'tw-phase-active' : ''} ${i === 0 ? 'tw-phase-first' : ''} ${i === STEPS.length - 1 ? 'tw-phase-last' : ''} ${i !== step && (i === 0 || i === STEPS.length - 1) ? 'tw-phase-dim' : ''}`}>
                  {name}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* เวที: ตราแรงค์ + คะแนน บนพื้นแสง */}
        <div className="tw-stage relative mt-4 flex h-56 flex-col items-center justify-center overflow-hidden rounded-2xl sm:h-72">
          <RankEmblem rank={shownRank} size={110} glow />
          <div className="mt-1 text-sm font-semibold tracking-widest text-white/85">{rankName(TOTAL_WAR_RANKS[shownRank])}</div>
          <div className="mt-1 flex items-baseline gap-2 tabular-nums drop-shadow">
            {res ? (<>
              <span className="text-lg text-white/60">{fmt(s)}</span>
              <span className={`text-xl font-bold ${res.change > 0 ? 'text-emerald-300' : res.change < 0 ? 'text-red-300' : 'text-white/70'}`}>{signed(res.change)}</span>
              <span className="text-3xl font-bold text-gold sm:text-4xl">{fmt(res.next)}</span>
            </>) : <span className="text-3xl font-bold text-gold sm:text-4xl">{fmt(s)}</span>}
          </div>
          {res?.promoted && <div className="mt-2 rounded-full bg-black/40 px-3 py-0.5 text-sm text-emerald-200">{L(`🎉 ขึ้น${res.promoted.name}`, `🎉 Promoted to ${rankName(res.promoted)}`)}</div>}
        </div>

        {/* แถบล่างแบบในเกม */}
        <div className="tw-dashboard mt-4 grid gap-2 sm:grid-cols-[1fr_auto_1.3fr_1fr] sm:items-center sm:gap-3">
          <div className="grid gap-2">
            <Pill className="tw-stat-pill" label={tx('รอบ')}>{tw.state === 'running' ? tw.round : tw.state === 'ended' ? TOTAL_WAR_ROUNDS : 0}/{TOTAL_WAR_ROUNDS}</Pill>
            <Pill className="tw-stat-pill" label={tx('สิ้นสุดซีซัน')}><Clock className="h-4 w-4" />{tw.state === 'running' ? short(tw.seasonEnd - now) : '–'}</Pill>
            {tw.state !== 'before' && <p className="px-4 text-right text-xs text-white/55">{tw.state === 'running' ? tx('จบ') : tx('จบแล้ว')} {endText(tw.state === 'running' ? tw.seasonEnd : tw.endedAt)}{' '}{tx('น.')}</p>}
          </div>
          <div className="hidden flex-col items-center sm:flex">
            <RankEmblem rank={rankIndex} size={52} />
            <span className="mt-0.5 text-sm font-semibold text-white/80">{rankName(rank)}</span>
          </div>
          <div className="grid gap-2">
            {/* แถบความคืบหน้า แรงค์นี้ → แรงค์ถัดไป */}
            <div className="flex items-center gap-1.5">
              <RankEmblem rank={rankIndex} size={26} />
              <div className="relative h-3 flex-1 overflow-hidden rounded-full border border-white/15 bg-black/50">
                <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-300 to-amber-100" style={{ width: `${progress * 100}%` }} />
                {res && <div className={`absolute inset-y-0 ${res.change >= 0 ? 'bg-emerald-300/70' : 'bg-red-400/70'}`}
                  style={{ left: `${Math.min(progress, progressAfter) * 100}%`, width: `${Math.abs(progressAfter - progress) * 100}%` }} />}
              </div>
              <RankEmblem rank={Math.min(rankIndex + 1, 4)} size={26} />
            </div>
            <Pill className="tw-stat-pill" label={tx('คะแนนปัจจุบัน')}>
              <input type="number" inputMode="numeric" min={0} value={score} onChange={(e) => setScore(e.target.value)} placeholder="0"
                className="tw-number-input [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none w-20 bg-transparent text-right outline-none" />
            </Pill>
          </div>
          <div className="tw-win-card rounded-2xl border p-2">
            <div className="text-center text-xs font-semibold">{tx('อัตราชนะรอบนี้')}</div>
            <div className="flex items-baseline justify-center">
              <input type="number" inputMode="decimal" min={0} max={100} step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="52.5"
                className="tw-number-input [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none w-20 bg-transparent text-center text-2xl font-bold outline-none placeholder:text-gold/40" />
              <span className="font-bold">%</span>
            </div>
            <div className="text-center text-[11px] opacity-75">{validRate ? L(`ชนะ ${w}/${fights}`, `Win ${w}/${fights}`) : L(`${rank.teams} ทีม · สู้ ${fights}`, `${rank.teams} teams · ${fights} fights`)}</div>
          </div>
        </div>
        {res && (
          <div className="mt-2 flex justify-center">
            <button type="button" onClick={() => { setScore(String(res.next)); setRate('') }} className="rounded-full border border-white/15 bg-black/40 px-4 py-1 text-sm text-white/80 hover:border-gold hover:text-gold">
              {tx('ใช้')}{' '}{fmt(res.next)}{' '}{tx('คิดรอบต่อไป')}
            </button>
          </div>
        )}
      </section>

      {/* ===== เป้าหมาย + รางวัล แบบการ์ดในเกม ===== */}
      <section className="mt-5 grid gap-4 md:grid-cols-[1fr_1.4fr]">
        <div className="tw-goal panel panel-gold rounded-3xl p-4 sm:p-5">
          <div className="flex items-center gap-2 font-semibold text-gold"><Target className="h-5 w-5" />{' '}{tx('จะทันไหม')}</div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {TOTAL_WAR_RANKS.map((k, i) => i > 0 && (
              <button key={k.key} type="button" onClick={() => setTarget(i)}
                className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm ${i === target ? 'border-gold bg-gold/15 text-gold' : 'border-white/10 text-white/60'}`}>
                <RankEmblem rank={i} size={16} /> {rankName(k)}
              </button>
            ))}
          </div>
          <div className="mt-4 text-center">
            {plan?.done ? <div className="text-lg text-emerald-200">{L(`ถึง${goal.name}แล้ว 🎉`, `Reached ${rankName(goal)} 🎉`)}</div>
              : plan ? (<>
                <div className="text-sm text-white/55">{tx('อีก')}{' '}{tw.resultsLeft}{' '}{tx('รอบ · ขาด')}{' '}{fmt(goal.min - s)}</div>
                <div className="mt-1 text-4xl font-bold text-gold">{pct((plan.wins / plan.fights) * 100)}</div>
                <div className="text-sm text-white/55">{tx('ชนะต่อรอบขั้นต่ำ')}</div>
              </>) : <div className="text-red-200">{L(`ไม่ทัน${goal.name}แล้ว`, `Can't reach ${rankName(goal)} anymore`)}</div>}
          </div>
        </div>

        <div className="tw-rewards panel panel-gold rounded-3xl p-3 sm:p-5">
          <div className="tw-rewards-heading text-center font-semibold">{tx('รางวัลระดับ')}</div>
          <ul className="mt-2 grid gap-1.5">
            {[...TOTAL_WAR_RANKS].reverse().map((k) => {
              const i = TOTAL_WAR_RANKS.indexOf(k)
              return (
                <li key={k.key} className={`tw-reward-row flex items-center gap-3 rounded-2xl border px-3 py-1.5 ${i === rankIndex ? 'tw-reward-current' : ''}`}>
                  <RankEmblem rank={i} size={34} />
                  <div className="flex-1 leading-tight">
                    <div className="font-semibold">{rankName(k)}</div>
                    <div className="text-xs text-[#6b5a6a]">{fmt(k.min)}{' '}{tx('คะแนน ·')}{' '}{k.teams}{' '}{tx('ทีม · 1% = +')}{8 * k.teams}</div>
                  </div>
                  {k.key === 'god' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#cbb8ff]/50 bg-gradient-to-r from-[#342858] to-[#514078] py-1 pl-1 pr-2 text-xs font-semibold text-[#fff] shadow-[0_0_12px_rgba(169,138,255,.2)]">
                      <img src={profileFrame} alt={tx('กรอบโปรไฟล์รางวัลแรงค์เทพเจ้า')} draggable={false} className="h-9 w-9 object-contain drop-shadow-[0_0_5px_rgba(198,166,255,.65)]" />
                      {L(k.reward, 'Profile Frame')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-[#3a3346] py-1 pl-1 pr-2 text-xs font-semibold text-[#fff]">
                      {k.reward.startsWith('รูบี้') ? <><img src={ruby} alt={tx('รูบี้')} title={tx('รูบี้')} draggable={false} className="h-5 w-5 object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,.5)]" />{k.reward.replace('รูบี้', '').trim()}</> : (k.reward || '–')}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </section>
    </div>
  )
}
