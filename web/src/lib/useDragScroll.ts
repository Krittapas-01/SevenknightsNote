import { useRef } from 'react'

/**
 * ลากแถบด้วยเมาส์เหมือนในเกม (ลากไปซ้าย = เลื่อนไปขวา) + ไถลต่อนิดหน่อยตอนปล่อย
 * มือถือใช้การปัดของเบราว์เซอร์อยู่แล้ว
 */
export function useDragScroll(ref: React.RefObject<HTMLDivElement | null>, axis: 'x' | 'y' = 'x') {
  const st = useRef({ down: false, p: 0, start: 0, moved: 0, v: 0, last: 0, lastT: 0, raf: 0 })
  // แนวตั้ง: เลื่อนกล่องที่ห่อ (เนื้อหาใน Modal) / แนวนอน: เลื่อนตัวเอง
  const target = () => (axis === 'y' ? (ref.current?.closest('.overflow-y-auto') as HTMLElement | null) : ref.current)
  const pos = (e: React.PointerEvent) => (axis === 'y' ? e.clientY : e.clientX)
  const get = (el: HTMLElement) => (axis === 'y' ? el.scrollTop : el.scrollLeft)
  const set = (el: HTMLElement, v: number) => (axis === 'y' ? (el.scrollTop = v) : (el.scrollLeft = v))
  return {
    onPointerDown: (e: React.PointerEvent) => {
      const el = target()
      if (e.pointerType !== 'mouse' || e.button !== 0 || !el) return
      cancelAnimationFrame(st.current.raf)
      Object.assign(st.current, { down: true, p: pos(e), start: get(el), moved: 0, v: 0, last: pos(e), lastT: performance.now() })
    },
    onPointerMove: (e: React.PointerEvent) => {
      const s = st.current
      const el = target()
      if (!s.down || !el) return
      const d = pos(e) - s.p
      s.moved = Math.max(s.moved, Math.abs(d))
      set(el, s.start - d)
      const now = performance.now()
      s.v = (pos(e) - s.last) / Math.max(1, now - s.lastT)
      s.last = pos(e)
      s.lastT = now
    },
    onPointerUp: () => {
      const s = st.current
      if (!s.down) return
      s.down = false
      // ไถลต่อ (momentum)
      let v = -s.v * 16
      const step = () => {
        const el = target()
        if (!el || Math.abs(v) < 0.5) return
        set(el, get(el) + v)
        v *= 0.92
        s.raf = requestAnimationFrame(step)
      }
      if (s.moved > 10) s.raf = requestAnimationFrame(step)
    },
    onPointerLeave: () => { st.current.down = false },
    // ถ้าเพิ่งลากเลื่อน อย่านับเป็นการกดการ์ด
    onClickCapture: (e: React.MouseEvent) => {
      if (st.current.moved > 6) {
        e.stopPropagation()
        e.preventDefault()
        st.current.moved = 0
      }
    },
  }
}
