import { useEffect, useState } from 'react'

const clock = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
})

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
  return (
    <div className="flex items-center gap-2 text-[11px] leading-4 text-white/50">
      <time dateTime={new Date(now).toISOString()} className="font-medium tabular-nums tracking-wider text-gold">{clock.format(now)}</time>
      <span>เวลาไทย</span>
    </div>
  )
}
