import { ClipboardList, Megaphone, Shield, Swords } from 'lucide-react'
import { dayIndex } from '../lib/war'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { usePulse } from '../lib/usePulse'
import DayPhaseChips from './DayPhaseChips'
import { tx, L } from '../lib/i18n'

const SEEN = (gid: string) => `7knote:seen:${gid}`
const readSeen = (gid: string) => {
  try { return localStorage.getItem(SEEN(gid)) } catch { return null }
}
const writeSeen = (gid: string, id: string) => {
  try { localStorage.setItem(SEEN(gid), id) } catch { /* ignore */ }
}

function ago(ts: number, now: number) {
  const m = Math.floor((now - ts) / 60000)
  if (m < 1) return tx('เมื่อสักครู่')
  if (m < 60) return L(`${m} นาทีที่แล้ว`, `${m} min ago`)
  const h = Math.floor(m / 60)
  if (h < 24) return L(`${h} ชม.ที่แล้ว`, `${h}h ago`)
  return L(`${Math.floor(h / 24)} วันที่แล้ว`, `${Math.floor(h / 24)}d ago`)
}

/** แถบประกาศติดใต้หัวเว็บ ทุกหน้าของกิลด์ อัปเดตเองทุก 60 วิ */
export default function AnnouncementBar({ gid }: { gid: string }) {
  const { pulse, locked } = usePulse(gid)
  const [now, setNow] = useState(Date.now())
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState<string | null>(() => readSeen(gid))

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => setSeen(readSeen(gid)), [gid])

  // ยังไม่เคยโหลด (เปิดกิลด์นี้ครั้งแรก) → จองที่ไว้ก่อน ไม่ให้เนื้อหาด้านล่างกระโดดตอนแถบโผล่
  // จอ sm ขึ้นไป แถบจริงมีแถวเดียว = py-2 + บรรทัด text-sm = 2.25rem (h-9) ทุกขนาดจอ
  // (เดิมจอคอมตั้ง 30px ตามที่วัดได้บนจอที่ย่อ 80% — ของจริง 36px → เนื้อหาโดนดันลงตอนแถบโผล่)
  if (locked) return null // กิลด์ล็อกด้วยรหัสเข้ากิลด์ (หน้ากิลด์ขึ้นช่องใส่รหัสแทน)
  if (!pulse) return (
    <div aria-hidden className="border-b border-white/10 bg-[var(--surface-2)]/90">
      <div className="mx-auto flex h-[63px] max-w-6xl items-center gap-3 px-4 sm:h-9">
        <span className="h-4 w-40 animate-pulse rounded-full bg-white/10" />
        <span className="hidden h-4 w-24 animate-pulse rounded-full bg-white/10 sm:block" />
      </div>
    </div>
  )
  const a = pulse.latest
  // แผนบุก/แผนกันแยกกัน → โชว์แผนของชนิดวันนี้ (วันจัดบ้าน = แผนกัน · วันอื่น = แผนบุก) ไม่มีค่อยใช้อีกชนิด
  const dayKind = pulse.schedule[dayIndex(now)] === 'defense' ? 'defense' : 'attack'
  const plans = pulse.activePlans
  const shownKind = plans ? (plans[dayKind] ? dayKind : plans.attack ? 'attack' : plans.defense ? 'defense' : null) : null
  const activePlan = plans ? (shownKind ? plans[shownKind]! : null) : pulse.activePlan
  const unseen = !!a && a.id !== seen

  function markSeen() {
    if (!a) return
    writeSeen(gid, a.id)
    setSeen(a.id)
  }

  return (
    <div
      className={`border-b backdrop-blur transition-colors ${
        unseen ? 'border-gold/60 bg-[var(--announce)]' : 'border-white/10 bg-[var(--surface-2)]/90'
      }`}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2 text-sm">
        {/* มือถือ: วันในเกม + ช่วงของวันอยู่ตรงนี้ (จอใหญ่อยู่ข้างนาฬิกาบนหัวเว็บ — HeaderClock) */}
        <DayPhaseChips now={now} className="sm:hidden" />
        {activePlan && (
          <Link to={`/g/${gid}/p/${activePlan.id}`} className="flex items-center gap-1 text-gold hover:underline">
            {shownKind === 'attack' ? <Swords className="h-4 w-4" /> : shownKind === 'defense' ? <Shield className="h-4 w-4" /> : <ClipboardList className="h-4 w-4" />} {activePlan.title}
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
            title={tx('กดเพื่อดูทั้งหมด')}
          >
            <span className={`inline-flex shrink-0 ${unseen ? 'animate-bounce' : ''}`}><Megaphone className={`h-4 w-4 ${unseen ? 'text-gold' : 'text-white/50'}`} /></span>
            {unseen && <span className="shrink-0 rounded-full bg-gold px-1.5 text-[11px] font-bold text-ink">{tx('ใหม่')}</span>}
            <span className={`min-w-0 ${open ? 'whitespace-pre-wrap' : 'truncate'} ${unseen ? 'font-semibold text-white' : 'text-white/80'}`}>
              {a.body || (activePlan ? L(`ใช้แผน ${activePlan.title}`, `Plan: ${activePlan.title}`) : '')}
            </span>
            <span className="ml-auto shrink-0 text-xs text-white/45">
              {ago(a.createdAt, now)}
            </span>
          </button>
        ) : (
          <span className="flex-1 text-white/40">{tx('ยังไม่มีประกาศ')}</span>
        )}

        <Link to={`/g/${gid}`} onClick={markSeen} className="hidden shrink-0 text-xs text-white/50 hover:text-white sm:inline">
          {tx('ดูทั้งหมด')}
        </Link>
      </div>
    </div>
  )
}
