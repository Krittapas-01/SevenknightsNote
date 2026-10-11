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
  /** ขั้น "ลองทำเอง" แบบเช็กผล: เป็นจริงเมื่อไหร่ไปขั้นต่อไปเอง (เช่น เปิดตารางอัศวินแล้ว) */
  until?: () => boolean
  /** ข้อความชวนลองทำ (ขั้น click / until) */
  tryHint?: string
  /** 'bottom' = กล่องอธิบายชิดล่างจอเสมอ (สิ่งที่ส่องใหญ่ เช่น หน้าต่างตาราง) */
  place?: 'bottom'
  /** ขั้น click ที่เปิดหน้าต่างซึ่งมีการสอนของตัวเอง → สอนหน้าต่างนั้นก่อน จบแล้วกลับมาขั้นถัดไปของการสอนนี้ */
  sub?: string
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

// การสอนที่พักไว้ระหว่างสอนหน้าต่างย่อย (กลับมาเล่นต่อที่ขั้นถัดไป)
let stack: { tour: Tour; i: number }[] = []

export function startTour(id: string) {
  const tour = registry[id]
  if (!tour) return
  stack = []
  set({ active: { tour, i: 0 } })
}
/** เริ่มการสอนของหน้าต่างย่อยที่เพิ่งเปิด — การสอนเดิมพักไว้ แล้วกลับมาเล่นต่อที่ขั้นถัดไป */
export function startSubTour(id: string) {
  const tour = registry[id], a = state.active
  if (!tour) return
  if (a) stack.push({ tour: a.tour, i: a.i + 1 })
  set({ active: { tour, i: 0 } })
}
/** ปิดการสอนที่เล่นอยู่ (seen = นับว่าดูแล้ว) แล้วกลับไปเล่นการสอนที่พักไว้ต่อ (ถ้ามี) */
function finish(seen: boolean) {
  if (state.active && seen) markTourSeen(state.active.tour.id)
  while (stack.length) {
    const p = stack.pop()!
    if (p.i < p.tour.steps.length) return set({ active: p })
    markTourSeen(p.tour.id)
  }
  set({ active: null })
}
export function goStep(i: number) {
  const a = state.active
  if (!a) return
  if (i >= a.tour.steps.length) return endTour()
  set({ active: { tour: a.tour, i: Math.max(0, i) } })
}
export function endTour() { finish(true) }
/** ปิดการสอนทั้งหมด รวมที่พักไว้ (ปุ่ม ✕ / Esc / ข้ามทั้งหมด) */
export function closeAllTours() {
  if (state.active) markTourSeen(state.active.tour.id)
  for (const p of stack) markTourSeen(p.tour.id)
  stack = []
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
    // เริ่มเองครั้งแรก — ถ้ามีหน้าต่างอื่นเปิดอยู่ (เช่น "มีอะไรใหม่") รอจนปิดก่อน
    // ยกเว้นการสอนที่อยู่ "ในหน้าต่าง" เอง (หน้าต่างนั้นคือบนสุด)
    let t = 0
    const tryStart = () => {
      if (state.active || tourSeen(id)) return
      const ms = document.querySelectorAll('[data-app-modal]')
      const top = ms[ms.length - 1]
      const mine = !!top && !!registry[id]?.steps.some((st) => st.sel && top.querySelector(st.sel))
      if ((top && !mine) || document.visibilityState !== 'visible') { t = window.setTimeout(tryStart, 700); return }
      startTour(id)
    }
    if (!tourSeen(id)) t = window.setTimeout(tryStart, delay)
    return () => {
      clearTimeout(t)
      set({ available: state.available.filter((x) => x !== id) })
      // ออกจากหน้า/เงื่อนไขหมด ระหว่างสอน (เช่น กดบันทึกแล้ว) → ปิดการสอนนั้น (ไม่นับว่าดูจบ — ยกเว้นเดินมาถึงครึ่งแล้ว)
      stack = stack.filter((p) => p.tour.id !== id)
      const a = state.active
      if (a?.tour.id === id) finish(a.i >= a.tour.steps.length / 2)
    }
  }, [id, when, delay])
}
