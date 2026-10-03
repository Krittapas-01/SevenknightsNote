import { Cookie, House, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useMatch } from 'react-router'
import Account from './Account'
import AnnouncementBar from './AnnouncementBar'
import HeaderClock from './HeaderClock'

export default function Layout() {
  // อยู่ในหน้าของกิลด์ไหน → โชว์แถบประกาศของกิลด์นั้นทุกหน้า
  const m = useMatch({ path: '/g/:gid', end: false })
  const gid = m?.params.gid
  const [menu, setMenu] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setMenu(false), [pathname]) // เปลี่ยนหน้า → ปิดเมนู
  useEffect(() => {
    if (!menu) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menu])
  return (
    <div className="min-h-dvh">
      <header className="site-header sticky top-0 z-40 border-b border-gold/15 bg-[#0c1425]/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
          <button onClick={() => setMenu(true)} aria-label="เปิดเมนู" aria-expanded={menu} className="-ml-1 mr-2 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/75 hover:bg-white/10 hover:text-white">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            <Link to="/" className="flex items-center gap-1.5 text-lg font-bold tracking-wide sm:gap-3">
              <span className="hidden sm:block" aria-hidden="true"><span className="brand-mark">✦</span></span> 7K <span className="font-normal text-gold">Note</span>
            </Link>
            <HeaderClock />
          </div>
          <span className="ml-auto mr-3 hidden text-xs font-medium tracking-[.2em] text-white/45 md:inline">GUILD WAR COMPANION</span>
          <div className="ml-auto md:ml-0"><Account /></div>
        </div>
      </header>
      <SideMenu open={menu} onClose={() => setMenu(false)} />
      {gid && <AnnouncementBar key={gid} gid={gid} />}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-8 pt-10 text-center text-xs leading-relaxed text-white/40">
        <p className="mb-2 text-gold/65" aria-hidden="true">— ✦ —</p>
        <p>7K Note · เครื่องมือวางแผนของผู้เล่น Seven Knights Re:BIRTH</p>
        <p className="mt-1">ภาพตัวละคร © Netmarble Corp. & Netmarble Nexus Inc. · <a className="underline underline-offset-4 hover:text-gold" href="https://sena.netmarble.com/en/pcplay" target="_blank" rel="noreferrer">เว็บไซต์เกมทางการ</a></p>
      </footer>
    </div>
  )
}

const NAV = [
  { to: '/', label: 'หน้าแรก', icon: House, end: true },
  { to: '/biscuit', label: 'เช็กบัฟบิสกิต', icon: Cookie, end: false },
]

/** เมนูข้าง (กดปุ่ม ☰ มุมซ้ายบน) — เพิ่มหน้าใหม่ที่ NAV */
function SideMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div onClick={onClose} className={`absolute inset-0 bg-black/60 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} />
      <nav
        aria-label="เมนูหลัก"
        className={`absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-gold/15 bg-[#11182b] p-4 shadow-2xl transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="mb-5 flex items-center justify-between">
          <span className="flex items-center gap-2 text-lg font-bold"><span className="text-gold">✦</span> 7K Note</span>
          <button onClick={onClose} aria-label="ปิดเมนู" tabIndex={open ? 0 : -1} className="grid h-8 w-8 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} tabIndex={open ? 0 : -1}
            className={({ isActive }) => `mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 ${isActive ? 'bg-white/10 text-gold' : 'text-white/85 hover:bg-white/5'}`}>
            <Icon className="h-5 w-5" /> {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
