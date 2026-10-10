import { useEffect, useRef, type RefObject } from 'react'
import { useLocation, useNavigationType } from 'react-router'

/** ตัวเลือกเดียวกับ .page-stage ใน index.css — ชิ้นที่ปลอดภัยจะขยับได้ */
const PIECE = ':not(.fixed, .sticky, .modal-backdrop, [role="dialog"], [data-bottom-bar], :has(.fixed, .sticky, [data-bottom-bar]))'

/**
 * แอนิเมชันเข้าหน้าทุกหน้า
 * - เปลี่ยนไปหน้าคนละแบบ: CSS (.page-stage) เล่นเองตอนชิ้นถูกใส่เข้ามา (รวมตอนข้อมูลโหลดเสร็จ)
 * - หน้าแบบเดิมแต่คนละอัน (เช่น บ้านศัตรู A → B): React ใช้ตัวเดิมซ้ำ CSS จะไม่เล่น → สั่งเล่นซ้ำที่นี่
 * - เปลี่ยนแค่ ?tab= หรือแค่เปลี่ยน URL หลังบันทึก (replace) ไม่เล่น
 */
export function usePageEnter(stage: RefObject<HTMLElement | null>) {
  const { pathname } = useLocation()
  const navType = useNavigationType()
  const prevRoot = useRef<Element | null>(null)
  const prevPath = useRef(pathname)
  useEffect(() => {
    const root = stage.current?.firstElementChild ?? null
    // replace = เปลี่ยน URL หลังบันทึก (เช่น new → id) ไม่ใช่การย้ายหน้า → ไม่เล่น
    const reused = root && root === prevRoot.current && prevPath.current !== pathname && navType !== 'REPLACE'
    prevRoot.current = root
    prevPath.current = pathname
    if (!reused || !root || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let i = 0
    for (const el of Array.from(root.children)) {
      let ok = false
      try { ok = el.matches(PIECE) } catch { return } // เบราว์เซอร์ไม่รู้จัก :has
      if (!ok) continue
      el.animate(
        [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
        { duration: 420, delay: Math.min(i++, 6) * 45, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'backwards' },
      )
    }
  }, [pathname, navType, stage])
}
