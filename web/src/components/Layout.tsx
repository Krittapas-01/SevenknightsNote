import { Link, Outlet, useMatch } from 'react-router'
import Account from './Account'
import AnnouncementBar from './AnnouncementBar'
import HeaderClock from './HeaderClock'

export default function Layout() {
  // อยู่ในหน้าของกิลด์ไหน → โชว์แถบประกาศของกิลด์นั้นทุกหน้า
  const m = useMatch({ path: '/g/:gid', end: false })
  const gid = m?.params.gid
  return (
    <div className="min-h-dvh">
      <header className="site-header sticky top-0 z-40 border-b border-gold/15 bg-[#0c1425]/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            <Link to="/" className="flex items-center gap-1.5 text-lg font-bold tracking-wide sm:gap-3">
              <span className="hidden sm:block" aria-hidden="true"><span className="brand-mark">✦</span></span> 7K <span className="font-normal text-gold">Note</span>
            </Link>
            <HeaderClock />
          </div>
          <span className="ml-auto mr-3 hidden text-xs font-medium tracking-[.2em] text-white/45 md:inline">GUILD WAR COMPANION</span>
          <Link to="/biscuit" className="ml-auto mr-3 whitespace-nowrap text-sm text-white/70 hover:text-gold md:ml-0">🍪 <span className="hidden sm:inline">เช็กบัฟบิสกิต</span></Link>
          <div><Account /></div>
        </div>
      </header>
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
