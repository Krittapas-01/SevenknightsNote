import { useEffect, useRef } from 'react'
import type { UsageEvent } from '../../../shared/usage'

/**
 * นับการใช้ฟีเจอร์ไว้ในเครื่อง แล้วส่งครั้งเดียวตอนซ่อน/ปิดแท็บ (navigator.sendBeacon) — ไม่เพิ่ม request ระหว่างใช้งาน
 * ส่งแค่ { events: { ocr: 2, ... } } ไม่มี URL (ลิงก์แชร์มี ?key=) และไม่มีข้อมูลกิลด์/ผู้ใช้
 */
const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''
const counts = new Map<UsageEvent, number>()
const lastAt = new Map<UsageEvent, number>()
let hooked = false

function flush() {
  if (!counts.size) return
  const body = JSON.stringify({ events: Object.fromEntries(counts) })
  counts.clear()
  // string = text/plain → ไม่ต้อง preflight CORS (Blob แบบ application/json บางเบราว์เซอร์ไม่ยอมส่ง)
  try { navigator.sendBeacon?.(`${BASE}/api/usage`, body) } catch { /* ส่งไม่ได้ก็ไม่เป็นไร */ }
}

/** นับ 1 ครั้ง (กันนับซ้ำจากการกดรัว ๆ / React StrictMode ภายใน 1 วิ) */
export function track(e: UsageEvent) {
  const now = Date.now()
  if (now - (lastAt.get(e) ?? 0) < 1000) return
  lastAt.set(e, now)
  counts.set(e, (counts.get(e) ?? 0) + 1)
  if (hooked) return
  hooked = true
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush() })
  window.addEventListener('pagehide', flush)
}

/** หน้าเครื่องคิดเลข: นับ 1 ครั้งต่อการเปิดหน้า ตอนผู้ใช้เริ่มแก้ค่า (dep เปลี่ยนจากตอนเปิดหน้า) */
export function useTrackFirstChange(e: UsageEvent, dep: unknown) {
  const initial = useRef(dep)
  const done = useRef(false)
  useEffect(() => {
    if (done.current || dep === initial.current) return
    done.current = true
    track(e)
  }, [e, dep])
}
