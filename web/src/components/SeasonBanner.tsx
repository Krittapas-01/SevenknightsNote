import { Trophy } from 'lucide-react'
import { currentSeason, warRound } from '../lib/season'
import { dateKey } from '../lib/war'

const displayDate = (key: string) => new Date(`${key}T00:00:00+07:00`).toLocaleDateString('th-TH', {
  timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short',
})

/** แถบ Season บนสุด (ข้อมูลมากับ pulse ที่แถบประกาศโหลดทุก 60 วิอยู่แล้ว) */
export default function SeasonBanner({ season: dates, schedule, now }: { season?: { start: string; end: string }; schedule: string[]; now: number }) {
  const season = dates ? currentSeason(dates.start, dates.end, dateKey(now)) : null
  if (!season) return null
  const round = warRound(season, schedule, dateKey(now))
  const urgent = season.phase === 'in' && season.daysLeft <= 3
  return (
    <div className={`border-b ${urgent ? 'border-amber-300/35 bg-amber-400/15' : 'border-gold/25 bg-gold/10'}`}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-2">
        <Trophy className="h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
        <span className="text-xs font-semibold tracking-widest text-gold">SEASON</span>
        {round && <span className="rounded-full border border-gold/40 px-2.5 py-0.5 text-sm font-semibold tabular-nums text-gold">รอบ {round.round}/{round.total}</span>}
        <strong className="text-lg tabular-nums text-gold">
          {season.phase === 'in' ? season.daysLeft === 1 ? 'วันสุดท้าย' : `เหลือ ${season.daysLeft} วัน` : season.phase === 'before' ? 'รอเริ่ม Season' : 'พักระหว่าง Season'}
        </strong>
        <span className="text-xs text-white/70 sm:ml-auto">
          {season.phase === 'in' ? `วันสุดท้าย ${displayDate(season.end)}` : `เริ่ม ${displayDate(season.nextStart)}`}
          {season.projected && <span className="ml-2 text-white/45">· คำนวณรอบถัดไป</span>}
        </span>
      </div>
    </div>
  )
}
