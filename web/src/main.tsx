import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import './index.css'
import Layout from './components/Layout'
import LandingPage from './pages/LandingPage'
// หน้าหนัก ๆ โหลดแยกเมื่อเปิดหน้านั้น (หน้าแรกเปิดเร็วขึ้น)
const GuildPage = lazy(() => import('./pages/GuildPage'))
const TargetPage = lazy(() => import('./pages/TargetPage'))
const PlanPage = lazy(() => import('./pages/PlanPage'))
const BiscuitPage = lazy(() => import('./pages/BiscuitPage'))
const loading = <p className="py-24 text-center text-white/50">กำลังโหลด...</p>
import NotFound from './pages/NotFound'

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
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
