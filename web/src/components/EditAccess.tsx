import { AlertTriangle, Check, Eye, EyeOff, KeyRound, LogOut, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { api, forgetEditKey, forgetRecent, saveEditKey } from '../lib/api'
import { loginWithDiscord, useAuth } from '../lib/auth'
import Modal from './Modal'
import { tx, L } from '../lib/i18n'

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
        <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? tx('ซ่อนรหัส') : tx('แสดงรหัส')}
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
  const auth = useAuth()

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
      } else setErr(r.locked ? tx('ใส่รหัสผิดหลายครั้ง ลองใหม่ในอีก 15 นาที') : tx('รหัสไม่ถูกต้อง'))
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="pill flex items-center gap-1.5 px-4 py-2 text-sm hover:border-gold">
        <KeyRound className="h-4 w-4" />{' '}{tx('ใส่รหัสแก้ไข')}
      </button>
      <Modal open={open} title={tx('เข้าโหมดแก้ไข')} onClose={() => setOpen(false)}>
        {auth.enabled && (
          <div className="mb-5 border-b border-white/10 pb-5">
            {auth.user ? (
              <p className="flex items-center gap-2 text-sm text-white/65">
                <img src={auth.user.avatar} alt="" className="h-6 w-6 rounded-full" />
                {tx('ล็อกอินเป็น')}{' '}{auth.user.name}{' '}{tx('แล้ว แต่ยังไม่มียศที่กิลด์นี้ให้แก้ได้ ใช้รหัสแทนได้')}
              </p>
            ) : (
              <>
                <button type="button" onClick={loginWithDiscord} className="w-full rounded-xl bg-[#5865f2] py-2 font-medium text-white hover:bg-[#4752c4]">
                  {tx('เข้าสู่ระบบด้วย Discord')}
                </button>
                <p className="mt-2 text-xs text-white/45">{tx('ถ้ากิลด์ตั้งยศใน Discord ไว้ คนที่มียศนั้นแก้ได้เลยไม่ต้องใช้รหัส')}</p>
              </>
            )}
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          <PasswordField label={tx('รหัสแก้ไขของกิลด์')} value={pw} onChange={setPw} autoComplete="current-password" autoFocus />
          {err && <p className="text-sm text-red-400">{err}</p>}
          <button disabled={busy || !pw.trim()} className="btn-gold w-full py-2">{busy ? tx('กำลังตรวจ...') : tx('เข้าโหมดแก้ไข')}</button>
          <p className="text-xs text-white/45">{tx('เครื่องนี้จะจำรหัสไว้ ไม่ต้องใส่ใหม่ทุกครั้ง')}</p>
        </form>
      </Modal>
    </>
  )
}

/** คนที่แก้ได้อยู่แล้ว: ตั้งรหัสใหม่ / ออกจากโหมดแก้ไข */
export function EditSettings({ gid, guildName, onLogout }: { gid: string; guildName: string; onLogout: () => void }) {
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
    if (next.length < 6) return setErr(tx('รหัสต้องยาวอย่างน้อย 6 ตัวอักษร'))
    if (next !== pw2.trim()) return setErr(tx('รหัสสองช่องไม่ตรงกัน'))
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
        <KeyRound className="h-4 w-4" />{' '}{tx('รหัสแก้ไข')}
      </button>
      <Modal open={open} title={tx('รหัสแก้ไขกิลด์')} onClose={close}>
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-white/60">
            {tx('ตั้งรหัสใหม่แล้วบอกเฉพาะคนที่ให้แก้แผนได้ รหัสเดิมและลิงก์แก้ไขแบบเก่าจะใช้ไม่ได้ทันที')}
          </p>
          <PasswordField label={tx('รหัสใหม่ (อย่างน้อย 6 ตัว)')} value={pw} onChange={setPw} autoComplete="new-password" autoFocus />
          <PasswordField label={tx('ยืนยันรหัสใหม่')} value={pw2} onChange={setPw2} autoComplete="new-password" />
          {err && <p className="text-sm text-red-400">{err}</p>}
          {done && <p className="flex items-center gap-1.5 text-sm text-green-400"><Check className="h-4 w-4" />{' '}{tx('ตั้งรหัสใหม่แล้ว')}</p>}
          <button disabled={busy || !pw.trim() || !pw2.trim()} className="btn-gold w-full py-2">{busy ? tx('กำลังบันทึก...') : tx('ตั้งรหัสใหม่')}</button>
        </form>
        <div className="mt-5 border-t border-white/10 pt-4">
          <button type="button" onClick={() => { forgetEditKey(gid); close(); onLogout() }}
            className="pill flex w-full items-center justify-center gap-1.5 px-4 py-2 text-sm text-white/70 hover:border-red-400 hover:text-red-300">
            <LogOut className="h-4 w-4" />{' '}{tx('ออกจากโหมดแก้ไขบนเครื่องนี้')}
          </button>
          <p className="mt-2 text-center text-xs text-white/40">{tx('ใช้ตอนยืมเครื่องคนอื่น กลับมาแก้ได้โดยใส่รหัสอีกครั้ง')}</p>
        </div>
        <DeleteGuild gid={gid} guildName={guildName} />
      </Modal>
    </>
  )
}

/**
 * ลบกิลด์ถาวร — ยืนยัน 3 ชั้นกันกดผิด:
 * 1) กดปุ่มลบ → อ่านคำเตือน  2) พิมพ์ชื่อกิลด์ให้ตรง  3) รอนับถอยหลัง 5 วิ แล้วกดลบถาวร
 */
export function DeleteGuild({ gid, guildName, onDelete, startAt = 0, onCancel }: {
  gid: string
  guildName: string
  /** แทนการลบปกติ (เช่น แอดมินลบ) — ไม่ส่ง = ลบด้วยรหัสแก้ไขแล้วกลับหน้าแรก */
  onDelete?: (typed: string) => Promise<void>
  /** เริ่มที่ขั้นไหน (แอดมินเปิดมาที่ขั้นอ่านคำเตือนเลย) */
  startAt?: 0 | 1
  onCancel?: () => void
}) {
  const navigate = useNavigate()
  const [step, setStep] = useState<number>(startAt)
  const [typed, setTyped] = useState('')
  const [wait, setWait] = useState(5)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (step !== 3 || wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [step, wait])
  const reset = () => { setStep(startAt); setTyped(''); setWait(5); setErr(''); onCancel?.() }

  async function del() {
    setBusy(true)
    setErr('')
    try {
      if (onDelete) {
        await onDelete(typed)
        forgetRecent(gid)
        return
      }
      await api.deleteGuild(gid, typed)
      forgetEditKey(gid)
      forgetRecent(gid)
      navigate('/', { replace: true })
    } catch (e) {
      setErr((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-red-300"><AlertTriangle className="h-4 w-4" />{' '}{tx('โซนอันตราย')}</p>
      {step === 0 && (
        <button type="button" onClick={() => setStep(1)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full border border-red-400/50 px-4 py-2 text-sm text-red-300 hover:bg-red-500/15">
          <Trash2 className="h-4 w-4" />{' '}{tx('ลบกิลด์นี้')}
        </button>
      )}
      {step === 1 && (
        <div className="mt-3 space-y-3 text-sm">
          <p className="text-white/75">{tx('จะลบ')}{' '}<b className="text-white">{guildName}</b>{' '}{tx('ทั้งหมด: บ้านศัตรู ทีมแก้ แผนสงคราม ประกาศ และการตั้งค่า Discord')}{' '}<b className="text-red-300">{tx('กู้คืนไม่ได้')}</b>{' '}{tx('และทุกคนที่มีลิงก์จะเข้าไม่ได้อีก')}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(2)} className="flex-1 rounded-full bg-red-500/80 px-4 py-2 font-semibold text-white hover:bg-red-500">{tx('เข้าใจแล้ว ลบต่อ')}</button>
            <button type="button" onClick={reset} className="pill flex-1 px-4 py-2">{tx('ยกเลิก')}</button>
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="mt-3 space-y-3 text-sm">
          <label className="block text-white/75">
            {tx('พิมพ์ชื่อกิลด์')}{' '}<b className="select-all text-white">{guildName}</b>{' '}{tx('เพื่อยืนยัน')}
            <input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus
              className="mt-1 w-full rounded-lg border border-red-400/40 bg-black/30 px-3 py-2 outline-none focus:border-red-400" />
          </label>
          <div className="flex gap-2">
            <button type="button" disabled={typed.trim() !== guildName.trim()} onClick={() => { setWait(5); setStep(3) }}
              className="flex-1 rounded-full bg-red-500/80 px-4 py-2 font-semibold text-white enabled:hover:bg-red-500 disabled:opacity-40">{tx('ถัดไป')}</button>
            <button type="button" onClick={reset} className="pill flex-1 px-4 py-2">{tx('ยกเลิก')}</button>
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="mt-3 space-y-3 text-sm">
          <p className="text-white/75">{tx('ยืนยันครั้งสุดท้าย: ลบ')}{' '}<b className="text-white">{guildName}</b>{' '}{tx('ถาวร')}</p>
          {err && <p className="text-red-400">{err}</p>}
          <div className="flex gap-2">
            <button type="button" disabled={wait > 0 || busy} onClick={del}
              className="flex-1 rounded-full bg-red-600 px-4 py-2 font-semibold text-white enabled:hover:bg-red-500 disabled:opacity-50">
              {busy ? tx('กำลังลบ...') : wait > 0 ? L(`ลบถาวร (รอ ${wait})`, `Delete permanently (wait ${wait})`) : tx('ลบถาวร')}
            </button>
            <button type="button" onClick={reset} className="pill flex-1 px-4 py-2">{tx('ยกเลิก')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
