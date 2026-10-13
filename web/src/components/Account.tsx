import { ChevronDown, CircleHelp, LogIn, LogOut, Star, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { clearAuthError, loginWithDiscord, logout, useAuth } from '../lib/auth'
import { L, tx } from '../lib/i18n'
import { closeAllTours, startTour, useTourState } from '../lib/tour'
import { DiscordIcon } from './ContactFab'

/**
 * มุมขวาบน: เข้าสู่ระบบด้วย Discord / รูปโปรไฟล์
 * กดรูป → เมนู: พรีเซต & ทีมที่ชอบ · สอนใช้หน้านี้ · ออกจากระบบ (หัวเว็บมือถือไม่เบียด)
 */
export default function Account() {
  const { ready, enabled, user, error } = useAuth()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const { available, active } = useTourState()
  const tourId = available.at(-1)
  const loc = useLocation()
  useEffect(() => setOpen(false), [loc.key])
  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', down)
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('pointerdown', down); document.removeEventListener('keydown', key) }
  }, [open])
  if (!ready || (!enabled && !user)) return null
  const item = 'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm'
  return (
    <div ref={box} className="relative flex items-center">
      {user ? (
        <>
          {/* มือถือ: ปุ่ม ? ย้ายมาอยู่ในเมนูนี้ → การสอน "ดูการสอนซ้ำ" ส่องที่รูปแทน */}
          <button type="button" data-testid="account-button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu"
            data-tour={tourId ? 'help-button' : undefined} title={user.name} aria-label={L('บัญชี', 'Account')}
            className={`group flex shrink-0 items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-1.5 ${open ? 'bg-white/10' : 'hover:bg-white/10'}`}>
            <img src={user.avatar} alt="" className={`h-8 w-8 shrink-0 rounded-full object-cover ring-1 ${open ? 'ring-gold/70' : 'ring-white/20 group-hover:ring-gold/70'}`} />
            <span className="hidden max-w-32 truncate text-sm text-white/80 group-hover:text-gold sm:inline">{user.name}</span>
            <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-white/50 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <div className="absolute right-0 top-11 z-50 w-60"><div role="menu" className="panel p-1.5 shadow-xl">
              <div className="flex items-center gap-2.5 border-b border-white/10 px-3 pb-2.5 pt-1.5">
                <img src={user.avatar} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                <span className="min-w-0 truncate font-semibold text-white">{user.name}</span>
              </div>
              <div className="pt-1">
                <Link role="menuitem" to="/favorites" onClick={() => setOpen(false)} className={`${item} text-white/80 hover:bg-white/10 hover:text-gold`}>
                  <Star className="h-4 w-4 shrink-0" />{tx('พรีเซต & ทีมที่ชอบ')}
                </Link>
                {tourId && (
                  <button type="button" role="menuitem" onClick={() => { setOpen(false); if (active) closeAllTours(); else startTour(tourId) }}
                    className={`${item} text-white/80 hover:bg-white/10 hover:text-gold sm:hidden`}>
                    <CircleHelp className="h-4 w-4 shrink-0" />{tx('ดูการสอนใช้หน้านี้')}
                  </button>
                )}
                <button type="button" role="menuitem" onClick={() => { setOpen(false); logout() }} className={`${item} text-red-300 hover:bg-red-500/10`}>
                  <LogOut className="h-4 w-4 shrink-0" />{tx('ออกจากระบบ')}
                </button>
              </div>
            </div></div>
          )}
        </>
      ) : (
        // มือถือ: เหลือแค่โลโก้ Discord (จอ 360 ใส่คำว่า Discord แล้วล้นขอบ)
        <button onClick={loginWithDiscord} aria-label={`${tx('เข้าสู่ระบบด้วย')} Discord`} title={`${tx('เข้าสู่ระบบด้วย')} Discord`}
          className="flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-full bg-[#5865f2] px-2 text-sm font-medium text-white hover:bg-[#4752c4] sm:h-auto sm:px-3 sm:py-1">
          <DiscordIcon className="h-5 w-5 sm:hidden" /><LogIn className="hidden h-4 w-4 sm:block" /> <span className="hidden sm:inline">{tx('เข้าสู่ระบบด้วย')} Discord</span>
        </button>
      )}
      {error && (
        <div role="alert" className="absolute right-0 top-10 flex w-64 items-start gap-2 rounded-xl border border-red-400/40 bg-[var(--alert-bg)] px-3 py-2 text-sm text-red-200 shadow-lg">
          <span className="flex-1">{error}</span>
          <button onClick={clearAuthError} aria-label={tx('ปิด')} className="text-red-200/70 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  )
}
