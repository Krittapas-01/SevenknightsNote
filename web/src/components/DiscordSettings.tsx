import { Check, MessageCircle, Send, Unlink } from 'lucide-react'
import { useState } from 'react'
import { api } from '../lib/api'
import type { GuildData } from '../lib/types'
import Modal from './Modal'

type Mode = '' | 'everyone' | 'here' | 'role'
const modeOf = (m: string): Mode => (m === '' || m === 'everyone' || m === 'here' ? m : 'role')

/** ปุ่ม + หน้าตั้งค่าแจ้งเตือนประกาศเข้า Discord (เฉพาะคนแก้ได้) */
export default function DiscordSettings({ gid, discord, reload }: { gid: string; discord: GuildData['discord']; reload: () => Promise<void> }) {
  const connected = !!discord?.connected
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [mode, setMode] = useState<Mode>('')
  const [role, setRole] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  function show() {
    const m = discord?.mention ?? ''
    setUrl('')
    setMode(modeOf(m))
    setRole(modeOf(m) === 'role' ? m : '')
    setMsg(null)
    setOpen(true)
  }

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true)
    setMsg(null)
    try {
      await fn()
      setMsg({ ok: true, text: ok })
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const mention = mode === 'role' ? role.trim() : mode
  const save = () =>
    run(async () => {
      if (mode === 'role' && !/^\d{5,25}$/.test(role.trim().replace(/^<@&(\d+)>$/, '$1'))) throw new Error('ใส่ Role ID เป็นตัวเลข')
      await api.saveDiscord(gid, { mention, ...(url.trim() ? { webhook: url.trim() } : {}) })
      setUrl('')
      await reload()
    }, 'บันทึกแล้ว')
  const test = () => run(() => api.testDiscord(gid), 'ส่งข้อความทดสอบแล้ว ลองดูในห้อง Discord')
  const unlink = () =>
    run(async () => {
      await api.saveDiscord(gid, { mention: '', webhook: '' })
      await reload()
    }, 'ยกเลิกการเชื่อมแล้ว')

  const field = 'mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 outline-none focus:border-gold'
  return (
    <>
      <button onClick={show} title="แจ้งเตือนเข้า Discord"
        className={`rounded-full p-1.5 hover:bg-white/10 ${connected ? 'text-[#8b93ff]' : 'text-white/60 hover:text-white'}`}>
        <MessageCircle className="h-4 w-4" />
      </button>
      <Modal open={open} title="แจ้งเตือนประกาศเข้า Discord" onClose={() => setOpen(false)}>
        <p className={`flex items-center gap-1.5 text-sm ${connected ? 'text-green-400' : 'text-white/55'}`}>
          {connected ? <><Check className="h-4 w-4" /> เชื่อมอยู่ ทุกประกาศ (รวมประกาศอัตโนมัติ 07:00) จะส่งเข้าห้อง</> : 'ยังไม่ได้เชื่อม'}
        </p>

        <label className="mt-4 block text-sm text-white/70">{connected ? 'เปลี่ยนเป็นห้องอื่น (เว้นว่าง = ใช้ห้องเดิม)' : 'ลิงก์ Webhook ของห้อง'}</label>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://discord.com/api/webhooks/..." className={field} autoComplete="off" />
        <p className="mt-1 text-xs text-white/40">ในดิสคอร์ด: ตั้งค่าห้อง → Integrations → Webhooks → New Webhook → Copy Webhook URL (ลิงก์นี้เก็บเป็นความลับ คนดูเว็บไม่เห็น)</p>

        <label className="mt-4 block text-sm text-white/70">แท็กใครตอนประกาศ</label>
        <div className="pill mt-1 flex w-fit flex-wrap p-0.5 text-sm">
          {([['', 'ไม่แท็ก'], ['role', 'ยศ'], ['here', '@here'], ['everyone', '@everyone']] as const).map(([m, label]) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`rounded-full px-3 py-1 ${mode === m ? 'bg-gold font-semibold text-ink' : 'text-white/70 hover:bg-white/10'}`}>
              {label}
            </button>
          ))}
        </div>
        {mode === 'role' && (
          <>
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role ID เช่น 123456789012345678" inputMode="numeric" className={field} />
            <p className="mt-1 text-xs text-white/40">เปิด Developer Mode (ตั้งค่าผู้ใช้ → Advanced) แล้วไป Server Settings → Roles → คลิกขวาที่ยศ → Copy Role ID</p>
          </>
        )}

        {msg && <p className={`mt-4 text-sm ${msg.ok ? 'text-green-400' : 'text-red-300'}`}>{msg.text}</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          <button disabled={busy || (!connected && !url.trim())} onClick={save} className="btn-gold px-6 py-2">บันทึก</button>
          {connected && (
            <>
              <button disabled={busy} onClick={test} className="pill flex items-center gap-1.5 px-4 py-2 text-sm hover:border-gold"><Send className="h-4 w-4" /> ส่งข้อความทดสอบ</button>
              <button disabled={busy} onClick={unlink} className="pill ml-auto flex items-center gap-1.5 px-4 py-2 text-sm text-white/60 hover:border-red-400 hover:text-red-300"><Unlink className="h-4 w-4" /> ยกเลิกการเชื่อม</button>
            </>
          )}
        </div>
      </Modal>
    </>
  )
}
