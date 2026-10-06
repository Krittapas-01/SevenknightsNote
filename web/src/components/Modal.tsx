import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

let scrollLocks = 0

export default function Modal({ open, title, onClose, children, wide }: { open: boolean; title: ReactNode; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const surface = useRef<HTMLDivElement>(null)
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

  // ล็อกการเลื่อนหน้าแบบนับจำนวน — เปิดซ้อนกันหลายหน้าต่าง ปลดล็อกเมื่อปิดครบทุกอัน
  // (แบบเดิมจำค่า overflow ก่อนหน้า: หน้าต่างซ้อน + render ใหม่ ทำให้จำค่า 'hidden' ไว้ → ปิดแล้วเลื่อนหน้าไม่ได้)
  useEffect(() => {
    if (!open) return
    scrollLocks++
    document.body.style.overflow = 'hidden'
    return () => {
      scrollLocks = Math.max(0, scrollLocks - 1)
      if (!scrollLocks) document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null
  // portal ไปที่ body: ถ้าอยู่ใน .panel (มี backdrop-filter) ตำแหน่ง fixed จะเพี้ยน
  return createPortal(
    <div className="modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onPointerDown={(e) => { downOnBackdrop.current = e.target === e.currentTarget }}
      onClick={(e) => { if (e.target === e.currentTarget && downOnBackdrop.current) onClose(); downOnBackdrop.current = false }}>
      <div
        ref={surface} data-app-modal role="dialog" aria-modal="true" aria-labelledby={titleId}
        className={`modal-surface panel panel-gold flex max-h-[88dvh] w-full ${wide ? 'max-w-6xl' : 'max-w-2xl'} flex-col rounded-b-none sm:rounded-b-[18px]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h2 id={titleId} className="text-lg font-semibold text-gold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-white/10" aria-label="ปิด">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="scrollbar-thin overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  ,
    document.body,
  )
}
