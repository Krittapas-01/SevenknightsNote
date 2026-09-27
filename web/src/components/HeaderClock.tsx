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
    <div className="flex shrink-0 flex-col border-l border-gold/20 pl-3 sm:pl-4">
      <time dateTime={new Date(now).toISOString()} className="text-xl font-semibold leading-6 tabular-nums tracking-wide text-gold sm:text-2xl">{clock.format(now)}</time>
      <span className="text-[10px] leading-3 text-white/55">เวลาไทย</span>
    </div>
  )
}
