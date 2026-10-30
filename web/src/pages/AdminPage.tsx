import { Link } from 'react-router'
import { useEffect, useMemo, useState } from 'react'
import { AlarmClock, DatabaseBackup, Lock, RefreshCw, Trash2 } from 'lucide-react'
import Modal from '../components/Modal'
import { DeleteGuild } from '../components/EditAccess'
import { api, type AdminBackup, type AdminGuild, type AdminStats } from '../lib/api'
import { L, LOCALE } from '../lib/i18n'
import { useAuth } from '../lib/auth'
import NotFound from './NotFound'
import AdminPacks from '../components/AdminPacks'
import AdminUsage from '../components/AdminUsage'
import AdminUsers from '../components/AdminUsers'

const DAY = 86_400_000
type SortKey = 'lastActive' | 'createdAt' | 'targets' | 'counters' | 'name'

/** "5 นาที" / "3 ชม." / "2 วัน" ที่แล้ว */
function ago(ts: number, now: number) {
  const m = Math.max(0, Math.floor((now - ts) / 60_000))
  if (m < 60) return L(`${m} นาที`, `${m} min`)
  if (m < 1440) return L(`${Math.floor(m / 60)} ชม.`, `${Math.floor(m / 60)} h`)
  return L(`${Math.floor(m / 1440)} วัน`, `${Math.floor(m / 1440)} d`)
}

/** สถานะกิลด์ตามการใช้งาน */
function status(g: AdminGuild, now: number) {
  const used = g.targets + g.counters + g.plans + g.announcements
  if (!used) return { label: L('ยังไม่ใช้', 'Unused'), cls: 'bg-white/5 text-white/40' }
  if (now - g.lastActive < DAY) return { label: L('ใช้วันนี้', 'Today'), cls: 'bg-emerald-500/15 text-emerald-300' }
  if (now - g.lastActive < 7 * DAY) return { label: L('ใช้ใน 7 วัน', 'This week'), cls: 'bg-sky-500/15 text-sky-300' }
  return { label: L('เงียบ', 'Quiet'), cls: 'bg-amber-500/15 text-amber-300' }
}

function Tile({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-xs text-white/50">{label}</div>
      <div className="mt-1 text-2xl font-bold text-gold">{value}</div>
      {sub && <div className="text-xs text-white/40">{sub}</div>}
    </div>
  )
}

export default function AdminPage() {
  const auth = useAuth()
  const [data, setData] = useState<AdminStats | null>(null)
  const [error, setError] = useState<{ status?: number; message: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [sort, setSort] = useState<SortKey>('lastActive')
  const [del, setDel] = useState<AdminGuild | null>(null)

  const load = () => {
    setLoading(true)
    api.adminStats()
      .then((d) => { setData(d); setError(null) })
      .catch((e) => setError({ status: e.status, message: e.message }))
      .finally(() => setLoading(false))
  }
  useEffect(() => { if (auth.ready && auth.user) load() }, [auth.ready, auth.user?.id])

  const rows = useMemo(() => {
    if (!data) return []
    const g = [...data.guilds]
    if (sort === 'name') return g.sort((a, b) => a.name.localeCompare(b.name))
    return g.sort((a, b) => b[sort] - a[sort])
  }, [data, sort])

  if (!auth.ready) return <p className="py-24 text-center text-white/50">{L('กำลังโหลด...', 'Loading...')}</p>
  // ไม่ได้ล็อกอิน / ไม่ใช่แอดมิน → หน้า 404 ปกติ (ไม่ให้รู้ว่ามีหน้านี้)
  if (!auth.user || error?.status === 404) return <NotFound />
  if (error)
    return (
      <div className="py-24 text-center">
        <p className="text-lg">{error.message}</p>
        <Link to="/" className="btn-gold mt-6 inline-block px-5 py-2">{L('กลับหน้าแรก', 'Back to home')}</Link>
      </div>
    )
  if (!data) return <p className="py-24 text-center text-white/50">{L('กำลังโหลด...', 'Loading...')}</p>

  const now = data.now
  const g = data.guilds
  const today = g.filter((x) => now - x.lastActive < DAY && x.targets + x.counters + x.plans + x.announcements > 0).length
  const week = g.filter((x) => now - x.lastActive < 7 * DAY && x.targets + x.counters + x.plans + x.announcements > 0).length
  const fresh = g.filter((x) => now - x.createdAt < 7 * DAY).length
  const unused = g.filter((x) => x.targets + x.counters + x.plans + x.announcements === 0).length
  const sum = (k: 'targets' | 'counters' | 'plans') => g.reduce((s, x) => s + x[k], 0)
  const locked = g.filter((x) => x.locked).length
  const reminder = g.filter((x) => x.warReminder).length

  const th = (key: SortKey, label: string, cls = '') => (
    <th className={`cursor-pointer select-none px-3 py-2 font-medium hover:text-gold ${sort === key ? 'text-gold' : ''} ${cls}`} onClick={() => setSort(key)}>
      {label}{sort === key ? ' ▾' : ''}
    </th>
  )

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">{L('แอดมิน', 'Admin')} · <span className="text-gold">{L('ภาพรวมกิลด์', 'Guild overview')}</span></h1>
        <button className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-sm hover:border-gold/60" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />{' '}{L('รีเฟรช', 'Refresh')}
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label={L('กิลด์ทั้งหมด', 'Guilds')} value={g.length} sub={L(`ใหม่ใน 7 วัน ${fresh}`, `${fresh} new this week`)} />
        <Tile label={L('ใช้วันนี้', 'Active today')} value={today} sub={L(`ใน 7 วัน ${week}`, `${week} this week`)} />
        <Tile label={L('สร้างแล้วยังไม่ใช้', 'Created, never used')} value={unused} />
        <Tile label={L('ล็อกอิน Discord อยู่', 'Discord logins')} value={data.discordUsers} sub={L('คน', 'people')} />
      </div>
      <p className="mt-2 text-xs text-white/40">
        {L('รวม', 'Total')} {L('บ้านศัตรู', 'enemy houses')} {sum('targets').toLocaleString()} · {L('ทีมแก้', 'counters')} {sum('counters').toLocaleString()} · {L('แผน', 'plans')} {sum('plans').toLocaleString()}
        {' · '}<Lock className="inline h-3 w-3" /> {L(`ล็อกรหัส ${locked} กิลด์`, `${locked} locked with a guild code`)}
        {' · '}<AlarmClock className="inline h-3 w-3" /> {L(`เตือนก่อนหมดเวลา 1 ชม. ${reminder} กิลด์`, `${reminder} with the 1-hour reminder`)}
      </p>
      {data.backup && <BackupCard b={data.backup} now={now} />}

      <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-black/30 text-left text-xs text-white/50">
            <tr>
              {th('name', L('กิลด์', 'Guild'))}
              <th className="px-3 py-2 font-medium">{L('สถานะ', 'Status')}</th>
              {th('lastActive', L('ใช้ล่าสุด', 'Last active'))}
              {th('createdAt', L('สร้างเมื่อ', 'Created'))}
              {th('targets', L('เป้าหมาย', 'Targets'), 'text-right')}
              {th('counters', L('ทีมแก้', 'Counters'), 'text-right')}
              <th className="px-3 py-2 text-right font-medium">{L('แผน', 'Plans')}</th>
              <th className="px-3 py-2 text-right font-medium">{L('ประกาศ', 'Posts')}</th>
              <th className="px-3 py-2 font-medium">Discord</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => {
              const st = status(x, now)
              return (
                <tr key={x.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="px-3 py-2">
                    <Link to={`/g/${x.id}`} className="font-medium hover:text-gold">{x.name}</Link>
                    {!!x.locked && <Lock className="ml-1.5 inline h-3.5 w-3.5 text-gold/80" aria-label={L('ล็อกด้วยรหัสเข้ากิลด์', 'Locked with a guild code')} />}
                  </td>
                  <td className="px-3 py-2"><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${st.cls}`}>{st.label}</span></td>
                  <td className="px-3 py-2 text-white/70">{ago(x.lastActive, now)}</td>
                  <td className="px-3 py-2 text-white/50">{new Date(x.createdAt).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' })}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{x.targets}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{x.counters}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{x.plans}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{x.announcements}{x.autoAnnouncements ? <span className="text-white/40"> +{x.autoAnnouncements} auto</span> : null}</td>
                  <td className="px-3 py-2 text-xs text-white/60">{[x.webhook ? 'webhook' : '', x.discordLogin ? L('ล็อกอิน', 'login') : '', x.warReminder ? L('เตือน 1 ชม.', '1h reminder') : ''].filter(Boolean).join(' · ') || '–'}</td>
                  <td className="px-2 py-2 text-right">
                    <button type="button" onClick={() => setDel(x)} title={L(`ลบ ${x.name}`, `Delete ${x.name}`)} className="rounded-full p-1.5 text-white/35 hover:bg-red-500/15 hover:text-red-300">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ลบกิลด์ (ยืนยันเหมือนลบปกติ: อ่านคำเตือน → พิมพ์ชื่อ → รอ 5 วิ) */}
      <Modal open={!!del} title={`${L('ลบกิลด์', 'Delete guild')}: ${del?.name ?? ''}`} onClose={() => setDel(null)}>
        {del && (
          <>
            <p className="text-sm text-white/60">{L(`${del.targets} บ้านศัตรู · ${del.counters} ทีมแก้ · ${del.plans} แผน · ${del.announcements} ประกาศ`, `${del.targets} enemy houses · ${del.counters} counters · ${del.plans} plans · ${del.announcements} posts`)}</p>
            <DeleteGuild key={del.id} gid={del.id} guildName={del.name} startAt={1} onCancel={() => setDel(null)}
              onDelete={async (typed) => { await api.adminDeleteGuild(del.id, typed); setDel(null); load() }} />
          </>
        )}
      </Modal>
      <p className="mt-2 text-xs text-white/35">{L('เห็นแค่ตัวเลข — ไม่แสดง webhook URL, รหัส หรือเนื้อหาในกิลด์', 'Numbers only — no webhook URLs, codes or guild content')}</p>
      <AdminUsers />
      <AdminUsage />
      <AdminPacks />
    </div>
  )
}

const mb = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`)
const thaiTime = (ts: number) => new Date(ts).toLocaleString(LOCALE, { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** สำรองฐานข้อมูลทุกคืน 03:00 → R2: คืนล่าสุดสำเร็จไหม (เกิน 26 ชม. = เตือน) */
function BackupCard({ b, now }: { b: AdminBackup; now: number }) {
  const title = <span className="flex items-center gap-1.5 font-semibold"><DatabaseBackup className="h-4 w-4 text-gold" />{L('สำรองข้อมูลทุกคืน', 'Nightly backup')}</span>
  const box = (tone: 'ok' | 'warn' | 'muted', body: React.ReactNode) => (
    <div className={`mt-4 rounded-2xl border p-4 text-sm ${tone === 'warn' ? 'border-amber-400/30 bg-amber-500/10 text-amber-100' : 'border-white/10 bg-black/20'}`}>
      {title}
      <div className={`mt-1 ${tone === 'muted' ? 'text-white/50' : ''}`}>{body}</div>
    </div>
  )
  if (!b.configured) return box('muted', L('ไม่ได้ผูก R2 (BACKUP) กับ API นี้ — ปกติในเครื่อง dev', 'No R2 bucket (BACKUP) bound to this API — normal on a local dev server'))
  if (!('count' in b)) return box('warn', L('อ่านรายชื่อไฟล์สำรองไม่ได้ ลองรีเฟรชอีกครั้ง', 'Could not list the backup files. Try refreshing.'))
  if (!b.latest) return box('muted', L('ยังไม่มีไฟล์สำรอง — รอบแรกจะทำตอนตี 3 (เวลาไทย)', 'No backup yet — the first one runs at 03:00 Thai time'))
  const late = now - b.latest.uploadedAt > 26 * 3_600_000
  return box(late ? 'warn' : 'ok', (
    <>
      <p>
        {L('ล่าสุด', 'Latest')} {thaiTime(b.latest.uploadedAt)} ({L(`${ago(b.latest.uploadedAt, now)} ที่แล้ว`, `${ago(b.latest.uploadedAt, now)} ago`)})
        {' · '}{mb(b.latest.bytes)}
        {b.latest.rows !== null && <> · {L(`${b.latest.rows.toLocaleString()} แถว`, `${b.latest.rows.toLocaleString()} rows`)}</>}
      </p>
      <p className="mt-0.5 text-xs text-white/45">
        {L(`เก็บไว้ ${b.count} ไฟล์ รวม ${mb(b.totalBytes)} · ลบไฟล์ที่เก่ากว่า ${b.keepDays} วันเอง`, `${b.count} files kept, ${mb(b.totalBytes)} in total · files older than ${b.keepDays} days are removed`)}
      </p>
      {late && <p className="mt-2 text-xs">{L('ไม่ได้สำรองเกิน 1 วันแล้ว — ดู Workers Logs ของ 7k-note-api หาคำว่า "backup failed"', 'No backup for over a day — check the 7k-note-api Workers Logs for "backup failed"')}</p>}
    </>
  ))
}
