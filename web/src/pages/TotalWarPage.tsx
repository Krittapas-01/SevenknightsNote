import { ArrowRight, CalendarClock, RotateCcw, Shield, Target } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  TOTAL_WAR_RANKS, TOTAL_WAR_ROUNDS, totalWarFights, totalWarNow, totalWarPlan, totalWarRankIndex, totalWarResult,
} from '../../../shared/game'

const STORE_KEY = '7k-note:totalwar'
const RANK_CLS = [
  'text-orange-200 border-orange-300/40 bg-orange-400/10', // ทั่วไป
  'text-emerald-200 border-emerald-300/40 bg-emerald-400/10', // ระดับสูง
  'text-rose-200 border-rose-300/40 bg-rose-400/10', // หายาก
  'text-amber-200 border-amber-300/40 bg-amber-400/10', // ตำนาน
  'text-violet-200 border-violet-300/40 bg-violet-400/10', // เทพเจ้า
]
const fmt = (n: number) => n.toLocaleString('en-US')
const signed = (n: number) => (n > 0 ? `+${fmt(n)}` : fmt(n))
const pct = (n: number) => `${Number(n.toFixed(2))}%`
const left = (ms: number) => {
  const m = Math.max(0, Math.round(ms / 60000))
  const d = Math.floor(m / 1440)
  const h = Math.floor((m % 1440) / 60)
  return d ? `${d} วัน ${h} ชม.` : h ? `${h} ชม. ${m % 60} นาที` : `${m} นาที`
}
const when = (ts: number) => new Date(ts).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const input = 'mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-lg tabular-nums'

/** สงครามเบ็ดเสร็จ: รอบ/เฟสตอนนี้ · คิดคะแนนรอบนี้ · ต้องชนะเท่าไหร่ถึงทันแรงค์เป้าหมาย */
export default function TotalWarPage() {
  const [score, setScore] = useState(() => { try { return localStorage.getItem(STORE_KEY) ?? '' } catch { return '' } })
  const [wins, setWins] = useState('')
  const [target, setTarget] = useState(3) // ตำนาน (รูบี้)
  const [roundsEdit, setRoundsEdit] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  useEffect(() => { try { localStorage.setItem(STORE_KEY, score) } catch { /* ไม่มี storage ก็ไม่เป็นไร */ } }, [score])
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t) }, [])

  const tw = totalWarNow(now)
  const s = score === '' ? NaN : Math.max(0, Math.floor(Number(score)))
  const validScore = Number.isFinite(s)
  const rankIndex = validScore ? totalWarRankIndex(s) : 0
  const rank = TOTAL_WAR_RANKS[rankIndex]
  const fights = totalWarFights(rank.teams)
  const w = wins === '' ? NaN : Math.floor(Number(wins))
  const validWins = Number.isFinite(w) && w >= 0 && w <= fights
  const res = validScore && validWins ? totalWarResult(s, w) : null
  const roundsLeft = roundsEdit !== null && roundsEdit !== '' ? Math.max(0, Math.min(TOTAL_WAR_ROUNDS, Math.floor(Number(roundsEdit)))) : tw.resultsLeft
  const goal = TOTAL_WAR_RANKS[target]
  const plan = validScore ? totalWarPlan(s, goal.min, roundsLeft) : undefined
  const half = fights / 2

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold sm:text-4xl">คำนวณแต้ม<span className="text-gold">เบ็ดเสร็จ</span></h1>
      <p className="mt-2 text-white/65">คิดคะแนนรอบนี้ และดูว่าต้องชนะเท่าไหร่ถึงจะทันแรงค์ที่อยากได้ · ซีซันละ {TOTAL_WAR_ROUNDS} รอบ</p>

      {/* รอบ/เฟสตอนนี้ (นับจากวันเริ่มซีซันใน shared/game.ts) */}
      <section className="panel mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 p-4 text-sm">
        <CalendarClock className="h-5 w-5 text-gold" />
        {tw.state === 'running' && (<>
          <span className="text-base font-semibold">รอบ {tw.round}/{TOTAL_WAR_ROUNDS}</span>
          <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-gold">{tw.phase.name}</span>
          <span className="text-white/60">อีก {left(tw.phaseLeft)}</span>
          <span className="text-white/45 sm:ml-auto">จบซีซัน {when(tw.seasonEnd)}</span>
        </>)}
        {tw.state === 'before' && <span>ซีซันใหม่เริ่มในอีก {left(tw.startsIn)}</span>}
        {tw.state === 'ended' && <span>จบ {TOTAL_WAR_ROUNDS} รอบแล้ว (สรุปซีซัน) · รอซีซันใหม่หลังแพทช์</span>}
      </section>

      <section className="panel mt-5 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-gold">คะแนนปัจจุบัน</span>
            <input type="number" inputMode="numeric" min={0} value={score} onChange={(e) => setScore(e.target.value)} placeholder="เช่น 3780" className={input} />
            <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-semibold ${RANK_CLS[rankIndex]}`}>
              <Shield className="h-3.5 w-3.5" /> {rank.name} · {rank.teams} ทีม · สู้ {fights} ครั้ง
            </span>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gold">ชนะรอบนี้ (รวมทุกทีม)</span>
            <span className="mt-1 flex items-center gap-2">
              <input type="number" inputMode="numeric" min={0} max={fights} value={wins} onChange={(e) => setWins(e.target.value)} placeholder={`เช่น ${half + 2}`} className={`${input} mt-0`} />
              <span className="shrink-0 text-white/60">/ {fights}</span>
            </span>
            <span className="mt-2 block text-sm text-white/55">
              {validWins ? <>อัตราชนะ <b className="text-white/85">{pct((w / fights) * 100)}</b></> : wins !== '' ? <span className="text-red-300">ใส่ 0–{fights}</span> : `ทีมละ 20 ครั้ง · ชนะเกินครึ่ง (${half}) 1 ครั้ง = +40`}
            </span>
          </label>
        </div>

        {res && (
          <div className="mt-5 rounded-2xl bg-black/25 p-4">
            <div className="flex flex-wrap items-center justify-center gap-3 text-2xl font-bold tabular-nums sm:text-3xl">
              <span className="text-white/70">{fmt(s)}</span>
              <span className={res.change > 0 ? 'text-emerald-300' : res.change < 0 ? 'text-red-300' : 'text-white/60'}>{signed(res.change)}</span>
              <ArrowRight className="h-6 w-6 text-white/40" />
              <span className="text-gold">{fmt(res.next)}</span>
            </div>
            <p className="mt-2 text-center text-sm text-white/55">
              (({pct(res.rate)} − 50) ÷ 5) × {res.rank.teams} ทีม × 40 = ({w} − {half}) × 40 = <b className="text-white/80">{signed(res.raw)}</b>
            </p>
            {res.promoted && (
              <p className="mt-3 rounded-lg bg-emerald-400/10 px-3 py-2 text-center text-sm text-emerald-100">
                🎉 เลื่อนขั้นเป็น <b>{res.promoted.name}</b> · คะแนนหยุดที่ {fmt(res.promoted.min)} (ได้จริง {signed(res.change)} จาก {signed(res.raw)}) · รอบหน้าใช้ {res.promoted.teams} ทีม
              </p>
            )}
            {!res.promoted && res.capped && (
              <p className="mt-3 rounded-lg bg-amber-400/10 px-3 py-2 text-center text-sm text-amber-100">
                ไม่ตกต่ำกว่า {fmt(res.rank.min)} (เกณฑ์แรงค์{res.rank.name}) · เสียจริง {signed(res.change)} จาก {signed(res.raw)}
              </p>
            )}
            <button type="button" onClick={() => { setScore(String(res.next)); setWins('') }} className="pill mx-auto mt-4 flex items-center gap-1.5 px-4 py-1.5 text-sm">
              <RotateCcw className="h-4 w-4" /> ใช้ {fmt(res.next)} เป็นคะแนนปัจจุบัน (คิดรอบต่อไป)
            </button>
          </div>
        )}

        {validScore && (
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer text-white/60">ตาราง: ชนะเท่าไหร่ ได้เท่าไหร่ (แรงค์{rank.name})</summary>
            <table className="mt-2 w-full text-center tabular-nums">
              <thead className="text-white/45"><tr><th className="py-1">ชนะ</th><th>อัตราชนะ</th><th>คะแนน</th><th>เป็น</th></tr></thead>
              <tbody>
                {[-4, -2, 0, 1, 2, 3, 4, 5, 6, 8, 10].map((d) => half + d).filter((x) => x >= 0 && x <= fights).map((x) => {
                  const r = totalWarResult(s, x)
                  return (
                    <tr key={x} className={`border-t border-white/5 ${x === w ? 'bg-gold/10' : ''}`}>
                      <td className="py-1">{x}/{fights}</td><td>{pct(r.rate)}</td>
                      <td className={r.change > 0 ? 'text-emerald-300' : r.change < 0 ? 'text-red-300' : 'text-white/50'}>{signed(r.change)}</td>
                      <td>{fmt(r.next)}{r.promoted ? ` · ${r.promoted.name}` : ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </details>
        )}
      </section>

      {/* วางแผน: ต้องชนะเฉลี่ยเท่าไหร่ถึงทันแรงค์เป้าหมาย */}
      <section className="panel mt-5 p-4 sm:p-5">
        <h2 className="flex items-center gap-2 font-semibold text-gold"><Target className="h-5 w-5" /> จะทันแรงค์ไหม</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-white/60">แรงค์เป้าหมาย</span>
            <select value={target} onChange={(e) => setTarget(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2">
              {TOTAL_WAR_RANKS.map((k, i) => i > 0 && <option key={k.key} value={i}>{k.name} ({fmt(k.min)}){k.reward ? ` · ${k.reward}` : ''}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-white/60">รอบที่ยังไม่ได้คิดคะแนน</span>
            <input type="number" inputMode="numeric" min={0} max={TOTAL_WAR_ROUNDS} value={roundsEdit ?? String(tw.resultsLeft)}
              onChange={(e) => setRoundsEdit(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 tabular-nums" />
            <span className="mt-1 block text-xs text-white/40">นับจากรอบตอนนี้ให้เอง · แก้ได้ถ้าไม่ตรง</span>
          </label>
        </div>
        <div className="mt-4 rounded-2xl bg-black/25 p-4 text-center">
          {!validScore && <p className="text-white/50">ใส่คะแนนปัจจุบันด้านบนก่อน</p>}
          {plan?.done && <p className="text-emerald-200">ถึง{goal.name}แล้ว 🎉 ตกกลับไม่ได้</p>}
          {plan && !plan.done && (<>
            <p className="text-white/70">ขาดอีก <b className="text-white">{fmt(goal.min - s)}</b> คะแนน ใน {roundsLeft} รอบ (เฉลี่ยรอบละ {fmt(plan.perRound)})</p>
            <p className="mt-2 text-2xl font-bold text-gold">ชนะ ≥ {plan.wins}/{plan.fights} ทุกรอบ</p>
            <p className="mt-1 text-sm text-white/55">อัตราชนะ {pct((plan.wins / plan.fights) * 100)} ขึ้นไป{rank.teams < 5 ? ' · เลื่อนขั้นแล้วทีมเพิ่ม ใช้ % ใกล้เคียงเดิม' : ''}</p>
          </>)}
          {validScore && plan === null && <p className="text-red-200">{roundsLeft ? `ชนะ 100% ทุกรอบที่เหลือก็ไม่ทัน${goal.name}` : 'ไม่เหลือรอบให้เล่นแล้ว'}</p>}
        </div>
      </section>

      <section className="panel mt-5 p-4 sm:p-5">
        <h2 className="font-semibold text-gold">แรงค์</h2>
        <ul className="mt-3 grid gap-2">
          {TOTAL_WAR_RANKS.map((k, i) => (
            <li key={k.key} className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ${RANK_CLS[i]} ${validScore && i === rankIndex ? 'ring-2 ring-gold/60' : 'opacity-80'}`}>
              <span className="flex items-center gap-2 font-semibold"><Shield className="h-4 w-4" /> {k.name}{k.reward && <span className="text-xs font-normal opacity-80">· {k.reward}</span>}</span>
              <span className="text-sm tabular-nums">{fmt(k.min)} คะแนน · {k.teams} ทีม</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-white/45">
          แต่ละทีมสู้ 20 ครั้ง · ได้/เสีย = ((อัตราชนะ% − 50) ÷ 5) × ทีม × 40 = (ชนะ − ครึ่งหนึ่ง) × 40 ·
          ถึงเกณฑ์แรงค์ถัดไปแล้วคะแนนหยุดที่เกณฑ์ (3,480 + 720 → 3,500) · เลื่อนขั้นแล้วตกกลับไม่ได้ (6,120 − 240 → 6,000) ·
          1 รอบ = เตรียมรอบ 5 ชม. → ต่อสู้ 6 ชม. → สรุปผล 1 ชม. · คะแนนปัจจุบันจำไว้ในเครื่องนี้
        </p>
      </section>
    </div>
  )
}
