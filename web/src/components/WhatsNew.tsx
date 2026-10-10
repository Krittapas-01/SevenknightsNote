import { Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { getRecent } from '../lib/api'
import { LATEST_UPDATE, markUpdateSeen, seenUpdate, unseenUpdates } from '../lib/changelog'
import Modal from './Modal'
import PatchNotes, { PatchHeader } from './PatchNotes'
import { tx } from '../lib/i18n'

/** มีอัปเดตที่เครื่องนี้ยังไม่เห็น? (ใช้ทำจุดแดงที่เมนู) */
export function useHasUpdate() {
  const [has, setHas] = useState(() => seenUpdate() !== LATEST_UPDATE)
  useEffect(() => {
    const on = () => setHas(seenUpdate() !== LATEST_UPDATE)
    window.addEventListener('7k-note:update-seen', on)
    return () => window.removeEventListener('7k-note:update-seen', on)
  }, [])
  return has
}

/**
 * ป๊อปอัป "มีอะไรใหม่" ครั้งเดียวต่อเครื่องต่ออัปเดต
 * คนที่เพิ่งเข้าเว็บครั้งแรก (ยังไม่เคยเปิดกิลด์) ไม่ต้องเห็น → นับว่าเห็นแล้วเลย
 */
export default function WhatsNew() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [items] = useState(() => unseenUpdates())

  useEffect(() => {
    if (seenUpdate() === LATEST_UPDATE) return
    if (seenUpdate() === null && getRecent().length === 0) { markUpdateSeen(); return }
    if (pathname === '/updates') return
    const t = setTimeout(() => setOpen(true), 600) // ให้หน้าโหลดเสร็จก่อน
    return () => clearTimeout(t)
  }, [pathname])

  const close = () => { setOpen(false); markUpdateSeen() }

  return (
    <Modal open={open} title={<span className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-gold" />{' '}{tx('มีอะไรใหม่')}</span>} onClose={close}>
      {/* แพทช์ที่ยังไม่เห็น (ใหม่สุดก่อน) — ปกติมีอันเดียว */}
      <div className="space-y-6">
        {items.map((c) => (
          <div key={c.id}>
            <PatchHeader entry={c} />
            <div className="mt-3"><PatchNotes entry={c} onNavigate={close} /></div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex gap-2">
        <button onClick={close} className="btn-gold flex-1 py-2 font-semibold">{tx('เข้าใจแล้ว')}</button>
        <Link to="/updates" onClick={close} className="pill px-4 py-2 text-sm text-white/80 hover:bg-white/10">{tx('ดูทั้งหมด')}</Link>
      </div>
    </Modal>
  )
}
