import { Check, Copy, Dices, Lock, LockOpen } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import Modal from './Modal'
import { api, inviteLink } from '../lib/api'
import { L } from '../lib/i18n'

/** ต้องตรงกับ VIEW_MIN / VIEW_MAX ฝั่ง API */
const MIN = 4
const MAX = 32
// ไม่มีตัวที่อ่านสับสน (0/O, 1/l/I) — พิมพ์ตามจากรูปแคปจอได้
const ABC = 'abcdefghjkmnpqrstuvwxyz23456789'
const randomCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => ABC[b % ABC.length]).join('')

/**
 * ล็อกหน้ากิลด์ด้วยรหัสเข้ากิลด์ (เจ้าของ = คนที่ใช้รหัสแก้ไข)
 * มีคนออกกิลด์ → เปลี่ยนรหัส → คนที่ใช้รหัสเดิมเข้าไม่ได้ทันที · สมาชิกที่เหลือกดลิงก์เชิญใหม่/ใส่รหัสใหม่ครั้งเดียว
 */
export default function ViewLock({ gid, locked, code, onChange }: {
  gid: string
  /** กิลด์ล็อกอยู่ไหม (จากข้อมูลกิลด์) */
  locked: boolean
  /** รหัสปัจจุบัน (จาก /check) · undefined = ยังไม่รู้ */
  code: string | null | undefined
  onChange: (code: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [next, setNext] = useState('')
  const [err, setErr] = useState('')
  const [done, setDone] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  useEffect(() => { if (open) setNext(code ?? '') }, [open, code])
  const isOn = !!code || (code === undefined && locked)

  function close() {
    setOpen(false)
    setErr('')
    setDone('')
  }

  async function save(value: string) {
    setBusy(true)
    setErr('')
    setDone('')
    try {
      const r = await api.setViewCode(gid, value)
      onChange(r.viewCode)
      setNext(r.viewCode ?? '')
      setDone(r.viewCode ? (isOn ? L('เปลี่ยนรหัสแล้ว รหัสเดิมใช้ไม่ได้อีก', 'Code changed. The old code no longer works.') : L('ล็อกหน้ากิลด์แล้ว', 'Guild page locked.')) : L('ปิดล็อกแล้ว ใครมีลิงก์ก็ดูได้', 'Lock removed. Anyone with the link can view.'))
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault()
    const v = next.trim()
    if (v.length < MIN || v.length > MAX) return setErr(L(`รหัสต้องยาว ${MIN}–${MAX} ตัวอักษร`, `The code must be ${MIN}–${MAX} characters`))
    if (v === code) return setErr(L('รหัสนี้ใช้อยู่แล้ว', 'That is already the code'))
    void save(v)
  }
  async function copy() {
    if (!code) return
    const url = inviteLink(gid, code)
    await navigator.clipboard.writeText(url).catch(() => prompt(L('คัดลอกลิงก์นี้', 'Copy this link'), url))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="pill flex items-center gap-1.5 px-4 py-2 text-sm hover:border-gold">
        {isOn ? <Lock className="h-4 w-4 text-gold" /> : <LockOpen className="h-4 w-4" />}{' '}{L('ล็อกหน้ากิลด์', 'Lock guild')}
      </button>
      <Modal open={open} title={L('รหัสเข้ากิลด์', 'Guild code')} onClose={close}>
        <p className="text-sm text-white/65">
          {L('ล็อกหน้ากิลด์ให้เข้าได้เฉพาะคนที่มีรหัส กันคนที่ออกกิลด์ไปแล้วแต่ยังมีลิงก์', 'Only people with the code can open this guild. Keeps out people who left but still have the link.')}
        </p>
        <p className={`mt-3 flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm ${isOn ? 'border-gold/40 bg-gold/10 text-gold' : 'border-white/10 bg-black/20 text-white/65'}`}>
          {isOn ? <Lock className="h-4 w-4 shrink-0" /> : <LockOpen className="h-4 w-4 shrink-0" />}
          {isOn ? L('ตอนนี้: ต้องใส่รหัสก่อนเข้า', 'Now: the code is needed to view') : L('ตอนนี้: ใครมีลิงก์ก็ดูได้', 'Now: anyone with the link can view')}
        </p>

        {code && (
          <div className="mt-4">
            <p className="text-sm text-white/70">{L('ลิงก์เชิญ (มีรหัสในตัว กดแล้วเข้าได้เลย)', 'Invite link (has the code, opens straight in)')}</p>
            <div className="mt-1 flex gap-2">
              <input readOnly value={inviteLink(gid, code)} onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white/70 outline-none" />
              <button type="button" onClick={copy} className="btn-gold flex shrink-0 items-center gap-1.5 px-3 py-2 text-sm">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{' '}{copied ? L('คัดลอกแล้ว', 'Copied') : L('คัดลอก', 'Copy')}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block text-sm text-white/70">
            {isOn ? L('รหัสใหม่', 'New code') : L('ตั้งรหัสเข้ากิลด์', 'Set a guild code')}{' '}<span className="text-white/40">({L(`${MIN}–${MAX} ตัว`, `${MIN}–${MAX} chars`)})</span>
            <span className="mt-1 flex gap-2">
              <input value={next} onChange={(e) => setNext(e.target.value)} maxLength={MAX} autoComplete="off" autoCapitalize="off" spellCheck={false}
                className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none focus:border-gold" />
              <button type="button" onClick={() => setNext(randomCode())} className="pill flex shrink-0 items-center gap-1.5 px-3 py-2 text-sm hover:border-gold">
                <Dices className="h-4 w-4" />{' '}{L('สุ่ม', 'Random')}
              </button>
            </span>
          </label>
          {err && <p className="text-sm text-red-400">{err}</p>}
          {done && <p className="flex items-center gap-1.5 text-sm text-green-400"><Check className="h-4 w-4" />{' '}{done}</p>}
          <button disabled={busy || !next.trim()} className="btn-gold w-full py-2">
            {busy ? L('กำลังบันทึก...', 'Saving...') : isOn ? L('เปลี่ยนรหัส', 'Change code') : L('ล็อกด้วยรหัสนี้', 'Lock with this code')}
          </button>
        </form>

        <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-white/50">
          <li>{L('มีคนออกกิลด์ → เปลี่ยนรหัส แล้วส่งลิงก์เชิญใหม่ในห้อง Discord ของกิลด์ คนที่ใช้รหัสเดิมเข้าไม่ได้ทันที', 'Someone left? Change the code and post the new invite link in your guild Discord. The old code stops working right away.')}</li>
          <li>{L('สมาชิกที่เหลือใส่รหัสใหม่ครั้งเดียว เครื่องจำไว้', 'Remaining members enter the new code once; their device remembers it.')}</li>
          <li>{L('คนที่มีรหัสแก้ไข หรือยศ Discord ที่แก้ได้ เข้าได้เลยไม่ต้องใส่ (ถ้าคนที่ออกมีรหัสแก้ไขด้วย ให้เปลี่ยนรหัสแก้ไขด้วย)', 'People with the edit password or an edit role in Discord get in without it. If the person who left had the edit password, change that too.')}</li>
        </ul>

        {isOn && (
          <button type="button" disabled={busy} onClick={() => void save('')}
            className="pill mt-5 flex w-full items-center justify-center gap-1.5 px-4 py-2 text-sm text-white/70 hover:border-red-400 hover:text-red-300">
            <LockOpen className="h-4 w-4" />{' '}{L('ปิดล็อก (ใครมีลิงก์ก็ดูได้)', 'Remove lock (anyone with the link can view)')}
          </button>
        )}
      </Modal>
    </>
  )
}
