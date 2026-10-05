import { Menu } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link, Outlet, useMatch } from 'react-router'
import Account from './Account'
import AnnouncementBar from './AnnouncementBar'
import HeaderClock from './HeaderClock'
import SideMenu from './SideMenu'

export default function Layout() {
  // อยู่ในหน้าของกิลด์ไหน → โชว์แถบประกาศของกิลด์นั้นทุกหน้า
  const m = useMatch({ path: '/g/:gid', end: false })
  const gid = m?.params.gid
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  return (
    <div className="min-h-dvh">
      <header className="site-header sticky top-0 z-40 border-b border-gold/15 bg-[#0c1425]/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
          <button onClick={() => setMenuOpen(true)} aria-label="เปิดเมนู" className="-ml-1 mr-3 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/20 text-white/80 hover:border-gold hover:text-gold">
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
      <SideMenu open={menuOpen} onClose={closeMenu} />
      {gid && <AnnouncementBar key={gid} gid={gid} />}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-8 pt-10 text-xs leading-relaxed text-white/40">
        <p className="mb-4 text-center text-gold/65" aria-hidden="true">— ✦ —</p>
        <div className="flex flex-col items-center gap-1.5 border-t border-white/10 pt-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <p>7K Note · เครื่องมือวางแผนกิลวอร์ Seven Knights Re:BIRTH · โปรเจกต์แฟนเมด</p>
          <p className="sm:text-right">ไม่มีส่วนเกี่ยวข้องหรือได้รับการรับรองจาก Netmarble Corp.</p>
        </div>
        <p className="mt-2 text-center sm:text-left">ภาพตัวละคร © Netmarble Corp. & Netmarble Nexus Inc. · <a className="underline underline-offset-4 hover:text-gold" href="https://sena.netmarble.com/en/pcplay" target="_blank" rel="noreferrer">เว็บไซต์เกมทางการ</a></p>
      </footer>
    </div>
  )
}
