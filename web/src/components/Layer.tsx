import { memo, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { fadeIn, motionOK, popIn, popOut } from '../lib/overlayMotion'

/** กำลังปิด = ไม่วาดใหม่ ค้างหน้าตาสุดท้ายไว้ */
const Frozen = memo(function Frozen({ node }: { node: ReactNode; frozen: boolean }) {
  return <>{node}</>
}, (_, next) => next.frozen)

/**
 * ชั้นลอยที่โผล่/หายด้วย {x && ...} (เช่น ตัวช่วยตั้งไม้ในแผนวอร์) · layer = ref ของพื้นหลัง (ลูกตัวแรกของพื้นหลัง = กรอบ)
 * - เปิด: พื้นหลังมืดลง + กรอบเด้งขึ้นกลางจอ
 * - ปิด: ค้างของเดิมบนจอไว้ (ไม่วาดใหม่) เล่นย่อ/จางหายก่อนค่อยถอดจริง
 *   ใช้ของเดิม ไม่โคลน = เฟรมหลังกดปิดไม่ต้องคำนวณ/วาดหน้าต่างใหม่ทั้งก้อน (กดแล้วไม่หน่วง)
 */
export default function Layer({ layer, children }: { layer: RefObject<HTMLElement | null>; children: ReactNode }) {
  const show = children != null && children !== false
  const last = useRef<ReactNode>(null)
  const [leaving, setLeaving] = useState(false)
  const [prev, setPrev] = useState(show)
  if (prev !== show) {
    setPrev(show)
    setLeaving(!show && motionOK())
  }
  if (show) last.current = children
  else if (!leaving) last.current = null

  useLayoutEffect(() => {
    const bd = layer.current
    if (!show || !bd) return
    fadeIn(bd)
    const s = bd.firstElementChild
    if (s instanceof HTMLElement) popIn(s, false)
  }, [show, layer])

  useLayoutEffect(() => {
    if (!leaving) return
    const bd = layer.current
    if (!bd) { setLeaving(false); return }
    // กันกดของในกรอบที่กำลังหาย: ต่อแผ่นใสทับ (ไม่สลับ pointer-events/inert ที่สืบทอดลงลูกทุกตัว = คำนวณสไตล์ใหม่ทั้งก้อน)
    const shield = document.createElement('div')
    shield.style.cssText = 'position:fixed;inset:0'
    bd.appendChild(shield)
    const focused = document.activeElement
    if (focused instanceof HTMLElement && bd.contains(focused)) focused.blur()
    const anims = popOut(bd.firstElementChild instanceof HTMLElement ? bd.firstElementChild : null, bd)
    let live = true
    Promise.all(anims.map((a) => a.finished)).then(() => { if (live) setLeaving(false) }, () => {})
    // เปิดกลับระหว่างกำลังปิด → ล้างแอนิเมชัน (fill: forwards) ให้กลับเป็นปกติ
    return () => { live = false; for (const a of anims) a.cancel(); shield.remove() }
  }, [leaving, layer])

  if (!show && !leaving) return null
  return <Frozen node={show ? children : last.current} frozen={!show} />
}
