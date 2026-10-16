import { X } from 'lucide-react'
import { useDeferredValue, useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { tx } from '../lib/i18n'
import { lockScroll } from '../lib/scrollLock'

export default function Modal({ open, title, onClose, children, wide }: { open: boolean; title: ReactNode; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const surface = useRef<HTMLDivElement>(null)
  // เปิดหน้าต่าง = พื้นหลังมืดขึ้นทันที แล้วค่อยวาดกรอบพร้อมเนื้อหา (บางหน้าต่างหนัก: การ์ดทีม/รูปเยอะ) → กดปุ่มแล้วไม่ค้าง (INP)
  // ไม่ขึ้นกรอบเปล่าไปก่อน: กรอบเล็กแล้วยืดเต็มทีหลัง = หน้าต่างกระโดด (CLS — มือถือกรอบชิดล่าง ขอบบนพุ่งขึ้นเกือบครึ่งจอ)
  const ready = useDeferredValue(open, false)
  // ปิดเมื่อกดและปล่อยบนพื้นหลังเท่านั้น — ลากคลุมข้อความในช่องแล้วเมาส์หลุดออกนอกกรอบจะไม่ปิดหน้าต่าง
  const downOnBackdrop = useRef(false)
  const titleId = useId()
  // onClose มักเป็นฟังก์ชันใหม่ทุก render → เก็บใน ref ไม่ให้ effect ด้านล่างรันซ้ำ
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      const dialogs = document.querySelectorAll('[data-app-modal]')
      if (e.key === 'Escape' && dialogs[dialogs.length - 1] === surface.current) closeRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // ล็อกการเลื่อนหน้าแบบนับจำนวน — เปิดซ้อนกันหลายหน้าต่าง ปลดล็อกเมื่อปิดครบทุกอัน (lib/scrollLock)
  useEffect(() => (open ? lockScroll() : undefined), [open])

  if (!open) return null
  // portal ไปที่ body: ถ้าอยู่ใน .panel (มี backdrop-filter) ตำแหน่ง fixed จะเพี้ยน
  // พื้นหลังมืดเฉย ๆ ไม่เบลอ: เบลอเต็มจอต้องเบลอใหม่ทั้งจอทุกเฟรมที่ในหน้าต่างขยับ (เลื่อน/ชี้การ์ด) → ตารางอัศวินหน้าใหญ่เลื่อนกระตุก
  return createPortal(
    <div className="modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
      onPointerDown={(e) => { downOnBackdrop.current = e.target === e.currentTarget }}
      onClick={(e) => { if (e.target === e.currentTarget && downOnBackdrop.current) onClose(); downOnBackdrop.current = false }}>
      {ready && (
        <div
          ref={surface} data-app-modal role="dialog" aria-modal="true" aria-labelledby={titleId}
          className={`modal-surface panel panel-gold flex max-h-[88dvh] w-full ${wide ? 'max-w-6xl' : 'max-w-2xl'} flex-col rounded-b-none sm:rounded-b-[18px]`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
            <h2 id={titleId} className="text-lg font-semibold text-gold">{title}</h2>
            <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-white/10" aria-label={tx('ปิด')}>
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="scrollbar-thin overflow-y-auto p-5">{children}</div>
        </div>
      )}
    </div>
  ,
    document.body,
  )
}
