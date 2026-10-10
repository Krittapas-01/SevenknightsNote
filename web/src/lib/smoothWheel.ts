import { useEffect } from 'react'
import { usePrefs } from './prefs'

/**
 * เลื่อนด้วยลูกกลิ้งเมาส์ให้นุ่มแบบ touchpad (ใช้ในหน้าที่การ์ดเยอะ)
 * ลูกกลิ้ง = กระโดดทีละ ~100px → Chrome วาดไม่ทัน → กระตุก
 * ดักเฉพาะลูกกลิ้ง (ก้อนใหญ่) แล้วไหลไปทีละนิดหลายเฟรม · touchpad/มือถือ/คนตั้ง reduced motion = ปกติ
 */
export function useSmoothWheel(enabled = true) {
  // ตั้งค่า → ปิดเลื่อนนุ่มได้
  enabled = usePrefs().smoothScroll && enabled
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let target = window.scrollY
    let current = target
    let raf = 0
    /** เจอ touchpad ล่าสุดเมื่อไหร่ (ปล่อยทั้งชุดต่อเนื่องให้เบราว์เซอร์) */
    let touchpadAt = -1e9

    const maxY = () => document.documentElement.scrollHeight - window.innerHeight

    // อยู่ในกล่องที่เลื่อนเองได้ (modal, แถบรายการ) → ปล่อยให้เบราว์เซอร์จัดการ
    const inScrollable = (el: Element | null) => {
      for (; el && el !== document.body; el = el.parentElement) {
        const oy = getComputedStyle(el).overflowY
        if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) return true
      }
      return false
    }

    const step = () => {
      current += (target - current) * 0.16
      if (Math.abs(target - current) < 0.5) current = target
      window.scrollTo({ top: current, behavior: 'instant' })
      raf = current === target ? 0 : requestAnimationFrame(step)
    }

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.shiftKey || e.deltaX) return // zoom / เลื่อนแนวนอน
      const dy = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY
      // ลูกกลิ้งเมาส์: wheelDelta เป็นจำนวนเท่าของ 120 เสมอ · touchpad: ค่าเศษ ๆ ไม่แน่นอน
      const wd = (e as WheelEvent & { wheelDeltaY?: number }).wheelDeltaY
      const looksMouse = e.deltaMode !== 0 || (wd ? wd % 120 === 0 : Math.abs(dy) >= 50)
      const t = performance.now()
      if (!looksMouse) touchpadAt = t
      // touchpad (รวมทั้งชุดที่ต่อเนื่องภายใน 0.4 วิ) → ไม่ยุ่ง และหยุดไหลที่ค้างอยู่
      if (!looksMouse || t - touchpadAt < 400) {
        if (raf) { cancelAnimationFrame(raf); raf = 0 }
        return
      }
      if (inScrollable(e.target as Element)) return
      e.preventDefault()
      if (!raf) target = current = window.scrollY // เริ่มใหม่จากตำแหน่งจริง (เผื่อลาก scrollbar/กดคีย์บอร์ดมา)
      target = Math.max(0, Math.min(maxY(), target + dy))
      if (!raf) raf = requestAnimationFrame(step)
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('wheel', onWheel)
      cancelAnimationFrame(raf)
    }
  }, [enabled])
}
