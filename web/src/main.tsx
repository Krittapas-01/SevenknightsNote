import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import './index.css'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import { applyUiZoom } from './lib/zoom'
import { applyMotion } from './lib/prefs'
import LandingPage from './pages/LandingPage'
import { prefetchGuild } from './lib/useGuild'
// หน้าหนัก ๆ โหลดแยกเมื่อเปิดหน้านั้น (หน้าแรกเปิดเร็วขึ้น)
const loadGuild = () => import('./pages/GuildPage')
const loadTarget = () => import('./pages/TargetPage')
const loadPlan = () => import('./pages/PlanPage')
const GuildPage = lazy(loadGuild)
const TargetPage = lazy(loadTarget)
const PlanPage = lazy(loadPlan)
const BiscuitPage = lazy(() => import('./pages/BiscuitPage'))
const TotalWarPage = lazy(() => import('./pages/TotalWarPage'))
import { PACKS_ON } from './lib/packs'
const PacksPage = lazy(() => import('./pages/PacksPage'))
const AtkPage = lazy(() => import('./pages/AtkPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'))
const GuidePage = lazy(() => import('./pages/GuidePage'))
const UpdatesPage = lazy(() => import('./pages/UpdatesPage'))
const PracticePage = lazy(() => import('./pages/PracticePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const loading = <p data-skeleton className="py-24 text-center text-white/50">{tx('กำลังโหลด...')}</p>
import NotFound from './pages/NotFound'
import { tx } from './lib/i18n'


applyUiZoom() // จอคอมย่อเหลือ 80% (Full HD) / 85% (2K) · ปรับเองได้ในหน้าตั้งค่า
applyMotion()

// เปิดเว็บมาที่หน้าของกิลด์ → เริ่มโหลดโค้ดหน้านั้น + ข้อมูลกิลด์พร้อมกันทันที (ไม่ต่อคิวรอ React วาด → โค้ดหน้า → ค่อยยิงข้อมูล)
// แล้วตอนเครื่องว่าง โหลดโค้ดหน้าที่มักกดต่อไว้ก่อน (กิลด์ ↔ บ้านศัตรู ↔ แผน) → กดแล้วเปิดทันที ไม่ค้างหน้าเดิมรอโหลด
const guildPath = location.pathname.match(/^\/g\/([^/]+)(?:\/([tp])\/[^/]+)?\/?$/)
if (guildPath) {
  try { prefetchGuild(decodeURIComponent(guildPath[1])) } catch { /* URL เพี้ยน → หน้ากิลด์จัดการเอง */ }
  void (guildPath[2] === 't' ? loadTarget() : guildPath[2] === 'p' ? loadPlan() : loadGuild()).catch(() => {})
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
  if (!saveData) {
    const whenIdle = (cb: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(cb, { timeout: 5000 }) : setTimeout(cb, 1000))
    // หลังรูป/ข้อมูลหน้าแรกโหลดเสร็จ (load) อีกสักพัก ไม่แย่งเน็ตกับของที่ต้องขึ้นจอก่อน
    addEventListener('load', () => setTimeout(() => whenIdle(() => {
      for (const load of [loadGuild, loadTarget, loadPlan]) load().catch(() => {})
    }), 2500), { once: true })
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<LandingPage />} />
          <Route path="g/:gid" element={<Suspense fallback={loading}><GuildPage /></Suspense>} />
          <Route path="g/:gid/t/:tid" element={<Suspense fallback={loading}><TargetPage /></Suspense>} />
          <Route path="g/:gid/p/:pid" element={<Suspense fallback={loading}><PlanPage /></Suspense>} />
          <Route path="biscuit" element={<Suspense fallback={loading}><BiscuitPage /></Suspense>} />
          <Route path="totalwar" element={<Suspense fallback={loading}><TotalWarPage /></Suspense>} />
          {PACKS_ON && <Route path="packs" element={<Suspense fallback={loading}><PacksPage /></Suspense>} />}
          <Route path="atk" element={<Suspense fallback={loading}><AtkPage /></Suspense>} />
          <Route path="admin" element={<Suspense fallback={loading}><AdminPage /></Suspense>} />
          <Route path="favorites" element={<Suspense fallback={loading}><FavoritesPage /></Suspense>} />
          <Route path="guide" element={<Suspense fallback={loading}><GuidePage /></Suspense>} />
          <Route path="guide/practice" element={<Suspense fallback={loading}><PracticePage /></Suspense>} />
          <Route path="updates" element={<Suspense fallback={loading}><UpdatesPage /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={loading}><SettingsPage /></Suspense>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
