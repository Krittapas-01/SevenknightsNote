import { useCallback, useEffect, useRef, useState } from 'react'
import { api, type Pulse } from './api'

const INTERVAL = 60_000 // เช็กประกาศทุก 60 วิ (ประหยัดโควตา API ฟรี 100k/วัน · ตอนโพสต์เองหรือกลับมาที่แท็บจะเช็กทันที)

/** แจ้งทุกหน้าว่ามีการเปลี่ยนแปลง (โพสต์ประกาศ/แก้ตาราง) ให้โหลดใหม่ */
export const notifyGuildChanged = (gid: string) => window.dispatchEvent(new CustomEvent('7knote:changed', { detail: gid }))

/**
 * เช็กประกาศล่าสุดเป็นระยะ (ทุก 60 วิ ตอนแท็บเปิดอยู่ + ทันทีที่กลับมาที่แท็บ)
 * ถ้าประกาศล่าสุดเปลี่ยน → ยิง event ให้หน้าอื่น ๆ โหลดข้อมูลใหม่ด้วย
 */
export function usePulse(gid: string | undefined) {
  const [pulse, setPulse] = useState<Pulse | null>(null)
  const lastId = useRef<string | null | undefined>(undefined)
  const lastRev = useRef<string | undefined>(undefined)
  const lastAt = useRef(0) // กันเช็กซ้อน (กลับมาที่แท็บ = visibilitychange + focus ยิงพร้อมกัน)
  const gone = useRef(false) // ไม่พบกิลด์ (ลิงก์ผิด/ถูกลบ) → หยุดเช็ก

  const selfNotify = useRef(false) // event ที่ตัวเองยิง ไม่ต้องเช็กซ้ำ

  const check = useCallback(async (force = false) => {
    if (!gid || gone.current || document.visibilityState !== 'visible') return
    if (!force && Date.now() - lastAt.current < 3_000) return
    lastAt.current = Date.now()
    try {
      const p = await api.pulse(gid)
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
      /* อื่น ๆ: เน็ตหลุดชั่วคราว รอบหน้าค่อยลองใหม่ */
    }
  }, [gid])

  useEffect(() => {
    if (!gid) return
    lastId.current = undefined
    lastRev.current = undefined
    lastAt.current = 0
    gone.current = false
    setPulse(null)
    check()
    const t = setInterval(() => check(), INTERVAL)
    const onVisible = () => document.visibilityState === 'visible' && check()
    // มีคนในหน้านี้โพสต์/แก้ → เช็กทันที (ไม่สนช่วงกันซ้อน) · ถ้าเป็น event ที่ตัวเองยิงก็ข้าม
    const onChanged = (e: Event) => (e as CustomEvent).detail === gid && !selfNotify.current && check(true)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    window.addEventListener('7knote:changed', onChanged)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      window.removeEventListener('7knote:changed', onChanged)
    }
  }, [gid, check])

  return pulse
}
