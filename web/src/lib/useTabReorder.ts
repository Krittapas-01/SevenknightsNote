import { useEffect, useRef, useState } from 'react'

/**
 * กดค้างแล้วลากแท็บเพื่อเรียงลำดับใหม่ (แถบ ทีมแก้ #1 #2 …)
 * - เมาส์: กดแล้วลากเกิน 6px = เริ่มลาก (คลิกเฉย ๆ ยังเป็นคลิกปกติ)
 * - นิ้ว: แตะค้าง 350ms (ไม่ขยับ) = เริ่มลาก · ปัดเร็ว ๆ ยังเลื่อนแถบได้เหมือนเดิม
 * ระหว่างลากโชว์ลำดับใหม่ทันที (preview) · ปล่อยแล้วค่อยเรียก onCommit(ids)
 */
export function useTabReorder(ids: string[], enabled: boolean, onCommit: (ids: string[]) => void, onPreview?: (ids: string[]) => void) {
  const [preview, setPreview] = useState<string[] | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const els = useRef(new Map<string, HTMLElement>())
  const st = useRef<{ id: string; pid: number; x0: number; y0: number; active: boolean; timer: number; touch: boolean; order: string[] } | null>(null)
  const suppressClick = useRef(false)
  // ฟัง move/up ที่ window — แท็บถูกย้ายตำแหน่งใน DOM ระหว่างลาก ทำให้ pointer capture หลุด (นิ้วไปค้างนอกแถบ = ไม่จบการลาก)
  const detach = useRef<(() => void) | null>(null)
  const key = ids.join('|')

  // ข้อมูลจากเซิร์ฟเวอร์ตามทันลำดับที่ลากไว้แล้ว (หรือมีคนเพิ่ม/ลบ) → เลิกใช้ preview
  useEffect(() => { setPreview((p) => (p && (p.join('|') === key || p.length !== ids.length) ? null : p)) }, [key, ids.length])

  // ตอนลากด้วยนิ้ว ห้ามหน้าเลื่อน (ต้องเป็น listener แบบ non-passive)
  useEffect(() => {
    const stop = (e: TouchEvent) => { if (st.current?.active) e.preventDefault() }
    document.addEventListener('touchmove', stop, { passive: false })
    return () => document.removeEventListener('touchmove', stop)
  }, [])

  const order = preview ?? ids
  const start = () => {
    const s = st.current!
    s.active = true
    setDragId(s.id)
    if (s.touch) navigator.vibrate?.(15)
  }
  const end = (commit: boolean) => {
    const s = st.current
    st.current = null
    detach.current?.()
    detach.current = null
    if (!s) return
    clearTimeout(s.timer)
    if (!s.active) return
    suppressClick.current = true
    setTimeout(() => (suppressClick.current = false), 0)
    setDragId(null)
    if (commit && s.order.join('|') !== ids.join('|')) onCommit(s.order)
    else setPreview(null)
  }

  const onMove = (e: PointerEvent) => {
    const s = st.current
    if (!s || s.pid !== e.pointerId) return
    if (e.pointerType === 'mouse' && e.buttons === 0) return end(true)
    const dx = e.clientX - s.x0, dy = e.clientY - s.y0
    if (!s.active) {
      if (s.touch) { if (Math.hypot(dx, dy) > 8) end(false) } // ขยับก่อนครบเวลา = ตั้งใจเลื่อนแถบ
      else if (Math.abs(dx) > 6) start()
      if (!st.current?.active) return
    }
    // ตำแหน่งใหม่ = จำนวนแท็บอื่นที่จุดกึ่งกลางอยู่ทางซ้ายของนิ้ว/เมาส์
    const others = s.order.filter((x) => x !== s.id)
    const idx = others.filter((x) => { const r = els.current.get(x)?.getBoundingClientRect(); return r && r.left + r.width / 2 < e.clientX }).length
    const next = [...others.slice(0, idx), s.id, ...others.slice(idx)]
    if (next.join('|') !== s.order.join('|')) { s.order = next; setPreview(next); onPreview?.(next) }
  }
  useEffect(() => () => detach.current?.(), [])

  const bind = (id: string) => ({
    ref: (el: HTMLElement | null) => { if (el) els.current.set(id, el); else els.current.delete(id) },
    onPointerDown: (e: React.PointerEvent) => {
      if (!enabled || ids.length < 2 || (e.pointerType === 'mouse' && e.button !== 0)) return
      const touch = e.pointerType !== 'mouse'
      st.current = { id, pid: e.pointerId, x0: e.clientX, y0: e.clientY, active: false, timer: 0, touch, order: order.slice() }
      if (touch) st.current.timer = window.setTimeout(() => st.current && !st.current.active && start(), 350)
      const move = (ev: PointerEvent) => onMove(ev)
      const up = (ev: PointerEvent) => { if (st.current?.pid === ev.pointerId) end(true) }
      const cancel = (ev: PointerEvent) => { if (st.current?.pid === ev.pointerId) end(false) }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
      window.addEventListener('pointercancel', cancel)
      detach.current?.()
      detach.current = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        window.removeEventListener('pointercancel', cancel)
      }
    },
    onClickCapture: (e: React.MouseEvent) => { if (suppressClick.current) { e.preventDefault(); e.stopPropagation() } },
    onContextMenu: (e: React.MouseEvent) => { if (st.current?.touch) e.preventDefault() }, // กดค้างบนมือถือไม่ให้เด้งเมนู
  })

  return { order, dragId, bind, cancelPreview: () => setPreview(null) }
}
