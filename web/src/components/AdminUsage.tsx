import { useEffect, useState } from 'react'
import { BarChart3, RefreshCw } from 'lucide-react'
import { api, type AdminUsage as Usage } from '../lib/api'
import { L } from '../lib/i18n'
import { USAGE_LABELS, type UsageEvent } from '../../../shared/usage'

/** หน้าแอดมิน: จำนวนครั้งที่ใช้แต่ละฟีเจอร์ (Workers Analytics Engine) — วันนี้ (วันในเกม 07:00) / 7 วัน / 30 วัน */
export default function AdminUsage() {
  const [data, setData] = useState<Usage | null>(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const load = () => {
    setLoading(true)
    api.adminUsage()
      .then((d) => { setData(d); setErr('') })
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])
  const num = (n: number) => n.toLocaleString()

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold"><BarChart3 className="h-5 w-5 text-gold" />{' '}{L('การใช้ปุ่ม/ฟีเจอร์', 'Feature usage')}</h2>
        <button className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-sm hover:border-gold/60" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />{' '}{L('รีเฟรช', 'Refresh')}
        </button>
      </div>
      {err && <p className="mt-3 text-sm text-red-300">{err}</p>}
      {data && !data.configured && (
        <div className="mt-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <p>{L('ยังเก็บตัวเลขอยู่ แต่หน้านี้ยังอ่านไม่ได้ — ต้องตั้ง Cloudflare API token ก่อน:', 'Counts are being collected, but this page cannot read them yet — set a Cloudflare API token:')}</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-amber-100/80">
            <li>{L('Cloudflare dashboard → My Profile → API Tokens → Create Custom Token → สิทธิ์ Account · Account Analytics · Read', 'Cloudflare dashboard → My Profile → API Tokens → Create Custom Token → permission Account · Account Analytics · Read')}</li>
            <li>{L('ในโฟลเดอร์ api รัน', 'In the api folder run')}{' '}<code className="rounded bg-black/30 px-1.5 py-0.5">npx wrangler secret put CF_API_TOKEN</code>{' '}{L('แล้ววาง token', 'and paste the token')}</li>
          </ol>
        </div>
      )}
      {data?.configured && data.error && <p className="mt-3 text-sm text-red-300">{L('อ่านสถิติไม่ได้', 'Could not read stats')} ({data.error}) — {L('เช็กสิทธิ์ของ token (Account Analytics: Read)', 'check the token permission (Account Analytics: Read)')}</p>}
      {data?.configured && data.rows && (
        <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[340px] text-sm">
            <thead className="bg-black/30 text-left text-xs text-white/50">
              <tr>
                <th className="px-3 py-2 font-medium">{L('ฟีเจอร์', 'Feature')}</th>
                <th className="px-3 py-2 text-right font-medium">{L('วันนี้', 'Today')}</th>
                <th className="px-3 py-2 text-right font-medium">{L('7 วัน', '7 days')}</th>
                <th className="px-3 py-2 text-right font-medium">{L('30 วัน', '30 days')}</th>
              </tr>
            </thead>
            <tbody>
              {[...data.rows].sort((a, b) => b.d30 - a.d30).map((r) => {
                const label = USAGE_LABELS[r.event as UsageEvent]
                return (
                  <tr key={r.event} className="border-t border-white/5">
                    <td className="px-3 py-2">{label ? L(label[0], label[1]) : r.event}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{num(r.today)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{num(r.d7)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gold">{num(r.d30)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-white/35">{L('นับแค่จำนวนครั้ง ส่งตอนปิด/ซ่อนแท็บ — ไม่มี URL, ชื่อกิลด์ หรือข้อมูลผู้ใช้ · "วันนี้" เริ่ม 07:00', 'Counts only, sent when a tab is hidden — no URLs, guild names or user data · "Today" starts 07:00 Thai time')}</p>
    </section>
  )
}
