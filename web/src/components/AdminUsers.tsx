import { useEffect, useState } from 'react'
import { RefreshCw, Users } from 'lucide-react'
import { api, type AdminUsers as Data } from '../lib/api'
import { L, LOCALE } from '../lib/i18n'

const DAY = 86_400_000

/** "วันนี้" / "เมื่อวาน" / "3 วันก่อน" — last_seen จดวันละครั้ง เลยบอกแค่ระดับวัน */
function daysAgo(ts: number | null, now: number) {
  if (!ts) return '–'
  const d = Math.floor((now - ts) / DAY)
  if (d <= 0) return L('ภายใน 24 ชม.', 'Last 24 h')
  if (d === 1) return L('เมื่อวาน', 'Yesterday')
  return L(`${d} วันก่อน`, `${d} days ago`)
}

/** หน้าแอดมิน: คนที่ล็อกอิน Discord อยู่ (session ยังไม่หมดอายุ) เรียงตามเข้าใช้ล่าสุด */
export default function AdminUsers() {
  const [data, setData] = useState<Data | null>(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const load = () => {
    setLoading(true)
    api.adminUsers()
      .then((d) => { setData(d); setErr('') })
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])
  const now = data?.now ?? 0
  const users = data?.users ?? []
  const today = users.filter((u) => u.lastSeen && now - u.lastSeen < DAY).length
  const week = users.filter((u) => u.lastSeen && now - u.lastSeen < 7 * DAY).length
  const legacy = users.filter((u) => !u.renews).length

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold"><Users className="h-5 w-5 text-gold" />{' '}{L('คนที่ล็อกอิน Discord', 'Discord logins')}</h2>
        <button className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-sm hover:border-gold/60" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />{' '}{L('รีเฟรช', 'Refresh')}
        </button>
      </div>
      {err && <p className="mt-3 text-sm text-red-300">{err}</p>}
      {data && (
        <>
          <p className="mt-2 text-sm text-white/60">
            {L(`ล็อกอินอยู่ ${users.length} คน · เข้าใน 24 ชม. ${today} · ใน 7 วัน ${week}`, `${users.length} logged in · ${today} in the last 24 h · ${week} in 7 days`)}
            {legacy > 0 && <span className="text-white/40">{' · '}{L(`${legacy} คนยังเป็นล็อกอินแบบเก่า (ไม่ต่ออายุ)`, `${legacy} on old logins (no renewal)`)}</span>}
          </p>
          <div className="mt-3 max-h-[28rem] overflow-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-black/60 text-left text-xs text-white/50">
                <tr>
                  <th className="px-3 py-2 font-medium">{L('ชื่อ Discord', 'Discord name')}</th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium">{L('เข้าล่าสุด', 'Last seen')}</th>
                  <th className="hidden whitespace-nowrap px-3 py-2 font-medium sm:table-cell">{L('ล็อกอินเมื่อ', 'Logged in')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-white/5">
                    <td className="px-3 py-2">
                      <span className="flex min-w-0 items-center gap-2">
                        {u.avatar ? <img src={u.avatar} alt="" width={20} height={20} loading="lazy" className="h-5 w-5 shrink-0 rounded-full" /> : <span className="h-5 w-5 shrink-0 rounded-full bg-white/10" />}
                        <span className="max-w-[10rem] truncate sm:max-w-none">{u.name}</span>
                        {u.devices > 1 && <span className="shrink-0 text-xs text-white/40">×{u.devices}</span>}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-white/70">{daysAgo(u.lastSeen, now)}</td>
                    <td className="hidden whitespace-nowrap px-3 py-2 text-white/50 sm:table-cell">{u.loginAt ? new Date(u.loginAt).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' }) : L('ก่อน 1.7', 'Before 1.7')}</td>
                  </tr>
                ))}
                {!users.length && <tr><td colSpan={3} className="px-3 py-4 text-center text-white/40">{L('ยังไม่มีใครล็อกอิน', 'Nobody is logged in')}</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="mt-2 text-xs text-white/35">{L('เห็นเฉพาะคนที่ล็อกอินยังไม่หมดอายุ (หายไปเกิน 7 วันจะหลุดจากรายการ) · เข้าล่าสุดจดวันละครั้ง · ×2 = ล็อกอินไว้ 2 เครื่อง', 'Only logins that have not expired (gone for over 7 days = dropped) · last seen is saved once a day · ×2 = logged in on 2 devices')}</p>
    </section>
  )
}
