import { Bot, CalendarDays, ChevronDown, ClipboardList, Megaphone, Settings2, Shield, Swords, Trash2 } from 'lucide-react'
import { PLAN_KIND_LABEL, planKind } from '../lib/types'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { api } from '../lib/api'
import { notifyGuildChanged } from '../lib/usePulse'
import type { Announcement, DayType, GuildData, PlanKind } from '../lib/types'
import { DAYS, DAYS_SHORT, DAY_TYPE, activePlanId, dateKey, dayIndex, fmtTime, isToday } from '../lib/war'
import { currentSeason } from '../lib/season'
import { DAY_NAMES, DAY_PLACEHOLDER, DAY_PLACEHOLDER_EN, MAX_AUTO_TEXT, defaultAutoText, fillDay } from '../../../shared/game'

const fmtDate = (key: string) => new Date(`${key}T00:00:00+07:00`).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: '2-digit' })
import DiscordSettings from './DiscordSettings'
import Modal from './Modal'
import { tx, L, LOCALE, EN } from '../lib/i18n'

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
  const todayType = data.schedule[today] ?? 'rest'
  // แผนบุก/แผนกันที่ใช้อยู่ แยกกัน
  const activeIds = { attack: activePlanId(data, 'attack'), defense: activePlanId(data, 'defense') }
  const activeAtk = data.plans.find((p) => p.id === activeIds.attack)
  const activeDef = data.plans.find((p) => p.id === activeIds.defense)
  const [latest, ...older] = data.announcements
  const needsPost = canEdit && todayType === 'attack' && !(latest && isToday(latest, now))

  return (
    <section className="panel panel-gold mt-4 p-4">
      {/* วันนี้ + ตารางสัปดาห์ */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <CalendarDays className="h-5 w-5 text-gold" />
          <span className="text-lg font-semibold">{L(`วัน${DAYS[today]}`, DAYS[today])}</span>
          <span className={`rounded-full border px-3 py-0.5 text-sm font-semibold ${DAY_TYPE[todayType].cls}`}>{DAY_TYPE[todayType].label}</span>
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
              <button onClick={() => setEditSchedule(true)} title={tx('แก้ตารางสงคราม')} className="ml-1 rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white">
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
        {([['attack', activeAtk], ['defense', activeDef]] as const).map(([k, p]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 text-white/70">
              {k === 'attack' ? <Swords className="h-4 w-4 text-red-300" /> : <Shield className="h-4 w-4 text-sky-300" />}{PLAN_KIND_LABEL[k]}{tx('ที่ใช้:')}
            </span>
            {p ? (
              <Link to={`/g/${gid}/p/${p.id}`} className="font-semibold text-gold underline-offset-4 hover:underline">{p.title}</Link>
            ) : (
              <span className="text-white/45">{tx('ยังไม่ได้ประกาศ')}</span>
            )}
            {k === 'attack' && <span className="mx-1 hidden text-white/20 sm:inline">·</span>}
          </span>
        ))}
        {latest?.opponent && latest.planId && (latest.planId === activeIds.attack || latest.planId === activeIds.defense) && (
          <span className="rounded-full bg-red-500/20 px-2.5 py-0.5 text-sm text-red-100">
            <Swords className="mr-1 inline h-3.5 w-3.5" />{tx('เจอกิลด์')}{' '}{latest.opponent}
          </span>
        )}
        {canEdit && (
          <button data-onboard="announce" onClick={() => setCompose(true)} className="btn-gold ml-auto flex items-center gap-1.5 px-4 py-1.5 text-sm">
            <Megaphone className="h-4 w-4" />{' '}{tx('ประกาศ')}
          </button>
        )}
      </div>

      {needsPost && (
        <p className="mt-3 rounded-lg border border-dashed border-gold/50 px-3 py-2 text-sm text-gold">
          {tx('วันนี้เป็นวันตี แต่ยังไม่มีประกาศ — ดูว่าเจอกิลด์ไหนแล้วกด "ประกาศ" เพื่อบอกแผนที่ใช้')}
        </p>
      )}

      {/* ประกาศล่าสุด */}
      {latest && <AnnouncementItem a={latest} data={data} gid={gid} canEdit={canEdit} reload={reload} highlight />}

      {older.length > 0 && (
        <div className="mt-2">
          <button onClick={() => setShowHistory((v) => !v)} className="flex items-center gap-1 text-sm text-white/55 hover:text-white">
            <ChevronDown className={`h-4 w-4 transition ${showHistory ? 'rotate-180' : ''}`} />{' '}{tx('ประกาศก่อนหน้า (')}{older.length})
          </button>
          {showHistory && older.map((a) => <AnnouncementItem key={a.id} a={a} data={data} gid={gid} canEdit={canEdit} reload={reload} />)}
        </div>
      )}

      <ComposeModal open={compose} onClose={() => setCompose(false)} gid={gid} data={data} activeIds={activeIds} todayType={todayType} reload={reload} />
      <ScheduleModal open={editSchedule} onClose={() => setEditSchedule(false)} gid={gid} schedule={data.schedule} auto={data.autoAnnounce ?? true} autoText={data.autoText ?? { attack: '', defense: '' }} season={data.season ?? { start: '', end: '' }} reload={reload} />
    </section>
  )
}

function AnnouncementItem({ a, data, gid, canEdit, reload, highlight }: { a: Announcement; data: GuildData; gid: string; canEdit: boolean; reload: () => Promise<void>; highlight?: boolean }) {
  const plan = data.plans.find((p) => p.id === a.planId)
  async function remove() {
    if (!confirm(tx('ลบประกาศนี้?'))) return
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
        {isToday(a) && <span className="rounded-full bg-gold px-2 text-xs font-semibold text-ink">{tx('วันนี้')}</span>}
        {a.auto && <span title={tx('ระบบประกาศให้ตอน 07:00')} className="flex items-center gap-1 rounded-full bg-white/10 px-2 text-xs text-white/60"><Bot className="h-3 w-3" />{' '}{tx('อัตโนมัติ')}</span>}
        {plan && (
          <Link to={`/g/${gid}/p/${plan.id}`} className="rounded-full border border-gold/50 px-2.5 text-gold hover:bg-gold/10">
            {tx('ใช้แผน:')}{' '}{plan.title}
          </Link>
        )}
        {a.opponent && <span className="text-red-200">vs {a.opponent}</span>}
        {canEdit && (
          <button onClick={remove} title={tx('ลบประกาศ')} className="ml-auto rounded-full p-1 text-white/40 hover:bg-red-500/15 hover:text-red-300">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {a.body && <p className={`mt-1.5 whitespace-pre-wrap ${highlight ? 'text-lg' : ''}`}>{a.body}</p>}
    </div>
  )
}

function ComposeModal({ open, onClose, gid, data, activeIds, todayType, reload }: { open: boolean; onClose: () => void; gid: string; data: GuildData; activeIds: Record<PlanKind, string | null>; todayType: DayType; reload: () => Promise<void> }) {
  const [planId, setPlanId] = useState<string>('')
  const [opponent, setOpponent] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const titleOf = (id: string | null) => data.plans.find((p) => p.id === id)?.title
  const today = DAYS[dayIndex()]
  // แผนที่ใช้อยู่ของชนิดเดียวกับแผนที่เลือก (เปลี่ยนแผนบุกไม่เกี่ยวกับแผนกัน)
  const selKind = data.plans.find((p) => p.id === planId)
  const activeId = selKind ? activeIds[planKind(selKind.data)] : null
  // วันจัดบ้าน → แผนกันขึ้นก่อน · วันอื่น → แผนบุกขึ้นก่อน
  const kindOrder: PlanKind[] = todayType === 'defense' ? ['defense', 'attack'] : ['attack', 'defense']

  // ข้อความสำเร็จรูป
  const templates = [
    planId && activeId && planId !== activeId ? `วันนี้ (${today}) เปลี่ยนจาก "${titleOf(activeId)}" เป็น "${titleOf(planId)}"` : null,
    planId ? `วันนี้ (${today}) ใช้ "${titleOf(planId)}"${opponent ? ` เจอกิลด์ ${opponent}` : ''}` : null,
    L(`วันนี้ (${today}) จัดบ้านกันตามแผนล่าสุด`, `Today (${today}): set defenses per the latest plan`),
    L(`วันนี้พักสงคราม`, `No war today`),
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
    <Modal open={open} title={tx('ประกาศถึงกิลด์')} onClose={onClose}>
      <label className="block text-sm text-white/70">{tx('แผนที่ให้ใช้')}</label>
      <select
        value={planId}
        onChange={(e) => setPlanId(e.target.value)}
        className="mt-1 w-full rounded-xl border border-white/15 bg-[var(--surface)] px-3 py-2 outline-none focus:border-gold"
      >
        <option value="">{tx('— ไม่เปลี่ยนแผน —')}</option>
        {kindOrder.map((k) => (
          <optgroup key={k} label={PLAN_KIND_LABEL[k]}>
            {data.plans.filter((p) => planKind(p.data) === k).map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} {p.id === activeIds[k] ? tx('(ใช้อยู่)') : ''}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <label className="mt-4 block text-sm text-white/70">{tx('กิลด์ที่เจอ (ถ้ามี)')}</label>
      <input
        value={opponent}
        onChange={(e) => setOpponent(e.target.value)}
        maxLength={50}
        placeholder={tx('เช่น pandoara')}
        className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 outline-none focus:border-gold"
      />

      <label className="mt-4 block text-sm text-white/70">{tx('ข้อความ')}</label>
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
        placeholder={tx('เช่น วันนี้เปลี่ยนจากแผน 1 เป็นแผน 2 เพราะอีกฝั่งบ้านเวทเยอะ')}
        className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 p-3 outline-none focus:border-gold"
      />
      {err && <p className="mt-2 text-sm text-red-300">{err}</p>}
      <div className="mt-4 flex gap-2">
        <button disabled={busy || (!body.trim() && !planId)} onClick={submit} className="btn-gold px-6 py-2">
          {busy ? tx('กำลังประกาศ...') : tx('ประกาศ')}
        </button>
        <button onClick={onClose} className="pill px-5 py-2">{tx('ยกเลิก')}</button>
      </div>
    </Modal>
  )
}



/** ข้อความเริ่มต้นของประกาศอัตโนมัติ — สร้างจาก shared/game.ts ที่เดียวกับ API */
const AUTO_DEFAULT = { attack: defaultAutoText('attack'), defense: defaultAutoText('defense') }

function ScheduleModal({ open, onClose, gid, schedule, auto, autoText, season, reload }: { open: boolean; onClose: () => void; gid: string; schedule: DayType[]; auto: boolean; autoText: { attack: string; defense: string }; season: { start: string; end: string }; reload: () => Promise<void> }) {
  const [autoDraft, setAutoDraft] = useState(auto)
  const [textDraft, setTextDraft] = useState(autoText)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setAutoDraft(auto)
      setTextDraft(autoText)
      setErr(null)
    }
  }
  const s = currentSeason(season.start, season.end, dateKey())

  async function save() {
    setBusy(true)
    setErr(null)
    try {
      await api.saveSchedule(gid, autoDraft, { attack: textDraft.attack.trim(), defense: textDraft.defense.trim() })
      await reload()
      onClose()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title={tx('ตารางสงครามรายสัปดาห์')} onClose={onClose}>
      <div className="grid grid-cols-7 gap-1.5 text-center text-sm">
        {DAYS.map((d, i) => (
          <div key={d} className="rounded-lg bg-black/25 px-1 py-2">
            <div className="text-white/60">{DAYS_SHORT[i]}</div>
            <div className="mt-1 font-semibold">{DAY_TYPE[schedule[i] ?? 'rest'].label}</div>
          </div>
        ))}
      </div>
      {s && (
        <p className="mt-3 rounded-xl bg-black/25 px-4 py-3 text-sm text-white/70">
          <span className="font-semibold text-white">Season</span> {fmtDate(s.start)} – {fmtDate(s.end)}
          {s.phase === 'off' && <span className="text-white/50">{' '}{tx('· ตอนนี้ช่วงพัก Season ถัดไปเริ่ม')}{' '}{fmtDate(s.nextStart)}</span>}
          {s.phase === 'before' && <span className="text-white/50">{' '}{tx('· ยังไม่เริ่ม')}</span>}
        </p>
      )}
      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-black/25 px-4 py-3">
        <input type="checkbox" checked={autoDraft} onChange={(e) => setAutoDraft(e.target.checked)} className="mt-1 h-4 w-4 accent-[#e2bf72]" />
        <span>
          <span className="font-semibold">{tx('ประกาศวันใหม่อัตโนมัติ 07:00')}</span>
          <span className="block text-sm text-white/55">{tx('บอกว่าวันนี้วันตีหรือจัดบ้านกันตามตารางนี้ (วันพักไม่แจ้ง) และแจ้งวันเริ่ม/วันสุดท้ายของ Season ส่วนแผนที่ใช้ไม่เปลี่ยน')}</span>
        </span>
      </label>
      <div className={`mt-3 space-y-3 rounded-xl bg-black/25 px-4 py-3 ${autoDraft ? '' : 'opacity-50'}`}>
        <p className="text-sm font-semibold">{tx('ข้อความที่ประกาศ')}</p>
        {(['attack', 'defense'] as const).map((k) => {
          const v = textDraft[k]
          // ตัวอย่างตรงกับที่ส่งเข้า Discord จริง (ชื่อวันภาษาไทย)
          const preview = fillDay(v.trim() || AUTO_DEFAULT[k], DAY_NAMES[dayIndex()])
          return (
            <label key={k} className="block">
              <span className="text-sm text-white/70">{DAY_TYPE[k].label}</span>
              <textarea rows={2} maxLength={MAX_AUTO_TEXT} value={v} disabled={!autoDraft}
                onChange={(e) => setTextDraft((d) => ({ ...d, [k]: e.target.value }))}
                placeholder={AUTO_DEFAULT[k]}
                className="mt-1 w-full resize-y rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm" />
              <span className="mt-0.5 flex justify-between gap-2 text-xs text-white/45">
                <span className="min-w-0 truncate">{tx('ตัวอย่าง:')}{' '}{preview}</span>
                <span className="shrink-0">{v.length}/{MAX_AUTO_TEXT}</span>
              </span>
            </label>
          )
        })}
        {EN && <p className="text-xs text-amber-300">Discord messages are currently posted in Thai (default text and day names).</p>}
        <p className="text-xs text-white/45">
          {tx('พิมพ์')}{' '}<code className="rounded bg-white/10 px-1">{EN ? DAY_PLACEHOLDER_EN : DAY_PLACEHOLDER}</code>{' '}{tx('แทนชื่อวัน (เช่น อังคาร) · เว้นว่าง = ใช้ข้อความเริ่มต้น · วันเริ่ม/วันสุดท้ายของ Season ยังใช้ข้อความ Season เหมือนเดิม · ส่งเข้า Discord ด้วย (ถ้าเชื่อมไว้)')}
        </p>
      </div>
      {err && <p className="mt-3 text-sm text-red-300">{err}</p>}
      <div className="mt-5 flex gap-2">
        <button disabled={busy} onClick={save} className="btn-gold px-6 py-2">{busy ? tx('กำลังบันทึก...') : tx('บันทึก')}</button>
        <button onClick={onClose} className="pill px-5 py-2">{tx('ยกเลิก')}</button>
      </div>
    </Modal>
  )
}
