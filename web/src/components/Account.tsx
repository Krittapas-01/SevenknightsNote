import { LogIn, LogOut, X } from 'lucide-react'
import { Link } from 'react-router'
import { clearAuthError, loginWithDiscord, logout, useAuth } from '../lib/auth'

/** มุมขวาบน: เข้าสู่ระบบด้วย Discord / รูป+ชื่อ + ออกจากระบบ */
export default function Account() {
  const { ready, enabled, user, error } = useAuth()
  if (!ready || (!enabled && !user)) return null
  return (
    <div className="relative flex items-center gap-2">
      {user ? (
        <>
          {/* กดรูป/ชื่อ → พรีเซ็ต & ทีมที่ชอบ (ผูกกับบัญชี Discord นี้) */}
          <Link to="/favorites" title="พรีเซ็ต & ทีมที่ชอบ" className="group flex items-center gap-2 rounded-full py-0.5 pl-0.5 pr-2 hover:bg-white/10">
            <img src={user.avatar} alt="" className="h-7 w-7 rounded-full ring-1 ring-white/20 group-hover:ring-gold/70" />
            <span className="hidden max-w-32 truncate text-sm text-white/80 group-hover:text-gold sm:inline">{user.name}</span>
          </Link>
          <button onClick={() => logout()} title="ออกจากระบบ" className="rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white">
            <LogOut className="h-4 w-4" />
          </button>
        </>
      ) : (
        <button onClick={loginWithDiscord} className="flex items-center gap-1.5 rounded-full bg-[#5865f2] px-2.5 py-1 text-sm font-medium text-white hover:bg-[#4752c4] sm:px-3">
          <LogIn className="hidden h-4 w-4 sm:block" /> <span className="hidden sm:inline">เข้าสู่ระบบด้วย</span> Discord
        </button>
      )}
      {error && (
        <div role="alert" className="absolute right-0 top-10 flex w-64 items-start gap-2 rounded-xl border border-red-400/40 bg-[#2a1520] px-3 py-2 text-sm text-red-200 shadow-lg">
          <span className="flex-1">{error}</span>
          <button onClick={clearAuthError} aria-label="ปิด" className="text-red-200/70 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  )
}
