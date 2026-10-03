import { Cookie, Home, Shield, X } from 'lucide-react'
import { useEffect, type ComponentType } from 'react'
import { NavLink } from 'react-router'
import { getRecent } from '../lib/api'

// เมนูหลักของเว็บ เพิ่มหน้า/เครื่องมือใหม่ที่นี่ที่เดียว
const NAV: { to: string; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { to: '/', label: 'หน้าแรก', icon: Home },
  { to: '/biscuit', label: 'เช็กบัฟบิสกิต', icon: Cookie },
]

export default function SideMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const recent = open ? getRecent() : []
  const item = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 ${isActive ? 'bg-white/10 text-gold' : 'text-white/85 hover:bg-white/5'}`

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div onClick={onClose} className={`absolute inset-0 bg-black/50 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} />
      <nav
        className={`absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-white/10 bg-[#11162a] p-4 shadow-2xl transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2 text-lg font-bold">
            <span className="text-gold">✦</span> 7K Note
          </span>
          <button onClick={onClose} aria-label="ปิดเมนู" className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end onClick={onClose} className={item}>
            <Icon className="h-5 w-5 shrink-0" /> {label}
          </NavLink>
        ))}

        {recent.length > 0 && (
          <>
            <hr className="my-3 border-white/10" />
            <p className="mb-1 px-3 text-xs text-white/45">กิลด์ที่เคยเปิด</p>
            {recent.map((r) => (
              <NavLink key={r.id} to={`/g/${r.id}`} onClick={onClose} className={item}>
                <Shield className="h-5 w-5 shrink-0" /> <span className="truncate">{r.name}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>
    </div>
  )
}
