import type { ReactNode } from 'react'
import { useSlidePill } from '../lib/slide'

/**
 * กล่องแท็บที่มีพื้นทองเลื่อนตามแท็บที่เลือก (ใช้ได้ในฟังก์ชันที่เรียก hook เองไม่ได้)
 * ปุ่มข้างในใส่ ref={item(key)} และคลาส relative z-10 · ไม่ต้องใส่พื้นหลังให้ปุ่มที่เลือก
 */
export default function SlidePillBox({ active, className = '', tour, children }: {
  active: string | number | null
  className?: string
  /** data-tour (จุดที่การสอนส่อง) */
  tour?: string
  children: (item: (key: string | number) => (el: HTMLElement | null) => void) => ReactNode
}) {
  const p = useSlidePill(active)
  return (
    <div ref={p.box} data-tour={tour} className={`relative ${className}`}>
      <span aria-hidden className="slide-pill" style={p.pill} />
      {children(p.item)}
    </div>
  )
}
