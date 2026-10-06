import { ArrowRight, RotateCcw, Shield } from 'lucide-react'
import { useEffect, useState } from 'react'
import { TOTAL_WAR_RANKS, TOTAL_WAR_ROUNDS, totalWarRankIndex, totalWarResult } from '../../../shared/game'

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

/** คำนวณคะแนนสงครามเบ็ดเสร็จ: ใส่คะแนนปัจจุบัน + อัตราชนะรอบนี้ → คะแนนใหม่ (คิดเลื่อนขั้น/กันตกแรงค์ให้) */
export default function TotalWarPage() {
  const [score, setScore] = useState(() => {
    try { return localStorage.getItem(STORE_KEY) ?? '' } catch { return '' }
  })
  const [rate, setRate] = useState('')
  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, score) } catch { /* ไม่มี storage ก็ไม่เป็นไร */ }
  }, [score])

  const s = score === '' ? NaN : Math.max(0, Math.floor(Number(score)))
  const r = rate === '' ? NaN : Number(rate)
  const validScore = Number.isFinite(s)
  const validRate = Number.isFinite(r) && r >= 0 && r <= 100
  const rankIndex = validScore ? totalWarRankIndex(s) : 0
  const rank = TOTAL_WAR_RANKS[rankIndex]
  const res = validScore && validRate ? totalWarResult(s, r) : null

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold sm:text-4xl">
        คำนวณแต้ม<span className="text-gold">เบ็ดเสร็จ</span>
      </h1>
      <p className="mt-2 text-white/65">
        ใส่คะแนนตอนนี้กับอัตราชนะของรอบ → ได้คะแนนหลังคิดผล · ซีซันละ {TOTAL_WAR_ROUNDS} รอบ
      </p>

      <section className="panel mt-6 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-gold">คะแนนปัจจุบัน</span>
            <input type="number" inputMode="numeric" min={0} value={score} onChange={(e) => setScore(e.target.value)}
              placeholder="เช่น 3780" className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-lg tabular-nums" />
            <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-semibold ${RANK_CLS[rankIndex]}`}>
              <Shield className="h-3.5 w-3.5" /> {rank.name} · {rank.teams} ทีม
            </span>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gold">อัตราชนะรอบนี้ (%)</span>
            <input type="number" inputMode="decimal" min={0} max={100} step="0.01" value={rate} onChange={(e) => setRate(e.target.value)}
              placeholder="เช่น 52.5" className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-lg tabular-nums" />
            {rate !== '' && !validRate && <span className="mt-2 block text-sm text-red-300">ใส่ 0–100</span>}
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
              (({r} − 50) ÷ 5) × {res.rank.teams} ทีม × 40 = <b className="text-white/80">{signed(res.raw)}</b>
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
            <button type="button" onClick={() => { setScore(String(res.next)); setRate('') }}
              className="pill mx-auto mt-4 flex items-center gap-1.5 px-4 py-1.5 text-sm">
              <RotateCcw className="h-4 w-4" /> ใช้ {fmt(res.next)} เป็นคะแนนปัจจุบัน (คิดรอบต่อไป)
            </button>
          </div>
        )}
      </section>

      <section className="panel mt-5 p-4 sm:p-5">
        <h2 className="font-semibold text-gold">แรงค์</h2>
        <ul className="mt-3 grid gap-2">
          {TOTAL_WAR_RANKS.map((k, i) => (
            <li key={k.key} className={`flex items-center justify-between rounded-xl border px-3 py-2 ${RANK_CLS[i]} ${validScore && i === rankIndex ? 'ring-2 ring-gold/60' : 'opacity-80'}`}>
              <span className="flex items-center gap-2 font-semibold"><Shield className="h-4 w-4" /> {k.name}</span>
              <span className="text-sm tabular-nums">{fmt(k.min)} คะแนน · {k.teams} ทีม</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-white/45">
          ได้/เสียต่อรอบ = ((อัตราชนะ% − 50) ÷ 5) × จำนวนทีม × 40 · ถึงเกณฑ์แรงค์ถัดไปแล้วคะแนนหยุดที่เกณฑ์ (เช่น 3,480 + 720 → 3,500) ·
          เลื่อนขั้นแล้วตกกลับไม่ได้ (เช่น 6,120 − 240 → 6,000) · คะแนนปัจจุบันจำไว้ในเครื่องนี้
        </p>
      </section>
    </div>
  )
}
