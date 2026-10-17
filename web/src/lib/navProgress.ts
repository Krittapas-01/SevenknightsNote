/**
 * รู้ว่า "กดไปหน้าใหม่แล้ว แต่หน้าใหม่ยังวาดไม่เสร็จ"
 * React Router เปลี่ยน URL ทันทีที่กด แต่ค่อยวาดหน้าใหม่แบบไม่ด่วน (startTransition) → ระหว่างนั้นหน้าเดิมค้างอยู่เฉย ๆ ดูเหมือนกดไม่ติด
 * - เริ่ม: URL เปลี่ยนไปหน้าอื่น (pushState จากลิงก์/navigate · popstate จากปุ่มย้อนกลับ) ขณะที่หน้าที่วาดอยู่ยังเป็นหน้าเดิม
 * - จบ: Layout วาดหน้าใหม่เสร็จ (navCommitted)
 * เปลี่ยนแค่ ?tab= (หน้าเดิม) / replace (เปลี่ยน URL หลังบันทึก) ไม่นับ
 */
type Phase = 'start' | 'done'
const subs = new Set<(p: Phase) => void>()
let shown = typeof location !== 'undefined' ? location.pathname : '/'
let pending = false

const emit = (p: Phase) => subs.forEach((f) => f(p))
function check() {
  const away = location.pathname !== shown // กดย้อนกลับมาหน้าเดิมก่อนหน้าใหม่วาดเสร็จ = จบ
  if (away === pending) return
  pending = away
  emit(away ? 'start' : 'done')
}

if (typeof history !== 'undefined') {
  const push = history.pushState
  history.pushState = function (...args: Parameters<History['pushState']>) {
    push.apply(this, args)
    check()
  }
  addEventListener('popstate', check)
}

/** Layout เรียกตอนวาดหน้าใหม่เสร็จ (useLayoutEffect ตาม pathname) */
export function navCommitted(path: string) {
  shown = path
  if (!pending) return
  pending = false
  emit('done')
}

export function onNav(f: (p: Phase) => void) {
  subs.add(f)
  return () => { subs.delete(f) }
}
