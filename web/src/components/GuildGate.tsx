import { Lock } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { EditLogin } from './EditAccess'
import { L } from '../lib/i18n'

/**
 * หน้าใส่รหัสเข้ากิลด์ — กิลด์ที่หัวกิลด์ล็อกไว้ (กันคนที่ออกกิลด์ไปแล้วแต่ยังมีลิงก์)
 * คนที่มีรหัสแก้ไข/ยศ Discord ที่แก้ได้ กด "ใส่รหัสแก้ไข" แทนได้ (ผ่านแล้วเว็บได้รหัสเข้ากิลด์มาเอง)
 */
export default function GuildGate({ gid, name, msg, onUnlock, onLogin }: {
  gid: string
  name: string
  msg: string
  onUnlock: (code: string) => Promise<void>
  onLogin: () => void
}) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  // มาจากหน้ากิลด์ที่เลื่อนลงไว้ (ถูกล็อกระหว่างเปิดอยู่) → กลับขึ้นบนสุด ไม่ให้กรอบใส่รหัสมุดใต้แถบด้านบน
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const c = code.trim()
    if (!c || busy) return
    setBusy(true)
    try { await onUnlock(c) } finally { setBusy(false) }
  }

  return (
    <div className="mx-auto max-w-md pb-24 pt-10 sm:py-20">
      <div className="panel panel-gold px-5 py-8 text-center sm:px-8">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-gold/40 bg-black/25 text-gold">
          <Lock className="h-5 w-5" />
        </span>
        {name && <h1 className="gold-title mt-4 break-words text-2xl font-extrabold">{name}</h1>}
        <p className="mt-2 text-sm text-white/65">{L('กิลด์นี้ล็อกไว้ ใส่รหัสเข้ากิลด์เพื่อดูแผนและทีมแก้', 'This guild is locked. Enter the guild code to see its plans and counters.')}</p>
        <form onSubmit={submit} className="mt-5 space-y-3 text-left">
          <label className="block text-sm text-white/70">
            {L('รหัสเข้ากิลด์', 'Guild code')}
            <input value={code} onChange={(e) => setCode(e.target.value)} autoFocus autoComplete="off" autoCapitalize="off" spellCheck={false} maxLength={32}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none focus:border-gold" />
          </label>
          {msg && <p role="alert" className="text-sm text-red-400">{msg}</p>}
          <button disabled={busy || !code.trim()} className="btn-gold w-full py-2">{busy ? L('กำลังตรวจ...', 'Checking...') : L('เข้ากิลด์', 'Enter guild')}</button>
          <p className="text-xs text-white/45">{L('ขอรหัสหรือลิงก์เชิญจากหัวกิลด์ · เครื่องนี้จะจำรหัสไว้', 'Ask your guild leader for the code or an invite link. This device will remember it.')}</p>
        </form>
        <div className="mt-6 border-t border-white/10 pt-5">
          <p className="mb-3 text-xs text-white/45">{L('หัวกิลด์/คนที่แก้แผนได้ เข้าด้วยรหัสแก้ไขหรือ Discord ได้เลย', 'Leaders and editors can get in with the edit password or Discord.')}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <EditLogin gid={gid} onLogin={onLogin} />
            <Link to="/" className="pill px-4 py-2 text-sm hover:border-gold">{L('กลับหน้าแรก', 'Back to home')}</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
