import { useEffect, useSyncExternalStore } from 'react'

/**
 * ระบบสอนใช้แบบส่องปุ่มจริง (spotlight tour)
 * - สอน "ตามหน้าที่เข้าไปจริง": หน้าไหนมีการสอน หน้านั้นเรียก useTour(id, เงื่อนไข) — เข้าครั้งแรกเล่นเอง, ครั้งต่อไปกดปุ่ม ? เพื่อดูซ้ำ
 * - เนื้อหาการสอนอยู่ที่ lib/tours.ts · หน้าตาอยู่ที่ components/TourOverlay.tsx
 * - จำว่าดูการสอนไหนไปแล้วในเครื่อง (localStorage) · รีเซ็ตได้ที่หน้าตั้งค่า
 */
export type TourStep = {
  /** CSS selector ของสิ่งที่จะส่อง — ไม่ใส่ = กล่องข้อความกลางจอ */
  sel?: string
  title: string
  body: string
  /** 'click' = ให้ผู้ใช้ลองกดสิ่งที่ส่องเอง แล้วค่อยไปขั้นต่อไป */
  action?: 'click'
  /** รอให้สิ่งที่ส่องโผล่ได้นานเท่าไหร่ (ms) ก่อนข้ามขั้นนี้ไป — ค่าเริ่มต้น 1500 */
  wait?: number
}
export type Tour = { id: string; steps: TourStep[] }

const KEY = '7k-note:tours-seen'
const read = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
export const tourSeen = (id: string) => read().includes(id)
export function markTourSeen(id: string) {
  try { const s = new Set(read()); s.add(id); localStorage.setItem(KEY, JSON.stringify([...s])) } catch { /* ไม่มี storage ก็ไม่เป็นไร */ }
}
/** ล้างประวัติการสอน (หน้าตั้งค่า) → เข้าแต่ละหน้าใหม่จะสอนอีกครั้ง */
export function resetTours() { try { localStorage.removeItem(KEY) } catch { /* ignore */ } }

// ---------- store เล็ก ๆ ของการสอนที่กำลังเล่น + การสอนที่หน้านี้มี ----------
type State = { active: { tour: Tour; i: number } | null; available: string[] }
let state: State = { active: null, available: [] }
const subs = new Set<() => void>()
const set = (s: Partial<State>) => { state = { ...state, ...s }; subs.forEach((f) => f()) }
const subscribe = (f: () => void) => { subs.add(f); return () => subs.delete(f) }
export const useTourState = () => useSyncExternalStore(subscribe, () => state)

let registry: Record<string, Tour> = {}
/** ลงทะเบียนเนื้อหาการสอนทั้งหมด (เรียกครั้งเดียวจาก TourOverlay) */
export const registerTours = (tours: Tour[]) => { registry = Object.fromEntries(tours.map((t) => [t.id, t])) }

export function startTour(id: string) {
  const tour = registry[id]
  if (tour) set({ active: { tour, i: 0 } })
}
export function goStep(i: number) {
  const a = state.active
  if (!a) return
  if (i >= a.tour.steps.length) return endTour()
  set({ active: { tour: a.tour, i: Math.max(0, i) } })
}
export function endTour() {
  if (state.active) markTourSeen(state.active.tour.id)
  set({ active: null })
}

/**
 * หน้าที่มีการสอน: when = เงื่อนไขที่ควรสอน (เช่น แก้ไขได้) — จริงครั้งแรกและยังไม่เคยดู → เล่นเองหลังหน้านิ่ง
 * การสอนที่เปิดอยู่ล่าสุดจะเป็นของปุ่ม ? (ดูซ้ำ)
 */
export function useTour(id: string, when: boolean, delay = 900) {
  useEffect(() => {
    if (!when) return
    set({ available: [...state.available.filter((x) => x !== id), id] })
    const t = !tourSeen(id) ? window.setTimeout(() => { if (!state.active && document.visibilityState === 'visible') startTour(id) }, delay) : 0
    return () => {
      clearTimeout(t)
      set({ available: state.available.filter((x) => x !== id) })
      // ออกจากหน้า/เงื่อนไขหมด ระหว่างสอน (เช่น กดบันทึกแล้ว) → ปิดการสอนนั้น (ไม่นับว่าดูจบ — ยกเว้นเดินมาถึงครึ่งแล้ว)
      const a = state.active
      if (a?.tour.id === id) { if (a.i >= a.tour.steps.length / 2) markTourSeen(id); set({ active: null }) }
    }
  }, [id, when, delay])
}
