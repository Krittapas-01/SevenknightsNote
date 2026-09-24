import { ClipboardList, Megaphone, Swords } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { usePulse } from '../lib/usePulse'
import { DAYS, DAY_TYPE, dayIndex, resetLabel } from '../lib/war'

const SEEN = (gid: string) => `7knote:seen:${gid}`
const readSeen = (gid: string) => {
  try { return localStorage.getItem(SEEN(gid)) } catch { return null }
}
const writeSeen = (gid: string, id: string) => {
  try { localStorage.setItem(SEEN(gid), id) } catch { /* ignore */ }
}

function ago(ts: number, now: number) {
  const m = Math.floor((now - ts) / 60000)
  if (m < 1) return 'เมื่อสักครู่'
  if (m < 60) return `${m} นาทีที่แล้ว`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} ชม.ที่แล้ว`
  return `${Math.floor(h / 24)} วันที่แล้ว`
}

/** แถบประกาศติดใต้หัวเว็บ ทุกหน้าของกิลด์ อัปเดตเองทุก 15 วิ */
export default function AnnouncementBar({ gid }: { gid: string }) {
  const pulse = usePulse(gid)
  const [now, setNow] = useState(Date.now())
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState<string | null>(() => readSeen(gid))

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => setSeen(readSeen(gid)), [gid])

  if (!pulse) return null
  const today = dayIndex(now)
  const type = pulse.schedule[today] ?? 'rest'
  const a = pulse.latest
  const unseen = !!a && a.id !== seen

  function markSeen() {
    if (!a) return
    writeSeen(gid, a.id)
    setSeen(a.id)
  }

  return (
    <div
      className={`sticky top-14 z-30 border-b backdrop-blur transition-colors ${
        unseen ? 'border-gold/60 bg-[#3a3120]/90' : 'border-white/10 bg-[#1b2236]/90'
      }`}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2 text-sm">
        <span className="flex items-center gap-1.5" title={`วันใหม่เริ่ม 07:00 (อีก ${resetLabel(now)})`}>
          <span className="font-semibold">{DAYS[today]}</span>
          <span className={`rounded-full border px-2 py-0 text-xs ${DAY_TYPE[type].cls}`}>{DAY_TYPE[type].label}</span>
        </span>

        {pulse.activePlan && (
          <Link to={`/g/${gid}/p/${pulse.activePlan.id}`} className="flex items-center gap-1 text-gold hover:underline">
            <ClipboardList className="h-4 w-4" /> {pulse.activePlan.title}
          </Link>
        )}
        {a?.opponent && (
          <span className="flex items-center gap-1 text-red-200">
            <Swords className="h-3.5 w-3.5" /> vs {a.opponent}
          </span>
        )}

        {a ? (
          <button
            onClick={() => { setOpen((v) => !v); markSeen() }}
            className="flex min-w-0 flex-1 basis-60 items-center gap-2 text-left"
            title="กดเพื่อดูทั้งหมด"
          >
            <Megaphone className={`h-4 w-4 shrink-0 ${unseen ? 'animate-bounce text-gold' : 'text-white/50'}`} />
            {unseen && <span className="shrink-0 rounded-full bg-gold px-1.5 text-[11px] font-bold text-ink">ใหม่</span>}
            <span className={`min-w-0 ${open ? 'whitespace-pre-wrap' : 'truncate'} ${unseen ? 'font-semibold text-white' : 'text-white/80'}`}>
              {a.body || (pulse.activePlan ? `ใช้แผน ${pulse.activePlan.title}` : '')}
            </span>
            <span className="ml-auto shrink-0 text-xs text-white/45">
              {ago(a.createdAt, now)}
            </span>
          </button>
        ) : (
          <span className="flex-1 text-white/40">ยังไม่มีประกาศ</span>
        )}

        <Link to={`/g/${gid}`} onClick={markSeen} className="hidden shrink-0 text-xs text-white/50 hover:text-white sm:inline">
          ดูทั้งหมด
        </Link>
      </div>
    </div>
  )
}
