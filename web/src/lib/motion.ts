import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { useLocation, useNavigationType } from 'react-router'

/** ชิ้นที่ปลอดภัยจะขยับได้ (ไม่ใช่ของ fixed/sticky และไม่มีของ fixed อยู่ข้างใน — transform จะทำให้ของ fixed กระโดด) */
const PIECE = ':not(.fixed, .sticky, .modal-backdrop, [role="dialog"], [data-bottom-bar], :has(.fixed, .sticky, [data-bottom-bar]))'

const DELAYS = [0, 45, 90, 135, 180, 220, 260]
const KEYS: Keyframe[] = [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }]
const EASE_OUT = 'cubic-bezier(.16, 1, .3, 1)'
function arrive(el: Element, delay: number) {
  let ok = false
  try { ok = el.matches(PIECE) } catch { return } // เบราว์เซอร์ไม่รู้จัก :has → ไม่มีแอนิเมชันเฉย ๆ
  if (ok) el.animate(KEYS, { duration: 420, delay, easing: EASE_OUT, fill: 'backwards' })
}

/**
 * แอนิเมชันเข้าหน้าทุกหน้า
 * - เปลี่ยนไปหน้าคนละแบบ: ชิ้นที่ถูกใส่เข้ามาใต้ .page-stage ลอยขึ้นทีละชิ้น (รวมตอนข้อมูลโหลดเสร็จ)
 *   เดิมใช้ CSS (.page-stage > * > :nth-child / :has) แต่ตัวเลือกพวกนั้นทำให้เบราว์เซอร์ต้องคำนวณสไตล์
 *   ทั้งแถวใหม่ทุกครั้งที่ลบ/เพิ่มของในหน้า (เช่น การ์ด 100+ ใบในแถบอัศวิน) → ย้ายมาทำด้วย JS แทน
 *   MutationObserver ทำงานก่อนเบราว์เซอร์วาดเฟรม → ไม่มีแวบเห็นของก่อนแอนิเมชันเริ่ม
 * - หน้าแบบเดิมแต่คนละอัน (เช่น บ้านศัตรู A → B): React ใช้ตัวเดิมซ้ำ CSS จะไม่เล่น → สั่งเล่นซ้ำที่นี่
 * - เปลี่ยนแค่ ?tab= หรือแค่เปลี่ยน URL หลังบันทึก (replace) ไม่เล่น
 */
export function usePageEnter(stage: RefObject<HTMLElement | null>) {
  const { pathname } = useLocation()
  const navType = useNavigationType()
  const prevRoot = useRef<Element | null>(null)
  const prevPath = useRef(pathname)
  useLayoutEffect(() => {
    const st = stage.current
    if (!st || typeof MutationObserver === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // ชิ้นใหม่ในหน้า (ลูกของลูก .page-stage) → ลอยขึ้น หน่วงตามลำดับ (เหมือน :nth-child เดิม)
    const pieces = new MutationObserver((recs) => {
      for (const r of recs) for (const n of Array.from(r.addedNodes)) {
        if (!(n instanceof Element) || n.parentElement !== r.target) continue
        const i = Array.prototype.indexOf.call((r.target as Element).children, n)
        arrive(n, DELAYS[Math.min(Math.max(i, 0), 6)])
      }
    })
    const watch = (root: Element, play: boolean) => {
      pieces.observe(root, { childList: true })
      if (play) Array.from(root.children).forEach((c, i) => arrive(c, DELAYS[Math.min(i, 6)]))
    }
    // หน้าใหม่ทั้งหน้า (ลูกของ .page-stage เปลี่ยน)
    const roots = new MutationObserver((recs) => {
      for (const r of recs) for (const n of Array.from(r.addedNodes)) if (n instanceof Element) watch(n, true)
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
    if (!reused || !root || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let i = 0
    for (const el of Array.from(root.children)) {
      let ok = false
      try { ok = el.matches(PIECE) } catch { return } // เบราว์เซอร์ไม่รู้จัก :has
      if (!ok) continue
      el.animate(KEYS, { duration: 420, delay: Math.min(i++, 6) * 45, easing: EASE_OUT, fill: 'backwards' })
    }
  }, [pathname, navType, stage])
}
