import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'

/**
 * แถบแท็บแบบมีพื้นเลื่อนตาม (พื้นทองวิ่งไปหาแท็บที่เลือก แทนการกระโดด)
 * ใช้: const s = useSlidePill(activeKey) → <div ref={s.box} className="relative ..."><span className="slide-pill" style={s.pill} />
 *      {items.map(k => <button ref={s.item(k)} className="relative z-10 ...">)}
 */
export function useSlidePill(active: string | number | null | undefined) {
  const box = useRef<HTMLDivElement | null>(null)
  const items = useRef(new Map<string | number, HTMLElement>())
  const [pill, setPill] = useState<CSSProperties>({ opacity: 0 })
  const first = useRef(true)
  const activeRef = useRef(active)
  activeRef.current = active
  const measure = useCallback(() => {
    const k = activeRef.current
    const el = k == null ? null : items.current.get(k)
    if (!el) return setPill((p) => (p.opacity === 0 ? p : { ...p, opacity: 0 }))
    const next: CSSProperties = {
      position: 'absolute', top: el.offsetTop, left: el.offsetLeft, width: el.offsetWidth, height: el.offsetHeight, opacity: 1,
      transition: first.current ? 'none' : 'left 260ms cubic-bezier(.2,.8,.2,1), width 260ms cubic-bezier(.2,.8,.2,1), top 260ms, height 260ms',
    }
    first.current = false
    setPill((p) => (p.left === next.left && p.width === next.width && p.top === next.top && p.height === next.height && p.opacity === 1 ? p : next))
  }, [])
  // เปลี่ยนแท็บ → วัดใหม่ · ขนาดกล่องเปลี่ยน (ฟอนต์โหลด/จอหมุน) → วัดใหม่
  useLayoutEffect(() => { measure() }, [active, measure])
  useLayoutEffect(() => {
    const el = box.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => measure())
    ro.observe(el)
    return () => ro.disconnect()
  })
  const item = (key: string | number) => (el: HTMLElement | null) => {
    if (el) {
      items.current.set(key, el)
      if (key === activeRef.current) requestAnimationFrame(measure) // แท็บโผล่ทีหลัง (เช่น หลังโหลดข้อมูล)
    } else items.current.delete(key)
  }
  return { box, pill, item }
}

/**
 * ทิศทางเลื่อนเนื้อหาตอนเปลี่ยนแท็บ: ไปแท็บขวา = เลื่อนเข้าจากขวา
 * จำทิศไว้จนกว่าจะเปลี่ยนแท็บครั้งถัดไป — ถ้าคืนค่าว่างตอน render รอบถัดไป คลาสจะหลุดกลางทางแล้วแอนิเมชันหยุด
 * ใช้คู่กับ key={index} ที่กล่องเนื้อหา (เปลี่ยนแท็บ = กล่องใหม่ = เล่นแอนิเมชันใหม่)
 */
export function useSlideDir(index: number) {
  const prev = useRef(index)
  const dir = useRef('')
  if (index !== prev.current) {
    dir.current = index > prev.current ? 'slide-in-r' : 'slide-in-l'
    prev.current = index
  }
  return dir.current
}
