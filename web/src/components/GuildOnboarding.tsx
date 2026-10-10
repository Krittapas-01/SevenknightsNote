import { ArrowRight, Check, ChevronDown, ChevronUp, PartyPopper, Rocket, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { ONBOARD_STEPS, onboardFlags, setOnboard, TUTORIAL_ON } from '../lib/onboarding'
import type { GuildData } from '../lib/types'

/**
 * แผง "เริ่มต้นกิลด์ของคุณ" — ติ๊กจากข้อมูลจริงของกิลด์ · ปุ่มของขั้นปัจจุบันบนหน้าจะกะพริบ
 * ขึ้นเฉพาะคนที่แก้ได้ บนเครื่องที่สร้างกิลด์
 */
type Props = { gid: string; data: GuildData; canEdit: boolean }
export default function GuildOnboarding(p: Props) { return TUTORIAL_ON ? <OnboardingInner {...p} /> : null }
function OnboardingInner({ gid, data, canEdit }: Props) {
  const nav = useNavigate()
  const { pathname, search } = useLocation()
  const [flags, setFlags] = useState(() => onboardFlags(gid))
  const [open, setOpen] = useState(true)
  const [cheer, setCheer] = useState<string | null>(null)
  useEffect(() => {
    const on = () => setFlags(onboardFlags(gid))
    on()
    window.addEventListener('7k-note:onboard', on)
    return () => window.removeEventListener('7k-note:onboard', on)
  }, [gid])

  const f = flags ?? { on: false }
  const status = ONBOARD_STEPS.map((s) => s.done(data, f))
  const count = status.filter(Boolean).length
  const all = count === ONBOARD_STEPS.length
  const cur = status.findIndex((x) => !x)
  const step = cur >= 0 ? ONBOARD_STEPS[cur] : null
  const active = !!flags?.on && !flags.hidden && !flags.done && canEdit

  // ทำขั้นไหนเสร็จ → ชมสั้น ๆ
  const prev = useRef(count)
  useEffect(() => {
    if (count > prev.current && active) {
      setCheer('เยี่ยม! ไปขั้นถัดไปกัน')
      setOpen(true)
      const t = setTimeout(() => setCheer(null), 2500)
      prev.current = count
      return () => clearTimeout(t)
    }
    prev.current = count
  }, [count, active]) // eslint-disable-line react-hooks/exhaustive-deps

  // ปุ่มของขั้นปัจจุบันกะพริบ (ปุ่มอาจโผล่ทีหลัง เช่น เปลี่ยนแท็บ → เช็คซ้ำเรื่อย ๆ)
  useEffect(() => {
    if (!active || !step) return
    const sel = `[data-onboard="${step.target}"]`
    const apply = () => document.querySelectorAll(sel).forEach((el) => el.classList.add('onboard-pulse'))
    apply()
    const t = setInterval(apply, 700)
    return () => { clearInterval(t); document.querySelectorAll('.onboard-pulse').forEach((el) => el.classList.remove('onboard-pulse')) }
  }, [active, step, pathname, search])

  if (!active) return null

  const go = () => {
    if (!step) return
    nav(step.go(gid, data))
    setTimeout(() => document.querySelector(`[data-onboard="${step.target}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 350)
  }

  return (
    <div data-noexport className="coach-panel fixed left-3 z-30 w-[min(21rem,calc(100vw-1.5rem))]" style={{ top: '7.5rem' }}>
      <div className="panel panel-gold overflow-hidden text-sm shadow-2xl">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button type="button" onClick={() => setOpen((v) => !v)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
            <Rocket className="h-4 w-4 shrink-0 text-gold" />
            <span className="min-w-0 flex-1 truncate font-semibold">เริ่มต้นกิลด์ของคุณ</span>
            <span className="tabular-nums text-gold">{count}/{ONBOARD_STEPS.length}</span>
            {open ? <ChevronUp className="h-4 w-4 text-white/60" /> : <ChevronDown className="h-4 w-4 text-white/60" />}
          </button>
          <button type="button" onClick={() => setOnboard(gid, { hidden: true })} title="ซ่อน (ไม่แสดงอีก)" className="rounded-full p-1 text-white/40 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <div className="h-1 bg-black/40"><div className="h-full bg-gradient-to-r from-[#e2bf72] to-[#fff1c9] transition-all duration-500" style={{ width: `${(count / ONBOARD_STEPS.length) * 100}%` }} /></div>

        {open && (
          <div className="max-h-[calc(100dvh-12rem)] overflow-y-auto p-3">
            {cheer && <p className="mb-2 flex items-center gap-1.5 rounded-lg bg-emerald-400/15 px-2.5 py-1.5 text-xs font-semibold text-emerald-200"><Check className="h-4 w-4" /> {cheer}</p>}
            {all ? (
              <div className="text-center">
                <PartyPopper className="mx-auto h-8 w-8 text-gold" />
                <p className="mt-1 font-bold">กิลด์พร้อมใช้งานแล้ว!</p>
                <p className="mt-1 text-xs text-white/60">กด "วิธีใช้" ในแต่ละหน้าได้ตลอดถ้าสงสัย</p>
                <button onClick={() => setOnboard(gid, { done: true })} className="btn-gold mt-3 px-5 py-1.5 text-sm font-semibold">ปิด</button>
              </div>
            ) : (
              <ol className="space-y-1.5">
                {ONBOARD_STEPS.map((s, i) => {
                  const ok = status[i]
                  const now = i === cur
                  return (
                    <li key={s.key} className={`rounded-lg border p-2 ${ok ? 'border-emerald-400/30 bg-emerald-400/5' : now ? 'border-gold/60 bg-gold/10' : 'border-white/10 bg-black/15'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${ok ? 'bg-emerald-400 text-ink' : now ? 'bg-gold text-ink' : 'bg-white/10 text-white/50'}`}>
                          {ok ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                        </span>
                        <span className={ok ? 'text-white/45 line-through' : 'font-medium'}>{s.title}</span>
                        {s.optional && !ok && <span className="text-[10px] text-white/40">ข้ามได้</span>}
                      </div>
                      {now && (
                        <div className="mt-1.5 pl-7">
                          <p className="text-xs leading-relaxed text-white/70">{s.how}</p>
                          <div className="mt-2 flex gap-2">
                            <button onClick={go} className="btn-gold flex items-center gap-1 px-3 py-1 text-xs font-semibold">พาไป <ArrowRight className="h-3.5 w-3.5" /></button>
                            {s.optional && <button onClick={() => setOnboard(gid, { skipDiscord: true })} className="px-2 py-1 text-xs text-white/50 hover:text-white">ข้าม</button>}
                          </div>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ol>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
