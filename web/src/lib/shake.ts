/**
 * เตือนแบบเกม: ข้อความเตือนสั่นแวบเดียวให้เด่น + มือถือสั่น + เลื่อนไปให้เห็น (ถ้าอยู่นอกจอ)
 * เครื่องที่ตั้งลดการเคลื่อนไหวไว้ = ไม่สั่น
 */
export function shakeScreen(errorSelector = '[data-error]') {
  try { navigator.vibrate?.(120) } catch { /* ไม่รองรับก็ไม่เป็นไร */ }
  // รอข้อความเตือนขึ้นก่อน (setErr แล้ว render รอบหน้า)
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>(errorSelector)
    if (!el) return
    el.classList.remove('error-shake')
    void el.offsetWidth // กดซ้ำ ข้อความเดิม ก็สั่นใหม่ได้
    el.classList.add('error-shake')
    const r = el.getBoundingClientRect()
    if (r.top < 80 || r.bottom > window.innerHeight) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }))
}
