import type { Modifier } from '@dnd-kit/core'
import { getPrefs, onPrefsChange } from './prefs'

/**
 * จอคอมย่อทั้งเว็บด้วย CSS zoom (index.css: html { zoom }) — ขนาดเท่าซูมเบราว์เซอร์ 80%
 * ตำแหน่งเมาส์เป็นพิกเซลจอจริง แต่ transform/left/top ในหน้าถูกย่อตาม zoom → ลากวางต้องหารกลับ
 */
export function uiZoom() {
  if (typeof document === 'undefined') return 1
  const z = parseFloat(getComputedStyle(document.documentElement).zoom || '1')
  return Number.isFinite(z) && z > 0 ? z : 1
}

/** ชิ้นที่ลากอยู่กับที่ (ใส่ transform ให้ตัวเอง) */
export const zoomInPlace: Modifier = ({ transform }) => {
  const z = uiZoom()
  return z === 1 ? transform : { ...transform, x: transform.x / z, y: transform.y / z }
}

/** DragOverlay: ตำแหน่งเริ่ม (left/top จากขนาดจอจริง) ก็ถูกย่อด้วย → ชดเชยทั้งตำแหน่งเริ่มและระยะลาก */
export const zoomOverlay: Modifier = ({ transform, activeNodeRect }) => {
  const z = uiZoom()
  if (z === 1 || !activeNodeRect) return transform
  return { ...transform, x: (activeNodeRect.left + transform.x) / z - activeNodeRect.left, y: (activeNodeRect.top + transform.y) / z - activeNodeRect.top }
}

/**
 * ย่อทั้งเว็บบนจอคอม (เท่ากดซูมเบราว์เซอร์) ตามความละเอียดจอจริง — มือถือ/จอแคบคงขนาดเดิม
 * Full HD = 80% · 2K ขึ้นไป (กว้างจริง ≥ 2400 พิกเซล เช่น 2560×1440, 2560×1600) = 85%
 * ใช้พิกเซลจริง (กว้างจอ × devicePixelRatio) เพราะจอ 2K ที่ตั้ง Scale 150% ใน Windows จะเห็นกว้างแค่ ~1700px
 */
export function applyUiZoom() {
  const set = () => {
    const el = document.documentElement
    if (window.innerWidth < 1024) { el.style.removeProperty('zoom'); return }
    // ตั้งค่า → ขนาดหน้าเว็บ (อัตโนมัติ = ดูจากความละเอียดจอ)
    const pref = getPrefs().zoom
    if (pref !== 'auto') { if (pref === '1') el.style.removeProperty('zoom'); else el.style.setProperty('zoom', pref); return }
    const physical = window.screen.width * window.devicePixelRatio
    el.style.setProperty('zoom', physical >= 2400 ? '0.85' : '0.8')
  }
  set()
  window.addEventListener('resize', set)
  onPrefsChange(set)
}
