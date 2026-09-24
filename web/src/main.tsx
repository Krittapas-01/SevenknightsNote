import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import './index.css'
import Layout from './components/Layout'
import LandingPage from './pages/LandingPage'
import GuildPage from './pages/GuildPage'
import TargetPage from './pages/TargetPage'
import PlanPage from './pages/PlanPage'
import NotFound from './pages/NotFound'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<LandingPage />} />
          <Route path="g/:gid" element={<GuildPage />} />
          <Route path="g/:gid/t/:tid" element={<TargetPage />} />
          <Route path="g/:gid/p/:pid" element={<PlanPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
