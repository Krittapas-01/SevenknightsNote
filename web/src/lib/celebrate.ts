import { L } from './i18n'
import { motionOK } from './teamMotion'

/**
 * ป้าย "บันทึกแล้ว ✓" ลอยขึ้นกลางจอล่าง + ประกายทอง แล้วหายเอง
 * ใช้หลังบันทึกบ้านศัตรู / ทีมแก้ / แผนสำเร็จ — ไม่ผูกกับ React (หน้าเปลี่ยนก็ยังเห็น)
 */
export function savedToast(text = L('บันทึกแล้ว', 'Saved')) {
  if (typeof document === 'undefined') return
  document.querySelector('.saved-toast')?.remove()
  const el = document.createElement('div')
  el.className = 'saved-toast'
  el.setAttribute('role', 'status')
  const sparks = Array.from({ length: 8 }, (_, i) => `<i style="--a:${i * 45}deg"></i>`).join('')
  el.innerHTML = `<span class="saved-toast-check"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>${sparks}</span>`
  el.append(document.createTextNode(text))
  document.body.append(el)
  window.setTimeout(() => el.classList.add('out'), 1700)
  window.setTimeout(() => el.remove(), 2100)
}

/** การ์ด/กล่องที่เพิ่งแก้: ขอบเรืองทอง + แสงกวาดผ่าน 1 ครั้ง */
export function flashSaved(el: Element | null | undefined) {
  if (!(el instanceof HTMLElement) || !motionOK()) return
  // ต่อท้ายเงาเดิมของการ์ด (กรอบทองด้านในยังอยู่) แล้วเติมวงเรืองด้านนอก
  const base = getComputedStyle(el).boxShadow
  const keep = base && base !== 'none' ? `${base}, ` : ''
  el.animate(
    [{ boxShadow: `${keep}0 0 0 0 #f4d58d00, 0 0 0 0 #f4d58d00` }, { boxShadow: `${keep}0 0 0 3px #f4d58dcc, 0 0 28px 6px #f4d58d55`, offset: 0.25 }, { boxShadow: `${keep}0 0 0 0 #f4d58d00, 0 0 0 0 #f4d58d00` }],
    { duration: 1300, easing: 'ease-out' },
  )
  if (getComputedStyle(el).position === 'static') return
  el.querySelector(':scope > .just-saved-sweep')?.remove()
  const sweep = document.createElement('span')
  sweep.className = 'just-saved-sweep'
  sweep.setAttribute('aria-hidden', 'true')
  el.append(sweep)
  window.setTimeout(() => sweep.remove(), 1100)
}
