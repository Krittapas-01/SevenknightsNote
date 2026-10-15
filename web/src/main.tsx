import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import './index.css'
import Layout from './components/Layout'
import { applyUiZoom } from './lib/zoom'
import { applyMotion } from './lib/prefs'
import LandingPage from './pages/LandingPage'
// หน้าหนัก ๆ โหลดแยกเมื่อเปิดหน้านั้น (หน้าแรกเปิดเร็วขึ้น)
const GuildPage = lazy(() => import('./pages/GuildPage'))
const TargetPage = lazy(() => import('./pages/TargetPage'))
const PlanPage = lazy(() => import('./pages/PlanPage'))
const BiscuitPage = lazy(() => import('./pages/BiscuitPage'))
const TotalWarPage = lazy(() => import('./pages/TotalWarPage'))
const AtkPage = lazy(() => import('./pages/AtkPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'))
const GuidePage = lazy(() => import('./pages/GuidePage'))
const UpdatesPage = lazy(() => import('./pages/UpdatesPage'))
const PracticePage = lazy(() => import('./pages/PracticePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const loading = <p className="py-24 text-center text-white/50">{tx('กำลังโหลด...')}</p>
import NotFound from './pages/NotFound'
import { tx } from './lib/i18n'


applyUiZoom() // จอคอมย่อเหลือ 80% (Full HD) / 85% (2K) · ปรับเองได้ในหน้าตั้งค่า
applyMotion()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<LandingPage />} />
          <Route path="g/:gid" element={<Suspense fallback={loading}><GuildPage /></Suspense>} />
          <Route path="g/:gid/t/:tid" element={<Suspense fallback={loading}><TargetPage /></Suspense>} />
          <Route path="g/:gid/p/:pid" element={<Suspense fallback={loading}><PlanPage /></Suspense>} />
          <Route path="biscuit" element={<Suspense fallback={loading}><BiscuitPage /></Suspense>} />
          <Route path="totalwar" element={<Suspense fallback={loading}><TotalWarPage /></Suspense>} />
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
  </StrictMode>,
)
