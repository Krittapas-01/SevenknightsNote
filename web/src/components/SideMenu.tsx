import { Calculator, Cookie, ExternalLink, Gem, Home, Megaphone, MessagesSquare, Settings, Shield, Sparkles, ThumbsUp, X } from 'lucide-react'
import { Suspense, lazy, useEffect, useState, type ComponentType } from 'react'
import { NavLink } from 'react-router'
import { getRecent, refreshRecent } from '../lib/api'
import { useHasUpdate } from './WhatsNew'
import Modal from './Modal'
import { tx } from '../lib/i18n'

// หน้าต่างตั้งค่าในเมนู โหลดตอนเปิดครั้งแรก (ไม่ต้องอยู่ในไฟล์หลักที่ทุกหน้าโหลด)
const SettingsBody = lazy(() => import('../pages/SettingsPage').then((m) => ({ default: m.SettingsBody })))

// เมนูหลักของเว็บ เพิ่มหน้า/เครื่องมือใหม่ที่นี่ที่เดียว
const NAV: { to: string; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { to: '/', label: tx('หน้าแรก'), icon: Home },
  { to: '/biscuit', label: tx('เช็กบัฟบิสกิต'), icon: Cookie },
  { to: '/totalwar', label: tx('คำนวณแต้มเบ็ดเสร็จ'), icon: Calculator },
  { to: '/packs', label: tx('เช็กความคุ้มค่าแพ็ค'), icon: Gem },
  { to: '/favorites', label: tx('พรีเซต & ทีมที่ชอบ'), icon: ThumbsUp },
]

// ลิงก์ออกไปหน้าทางการของ Netmarble (เปิดแท็บใหม่)
const EXTERNAL = [
  { href: 'https://skre-shop.netmarble.com/en/event/daily_gift', label: tx('เปิดไพ่ทาโรต์'), sub: tx('ของขวัญรายวัน · หน้าทางการ'), icon: Sparkles },
  { href: 'https://forum.netmarble.com/sk_rebirth_gl', label: tx('ฟอรัมไทย'), sub: tx('Netmarble Forum · ทางการ'), icon: MessagesSquare },
  { href: 'https://forum.netmarble.com/sena_rebirth', label: tx('ฟอรัมเกาหลี'), sub: tx('Netmarble Forum · ทางการ'), icon: MessagesSquare },
]

export default function SideMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const [recent, setRecent] = useState(getRecent)
  const [settings, setSettings] = useState(false)
  const hasUpdate = useHasUpdate()
  useEffect(() => {
    if (!open) return
    setRecent(getRecent())
    refreshRecent().then(setRecent).catch(() => {}) // ชื่อล่าสุด + ตัดกิลด์ที่ถูกลบ
  }, [open])
  const item = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 ${isActive ? 'bg-white/10 text-gold' : 'text-white/85 hover:bg-white/5'}`

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div onClick={onClose} className={`absolute inset-0 bg-[var(--backdrop)] transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} />
      <nav
        className={`absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-white/10 bg-[var(--surface-3)] p-4 shadow-2xl transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2 text-lg font-bold">
            <span className="text-gold">✦</span> 7K Note
          </span>
          <button onClick={onClose} aria-label={tx('ปิดเมนู')} className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end onClick={onClose} className={item}>
            <Icon className="h-5 w-5 shrink-0" /> {label}
          </NavLink>
        ))}
        {EXTERNAL.map(({ href, label, sub, icon: Icon }) => (
          <a key={href} href={href} target="_blank" rel="noreferrer" onClick={onClose} className={item({ isActive: false })}>
            <Icon className="h-5 w-5 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block">{label}</span>
              <span className="block text-xs text-white/45">{sub}</span>
            </span>
            <ExternalLink className="h-4 w-4 shrink-0 text-white/40" />
          </a>
        ))}

        <hr className="my-3 border-white/10" />
        <p className="mb-1 px-3 text-xs text-white/45">{tx('กิลด์ที่เคยเปิด')}</p>
        {recent.length === 0 && <p className="px-3 py-2 text-sm text-white/40">{tx('ยังไม่มี เปิดลิงก์กิลด์แล้วจะขึ้นที่นี่')}</p>}
        {recent.map((r) => (
          <NavLink key={r.id} to={`/g/${r.id}`} onClick={onClose} className={item}>
            <Shield className="h-5 w-5 shrink-0" /> <span className="truncate">{r.name}</span>
          </NavLink>
        ))}

        {/* ล่างสุดของเมนู (mt-auto): อัปเดตล่าสุด + ตั้งค่า — แบบแอปทั่วไป */}
        <div className="mt-auto border-t border-white/10 pt-3">
          <NavLink to="/updates" end onClick={onClose} className={item}>
            <Megaphone className="h-5 w-5 shrink-0" />{' '}{tx('อัปเดตล่าสุด')}
            {hasUpdate && <span className="ml-auto rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-4 text-white">{tx('ใหม่')}</span>}
          </NavLink>
          {/* ตั้งค่าเปิดเป็นป๊อปอัป ไม่ต้องเปลี่ยนหน้า (ปิดแล้วอยู่หน้าเดิม) */}
          <button type="button" onClick={() => { onClose(); setSettings(true) }} className={`w-full ${item({ isActive: false })}`}>
            <Settings className="h-5 w-5 shrink-0" />{' '}{tx('ตั้งค่า')}
          </button>
        </div>
      </nav>
      <Modal open={settings} title={tx('ตั้งค่า')} onClose={() => setSettings(false)}>
        <Suspense fallback={<p className="py-8 text-center text-white/50">{tx('กำลังโหลด...')}</p>}><SettingsBody onNavigate={() => setSettings(false)} /></Suspense>
      </Modal>
    </div>
  )
}
