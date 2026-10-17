/**
 * แอนิเมชันของหน้าต่าง/ชั้นที่ลอยทับหน้า (Modal, ตัวช่วยตั้งไม้)
 * - ใช้แค่ transform / opacity (การ์ดจอทำเอง ไม่ต้องคำนวณหน้าใหม่) · ไม่มีเบลอ
 * - ใช้ WAAPI (el.animate) → ต้องเช็ก "ลดแอนิเมชัน" เอง (motionOK) เพราะกฎ CSS ไม่ครอบคลุม
 * - แอนิเมชันที่สร้างก่อนเฟรมหนัก ๆ (เนื้อหาเยอะ) เบราว์เซอร์จะเริ่มนับเวลาหลังเฟรมนั้นวาดเสร็จ → ไม่โดนกินกลางทาง
 */
import { motionOK } from './teamMotion'

export { motionOK }

const OUT = 'cubic-bezier(.16, 1, .3, 1)' // ออกตัวเร็ว ค่อย ๆ หยุด
const POP = 'cubic-bezier(.22, 1.4, .36, 1)' // แบบเดียวกันแต่เลยไปนิดแล้วเด้งกลับ (เหมือนป๊อปอัปในเกม)
const IN = 'cubic-bezier(.4, 0, 1, 1)' // ค่อย ๆ เร่ง (ตอนออก)
/** มือถือ = หน้าต่างเป็นแผ่นชิดขอบล่าง (Modal: items-end ต่ำกว่า sm)
 * จำค่าไว้ (อัปเดตตอนจอเปลี่ยนขนาด) — อ่าน .matches ทุกครั้งอาจทำให้เบราว์เซอร์คำนวณหน้าใหม่กลางจังหวะกด */
let isSheet = false
if (typeof matchMedia !== 'undefined') {
  const mq = matchMedia('(max-width: 639px)')
  isSheet = mq.matches
  mq.addEventListener?.('change', (e) => { isSheet = e.matches })
}
const sheet = () => isSheet

/** ชิ้นที่ปลอดภัยจะขยับ (ไม่ใช่ของ fixed/sticky และไม่มีของ fixed อยู่ข้างใน — transform ทำให้ของ fixed กระโดด) */
export const PIECE = ':not(.fixed, .sticky, .modal-backdrop, [role="dialog"], [data-bottom-bar], :has(.fixed, .sticky, [data-bottom-bar]))'
export function movable(el: Element) {
  try { return el.matches(PIECE) } catch { return false } // เบราว์เซอร์ไม่รู้จัก :has → ไม่ขยับ
}

/** เรียก cb หลังวาดไปแล้ว n เฟรม (n=1: หลังเฟรมถัดไปวาดเสร็จ) · คืนฟังก์ชันยกเลิก */
export function afterPaint(cb: () => void, n = 1) {
  let id = 0
  const step = (left: number) => { id = requestAnimationFrame(() => (left ? step(left - 1) : cb())) }
  step(n)
  return () => cancelAnimationFrame(id)
}

/** พื้นหลังมืดค่อย ๆ มืดลง */
export function fadeIn(el: Element, ms = 220) {
  if (!motionOK()) return null
  return el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms, easing: 'ease-out' })
}

/** ดาว ✦ บน/ล่างกลางกรอบ (.panel::before / ::after) หมุนวิ้งเข้ามา */
function twinkle(el: Element, pseudoElement: '::before' | '::after', delay: number) {
  // สั่งในเฟรมถัดไป: แอนิเมชัน pseudo-element บังคับให้เบราว์เซอร์คำนวณสไตล์ทันที — ไม่ทำในจังหวะกด (INP)
  requestAnimationFrame(() => { try {
    el.animate([
      { opacity: 0, transform: 'translateX(-50%) scale(.2) rotate(-140deg)' },
      { opacity: 1, transform: 'translateX(-50%) scale(1.8) rotate(12deg)', offset: 0.55 },
      { opacity: 1, transform: 'translateX(-50%) scale(1) rotate(0deg)' },
    ], { duration: 640, delay, easing: 'ease-out', fill: 'backwards', pseudoElement })
  } catch { /* เบราว์เซอร์เก่าไม่รองรับ pseudoElement — ข้ามเฉย ๆ */ } })
}

/**
 * กรอบหน้าต่างเปิด: จอคอม = ขยายเด้งขึ้นจากกลางจอ · มือถือ = แผ่นเลื่อนขึ้นจากขอบล่าง (asSheet=false = เด้งกลางจอเสมอ)
 * แล้วดาวขอบกรอบวิ้งตาม
 */
export function popIn(surface: HTMLElement, asSheet = sheet()) {
  if (!motionOK()) return
  if (asSheet) {
    surface.animate([{ transform: 'translateY(100%)' }, { transform: 'none' }], { duration: 420, easing: OUT })
    twinkle(surface, '::before', 180)
  } else {
    surface.animate([{ opacity: 0, transform: 'translateY(22px) scale(.93)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: POP })
    twinkle(surface, '::before', 140)
    twinkle(surface, '::after', 230)
  }
}

/** กรอบหน้าต่างปิด (ย่อ+จางลง / มือถือเลื่อนลง) พร้อมพื้นหลังจางออก · คืนแอนิเมชันไว้รอจบหรือยกเลิก */
export function popOut(surface: HTMLElement | null, backdrop: HTMLElement) {
  const s = sheet()
  const list: Animation[] = [backdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: s ? 260 : 200, easing: 'ease-in', fill: 'forwards' })]
  if (surface) {
    list.push(surface.animate(
      s ? [{ transform: 'none' }, { transform: 'translateY(100%)' }] : [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(12px) scale(.96)' }],
      { duration: s ? 260 : 180, easing: IN, fill: 'forwards' },
    ))
  }
  return list
}

const RISE: Keyframe[] = [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }]
/**
 * เนื้อหาในกล่องลอยขึ้นทีละชิ้น (ลูกตรงของกล่อง · ลูกที่มี data-cascade = ไล่ลูกของมันแทน เช่น หมวดในตารางอัศวิน)
 * ขยับไม่เกิน 8 ชิ้น (ชิ้นท้าย ๆ อยู่นอกจออยู่แล้ว)
 */
export function rise(box: Element, start = 0, gap = 60) {
  if (!motionOK()) return
  const items: Element[] = []
  for (const c of Array.from(box.children)) {
    if (c.hasAttribute('data-cascade')) items.push(...Array.from(c.children))
    else items.push(c)
    if (items.length >= 8) break
  }
  items.slice(0, 8).forEach((el, i) => {
    if (movable(el)) el.animate(RISE, { duration: 460, delay: start + i * gap, easing: OUT, fill: 'backwards' })
  })
}

/** เมนูข้างเปิด: รายการไล่เลื่อนเข้าจากซ้ายทีละอัน ตามแผ่นเมนูที่กำลังเลื่อนออกมา (ไม่เกิน max อัน) */
export function slideItems(box: Element, start = 60, gap = 22, max = 12) {
  if (!motionOK()) return
  Array.from(box.children).slice(0, max).forEach((el, i) => {
    el.animate([{ opacity: 0, transform: 'translateX(-18px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: start + i * gap, easing: OUT, fill: 'backwards' })
  })
}

/** ของในกรอบที่ใหญ่เกินนี้ไม่ทำเงาตอนปิด (โคลนแล้วต้องวาดใหม่ทั้งก้อน = กระตุกตอนปิด) */
const GHOST_MAX = 700

/**
 * เตรียมเงาตอนปิด ให้ชั้นลอยที่อาจโดนถอดทิ้งทั้งก้อน (ข้างนอกเลิกวาด {x && <Modal/>}) · เรียกตอนใส่ แล้วเรียกฟังก์ชันที่คืนมาตอนถอด
 * จำตำแหน่งเลื่อนของกล่องข้างในจากเหตุการณ์เลื่อนไว้ก่อน (โคลนไม่จำ) — ไม่ไล่อ่าน scrollTop ตอนถอด
 * (อ่านตอนนั้น = เบราว์เซอร์ต้องคำนวณตำแหน่งทั้งหน้าใหม่กลางจังหวะกดปิด)
 */
export function ghostable(backdrop: HTMLElement) {
  const pos = new Map<Element, [number, number]>()
  const onScroll = (e: Event) => { const t = e.target; if (t instanceof Element) pos.set(t, [t.scrollTop, t.scrollLeft]) }
  backdrop.addEventListener('scroll', onScroll, { capture: true, passive: true })
  /** live = ยังเปิดอยู่ตอนโดนถอด (ปิดเองไปแล้ว = ไม่ต้องมีเงา) */
  return (surface: HTMLElement | null, live = true) => {
    backdrop.removeEventListener('scroll', onScroll, true)
    if (live) ghostOut(backdrop, surface, pos)
  }
}

/**
 * โคลนหน้าตาสุดท้ายไว้เล่นแอนิเมชันปิดแทน: โคลนตอนยังติดหน้าอยู่ แล้วค่อยใส่หลังถอดจริง
 * ถ้ายังติดหน้าอยู่ (React StrictMode ถอด-ใส่ effect ซ้ำตอนพัฒนา) = ไม่ได้ปิดจริง ทิ้งโคลน
 */
function ghostOut(backdrop: HTMLElement, surface: HTMLElement | null, pos: Map<Element, [number, number]>) {
  if (!motionOK() || !backdrop.isConnected) return
  const all = backdrop.getElementsByTagName('*')
  if (all.length > GHOST_MAX) return
  const ghost = backdrop.cloneNode(true) as HTMLElement
  const at = (el: Element): number => Array.prototype.indexOf.call(all, el)
  // ตำแหน่งในรายการ (โคลนเรียงเหมือนกัน) ของกล่องที่เลื่อนอยู่
  const scrolled: [number, number, number][] = []
  for (const [el, [top, left]] of pos) if ((top || left) && el !== backdrop && backdrop.contains(el)) scrolled.push([at(el), top, left])
  const si = surface ? at(surface) : -1
  // ใส่โคลนต้นเฟรมถัดไป (ก่อนวาด = ไม่มีแวบหาย): ตอนนั้นเบราว์เซอร์ต้องคำนวณสไตล์/ตำแหน่งใหม่อยู่แล้ว
  // ใส่ทันที = โคลนโดนคำนวณ + เช็กเมาส์ชี้ซ้ำอีกรอบในจังหวะกดปิด (กดแล้วช้าลง)
  requestAnimationFrame(() => {
    if (backdrop.isConnected) return
    ghost.inert = true
    ghost.setAttribute('aria-hidden', 'true')
    ghost.style.pointerEvents = 'none'
    for (const n of Array.from(ghost.querySelectorAll('[id], [data-app-modal], [data-tour]'))) { n.removeAttribute('id'); n.removeAttribute('data-app-modal'); n.removeAttribute('data-tour') }
    document.body.appendChild(ghost)
    const ga = ghost.getElementsByTagName('*')
    for (const [i, top, left] of scrolled) { ga[i].scrollTop = top; ga[i].scrollLeft = left }
    // แอนิเมชัน CSS ในโคลนจะเริ่มเล่นใหม่ (เช่น การ์ดเด้ง) → ข้ามไปท้ายเลย
    for (const a of ghost.getAnimations({ subtree: true })) { try { a.finish() } catch { a.cancel() } }
    const anims = popOut(si >= 0 ? (ga[si] as HTMLElement) : null, ghost)
    Promise.all(anims.map((a) => a.finished)).catch(() => {}).finally(() => ghost.remove())
  })
}
