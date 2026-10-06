import { GAME_SCHEDULE } from '../../../shared/game'
import { DAYS, DAY_TYPE, dayIndex, dayPhase } from '../lib/war'

/** วันในเกม + ช่วงของวันตอนนี้ แบบป้าย (ใช้บนมือถือ — จอใหญ่อยู่ข้างนาฬิกาใน HeaderClock) */
export default function DayPhaseChips({ now, className = '' }: { now: number; className?: string }) {
  const today = dayIndex(now)
  const type = GAME_SCHEDULE[today] ?? 'rest'
  const ph = dayPhase(type, now)
  return (
    <span className={`flex items-center gap-1.5 ${className}`} title={ph ? `${ph.label} ถึง ${ph.until} (อีก ${ph.left})` : undefined}>
      <span className="font-semibold">{DAYS[today]}</span>
      <span className={`rounded-full border px-2 py-0 text-xs ${DAY_TYPE[type].cls}`}>{DAY_TYPE[type].label}</span>
      {ph && (
        <span className={`rounded-full px-2 py-0 text-xs ${ph.step === 1 ? 'bg-emerald-400/15 text-emerald-100' : 'bg-amber-400/15 text-amber-100'}`}>
          {ph.label} · ถึง {ph.until}
        </span>
      )}
    </span>
  )
}
