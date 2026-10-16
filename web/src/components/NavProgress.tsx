import { useEffect, useRef } from 'react'
import { onNav } from '../lib/navProgress'
import { motionOK } from '../lib/overlayMotion'

const SHOW_AFTER = 100 // ms — เปลี่ยนหน้าเร็วกว่านี้ไม่เห็นอะไรเลย

/**
 * แถบทองบางบนสุดของจอ ระหว่างรอหน้าใหม่วาด (lib/navProgress) + ม่านจาง ๆ ทับหน้าเดิม → กดแล้วรู้ทันทีว่าติด
 * ใช้ transform/opacity อย่างเดียว (การ์ดจอวาดเอง ไม่แย่งงานกับการวาดหน้าใหม่)
 * ไม่จางตัวหน้าเดิมเอง: เบราว์เซอร์ต้องวาดหน้าเดิมทั้งหน้าใหม่เป็นชั้นแยก → หน้าใหม่มาช้าลง ~60ms (วัดที่ CPU ช้าลง 4 เท่า)
 */
export default function NavProgress() {
  const bar = useRef<HTMLDivElement>(null)
  const veil = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let run: Animation[] = []
    let grow: Animation | null = null
    let startedAt = 0
    let safety = 0
    const stop = () => { for (const a of run) a.cancel(); run = []; grow = null; clearTimeout(safety) }
    const unsub = onNav((phase) => {
      const el = bar.current
      if (!el || !motionOK()) return
      if (phase === 'start') {
        stop()
        startedAt = performance.now()
        // ค่อย ๆ วิ่งไป 85% (ไม่รู้ว่าจะเสร็จเมื่อไร → ช้าลงเรื่อย ๆ)
        grow = el.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(.85)' }], { duration: 4000, easing: 'cubic-bezier(.1, .7, .3, 1)', fill: 'forwards' })
        run.push(grow, el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, delay: SHOW_AFTER, fill: 'both' }))
        // หน้าเดิมหรี่ลง = กำลังออกจากหน้านี้
        if (veil.current) run.push(veil.current.animate([{ opacity: 0 }, { opacity: 0.45 }], { duration: 220, delay: SHOW_AFTER + 40, easing: 'ease-out', fill: 'both' }))
        safety = window.setTimeout(stop, 10000) // เผื่อหน้าใหม่ไม่มาจริง (ไม่ค้างแถบ/หน้าหรี่ตลอดไป)
        return
      }
      if (!grow) return
      // หน้าใหม่มาแล้ว: หน้าเลิกหรี่ทันที (หน้าใหม่มีแอนิเมชันเข้าของมันเอง) · แถบวิ่งจนสุดแล้วจางหาย
      const p = grow.effect?.getComputedTiming().progress ?? 0
      const fast = performance.now() - startedAt < SHOW_AFTER
      stop()
      if (fast) return
      run.push(el.animate([
        { transform: `scaleX(${0.85 * p})`, opacity: 1 },
        { transform: 'scaleX(1)', opacity: 1, offset: 0.45 },
        { transform: 'scaleX(1)', opacity: 0 },
      ], { duration: 460, easing: 'ease-out', fill: 'forwards' }))
    })
    return () => { unsub(); stop() }
  }, [])
  return <><div ref={veil} aria-hidden className="nav-veil" /><div ref={bar} aria-hidden className="nav-progress" /></>
}
