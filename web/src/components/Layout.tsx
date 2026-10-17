import { Menu } from 'lucide-react'
import { Suspense, lazy, useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useMatch, useNavigationType } from 'react-router'
import Account from './Account'
import AnnouncementBar from './AnnouncementBar'
import TopStrip from './TopStrip'
import HeaderClock from './HeaderClock'
import SideMenu from './SideMenu'
import ContactFab from './ContactFab'
import RefreshFailed from './RefreshFailed'
import ErrorBoundary from './ErrorBoundary'
import { ViewerBar } from './ViewAsToggle'
import WhatsNew, { useHasUpdate } from './WhatsNew'
import CoachPanel from './CoachPanel'
import TourHelpButton from './TourHelpButton'
import LangButton, { LangSuggest } from './LangButton'
import { SupportModal, openSupport } from './Support'
// ชั้นสอนใช้ + เนื้อหาการสอนทั้งหมด โหลดแยก (ไฟล์หลักเล็กลง) — การสอนเริ่มหลังหน้านิ่งอยู่แล้ว
const TourOverlay = lazy(() => import('./TourOverlay'))
import { isDemo } from '../lib/demo'
import { tx, L } from '../lib/i18n'
import { usePageEnter } from '../lib/motion'
import { navCommitted } from '../lib/navProgress'
import NavProgress from './NavProgress'

export default function Layout() {
  // อยู่ในหน้าของกิลด์ไหน → โชว์แถบประกาศของกิลด์นั้นทุกหน้า
  const m = useMatch({ path: '/g/:gid', end: false })
  const gid = m?.params.gid
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const hasUpdate = useHasUpdate()
  const stage = useRef<HTMLElement>(null)
  const loc = useLocation()
  const navType = useNavigationType()
  usePageEnter(stage)
  // กดลิงก์ไปหน้าใหม่ (PUSH) → เริ่มที่บนสุดของหน้าใหม่ · กดย้อนกลับ (POP) ให้หน้านั้นคืนตำแหน่งเอง (เช่น หน้ากิลด์)
  // ไม่งั้นหน้าใหม่เปิดที่ตำแหน่งเลื่อนเดิมของหน้าก่อน: หน้าใหม่สั้นกว่า = ถูกตัดไปท้ายหน้า แล้ว footer/เนื้อหาเด้งขึ้นมากลางจอ (CLS)
  // useLayoutEffect = เลื่อนก่อนหน้าใหม่วาดเฟรมแรก
  useLayoutEffect(() => {
    if (navType === 'PUSH') window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    navCommitted(loc.pathname) // หน้าใหม่วาดแล้ว → แถบโหลดสีทองวิ่งจนสุด (NavProgress)
  }, [loc.pathname]) // เฉพาะตอนเปลี่ยนหน้า (เปลี่ยนแค่ ?tab= ในหน้าเดิมไม่เลื่อน)
  return (
    <div className="min-h-dvh">
      {/* กดไปหน้าใหม่แล้วหน้าใหม่ยังวาดไม่เสร็จ → แถบทองบนสุด + ม่านจาง ๆ ทับหน้าเดิม */}
      <NavProgress />
      <header data-sticky-top className="site-header @container sticky top-0 z-40 border-b border-gold/15 bg-[var(--surface-deep)]/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-3 sm:px-4">
          <button onClick={() => setMenuOpen(true)} aria-label={tx('เปิดเมนู')} className="relative -ml-1 mr-2 grid h-9 w-9 shrink-0 sm:mr-3 place-items-center rounded-lg border border-white/20 text-white/80 hover:border-gold hover:text-gold">
            <Menu className="h-5 w-5" />
            {hasUpdate && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[var(--surface-deep)]" aria-label={tx('มีอัปเดตใหม่')} />}
          </button>
          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            {/* จอแคบ/ตั้งตัวอักษรใหญ่ (หน่วย rem ขยายตาม) → ย่อชื่อเว็บก่อน ไม่ให้หัวเว็บล้น: ซ่อน "Note" → ซ่อนชื่อทั้งหมด */}
            <Link to="/" aria-label="7K Note" className="flex items-center gap-1.5 text-lg font-bold tracking-wide sm:gap-3 @max-[18.5rem]:hidden">
              <span className="hidden sm:block" aria-hidden="true"><span className="brand-mark">✦</span></span> 7K <span className="font-normal text-gold @max-[22rem]:hidden">Note</span>
            </Link>
            <HeaderClock />
          </div>
          <span className="ml-auto mr-3 hidden text-xs font-medium tracking-[.2em] text-white/45 md:inline">GUILD WAR COMPANION</span>
          <div className="ml-auto flex items-center md:ml-0"><TourHelpButton /><LangButton /><Account /></div>
        </div>
      </header>
      <SideMenu open={menuOpen} onClose={closeMenu} />
      {/* Season ขึ้นทุกหน้า (เหมือนทุกกิลด์) · หน้ากิลด์มีแถบประกาศต่อท้าย — ติดใต้หัวเว็บไปด้วยกัน */}
      <div data-sticky-top className="sticky top-14 z-30">
        <TopStrip inGuild={!!gid} />
        {gid && <AnnouncementBar key={gid} gid={gid} />}
        {gid && <ViewerBar gid={gid} />}
      </div>
      {/* สูงอย่างน้อยเต็มจอ → footer อยู่ใต้ขอบจอเสมอ (ระหว่างโหลด/หน้าสั้น footer ไม่โผล่มาแล้วโดนดันลง = CLS)
          หาร --ui-zoom: จอคอมย่อทั้งเว็บด้วย zoom → 100svh ถูกย่อตามไปด้วย (lib/zoom) · svh = ไม่ยืด/หดตามแถบที่อยู่ของมือถือตอนเลื่อน */}
      <main ref={stage} className="page-stage mx-auto min-h-[calc(100svh/var(--ui-zoom,1)-3.5rem)] max-w-6xl px-4 py-6 sm:py-8">
        {/* หน้าไหนพัง → กล่องให้โหลดใหม่ (หัวเว็บ/เมนูยังใช้ได้) · เปลี่ยนหน้าแล้วลองใหม่เอง */}
        <ErrorBoundary resetKey={loc.pathname}><Outlet /></ErrorBoundary>
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-8 pt-10 text-xs leading-relaxed text-white/40">
        <p className="mb-4 text-center text-gold/65" aria-hidden="true">— ✦ —</p>
        <div className="flex flex-col items-center gap-1.5 border-t border-white/10 pt-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <p>{tx('7K Note · เครื่องมือวางแผนสงครามกิลด์ Seven Knights Re:BIRTH · โปรเจกต์แฟนเมด')}</p>
          <p className="sm:text-right">{tx('ไม่มีส่วนเกี่ยวข้องหรือได้รับการรับรองจาก Netmarble Corp.')}</p>
        </div>
        <div className="mt-2 flex flex-col items-center gap-1.5 text-center sm:flex-row sm:justify-between sm:text-left">
          <p>{tx('ภาพอัศวิน © Netmarble Corp. & Netmarble Nexus Inc. ·')}{' '}<a className="underline underline-offset-4 hover:text-gold" href="https://sena.netmarble.com/en/pcplay" target="_blank" rel="noreferrer">{tx('เว็บไซต์เกมทางการ')}</a></p>
        </div>
        <p className="mt-3 text-center sm:text-left">
          <button type="button" data-testid="footer-support" onClick={openSupport} className="text-gold/80 underline-offset-4 hover:text-gold hover:underline">
            {L('ชอบ 7K Note? ☕ สนับสนุนค่าเซิร์ฟเวอร์', 'Enjoying 7K Note? ☕ Help with server costs')}
          </button>
        </p>
        <p className="mt-2 text-center sm:text-left">{tx('ข้อมูลและไอคอนบางส่วนจาก')}{' '}<a className="underline underline-offset-4 hover:text-gold" href="https://7katlas.com" target="_blank" rel="noreferrer">7K Atlas</a>{' '}{tx('· ขอบคุณมากครับ')}</p>
      </footer>
      <ContactFab />
      <RefreshFailed />
      <LangSuggest />
      <SupportModal />
      <Suspense fallback={null}><TourOverlay /></Suspense>
      {isDemo(gid) ? <CoachPanel /> : <WhatsNew />}
    </div>
  )
}
