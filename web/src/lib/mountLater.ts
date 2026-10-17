import { startTransition, useEffect, useRef, useState } from 'react'

/**
 * ทยอยใส่เนื้อหาให้ช่องในรายการยาว (การ์ดบ้านศัตรูหน้ากิลด์ 70+ ใบ)
 * เปิดหน้า/กดย้อนกลับ: สร้างการ์ดครบทุกใบในจังหวะเดียว = มือถือค้างเกือบ 1 วิ ทั้งที่เห็นแค่ 2–3 ใบ
 * ที่นี่: ช่องที่ยังไม่ใส่เนื้อหาเป็นกล่องเปล่าขนาดเท่าการ์ด (หน้าไม่ขยับ)
 * - ช่องที่เลื่อนเข้าใกล้จอ (ภายใน 1 จอ) → ใส่ทันที
 * - ที่เหลือ → ค่อย ๆ ใส่ทีละไม่กี่ใบตอนเครื่องว่าง (ครบแล้วเลื่อนเร็วแค่ไหนก็ไม่ต้องสร้างการ์ดอีก)
 */

type Idle = (cb: () => void) => number
const w = (typeof window !== 'undefined' ? window : undefined) as (Window & typeof globalThis) | undefined
// Safari ไม่มี requestIdleCallback → ตั้งเวลาเป็นช่วง ๆ แทน (ทีละชุดเล็ก ไม่ทำรวดเดียว)
const idle: Idle = w && typeof w.requestIdleCallback === 'function'
  ? (cb) => w.requestIdleCallback(cb)
  : (cb) => setTimeout(cb, 120) as unknown as number

/** ใบต่อรอบว่าง (ใบละ ~7ms ที่มือถือช้า) */
const BATCH = 3
/** เพิ่งมีช่องใหม่ (เปิดหน้า/ย้อนกลับ) → รอเท่านี้ก่อนเริ่มทยอยใส่ ให้จอแรกได้เครื่องเต็ม ๆ */
const START_DELAY = 1000

/** กำลังเลื่อนจออยู่ (เลื่อนล่าสุดไม่เกินเท่านี้) → รอก่อน ไม่แย่งเฟรมตอนเลื่อน (ใบที่ใกล้จอยังใส่ทันทีตามปกติ) */
const SCROLL_QUIET = 200

const jobs = new Map<Element, () => void>() // ลำดับที่ใส่ = ลำดับบนหน้า (บนลงล่าง)
let io: IntersectionObserver | null = null
let pending = false
let quietUntil = 0
let listening = false

function run(el: Element) {
  const f = jobs.get(el)
  if (!f) return
  jobs.delete(el)
  io?.unobserve(el)
  f()
}

function pump() {
  pending = false
  const wait = quietUntil - performance.now()
  if (wait > 0) { pending = true; setTimeout(() => idle(pump), wait); return }
  // ทำแบบ transition: React แบ่งงานเป็นช่วงสั้น ๆ ผู้ใช้กดอะไรระหว่างนั้น = ได้คิวก่อน
  startTransition(() => {
    let n = 0
    for (const el of jobs.keys()) {
      if (n++ >= BATCH) break
      run(el)
    }
  })
  schedule()
}

function schedule() {
  if (pending || jobs.size === 0) return
  if (!listening) {
    listening = true
    window.addEventListener('scroll', () => { quietUntil = Math.max(quietUntil, performance.now() + SCROLL_QUIET) }, { passive: true })
  }
  pending = true
  idle(pump)
}

/** ลงคิวช่อง el: ใกล้จอเมื่อไหร่/เครื่องว่างเมื่อไหร่ → เรียก show() ครั้งเดียว · คืนฟังก์ชันยกเลิก */
export function mountLater(el: Element, show: () => void): () => void {
  if (typeof IntersectionObserver === 'undefined') { show(); return () => {} }
  io ??= new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) run(e.target)
  }, { rootMargin: '100% 0px' })
  jobs.set(el, show)
  io.observe(el)
  quietUntil = performance.now() + START_DELAY
  schedule()
  return () => { jobs.delete(el); io?.unobserve(el) }
}

/** ช่องที่ใส่เนื้อหาทีหลัง: eager = ใส่ตั้งแต่แรก (ใบที่เห็นบนจอแรก) · คืน [ref ของช่อง, ใส่เนื้อหาแล้วหรือยัง] */
export function useMountLater<T extends Element>(eager: boolean) {
  const ref = useRef<T>(null)
  const [on, setOn] = useState(eager)
  useEffect(() => {
    if (on || !ref.current) return
    return mountLater(ref.current, () => setOn(true))
  }, [on])
  return [ref, on] as const
}
