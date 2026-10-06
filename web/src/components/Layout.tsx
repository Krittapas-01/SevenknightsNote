import { Bug, Check, Menu } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link, Outlet, useMatch } from 'react-router'
import Account from './Account'
import AnnouncementBar from './AnnouncementBar'
import TopStrip from './TopStrip'
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
        <div className="mx-auto flex h-14 max-w-6xl items-center px-3 sm:px-4">
          <button onClick={() => setMenuOpen(true)} aria-label="เปิดเมนู" className="-ml-1 mr-2 grid h-9 w-9 shrink-0 sm:mr-3 place-items-center rounded-lg border border-white/20 text-white/80 hover:border-gold hover:text-gold">
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
      {/* Season ขึ้นทุกหน้า (เหมือนทุกกิลด์) · หน้ากิลด์มีแถบประกาศต่อท้าย — ติดใต้หัวเว็บไปด้วยกัน */}
      <div className="sticky top-14 z-30">
        <TopStrip inGuild={!!gid} />
        {gid && <AnnouncementBar key={gid} gid={gid} />}
      </div>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-8 pt-10 text-xs leading-relaxed text-white/40">
        <p className="mb-4 text-center text-gold/65" aria-hidden="true">— ✦ —</p>
        <div className="flex flex-col items-center gap-1.5 border-t border-white/10 pt-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <p>7K Note · เครื่องมือวางแผนกิลวอร์ Seven Knights Re:BIRTH · โปรเจกต์แฟนเมด</p>
          <p className="sm:text-right">ไม่มีส่วนเกี่ยวข้องหรือได้รับการรับรองจาก Netmarble Corp.</p>
        </div>
        <div className="mt-2 flex flex-col items-center gap-1.5 text-center sm:flex-row sm:justify-between sm:text-left">
          <p>ภาพตัวละคร © Netmarble Corp. & Netmarble Nexus Inc. · <a className="underline underline-offset-4 hover:text-gold" href="https://sena.netmarble.com/en/pcplay" target="_blank" rel="noreferrer">เว็บไซต์เกมทางการ</a></p>
          <BugReport />
        </div>
      </footer>
    </div>
  )
}

// แจ้งบั๊กทาง Discord — ชื่อผู้ใช้ Discord ลิงก์ตรงไม่ได้ เลยกดแล้วคัดลอกชื่อให้
const BUG_DISCORD = 'bruhh_exe'
function BugReport() {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(BUG_DISCORD).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }
  return (
    <button onClick={copy} title="กดเพื่อคัดลอกชื่อ Discord" className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-white/5 hover:text-gold">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Bug className="h-3.5 w-3.5" />}
      แจ้งบั๊ก Discord: <span className="font-semibold text-white/70">{BUG_DISCORD}</span>
      {copied && <span className="text-emerald-400">คัดลอกแล้ว</span>}
    </button>
  )
}
