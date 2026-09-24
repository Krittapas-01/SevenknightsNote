import { Link, Outlet, useMatch } from 'react-router'
import AnnouncementBar from './AnnouncementBar'

export default function Layout() {
  // อยู่ในหน้าของกิลด์ไหน → โชว์แถบประกาศของกิลด์นั้นทุกหน้า
  const m = useMatch({ path: '/g/:gid', end: false })
  const gid = m?.params.gid
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#161c2e]/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold">
            <span className="text-gold">✦</span> 7K Note
          </Link>
        </div>
      </header>
      {gid && <AnnouncementBar key={gid} gid={gid} />}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}
