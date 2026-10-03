import { useCallback, useEffect, useRef, useState } from 'react'
import { api, type Pulse } from './api'

const INTERVAL = 30_000 // เช็กประกาศทุก 30 วิ (ประหยัดโควตา API ฟรี 100k/วัน)

/** แจ้งทุกหน้าว่ามีการเปลี่ยนแปลง (โพสต์ประกาศ/แก้ตาราง) ให้โหลดใหม่ */
export const notifyGuildChanged = (gid: string) => window.dispatchEvent(new CustomEvent('7knote:changed', { detail: gid }))

/**
 * เช็กประกาศล่าสุดเป็นระยะ (ทุก 30 วิ ตอนแท็บเปิดอยู่ + ทันทีที่กลับมาที่แท็บ)
 * ถ้าประกาศล่าสุดเปลี่ยน → ยิง event ให้หน้าอื่น ๆ โหลดข้อมูลใหม่ด้วย
 */
export function usePulse(gid: string | undefined) {
  const [pulse, setPulse] = useState<Pulse | null>(null)
  const lastId = useRef<string | null | undefined>(undefined)

  const check = useCallback(async () => {
    if (!gid || document.visibilityState !== 'visible') return
    try {
      const p = await api.pulse(gid)
      setPulse(p)
      const id = p.latest?.id ?? null
      if (lastId.current !== undefined && lastId.current !== id) notifyGuildChanged(gid)
      lastId.current = id
    } catch {
      /* เน็ตหลุดชั่วคราว รอบหน้าค่อยลองใหม่ */
    }
  }, [gid])

  useEffect(() => {
    if (!gid) return
    lastId.current = undefined
    setPulse(null)
    check()
    const t = setInterval(check, INTERVAL)
    const onVisible = () => document.visibilityState === 'visible' && check()
    const onChanged = (e: Event) => (e as CustomEvent).detail === gid && check()
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
