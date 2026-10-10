import { BookmarkPlus, Bookmark } from 'lucide-react'
import { useEffect, useState } from 'react'
import Modal from './Modal'
import TeamPanel from './TeamPanel'
import { api, type Preset, type PresetInput } from '../lib/api'
import { loginWithDiscord, useAuth } from '../lib/auth'
import type { HeroNote, SkillStep, Team } from '../lib/types'
import { baseName, getUnit, unitBase } from '../data/heroes'
import { tx } from '../lib/i18n'

const teamName = (t: Team) => t.slots.filter(Boolean).map((id) => unitBase(id)).join(' · ')

/** ปุ่ม "บันทึกเป็นพรีเซต" — ตั้งชื่อแล้วเก็บกับบัญชี Discord */
export function SavePresetButton({ team, skills, note, heroNotes, className = '' }: { team: Team; skills: SkillStep[]; note: string; heroNotes?: HeroNote[]; className?: string }) {
  const auth = useAuth()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (!auth.enabled) return null
  const start = () => {
    if (!auth.user) return loginWithDiscord()
    setName(teamName(team).slice(0, 40))
    setMsg(null)
    setOpen(true)
  }
  const save = async () => {
    setBusy(true)
    try {
      const p: PresetInput = { name: name.trim() || tx('พรีเซต'), team, skills, note, heroNotes: heroNotes ?? [] }
      await api.createPreset(p)
      setMsg(tx('บันทึกแล้ว ✓ ดูได้ที่ "ทีมที่ฉันชอบ"'))
      setTimeout(() => setOpen(false), 900)
    } catch (e) {
      setMsg((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <button type="button" onClick={start} title={auth.user ? tx('เก็บทีมนี้ (รวมอุปกรณ์/ค่าความสามารถ) เป็นพรีเซตของฉัน') : tx('เข้าสู่ระบบ Discord เพื่อบันทึกพรีเซต')}
        className={`flex items-center gap-1 rounded-full border border-white/15 px-3 py-1 text-sm text-white/70 hover:border-gold/60 hover:text-gold ${className}`}>
        <BookmarkPlus className="h-4 w-4" />{' '}{tx('บันทึกเป็นพรีเซต')}
      </button>
      <Modal open={open} title={tx('บันทึกเป็นพรีเซตของฉัน')} onClose={() => setOpen(false)}>
        <label className="block text-sm text-white/70">{tx('ชื่อพรีเซต')}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus
          onKeyDown={(e) => e.key === 'Enter' && save()}
          className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 outline-none focus:border-gold" placeholder={tx('เช่น ทีมตีบ้านเวทของฉัน')} />
        <p className="mt-1 text-xs text-white/45">{tx('เก็บทีม ลำดับสกิล โน้ต อุปกรณ์ และค่าความสามารถ · ใช้ได้ทุกกิลด์ทุกเครื่อง')}</p>
        {msg && <p className="mt-3 text-sm text-gold">{msg}</p>}
        <div className="mt-4 flex gap-2">
          <button disabled={busy} onClick={save} className="btn-gold px-6 py-2">{tx('บันทึก')}</button>
          <button disabled={busy} onClick={() => setOpen(false)} className="pill px-5 py-2">{tx('ยกเลิก')}</button>
        </div>
      </Modal>
    </>
  )
}

/** ปุ่ม "พรีเซตของฉัน" + หน้าต่างเลือก → onPick(พรีเซต) */
export function PresetPickerButton({ onPick, className = '', label = tx('พรีเซตของฉัน') }: { onPick: (p: Preset) => void; className?: string; label?: string }) {
  const auth = useAuth()
  const [open, setOpen] = useState(false)
  const [list, setList] = useState<Preset[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    if (!open) return
    setList(null)
    api.myPresets().then((r) => setList(r.presets)).catch((e) => setErr((e as Error).message))
  }, [open])
  if (!auth.enabled) return null
  return (
    <>
      <button type="button" onClick={() => (auth.user ? setOpen(true) : loginWithDiscord())}
        title={auth.user ? tx('ใส่ทีมจากพรีเซตของฉัน') : tx('เข้าสู่ระบบ Discord เพื่อใช้พรีเซต')}
        className={`flex items-center gap-1.5 rounded-full border border-gold/50 px-3 py-1.5 text-sm text-gold hover:bg-gold/10 ${className}`}>
        <Bookmark className="h-4 w-4" /> {label}
      </button>
      <Modal open={open} title={tx('พรีเซตของฉัน')} onClose={() => setOpen(false)} wide>
        {err ? <p className="text-red-300">{err}</p> : !list ? <p className="text-white/50">{tx('กำลังโหลด...')}</p> : !list.length ? (
          <p className="text-white/60">{tx('ยังไม่มีพรีเซต — กด "บันทึกเป็นพรีเซต" ที่ทีมแก้ หรือในหน้า "ทีมที่ฉันชอบ"')}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => (
              <button key={p.id} type="button" onClick={() => { onPick(p); setOpen(false) }}
                className="rounded-2xl border border-white/10 p-2 text-left transition hover:border-gold/60 hover:bg-white/5">
                <p className="mb-2 truncate px-1 font-semibold text-gold">{p.name}</p>
                <span className="pointer-events-none block"><TeamPanel variant="ally" size="sm" team={p.team} skills={p.skills} /></span>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </>
  )
}
