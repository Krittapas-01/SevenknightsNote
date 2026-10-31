import { Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { getRecent } from '../lib/api'
import { markUpdateSeen, seenLatest, seenUpdate, unseenUpdates } from '../lib/changelog'
import Modal from './Modal'
import PatchNotes, { PatchHeader } from './PatchNotes'
import { tx } from '../lib/i18n'

/** มีอัปเดตที่เครื่องนี้ยังไม่เห็น? (ใช้ทำจุดแดงที่เมนู) */
export function useHasUpdate() {
  const [has, setHas] = useState(() => !seenLatest())
  useEffect(() => {
    const on = () => setHas(!seenLatest())
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
  const [items] = useState(() => unseenUpdates().filter((c) => !c.quiet))

  useEffect(() => {
    if (seenLatest()) return
    if (seenUpdate() === null && getRecent().length === 0) { markUpdateSeen(); return }
    if (!items.length) { markUpdateSeen(); return } // มีแต่แพตช์ quiet ที่ยังไม่เห็น → ไม่ต้องเด้ง
    if (pathname === '/updates') return
    const t = setTimeout(() => { if (!seenLatest()) setOpen(true) }, 600) // ให้หน้าโหลดเสร็จก่อน
    return () => clearTimeout(t)
  }, [pathname])

  // กด "เข้าใจแล้ว" ในแท็บอื่น → ปิดป๊อปอัปที่ค้างในแท็บนี้ด้วย
  useEffect(() => {
    const on = () => { if (seenLatest()) setOpen(false) }
    window.addEventListener('7k-note:update-seen', on)
    return () => window.removeEventListener('7k-note:update-seen', on)
  }, [])

  const close = () => { setOpen(false); markUpdateSeen() }

  return (
    <Modal open={open} title={<span className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-gold" />{' '}{tx('มีอะไรใหม่')}</span>} onClose={close}>
      {/* แพทช์ที่ยังไม่เห็น (ใหม่สุดก่อน) — ปกติมีอันเดียว */}
      <div className="space-y-6">
        {items.map((c, i) => (
          <div key={c.id} className={i ? 'border-t border-white/10 pt-6' : ''}>
            <PatchHeader entry={c} />
            <div className="mt-4"><PatchNotes entry={c} onNavigate={close} /></div>
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
