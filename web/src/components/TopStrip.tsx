import { useEffect, useState } from 'react'
import { GAME_SCHEDULE, GAME_SEASON } from '../../../shared/game'
import DayPhaseChips from './DayPhaseChips'
import SeasonBanner from './SeasonBanner'

/**
 * แถบใต้หัวเว็บที่ขึ้น "ทุกหน้า": Season (เหมือนทุกกิลด์ — มาจาก shared/game.ts)
 * มือถือ + หน้าที่ไม่ใช่ของกิลด์: วัน/ช่วงของวันด้วย (หน้ากิลด์อยู่ในแถบประกาศแล้ว)
 */
export default function TopStrip({ inGuild }: { inGuild: boolean }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="bg-[var(--surface-2)]/90 backdrop-blur">
      <SeasonBanner season={GAME_SEASON} schedule={GAME_SCHEDULE} now={now} />
      {!inGuild && (
        <div className="border-b border-white/10 sm:hidden">
          <DayPhaseChips now={now} className="mx-auto max-w-6xl px-4 py-2 text-sm" />
        </div>
      )}
    </div>
  )
}
