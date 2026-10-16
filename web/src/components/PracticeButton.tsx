import { Gamepad2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import TeamPractice from './TeamPractice'
import { lockScroll } from '../lib/scrollLock'

/** ปุ่ม "ลองฝึก" — เปิดสนามฝึกซ้อนบนหน้าเดิม (ข้อมูลทดลอง ไม่ยุ่งกับทีมจริง) */
import { TUTORIAL_ON } from '../lib/onboarding'
export default function PracticeButton(p: { className?: string }) { return TUTORIAL_ON ? <PracticeInner {...p} /> : null }
function PracticeInner({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const unlock = lockScroll()
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[data-app-modal]')) setOpen(false) }
    window.addEventListener('keydown', esc)
    return () => { unlock(); window.removeEventListener('keydown', esc) }
  }, [open])
  return (
    <>
      <button type="button" data-noexport onClick={() => setOpen(true)} title="ลองจัดทีมในสนามฝึก (ไม่บันทึกจริง)"
        className={`inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs text-gold hover:bg-gold/20 ${className}`}>
        <Gamepad2 className="h-3.5 w-3.5" /> ลองฝึก
      </button>
      {open && (
        <div data-noexport role="dialog" aria-label="สนามฝึกจัดทีม" className="fixed inset-0 overflow-y-auto bg-[#0b1120]/95" style={{ zIndex: 45 }}>
          <div className="sticky top-0 z-10 border-b border-gold/20 bg-[var(--surface-deep)]/95">
            <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
              <Gamepad2 className="h-5 w-5 text-gold" />
              <span className="font-bold">สนามฝึก<span className="text-gold">จัดทีม</span></span>
              <span className="hidden text-xs text-white/50 sm:inline">ข้อมูลทดลอง · ไม่บันทึกลงกิลด์</span>
              <button onClick={() => setOpen(false)} className="ml-auto flex items-center gap-1 rounded-full border border-white/20 px-3 py-1.5 text-sm text-white/80 hover:border-gold hover:text-gold">
                <X className="h-4 w-4" /> ปิด
              </button>
            </div>
          </div>
          <div className="px-4 py-6">
            <TeamPractice overlay onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
