import { useEffect, useRef } from 'react'
import { L } from './i18n'

export const UNSAVED_MSG = () => L('มีส่วนที่แก้แล้วยังไม่ได้บันทึก ออกจากหน้านี้เลยไหม? (สิ่งที่แก้จะหาย)', 'You have unsaved changes. Leave this page anyway? (your changes will be lost)')

/**
 * กันงานหายตอนกำลังแก้ (เว็บใช้ BrowserRouter → ไม่มี useBlocker):
 * - รีเฟรช/ปิดแท็บ → เบราว์เซอร์ถามเอง (beforeunload)
 * - กดลิงก์ในเว็บ (ชื่อกิลด์ ลิงก์แผนในแถบประกาศ เมนู ฯลฯ) → ถามก่อนออก
 * isDirty เรียกตอนจะออกเท่านั้น (ไม่คำนวณทุกครั้งที่ render)
 */
export function useUnsavedGuard(active: boolean, isDirty: () => boolean) {
  const dirty = useRef(isDirty)
  useEffect(() => { dirty.current = isDirty })
  useEffect(() => {
    if (!active) return
    const onUnload = (e: BeforeUnloadEvent) => {
      if (!dirty.current()) return
      e.preventDefault()
      e.returnValue = ''
    }
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || a.target === '_blank' || a.origin !== window.location.origin) return
      // ลิงก์ที่อยู่หน้าเดิม (เช่น ?slot=) ไม่นับเป็นการออก
      if (a.pathname === window.location.pathname) return
      if (!dirty.current()) return
      if (!window.confirm(UNSAVED_MSG())) { e.preventDefault(); e.stopPropagation() }
    }
    window.addEventListener('beforeunload', onUnload)
    document.addEventListener('click', onClick, true)
    return () => { window.removeEventListener('beforeunload', onUnload); document.removeEventListener('click', onClick, true) }
  }, [active])
}
