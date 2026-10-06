import { useEffect, useState } from 'react'
import { GAME_SCHEDULE } from '../../../shared/game'
import { DAYS, DAY_TYPE, dayIndex, dayPhase, phaseHelp, resetLabel } from '../lib/war'

const clock = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
})

/** นาฬิกาเวลาไทย + วันในเกม/ช่วงของวันตอนนี้ (กติกาเกมเหมือนทุกกิลด์ → โชว์ได้ทุกหน้า) */
export default function HeaderClock() {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const tick = () => { if (!document.hidden) setNow(Date.now()) }
    const timer = window.setInterval(tick, 1000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])
  const today = dayIndex(now)
  const type = GAME_SCHEDULE[today] ?? 'rest'
  const ph = dayPhase(type, now)
  return (
    <div className="flex shrink-0 items-center gap-2 border-l border-gold/20 pl-2.5 sm:gap-3 sm:pl-4">
      <div className="flex flex-col">
        <time dateTime={new Date(now).toISOString()} className="text-lg font-semibold leading-6 tabular-nums tracking-wide text-gold sm:text-2xl">{clock.format(now)}</time>
        <span className="text-[10px] leading-3 text-white/55">เวลาไทย</span>
      </div>
      {/* วันในเกม (เปลี่ยน 07:00) + ช่วงของวัน — จอใหญ่อยู่ข้างนาฬิกา · มือถือที่ไม่พอ ไปอยู่ในแถบประกาศแทน (AnnouncementBar) */}
      <div className="hidden flex-col gap-0.5 text-[11px] leading-4 sm:flex" title={`${ph ? `${ph.label} ถึง ${ph.until} (อีก ${ph.left}) · ${phaseHelp(type)} · ` : ''}วันใหม่เริ่ม 07:00 (อีก ${resetLabel(now)})`}>
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="font-semibold text-white/90">{DAYS[today]}</span>
          <span className={`rounded-full border px-1.5 text-[10px] leading-4 ${DAY_TYPE[type].cls}`}>
            {DAY_TYPE[type].label}
          </span>
        </span>
        {ph && (
          <span className={`whitespace-nowrap ${ph.step === 1 ? 'text-emerald-200' : 'text-amber-200'}`}>
            {ph.label} · ถึง {ph.until}
          </span>
        )}
      </div>
    </div>
  )
}
