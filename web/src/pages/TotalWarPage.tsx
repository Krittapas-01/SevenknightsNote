import { Clock, Target } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import RankEmblem from '../components/RankEmblem'
import './TotalWarPage.css'
import profileFrame from '../assets/totalwar-ranks/profile-frame.webp'
import {
  TOTAL_WAR_PHASES, TOTAL_WAR_RANKS, TOTAL_WAR_ROUNDS, totalWarFights, totalWarNow, totalWarPlan, totalWarRankIndex, totalWarResult,
} from '../../../shared/game'

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
const STEPS = ['เตรียมซีซัน', ...TOTAL_WAR_PHASES.map((p) => p.name.replace(/ \(.*\)/, '')), 'สรุปซีซัน']
const COUNTDOWN: Record<string, string> = { prep: 'เวลาเริ่มการต่อสู้', fight: 'เวลาสิ้นสุดการต่อสู้', result: 'เวลาประกาศผลรอบ' }

/** ป้ายแบบในเกม: ✦ หัวข้อ ........ ค่า */
function Pill({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-full border border-white/10 bg-[#1a1530]/80 px-4 py-1.5 ${className}`}>
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
        <h1 className="text-3xl font-extrabold sm:text-4xl">สงคราม<span className="text-gold">เบ็ดเสร็จ</span></h1>
        <p>ติดตามอันดับ วางแผนคะแนน และเช็กเป้าหมายของซีซัน</p>
      </header>

      {/* ===== หน้าหลักแบบในเกม ===== */}
      <section className="tw-arena panel panel-gold relative mt-5 overflow-hidden rounded-3xl p-3 sm:p-5">
        {/* นับถอยหลังเฟส */}
        <div className="tw-countdown-row flex justify-center">
          <span className="tw-countdown rounded-full border px-4 py-1.5 text-sm">
            <span className="tw-countdown-spark" aria-hidden="true">✦</span>
            <span className="tw-countdown-label">{tw.state === 'running' ? COUNTDOWN[tw.phase.key] : tw.state === 'before' ? 'ซีซันเริ่มใน' : 'สรุปซีซัน'}</span>
            {tw.state !== 'ended' && <span className="tw-countdown-time"><Clock aria-hidden="true" className="h-4 w-4" /><b className="tabular-nums">{short(tw.state === 'running' ? tw.phaseLeft : tw.startsIn)}</b></span>}
          </span>
        </div>
        {/* แถบเฟส */}
        <div className="tw-phase-scroll scrollbar-thin mt-4 overflow-x-auto">
          <div className="tw-phase-track mx-auto flex w-max rounded-xl sm:w-full">
            {STEPS.map((name, i) => (
              <div key={name} aria-current={i === step ? 'step' : undefined}
                className={`tw-phase -ml-2.5 flex-1 px-5 py-2 text-xs font-semibold first:ml-0 sm:px-3 sm:text-base ${i === step ? 'tw-phase-active' : ''} ${i === 0 ? 'tw-phase-first' : ''}`}>
                {name}
              </div>
            ))}
          </div>
        </div>

        {/* เวที: ตราแรงค์ + คะแนน บนพื้นแสง */}
        <div className="tw-stage relative mt-4 flex h-56 flex-col items-center justify-center overflow-hidden rounded-2xl sm:h-72">
          <RankEmblem rank={shownRank} size={110} glow />
          <div className="mt-1 text-sm font-semibold tracking-widest text-white/85">{TOTAL_WAR_RANKS[shownRank].name}</div>
          <div className="mt-1 flex items-baseline gap-2 tabular-nums drop-shadow">
            {res ? (<>
              <span className="text-lg text-white/60">{fmt(s)}</span>
              <span className={`text-xl font-bold ${res.change > 0 ? 'text-emerald-300' : res.change < 0 ? 'text-red-300' : 'text-white/70'}`}>{signed(res.change)}</span>
              <span className="text-3xl font-bold text-gold sm:text-4xl">{fmt(res.next)}</span>
            </>) : <span className="text-3xl font-bold text-gold sm:text-4xl">{fmt(s)}</span>}
          </div>
          {res?.promoted && <div className="mt-2 rounded-full bg-black/40 px-3 py-0.5 text-sm text-emerald-200">🎉 ขึ้น{res.promoted.name}</div>}
        </div>

        {/* แถบล่างแบบในเกม */}
        <div className="tw-dashboard mt-4 grid gap-2 sm:grid-cols-[1fr_auto_1.3fr_1fr] sm:items-center sm:gap-3">
          <div className="grid gap-2">
            <Pill className="tw-stat-pill" label="รอบ">{tw.state === 'running' ? tw.round : tw.state === 'ended' ? TOTAL_WAR_ROUNDS : 0}/{TOTAL_WAR_ROUNDS}</Pill>
            <Pill className="tw-stat-pill" label="สิ้นสุดซีซัน"><Clock className="h-4 w-4" />{tw.state === 'running' ? short(tw.seasonEnd - now) : '–'}</Pill>
          </div>
          <div className="hidden flex-col items-center sm:flex">
            <RankEmblem rank={rankIndex} size={52} />
            <span className="mt-0.5 text-sm font-semibold text-white/80">{rank.name}</span>
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
            <Pill className="tw-stat-pill" label="คะแนนปัจจุบัน">
              <input type="number" inputMode="numeric" min={0} value={score} onChange={(e) => setScore(e.target.value)} placeholder="0"
                className="tw-number-input [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none w-20 bg-transparent text-right outline-none" />
            </Pill>
          </div>
          <div className="tw-win-card rounded-2xl border p-2">
            <div className="text-center text-xs font-semibold">อัตราชนะรอบนี้</div>
            <div className="flex items-baseline justify-center">
              <input type="number" inputMode="decimal" min={0} max={100} step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="52.5"
                className="tw-number-input [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none w-20 bg-transparent text-center text-2xl font-bold outline-none placeholder:text-gold/40" />
              <span className="font-bold">%</span>
            </div>
            <div className="text-center text-[11px] opacity-75">{validRate ? `ชนะ ${w}/${fights}` : `${rank.teams} ทีม · สู้ ${fights}`}</div>
          </div>
        </div>
        {res && (
          <div className="mt-2 flex justify-center">
            <button type="button" onClick={() => { setScore(String(res.next)); setRate('') }} className="rounded-full border border-white/15 bg-black/40 px-4 py-1 text-sm text-white/80 hover:border-gold hover:text-gold">
              ใช้ {fmt(res.next)} คิดรอบต่อไป
            </button>
          </div>
        )}
      </section>

      {/* ===== เป้าหมาย + รางวัล แบบการ์ดในเกม ===== */}
      <section className="mt-5 grid gap-4 md:grid-cols-[1fr_1.4fr]">
        <div className="tw-goal panel panel-gold rounded-3xl p-4 sm:p-5">
          <div className="flex items-center gap-2 font-semibold text-gold"><Target className="h-5 w-5" /> จะทันไหม</div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {TOTAL_WAR_RANKS.map((k, i) => i > 0 && (
              <button key={k.key} type="button" onClick={() => setTarget(i)}
                className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm ${i === target ? 'border-gold bg-gold/15 text-gold' : 'border-white/10 text-white/60'}`}>
                <RankEmblem rank={i} size={16} /> {k.name}
              </button>
            ))}
          </div>
          <div className="mt-4 text-center">
            {plan?.done ? <div className="text-lg text-emerald-200">ถึง{goal.name}แล้ว 🎉</div>
              : plan ? (<>
                <div className="text-sm text-white/55">อีก {tw.resultsLeft} รอบ · ขาด {fmt(goal.min - s)}</div>
                <div className="mt-1 text-4xl font-bold text-gold">{pct((plan.wins / plan.fights) * 100)}</div>
                <div className="text-sm text-white/55">ชนะต่อรอบขั้นต่ำ</div>
              </>) : <div className="text-red-200">ไม่ทัน{goal.name}แล้ว</div>}
          </div>
        </div>

        <div className="tw-rewards panel panel-gold rounded-3xl p-3 sm:p-5">
          <div className="tw-rewards-heading text-center font-semibold">รางวัลระดับ</div>
          <ul className="mt-2 grid gap-1.5">
            {[...TOTAL_WAR_RANKS].reverse().map((k) => {
              const i = TOTAL_WAR_RANKS.indexOf(k)
              return (
                <li key={k.key} className={`tw-reward-row flex items-center gap-3 rounded-2xl border px-3 py-1.5 ${i === rankIndex ? 'tw-reward-current' : ''}`}>
                  <RankEmblem rank={i} size={34} />
                  <div className="flex-1 leading-tight">
                    <div className="font-semibold">{k.name}</div>
                    <div className="text-xs text-[#6b5a6a]">{fmt(k.min)} คะแนน · {k.teams} ทีม · 1% = +{8 * k.teams}</div>
                  </div>
                  {k.key === 'god' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#cbb8ff]/50 bg-gradient-to-r from-[#342858] to-[#514078] py-1 pl-1 pr-2 text-xs font-semibold text-white shadow-[0_0_12px_rgba(169,138,255,.2)]">
                      <img src={profileFrame} alt="กรอบโปรไฟล์รางวัลแรงค์เทพเจ้า" draggable={false} className="h-9 w-9 object-contain drop-shadow-[0_0_5px_rgba(198,166,255,.65)]" />
                      {k.reward}
                    </span>
                  ) : (
                    <span className="rounded-lg bg-[#3a3346] px-2 py-1 text-xs font-semibold text-white">{k.reward || '–'}</span>
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
