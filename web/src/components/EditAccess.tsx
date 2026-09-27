import { Check, Eye, EyeOff, KeyRound, LogOut } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { api, forgetEditKey, saveEditKey } from '../lib/api'
import Modal from './Modal'

const input = 'w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 pr-10 outline-none focus:border-gold'

function PasswordField({ value, onChange, label, autoComplete, autoFocus }: {
  value: string; onChange: (v: string) => void; label: string; autoComplete: string; autoFocus?: boolean
}) {
  const [show, setShow] = useState(false)
  return (
    <label className="block text-sm text-white/70">
      {label}
      <span className="relative mt-1 block">
        <input type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete} autoFocus={autoFocus} className={input} />
        <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'ซ่อนรหัส' : 'แสดงรหัส'}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-white/50 hover:text-white">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
    </label>
  )
}

/** คนที่ยังดูอย่างเดียว: ใส่รหัสเพื่อเข้าโหมดแก้ไข */
export function EditLogin({ gid, onLogin }: { gid: string; onLogin: () => void }) {
  const [open, setOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const key = pw.trim()
    if (!key) return
    setBusy(true)
    setErr('')
    try {
      const r = await api.checkEdit(gid, key)
      if (r.canEdit) {
        saveEditKey(gid, key)
        setOpen(false)
        setPw('')
        onLogin()
      } else setErr(r.locked ? 'ใส่รหัสผิดหลายครั้ง ลองใหม่ในอีก 15 นาที' : 'รหัสไม่ถูกต้อง')
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="pill flex items-center gap-1.5 px-4 py-2 text-sm hover:border-gold">
        <KeyRound className="h-4 w-4" /> ใส่รหัสแก้ไข
      </button>
      <Modal open={open} title="ใส่รหัสแก้ไข" onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          <PasswordField label="รหัสแก้ไขของกิลด์" value={pw} onChange={setPw} autoComplete="current-password" autoFocus />
          {err && <p className="text-sm text-red-400">{err}</p>}
          <button disabled={busy || !pw.trim()} className="btn-gold w-full py-2">{busy ? 'กำลังตรวจ...' : 'เข้าโหมดแก้ไข'}</button>
          <p className="text-xs text-white/45">เครื่องนี้จะจำรหัสไว้ ไม่ต้องใส่ใหม่ทุกครั้ง</p>
        </form>
      </Modal>
    </>
  )
}

/** คนที่แก้ได้อยู่แล้ว: ตั้งรหัสใหม่ / ออกจากโหมดแก้ไข */
export function EditSettings({ gid, onLogout }: { gid: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  function close() {
    setOpen(false)
    setPw('')
    setPw2('')
    setErr('')
    setDone(false)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const next = pw.trim()
    if (next.length < 6) return setErr('รหัสต้องยาวอย่างน้อย 6 ตัวอักษร')
    if (next !== pw2.trim()) return setErr('รหัสสองช่องไม่ตรงกัน')
    setBusy(true)
    setErr('')
    try {
      await api.setPassword(gid, next)
      saveEditKey(gid, next)
      setDone(true)
      setPw('')
      setPw2('')
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="pill flex items-center gap-1.5 px-4 py-2 text-sm hover:border-gold">
        <KeyRound className="h-4 w-4" /> รหัสแก้ไข
      </button>
      <Modal open={open} title="รหัสแก้ไขกิลด์" onClose={close}>
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-white/60">
            ตั้งรหัสใหม่แล้วบอกเฉพาะคนที่ให้แก้แผนได้ รหัสเดิมและลิงก์แก้ไขแบบเก่าจะใช้ไม่ได้ทันที
          </p>
          <PasswordField label="รหัสใหม่ (อย่างน้อย 6 ตัว)" value={pw} onChange={setPw} autoComplete="new-password" autoFocus />
          <PasswordField label="ยืนยันรหัสใหม่" value={pw2} onChange={setPw2} autoComplete="new-password" />
          {err && <p className="text-sm text-red-400">{err}</p>}
          {done && <p className="flex items-center gap-1.5 text-sm text-green-400"><Check className="h-4 w-4" /> ตั้งรหัสใหม่แล้ว</p>}
          <button disabled={busy || !pw.trim() || !pw2.trim()} className="btn-gold w-full py-2">{busy ? 'กำลังบันทึก...' : 'ตั้งรหัสใหม่'}</button>
        </form>
        <div className="mt-5 border-t border-white/10 pt-4">
          <button type="button" onClick={() => { forgetEditKey(gid); close(); onLogout() }}
            className="pill flex w-full items-center justify-center gap-1.5 px-4 py-2 text-sm text-white/70 hover:border-red-400 hover:text-red-300">
            <LogOut className="h-4 w-4" /> ออกจากโหมดแก้ไขบนเครื่องนี้
          </button>
          <p className="mt-2 text-center text-xs text-white/40">ใช้ตอนยืมเครื่องคนอื่น กลับมาแก้ได้โดยใส่รหัสอีกครั้ง</p>
        </div>
      </Modal>
    </>
  )
}
