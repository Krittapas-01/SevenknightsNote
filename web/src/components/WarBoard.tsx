import { Bot, CalendarDays, ChevronDown, ClipboardList, Megaphone, Settings2, Swords, Trash2 } from 'lucide-react'
import { PLAN_KIND_LABEL, planKind } from '../lib/types'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { api } from '../lib/api'
import { notifyGuildChanged } from '../lib/usePulse'
import type { Announcement, DayType, GuildData } from '../lib/types'
import { DAYS, DAYS_SHORT, DAY_TYPE, activePlanId, dateKey, dayIndex, fmtTime, isToday } from '../lib/war'
import DiscordSettings from './DiscordSettings'
import Modal from './Modal'
import { currentSeason, warRound } from '../lib/season'

type Props = { gid: string; data: GuildData; canEdit: boolean; reload: () => Promise<void> }

/** แถบบนสุดของหน้ากิลด์: วันนี้วันอะไร + แผนที่ใช้ + ประกาศล่าสุด */
export default function WarBoard({ gid, data, canEdit, reload: reloadData }: Props) {
  // โหลดใหม่ + บอกแถบประกาศให้อัปเดตทันที
  const reload = async () => {
    await reloadData()
    notifyGuildChanged(gid)
  }
  const [compose, setCompose] = useState(false)
  const [editSchedule, setEditSchedule] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // อัปเดตทุกนาที: วันเปลี่ยนเองตอน 07:00 และนับถอยหลังเดินต่อ
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])
  const today = dayIndex(now)
  const season = currentSeason(data.season?.start ?? '', data.season?.end ?? '', dateKey(now))
  const todayType = data.schedule[today] ?? 'rest'
  const activeId = activePlanId(data)
  const activePlan = data.plans.find((p) => p.id === activeId)
  const [latest, ...older] = data.announcements
  const needsPost = canEdit && todayType === 'attack' && !(latest && isToday(latest, now))

  return (
    <section className="panel panel-gold mt-6 p-4 sm:p-5">
      {/* วันนี้ + ตารางสัปดาห์ */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <CalendarDays className="h-5 w-5 text-gold" />
          <span className="text-lg font-semibold">วัน{DAYS[today]}</span>
          <span className={`rounded-full border px-3 py-0.5 text-sm font-semibold ${DAY_TYPE[todayType].cls}`}>{DAY_TYPE[todayType].label}</span>
          {season && <SeasonChip s={season} round={warRound(season, data.schedule, dateKey(now))} />}
        </div>
        <div className="war-week ml-auto flex w-full items-center gap-1 sm:w-auto">
          {data.schedule.map((t, i) => (
            <div
              key={i}
              title={`${DAYS[i]} · ${DAY_TYPE[t].label}`}
              className={`flex min-w-0 flex-1 flex-col items-center rounded-lg border py-2 text-[11px] leading-tight sm:w-12 sm:flex-none ${DAY_TYPE[t].cls} ${i === today ? 'ring-2 ring-gold' : ''}`}
            >
              <span className="font-semibold">{DAYS_SHORT[i]}</span>
              <span>{DAY_TYPE[t].short}</span>
            </div>
          ))}
          {canEdit && (
            <>
              <button onClick={() => setEditSchedule(true)} title="แก้ตารางวอร์" className="ml-1 rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white">
                <Settings2 className="h-4 w-4" />
              </button>
              <DiscordSettings gid={gid} discord={data.discord} reload={reload} />
            </>
          )}
        </div>
      </div>

      {/* แผนที่ใช้อยู่ */}
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-black/25 px-4 py-3">
        <ClipboardList className="h-5 w-5 text-gold" />
        <span className="text-white/70">แผนที่ใช้ตอนนี้:</span>
        {activePlan ? (
          <Link to={`/g/${gid}/p/${activePlan.id}`} className="font-semibold text-gold underline-offset-4 hover:underline">
            {activePlan.title}
          </Link>
        ) : (
          <span className="text-white/45">ยังไม่ได้ประกาศ</span>
        )}
        {latest?.opponent && latest.planId === activeId && (
          <span className="rounded-full bg-red-500/20 px-2.5 py-0.5 text-sm text-red-100">
            <Swords className="mr-1 inline h-3.5 w-3.5" />เจอกิลด์ {latest.opponent}
          </span>
        )}
        {canEdit && (
          <button onClick={() => setCompose(true)} className="btn-gold ml-auto flex items-center gap-1.5 px-4 py-1.5 text-sm">
            <Megaphone className="h-4 w-4" /> ประกาศ
          </button>
        )}
      </div>

      {needsPost && (
        <p className="mt-3 rounded-lg border border-dashed border-gold/50 px-3 py-2 text-sm text-gold">
          วันนี้เป็นวันตี แต่ยังไม่มีประกาศ — ดูว่าเจอกิลด์ไหนแล้วกด "ประกาศ" เพื่อบอกแผนที่ใช้
        </p>
      )}

      {/* ประกาศล่าสุด */}
      {latest && <AnnouncementItem a={latest} data={data} gid={gid} canEdit={canEdit} reload={reload} highlight />}

      {older.length > 0 && (
        <div className="mt-2">
          <button onClick={() => setShowHistory((v) => !v)} className="flex items-center gap-1 text-sm text-white/55 hover:text-white">
            <ChevronDown className={`h-4 w-4 transition ${showHistory ? 'rotate-180' : ''}`} /> ประกาศก่อนหน้า ({older.length})
          </button>
          {showHistory && older.map((a) => <AnnouncementItem key={a.id} a={a} data={data} gid={gid} canEdit={canEdit} reload={reload} />)}
        </div>
      )}

      <ComposeModal open={compose} onClose={() => setCompose(false)} gid={gid} data={data} activeId={activeId} reload={reload} />
      <ScheduleModal open={editSchedule} onClose={() => setEditSchedule(false)} gid={gid} schedule={data.schedule} auto={data.autoAnnounce ?? true} season={data.season ?? { start: '', end: '' }} reload={reload} />
    </section>
  )
}

function AnnouncementItem({ a, data, gid, canEdit, reload, highlight }: { a: Announcement; data: GuildData; gid: string; canEdit: boolean; reload: () => Promise<void>; highlight?: boolean }) {
  const plan = data.plans.find((p) => p.id === a.planId)
  async function remove() {
    if (!confirm('ลบประกาศนี้?')) return
    await api.deleteAnnouncement(gid, a.id)
    await reload()
  }
  return (
    <div className={`mt-3 rounded-xl px-4 py-3 ${highlight ? 'border border-gold/40 bg-gold/10' : 'bg-white/5'}`}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Megaphone className={`h-4 w-4 ${highlight ? 'text-gold' : 'text-white/50'}`} />
        {a.author && (
          <span className="flex items-center gap-1.5 text-white/80">
            <img src={a.author.avatar} alt="" className="h-5 w-5 rounded-full" /> {a.author.name}
            {a.author.role && <span className="rounded-full border border-[#8b93ff]/50 bg-[#5865f2]/20 px-2 text-xs text-[#c9ccff]">{a.author.role}</span>}
          </span>
        )}
        <span className="text-white/60">{fmtTime(a.createdAt)}</span>
        {isToday(a) && <span className="rounded-full bg-gold px-2 text-xs font-semibold text-ink">วันนี้</span>}
        {a.auto && <span title="ระบบประกาศให้ตอน 07:00" className="flex items-center gap-1 rounded-full bg-white/10 px-2 text-xs text-white/60"><Bot className="h-3 w-3" /> อัตโนมัติ</span>}
        {plan && (
          <Link to={`/g/${gid}/p/${plan.id}`} className="rounded-full border border-gold/50 px-2.5 text-gold hover:bg-gold/10">
            ใช้แผน: {plan.title}
          </Link>
        )}
        {a.opponent && <span className="text-red-200">vs {a.opponent}</span>}
        {canEdit && (
          <button onClick={remove} title="ลบประกาศ" className="ml-auto rounded-full p-1 text-white/40 hover:bg-red-500/15 hover:text-red-300">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {a.body && <p className={`mt-1.5 whitespace-pre-wrap ${highlight ? 'text-lg' : ''}`}>{a.body}</p>}
    </div>
  )
}

function ComposeModal({ open, onClose, gid, data, activeId, reload }: { open: boolean; onClose: () => void; gid: string; data: GuildData; activeId: string | null; reload: () => Promise<void> }) {
  const [planId, setPlanId] = useState<string>('')
  const [opponent, setOpponent] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const titleOf = (id: string | null) => data.plans.find((p) => p.id === id)?.title
  const today = DAYS[dayIndex()]

  // ข้อความสำเร็จรูป
  const templates = [
    planId && activeId && planId !== activeId ? `วันนี้ (${today}) เปลี่ยนจาก "${titleOf(activeId)}" เป็น "${titleOf(planId)}"` : null,
    planId ? `วันนี้ (${today}) ใช้ "${titleOf(planId)}"${opponent ? ` เจอกิลด์ ${opponent}` : ''}` : null,
    `วันนี้ (${today}) จัดบ้านกันตามแผนล่าสุด`,
    `วันนี้พักวอร์`,
  ].filter(Boolean) as string[]

  async function submit() {
    setBusy(true)
    setErr(null)
    try {
      await api.announce(gid, { body: body.trim(), planId: planId || null, opponent: opponent.trim() })
      await reload()
      setBody('')
      setOpponent('')
      onClose()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title="ประกาศถึงกิลด์" onClose={onClose}>
      <label className="block text-sm text-white/70">แผนที่ให้ใช้</label>
      <select
        value={planId}
        onChange={(e) => setPlanId(e.target.value)}
        className="mt-1 w-full rounded-xl border border-white/15 bg-[#161c2e] px-3 py-2 outline-none focus:border-gold"
      >
        <option value="">— ไม่เปลี่ยนแผน —</option>
        {(['attack', 'defense'] as const).map((k) => (
          <optgroup key={k} label={PLAN_KIND_LABEL[k]}>
            {data.plans.filter((p) => planKind(p.data) === k).map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} {p.id === activeId ? '(ใช้อยู่)' : ''}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <label className="mt-4 block text-sm text-white/70">กิลด์ที่เจอ (ถ้ามี)</label>
      <input
        value={opponent}
        onChange={(e) => setOpponent(e.target.value)}
        maxLength={50}
        placeholder="เช่น pandoara"
        className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 outline-none focus:border-gold"
      />

      <label className="mt-4 block text-sm text-white/70">ข้อความ</label>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {templates.map((t) => (
          <button key={t} onClick={() => setBody(t)} className="rounded-full border border-dashed border-white/25 px-3 py-0.5 text-left text-xs text-white/70 hover:border-gold hover:text-gold">
            {t}
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={1000}
        rows={4}
        placeholder="เช่น วันนี้เปลี่ยนจากแผน 1 เป็นแผน 2 เพราะอีกฝั่งบ้านเวทย์เยอะ"
        className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 p-3 outline-none focus:border-gold"
      />
      {err && <p className="mt-2 text-sm text-red-300">{err}</p>}
      <div className="mt-4 flex gap-2">
        <button disabled={busy || (!body.trim() && !planId)} onClick={submit} className="btn-gold px-6 py-2">
          {busy ? 'กำลังประกาศ...' : 'ประกาศ'}
        </button>
        <button onClick={onClose} className="pill px-5 py-2">ยกเลิก</button>
      </div>
    </Modal>
  )
}

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const thDate = (key: string) => `${+key.slice(8, 10)} ${TH_MONTHS[+key.slice(5, 7) - 1]}`

function SeasonChip({ s, round }: { s: NonNullable<ReturnType<typeof currentSeason>>; round: ReturnType<typeof warRound> }) {
  const text = s.phase === 'in'
    ? `Season${round ? ` · รอบ ${round.round}/${round.total}` : ''} · ${s.daysLeft === 1 ? 'วันสุดท้าย' : `เหลือ ${s.daysLeft} วัน (จบ ${thDate(s.end)})`}`
    : `พักระหว่าง Season · เริ่ม ${thDate(s.nextStart)}`
  return (
    <span title={s.projected ? 'นับต่อจาก Season ที่ตั้งไว้ (จบแล้วพัก 1 สัปดาห์ ยาวเท่าเดิม)' : undefined}
      className={`rounded-full border px-3 py-0.5 text-sm ${s.phase === 'in' ? 'border-gold/40 text-gold' : 'border-white/15 text-white/55'}`}>
      {text}{s.projected ? ' *' : ''}
    </span>
  )
}

function ScheduleModal({ open, onClose, gid, schedule, auto, season, reload }: { open: boolean; onClose: () => void; gid: string; schedule: DayType[]; auto: boolean; season: { start: string; end: string }; reload: () => Promise<void> }) {
  const [draft, setDraft] = useState<DayType[]>(schedule)
  const [autoDraft, setAutoDraft] = useState(auto)
  const [start, setStart] = useState(season.start)
  const [end, setEnd] = useState(season.end)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setDraft(schedule)
      setAutoDraft(auto)
      setStart(season.start)
      setEnd(season.end)
      setErr(null)
    }
  }

  async function save() {
    setBusy(true)
    setErr(null)
    try {
      await api.saveSchedule(gid, draft, autoDraft, { start, end })
      await reload()
      onClose()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title="ตารางวอร์รายสัปดาห์" onClose={onClose}>
      <div className="space-y-2">
        {DAYS.map((d, i) => (
          <div key={d} className="flex items-center gap-3">
            <span className="w-16">{d}</span>
            <div className="pill flex p-0.5 text-sm">
              {(['attack', 'defense', 'rest'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setDraft((x) => x.map((v, j) => (j === i ? t : v)))}
                  className={`rounded-full px-3 py-1 ${draft[i] === t ? 'bg-gold font-semibold text-ink' : 'text-white/70 hover:bg-white/10'}`}
                >
                  {DAY_TYPE[t].label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-black/25 px-4 py-3">
        <input type="checkbox" checked={autoDraft} onChange={(e) => setAutoDraft(e.target.checked)} className="mt-1 h-4 w-4 accent-[#e2bf72]" />
        <span>
          <span className="font-semibold">ประกาศวันใหม่อัตโนมัติ 07:00</span>
          <span className="block text-sm text-white/55">บอกว่าวันนี้วันตีหรือจัดบ้านกันตามตารางนี้ (วันพักไม่แจ้ง) และแจ้งวันเริ่ม/วันสุดท้ายของ Season ส่วนแผนที่ใช้ไม่เปลี่ยน</span>
        </span>
      </label>
      <div className="mt-4 rounded-xl bg-black/25 px-4 py-3">
        <p className="font-semibold">Season</p>
        <p className="text-sm text-white/55">ดูจากหน้า Guild War ในเกม (Official Season) · ช่วงพักระหว่าง Season จะไม่แจ้ง · ถ้าไม่ได้อัปเดต ระบบนับ Season ถัดไปให้เอง (เริ่มหลังจบ 1 สัปดาห์ ยาวเท่าเดิม)</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="rounded-lg border border-white/15 bg-[#161c2e] px-2.5 py-1.5 outline-none [color-scheme:dark] focus:border-gold" />
          <span className="text-white/50">ถึง</span>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded-lg border border-white/15 bg-[#161c2e] px-2.5 py-1.5 outline-none [color-scheme:dark] focus:border-gold" />
          {(start || end) && <button type="button" onClick={() => { setStart(''); setEnd('') }} className="text-white/45 hover:text-white">ล้าง</button>}
        </div>
      </div>
      {err && <p className="mt-3 text-sm text-red-300">{err}</p>}
      <div className="mt-5 flex gap-2">
        <button disabled={busy} onClick={save} className="btn-gold px-6 py-2">{busy ? 'กำลังบันทึก...' : 'บันทึก'}</button>
        <button onClick={onClose} className="pill px-5 py-2">ยกเลิก</button>
      </div>
    </Modal>
  )
}
