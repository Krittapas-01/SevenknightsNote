/**
 * ทยอยวาดการ์ดล่วงหน้า (หน้ากิลด์)
 * การ์ดเริ่มเป็น content-visibility:auto (โหลดหน้าแรกเร็ว ไม่ต้องวาดทุกใบ)
 * จากนั้น "ตอนเครื่องว่าง" ค่อย ๆ เปลี่ยนเป็น visible ทีละใบจากบนลงล่างจนครบ
 * → พอวาดครบแล้ว เลื่อนด้วยลูกกลิ้งเมาส์จะไม่มีงานวาดเหลือให้กระตุก
 * การ์ดที่ใกล้จอ (IntersectionObserver) ได้คิวก่อน เผื่อเลื่อนเร็วกว่าที่วาดทัน
 */
/** true = ทยอยวาดครบทุกใบตอนเครื่องว่าง · false = วาดเมื่อเลื่อนเข้าใกล้เท่านั้น (แบบ 7k-combo) */
const PRERENDER_ALL = true
/** เปิดหน้ามา รอเท่านี้ก่อนเริ่มวาดเบื้องหลัง (ช่วงแรกจะได้ลื่น) */
const START_DELAY = 800
/** กำลังเลื่อนอยู่ (เลื่อนล่าสุดไม่เกินเท่านี้) → หยุดรอ ไม่แย่งเฟรม */
const SCROLL_QUIET = 200

let startAt = 0
let lastScroll = 0
let listening = false
const now = () => performance.now()

const queue = new Set<HTMLElement>()
let io: IntersectionObserver | null = null
let scheduled = false

const idle: (cb: (d?: IdleDeadline) => void) => void =
  typeof requestIdleCallback === 'function'
    ? (cb) => requestIdleCallback(cb, { timeout: 500 })
    : (cb) => setTimeout(cb, 50)

function reveal(el: HTMLElement) {
  queue.delete(el)
  io?.unobserve(el)
  el.style.contentVisibility = 'visible'
}

function pump(d?: IdleDeadline) {
  scheduled = false
  // ยังไม่ถึงเวลาเริ่ม หรือกำลังเลื่อนอยู่ → รอแล้วค่อยลองใหม่
  const wait = Math.max(startAt - now(), lastScroll + SCROLL_QUIET - now())
  if (wait > 0) {
    scheduled = true
    setTimeout(() => idle(pump), wait)
    return
  }
  let n = 0
  // ทีละ 2 ใบต่อช่วงว่าง (ใบละ ~5–10ms) ไม่ให้เกินงบเฟรม
  for (const el of queue) {
    if (n >= 2 || (d && !d.didTimeout && d.timeRemaining() < 6)) break
    if (el.isConnected) reveal(el)
    else queue.delete(el)
    n++
  }
  schedule()
}

function schedule() {
  if (!PRERENDER_ALL || scheduled || queue.size === 0) return
  if (!listening) {
    listening = true
    window.addEventListener('scroll', () => { lastScroll = now() }, { passive: true })
  }
  scheduled = true
  idle(pump)
}

function observer() {
  if (!io && typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) reveal(e.target as HTMLElement)
    }, { rootMargin: '150% 0px' })
  }
  return io
}

/** ใช้เป็น ref ของการ์ด: <div ref={renderAhead} style={{ contentVisibility: 'auto' }} /> */
export function renderAhead(el: HTMLElement | null) {
  if (!el) return
  // เปิดหน้าใหม่ (คิวว่าง) → เริ่มนับหน่วงใหม่
  if (queue.size === 0) startAt = now() + START_DELAY
  queue.add(el)
  observer()?.observe(el)
  schedule()
  return () => {
    queue.delete(el)
    io?.unobserve(el)
  }
}
