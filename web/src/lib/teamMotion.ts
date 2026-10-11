import { useLayoutEffect, useRef, type RefObject } from 'react'
import { uiZoom } from './zoom'

/** เล่นแอนิเมชันได้ไหม (ตั้งค่า "ลดแอนิเมชัน" / ตั้งค่าเครื่อง) — WAAPI ไม่โดนกฎ CSS เลยต้องเช็กเอง */
export function motionOK() {
  if (typeof document === 'undefined') return false
  if (document.documentElement.classList.contains('reduce-motion')) return false
  return !matchMedia('(prefers-reduced-motion: reduce)').matches
}

const EASE = 'cubic-bezier(.2,.8,.2,1)'
const BOUNCE = 'cubic-bezier(.34,1.56,.64,1)'

/** แบบเด้งของชิ้นที่เพิ่งโผล่ (data-mp="ชนิด:คีย์") */
const POP: Record<string, { k: Keyframe[]; o: KeyframeAnimationOptions }> = {
  // อัศวิน/สัตว์เลี้ยงเพิ่งใส่: ขยายจากเล็ก + เด้งนิด ๆ
  hero: { k: [{ transform: 'scale(.55)', opacity: 0 }, { transform: 'scale(1.08)', opacity: 1, offset: 0.65 }, { transform: 'none', opacity: 1 }], o: { duration: 360, easing: EASE } },
  // ป้ายลำดับสกิล
  badge: { k: [{ transform: 'scale(0)' }, { transform: 'none' }], o: { duration: 300, easing: BOUNCE } },
  // ช่องว่างหลังเอาตัวออก: ค่อย ๆ โผล่
  empty: { k: [{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'none' }], o: { duration: 260, easing: EASE } },
  // วงรูปแบบ / วงลำดับสกิล: หมุนเข้า
  orb: { k: [{ transform: 'rotate(-70deg) scale(.75)' }, { transform: 'none' }], o: { duration: 420, easing: BOUNCE } },
}

/**
 * แอนิเมชันตอนจัดทีม (เฉพาะการ์ดที่แก้อยู่)
 * - data-m="คีย์" : ชิ้นที่ย้ายที่ได้ (อัศวิน) → ย้ายช่อง/เปลี่ยนรูปแบบ = เลื่อนไปที่ใหม่ (FLIP)
 * - data-mp="ชนิด:คีย์" : ชิ้นที่เพิ่งโผล่ (คีย์ใหม่) → เด้งเข้าตามชนิดใน POP
 * เล่นเฉพาะตอนทีมเปลี่ยน (sig เปลี่ยน) ไม่เล่นตอนเปิดหน้า · ใช้ transform/opacity อย่างเดียว
 */
export function useTeamMotion(root: RefObject<HTMLElement | null>, sig: string, enabled: boolean) {
  const prevPos = useRef<Map<string, { x: number; y: number }> | null>(null)
  const prevPop = useRef<Set<string> | null>(null)
  const prevSig = useRef(sig)
  useLayoutEffect(() => {
    const el = root.current
    if (!enabled || !el) { prevPos.current = null; prevPop.current = null; prevSig.current = sig; return }
    const z = uiZoom()
    const base = el.getBoundingClientRect()
    const movers = Array.from(el.querySelectorAll<HTMLElement>('[data-m]'))
    const pops = Array.from(el.querySelectorAll<HTMLElement>('[data-mp]'))
    const pos = new Map<string, { x: number; y: number }>()
    for (const m of movers) {
      const r = m.getBoundingClientRect()
      pos.set(m.dataset.m!, { x: (r.left - base.left) / z, y: (r.top - base.top) / z })
    }
    const popKeys = new Set(pops.map((p) => p.dataset.mp!))
    const oldPos = prevPos.current, oldPop = prevPop.current
    if (oldPos && oldPop && sig !== prevSig.current && motionOK()) {
      for (const m of movers) {
        const k = m.dataset.m!
        const a = oldPos.get(k), b = pos.get(k)!
        if (a) {
          const dx = a.x - b.x, dy = a.y - b.y
          if (Math.abs(dx) > 1 || Math.abs(dy) > 1) m.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 340, easing: EASE })
        } else m.animate(POP.hero.k, POP.hero.o) // เพิ่งใส่เข้ามา
      }
      for (const p of pops) {
        const k = p.dataset.mp!
        if (oldPop.has(k)) continue
        const kind = POP[k.slice(0, k.indexOf(':'))]
        if (kind) p.animate(kind.k, kind.o)
      }
    }
    prevPos.current = pos
    prevPop.current = popKeys
    prevSig.current = sig
  })
}
