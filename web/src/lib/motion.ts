import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { useLocation, useNavigationType } from 'react-router'
import { motionOK, movable } from './overlayMotion'

const DELAYS = [0, 50, 100, 150, 195, 235, 270]
const KEYS: Keyframe[] = [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }]
/** โครงหน้า (กล่องเทาตอนรอข้อมูล) เข้า / หน้าจริงมาแทนโครง: ไม่จางจากศูนย์ ไม่งั้นจอว่างแวบหนึ่งระหว่างของเก่าหายกับของใหม่ค่อย ๆ โผล่ */
const SETTLE: Keyframe[] = [{ opacity: 0.4, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }]
const EASE_OUT = 'cubic-bezier(.16, 1, .3, 1)'
function arrive(el: Element, delay: number, keys = KEYS) {
  if (movable(el)) el.animate(keys, { duration: 480, delay, easing: EASE_OUT, fill: 'backwards' })
}
/** โครงหน้าระหว่างรอ (PageSkeleton / Suspense fallback) */
const isSkeleton = (el: Element | null) => !!el?.hasAttribute('data-skeleton')

/**
 * แอนิเมชันเข้าหน้าทุกหน้า
 * - เปลี่ยนไปหน้าคนละแบบ: ชิ้นที่ถูกใส่เข้ามาใต้ .page-stage ลอยขึ้นทีละชิ้น (รวมตอนข้อมูลโหลดเสร็จ)
 *   เดิมใช้ CSS (.page-stage > * > :nth-child / :has) แต่ตัวเลือกพวกนั้นทำให้เบราว์เซอร์ต้องคำนวณสไตล์
 *   ทั้งแถวใหม่ทุกครั้งที่ลบ/เพิ่มของในหน้า (เช่น การ์ด 100+ ใบในแถบอัศวิน) → ย้ายมาทำด้วย JS แทน
 *   MutationObserver ทำงานก่อนเบราว์เซอร์วาดเฟรม → ไม่มีแวบเห็นของก่อนแอนิเมชันเริ่ม
 * - โครงหน้า (data-skeleton) เข้า และ โครงหน้า → หน้าจริง: ขยับเบา ๆ ไม่จางจากศูนย์ (ไม่มีจอว่างแวบ)
 * - หน้าแบบเดิมแต่คนละอัน (เช่น บ้านศัตรู A → B): React ใช้ตัวเดิมซ้ำ CSS จะไม่เล่น → สั่งเล่นซ้ำที่นี่
 * - เปลี่ยนแค่ ?tab= หรือแค่เปลี่ยน URL หลังบันทึก (replace) ไม่เล่น
 * - ปิดเมื่อตั้งค่า "ลดแอนิเมชัน" (ในเว็บ/ในเครื่อง)
 */
export function usePageEnter(stage: RefObject<HTMLElement | null>) {
  const { pathname } = useLocation()
  const navType = useNavigationType()
  const prevRoot = useRef<Element | null>(null)
  const prevPath = useRef(pathname)
  useLayoutEffect(() => {
    const st = stage.current
    if (!st || typeof MutationObserver === 'undefined') return
    // ชิ้นใหม่ในหน้า (ลูกของลูก .page-stage) → ลอยขึ้น หน่วงตามลำดับ (เหมือน :nth-child เดิม)
    const pieces = new MutationObserver((recs) => {
      if (!motionOK()) return
      for (const r of recs) for (const n of Array.from(r.addedNodes)) {
        if (!(n instanceof Element) || n.parentElement !== r.target) continue
        const i = Array.prototype.indexOf.call((r.target as Element).children, n)
        arrive(n, DELAYS[Math.min(Math.max(i, 0), 6)])
      }
    })
    const watch = (root: Element, play: boolean, settle = false) => {
      pieces.observe(root, { childList: true })
      if (!play || !motionOK()) return
      Array.from(root.children).forEach((c, i) => arrive(c, settle ? Math.min(i, 6) * 30 : DELAYS[Math.min(i, 6)], settle ? SETTLE : KEYS))
    }
    // หน้าใหม่ทั้งหน้า (ลูกของ .page-stage เปลี่ยน)
    const roots = new MutationObserver((recs) => {
      const fromSkeleton = recs.some((r) => Array.from(r.removedNodes).some((n) => n instanceof Element && isSkeleton(n)))
      for (const r of recs) for (const n of Array.from(r.addedNodes)) if (n instanceof Element) watch(n, true, fromSkeleton || isSkeleton(n))
    })
    roots.observe(st, { childList: true })
    for (const root of Array.from(st.children)) watch(root, true) // เปิดเว็บครั้งแรก
    return () => { pieces.disconnect(); roots.disconnect() }
  }, [stage])
  useEffect(() => {
    const root = stage.current?.firstElementChild ?? null
    // replace = เปลี่ยน URL หลังบันทึก (เช่น new → id) ไม่ใช่การย้ายหน้า → ไม่เล่น
    const reused = root && root === prevRoot.current && prevPath.current !== pathname && navType !== 'REPLACE'
    prevRoot.current = root
    prevPath.current = pathname
    if (!reused || !root || !motionOK()) return
    Array.from(root.children).filter(movable).forEach((el, i) => arrive(el, Math.min(i, 6) * 45))
  }, [pathname, navType, stage])
}
