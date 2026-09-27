import { Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { currentSeason } from '../lib/season'
import { dateKey } from '../lib/war'

const displayDate = (key: string) => new Date(`${key}T00:00:00+07:00`).toLocaleDateString('th-TH', {
  timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short',
})

export default function SeasonBanner({ gid, now }: { gid: string; now: number }) {
  const [dates, setDates] = useState<{ start: string; end: string } | null>(null)
  useEffect(() => {
    let active = true
    let loading = false
    const refresh = async () => {
      if (document.hidden || loading) return
      loading = true
      try {
        const data = await api.getGuild(gid)
        if (active) setDates(data.season ?? null)
      } catch { /* Keep the last known season during a temporary connection failure. */ }
      finally { loading = false }
    }
    const changed = (event: Event) => { if ((event as CustomEvent).detail === gid) void refresh() }
    setDates(null)
    void refresh()
    const timer = window.setInterval(refresh, 300_000)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('7knote:changed', changed)
    return () => {
      active = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('7knote:changed', changed)
    }
  }, [gid])
  const season = dates && currentSeason(dates.start, dates.end, dateKey(now))
  if (!season) return null
  const urgent = season.phase === 'in' && season.daysLeft <= 3
  return (
    <div className={`border-b ${urgent ? 'border-amber-300/35 bg-amber-400/15' : 'border-gold/25 bg-gold/10'}`}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-2">
        <Trophy className="h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
        <span className="text-xs font-semibold tracking-widest text-gold">SEASON</span>
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
