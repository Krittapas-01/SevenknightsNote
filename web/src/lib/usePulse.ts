import { useCallback, useEffect, useRef, useState } from 'react'
import { api, forgetViewKey, type Pulse } from './api'

// Workers Paid: 10M request/เดือน + D1 อ่าน 25B แถว/เดือน — pulse ที่ไม่มีอะไรเปลี่ยนอ่าน D1 แค่ 1 แถว (?rev=)
// ตัวกินหลักยังเป็นแท็บที่เปิดทิ้งไว้บนคอมทั้งวัน → พัก/หน้าต่างอยู่ข้างหลัง ยังเช็กห่าง ๆ เหมือนเดิม
const ACTIVE_EVERY = 30_000 // มีคนใช้งานอยู่ = เช็กทุก 30 วิ
const IDLE_EVERY = 5 * 60_000 // ไม่ได้แตะ 5 นาที หรือหน้าต่างเว็บไม่ได้อยู่ข้างหน้า = เช็กทุก 5 นาที
const IDLE_AFTER = 5 * 60_000
const REFOCUS_GAP = 20_000 // สลับกลับมาที่แท็บ/ขยับหลังพัก = เช็กทันที แต่ไม่ถี่กว่าทุก 20 วิ
const TICK = 10_000

/** แจ้งทุกหน้าว่ามีการเปลี่ยนแปลง (โพสต์ประกาศ/แก้ตาราง) ให้โหลดใหม่ */
export const notifyGuildChanged = (gid: string) => window.dispatchEvent(new CustomEvent('7knote:changed', { detail: gid }))

/**
 * เช็กประกาศล่าสุดเป็นระยะ: ใช้งานอยู่ทุก 30 วิ · พัก/หน้าต่างอยู่ข้างหลังทุก 5 นาที · แท็บซ่อน = หยุด
 * กลับมาที่แท็บหรือเริ่มใช้งานอีกครั้ง = เช็กทันที (ห่างกันอย่างน้อย 20 วิ)
 * ถ้าประกาศล่าสุดเปลี่ยน → ยิง event ให้หน้าอื่น ๆ โหลดข้อมูลใหม่ด้วย
 */
const PKEY = (gid: string) => `7knote:pulse:${gid}`
/** ข้อมูลแถบประกาศล่าสุดที่เคยโหลด (เปิดซ้ำ = โชว์ได้ทันที ไม่ต้องรอ → หน้าไม่กระโดด) */
function cachedPulse(gid: string | undefined): Pulse | null {
  if (!gid) return null
  try { return JSON.parse(localStorage.getItem(PKEY(gid)) || 'null') } catch { return null }
}

export function usePulse(gid: string | undefined) {
  const [pulse, setPulseState] = useState<Pulse | null>(() => cachedPulse(gid))
  const pulseRef = useRef(pulse)
  const [locked, setLocked] = useState(false) // กิลด์ล็อกด้วยรหัสเข้ากิลด์ และเครื่องนี้ยังไม่มีรหัส → ไม่โชว์แถบ // ตัวที่โชว์อยู่ (ส่งเลขเวอร์ชันไปให้ API ตอบสั้น ๆ ถ้าไม่มีอะไรเปลี่ยน)
  const setPulse = (p: Pulse) => {
    if (p === pulseRef.current) return // ไม่เปลี่ยน = ไม่ต้อง render/เขียนเครื่องใหม่
    pulseRef.current = p
    setPulseState(p)
    try { localStorage.setItem(PKEY(gid!), JSON.stringify(p)) } catch { /* เต็ม/โหมดส่วนตัว */ }
  }
  const lastId = useRef<string | null | undefined>(undefined)
  const lastRev = useRef<string | undefined>(undefined)
  const lastAt = useRef(0) // กันเช็กซ้อน (กลับมาที่แท็บ = visibilitychange + focus ยิงพร้อมกัน)
  const gone = useRef(false) // ไม่พบกิลด์ (ลิงก์ผิด/ถูกลบ) → หยุดเช็ก

  const selfNotify = useRef(false) // event ที่ตัวเองยิง ไม่ต้องเช็กซ้ำ

  const check = useCallback(async (force = false) => {
    if (!gid || gone.current || document.visibilityState !== 'visible') return
    if (!force && Date.now() - lastAt.current < REFOCUS_GAP) return
    lastAt.current = Date.now()
    try {
      const p = await api.pulse(gid, pulseRef.current)
      setPulse(p)
      const id = p.latest?.id ?? null
      // ประกาศล่าสุดเปลี่ยน หรือมีคนแก้ข้อมูลกิลด์ (เลขเวอร์ชันขยับ) → ให้ทุกหน้าโหลดใหม่ (ถ้าเลขตรงกับที่มีอยู่แล้ว useGuild จะไม่โหลดซ้ำ)
      const revChanged = lastRev.current !== undefined && p.rev !== undefined && lastRev.current !== p.rev
      lastRev.current = p.rev
      if ((lastId.current !== undefined && lastId.current !== id) || revChanged) {
        selfNotify.current = true
        notifyGuildChanged(gid)
        selfNotify.current = false
      }
      lastId.current = id
    } catch (e) {
      if ((e as { status?: number }).status === 404) gone.current = true
      // หัวกิลด์ล็อก/เปลี่ยนรหัสเข้ากิลด์ → หยุดเช็ก ซ่อนแถบ แล้วให้หน้ากิลด์โหลดใหม่ (จะขึ้นหน้าใส่รหัส)
      const d = (e as { data?: { viewLocked?: boolean; wrong?: boolean } }).data
      if (d?.viewLocked) {
        gone.current = true
        if (d.wrong) forgetViewKey(gid, true)
        pulseRef.current = null
        setPulseState(null)
        setLocked(true)
        try { localStorage.removeItem(PKEY(gid)) } catch { /* ignore */ }
        selfNotify.current = true
        notifyGuildChanged(gid)
        selfNotify.current = false
      }
      /* อื่น ๆ: เน็ตหลุดชั่วคราว รอบหน้าค่อยลองใหม่ */
    }
  }, [gid])

  useEffect(() => {
    if (!gid) return
    lastId.current = undefined
    lastRev.current = undefined
    lastAt.current = 0
    gone.current = false
    setLocked(false)
    pulseRef.current = cachedPulse(gid)
    setPulseState(pulseRef.current)
    check()
    let activeAt = Date.now()
    const idle = () => Date.now() - activeAt > IDLE_AFTER || !document.hasFocus()
    // นาฬิกาเดินทุก 10 วิ แล้วดูว่าถึงรอบหรือยัง (รอบสั้น/ยาวตามว่ามีคนใช้อยู่ไหม)
    const t = setInterval(() => { if (Date.now() - lastAt.current >= (idle() ? IDLE_EVERY : ACTIVE_EVERY) - 1_000) check(true) }, TICK)
    // แตะ/พิมพ์/เลื่อน = มีคนใช้ · ถ้าเพิ่งกลับมาจากพักและไม่ได้เช็กมานานกว่ารอบปกติ → เช็กเลย
    const onActive = () => {
      const wasIdle = Date.now() - activeAt > IDLE_AFTER
      activeAt = Date.now()
      if (wasIdle && Date.now() - lastAt.current >= ACTIVE_EVERY) check()
    }
    const ACT = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const
    for (const ev of ACT) window.addEventListener(ev, onActive, { passive: true, capture: true })
    const onVisible = () => { if (document.visibilityState === 'visible') { activeAt = Date.now(); check() } }
    // มีคนในหน้านี้โพสต์/แก้ → เช็กทันที (ไม่สนช่วงกันซ้อน) · ถ้าเป็น event ที่ตัวเองยิงก็ข้าม
    const onChanged = (e: Event) => (e as CustomEvent).detail === gid && !selfNotify.current && check(true)
    // ใส่รหัสเข้ากิลด์ผ่านแล้ว → กลับมาเช็กต่อ
    const onUnlocked = (e: Event) => { if ((e as CustomEvent).detail === gid) { gone.current = false; setLocked(false); check(true) } }
    window.addEventListener('7knote:view-unlocked', onUnlocked)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    window.addEventListener('7knote:changed', onChanged)
    return () => {
      clearInterval(t)
      for (const ev of ACT) window.removeEventListener(ev, onActive, { capture: true })
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      window.removeEventListener('7knote:changed', onChanged)
      window.removeEventListener('7knote:view-unlocked', onUnlocked)
    }
  }, [gid, check])

  return { pulse, locked }
}
