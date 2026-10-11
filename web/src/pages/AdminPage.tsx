import { Link } from 'react-router'
import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Trash2 } from 'lucide-react'
import Modal from '../components/Modal'
import { DeleteGuild } from '../components/EditAccess'
import { api, type AdminGuild, type AdminStats } from '../lib/api'
import { useAuth } from '../lib/auth'
import NotFound from './NotFound'
import AdminPacks from '../components/AdminPacks'

const DAY = 86_400_000
type SortKey = 'lastActive' | 'createdAt' | 'targets' | 'counters' | 'name'

/** "5 นาที" / "3 ชม." / "2 วัน" ที่แล้ว */
function ago(ts: number, now: number) {
  const m = Math.max(0, Math.floor((now - ts) / 60_000))
  if (m < 60) return `${m} นาที`
  if (m < 1440) return `${Math.floor(m / 60)} ชม.`
  return `${Math.floor(m / 1440)} วัน`
}

/** สถานะกิลด์ตามการใช้งาน */
function status(g: AdminGuild, now: number) {
  const used = g.targets + g.counters + g.plans + g.announcements
  if (!used) return { label: 'ยังไม่ใช้', cls: 'bg-white/5 text-white/40' }
  if (now - g.lastActive < DAY) return { label: 'ใช้วันนี้', cls: 'bg-emerald-500/15 text-emerald-300' }
  if (now - g.lastActive < 7 * DAY) return { label: 'ใช้ใน 7 วัน', cls: 'bg-sky-500/15 text-sky-300' }
  return { label: 'เงียบ', cls: 'bg-amber-500/15 text-amber-300' }
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

  if (!auth.ready) return <p className="py-24 text-center text-white/50">กำลังโหลด...</p>
  // ไม่ได้ล็อกอิน / ไม่ใช่แอดมิน → หน้า 404 ปกติ (ไม่ให้รู้ว่ามีหน้านี้)
  if (!auth.user || error?.status === 404) return <NotFound />
  if (error)
    return (
      <div className="py-24 text-center">
        <p className="text-lg">{error.message}</p>
        <Link to="/" className="btn-gold mt-6 inline-block px-5 py-2">กลับหน้าแรก</Link>
      </div>
    )
  if (!data) return <p className="py-24 text-center text-white/50">กำลังโหลด...</p>

  const now = data.now
  const g = data.guilds
  const today = g.filter((x) => now - x.lastActive < DAY && x.targets + x.counters + x.plans + x.announcements > 0).length
  const week = g.filter((x) => now - x.lastActive < 7 * DAY && x.targets + x.counters + x.plans + x.announcements > 0).length
  const fresh = g.filter((x) => now - x.createdAt < 7 * DAY).length
  const unused = g.filter((x) => x.targets + x.counters + x.plans + x.announcements === 0).length
  const sum = (k: 'targets' | 'counters' | 'plans') => g.reduce((s, x) => s + x[k], 0)

  const th = (key: SortKey, label: string, cls = '') => (
    <th className={`cursor-pointer select-none px-3 py-2 font-medium hover:text-gold ${sort === key ? 'text-gold' : ''} ${cls}`} onClick={() => setSort(key)}>
      {label}{sort === key ? ' ▾' : ''}
    </th>
  )

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">แอดมิน · <span className="text-gold">ภาพรวมกิลด์</span></h1>
        <button className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-sm hover:border-gold/60" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> รีเฟรช
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="กิลด์ทั้งหมด" value={g.length} sub={`ใหม่ใน 7 วัน ${fresh}`} />
        <Tile label="ใช้วันนี้" value={today} sub={`ใน 7 วัน ${week}`} />
        <Tile label="สร้างแล้วยังไม่ใช้" value={unused} />
        <Tile label="ล็อกอิน Discord อยู่" value={data.discordUsers} sub="คน" />
      </div>
      <p className="mt-2 text-xs text-white/40">
        รวม บ้านศัตรู {sum('targets').toLocaleString()} · ทีมแก้ {sum('counters').toLocaleString()} · แผน {sum('plans').toLocaleString()}
      </p>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-black/30 text-left text-xs text-white/50">
            <tr>
              {th('name', 'กิลด์')}
              <th className="px-3 py-2 font-medium">สถานะ</th>
              {th('lastActive', 'ใช้ล่าสุด')}
              {th('createdAt', 'สร้างเมื่อ')}
              {th('targets', 'เป้าหมาย', 'text-right')}
              {th('counters', 'ทีมแก้', 'text-right')}
              <th className="px-3 py-2 text-right font-medium">แผน</th>
              <th className="px-3 py-2 text-right font-medium">ประกาศ</th>
              <th className="px-3 py-2 font-medium">Discord</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => {
              const st = status(x, now)
              return (
                <tr key={x.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="px-3 py-2"><Link to={`/g/${x.id}`} className="font-medium hover:text-gold">{x.name}</Link></td>
                  <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs ${st.cls}`}>{st.label}</span></td>
                  <td className="px-3 py-2 text-white/70">{ago(x.lastActive, now)}</td>
                  <td className="px-3 py-2 text-white/50">{new Date(x.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{x.targets}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{x.counters}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{x.plans}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{x.announcements}{x.autoAnnouncements ? <span className="text-white/40"> +{x.autoAnnouncements} auto</span> : null}</td>
                  <td className="px-3 py-2 text-xs text-white/60">{[x.webhook ? 'webhook' : '', x.discordLogin ? 'ล็อกอิน' : ''].filter(Boolean).join(' · ') || '–'}</td>
                  <td className="px-2 py-2 text-right">
                    <button type="button" onClick={() => setDel(x)} title={`ลบ ${x.name}`} className="rounded-full p-1.5 text-white/35 hover:bg-red-500/15 hover:text-red-300">
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
      <Modal open={!!del} title={`ลบกิลด์: ${del?.name ?? ''}`} onClose={() => setDel(null)}>
        {del && (
          <>
            <p className="text-sm text-white/60">{del.targets} บ้านศัตรู · {del.counters} ทีมแก้ · {del.plans} แผน · {del.announcements} ประกาศ</p>
            <DeleteGuild key={del.id} gid={del.id} guildName={del.name} startAt={1} onCancel={() => setDel(null)}
              onDelete={async (typed) => { await api.adminDeleteGuild(del.id, typed); setDel(null); load() }} />
          </>
        )}
      </Modal>
      <p className="mt-2 text-xs text-white/35">เห็นแค่ตัวเลข — ไม่แสดง webhook URL, รหัส หรือเนื้อหาในกิลด์</p>
      <AdminPacks />
    </div>
  )
}
