import {
  DndContext, DragOverlay, MouseSensor, PointerSensor, TouchSensor, pointerWithin, rectIntersection, useSensor, useSensors,
  type CollisionDetection, type DragEndEvent, type DragStartEvent, type Modifier,
} from '@dnd-kit/core'
import { zoomOverlay } from '../lib/zoom'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { MAX_HEROES, type SlotRef } from '../lib/types'
import UnitCard from './UnitCard'

/**
 * ศูนย์กลางลากวางของทั้งหน้า
 * - ลากสลับช่องในทีมเดียวกัน
 * - ลากการ์ดจากแถบอัศวินด้านล่าง (roster) ขึ้นไปวางในทีมไหนก็ได้
 * - กดการ์ดในแถบ = ใส่ช่องว่างของ "ทีมที่เลือกอยู่" (ทีมล่าสุดที่แตะ)
 *
 * id ของช่อง:  <panelId>|h:0..4  /  <panelId>|p  /  <panelId>|e:0..3
 * id ของการ์ดในแถบ: roster|<hero|pet>|<unitId>
 */

export type PanelHandlers = {
  label: () => string
  /** ตัวที่อยู่ในทีมนี้แล้ว (ซ่อนจากแถบอัศวิน) */
  used: () => string[]
  valueOf: (ref: SlotRef) => string | null
  onMove?: (from: SlotRef, to: SlotRef) => void
  /** วางการ์ดจากแถบลงช่อง (unit = อัศวิน/สัตว์เลี้ยง) */
  onDropUnit?: (ref: SlotRef, unitId: string | null) => void
  /** ยกเลิกช่องที่เลือกค้างไว้ (คืน true = มีให้ยกเลิก) */
  clearSelection?: () => boolean
  /** กลุ่มการ์ด (ally/enemy) — ลากข้ามการ์ดได้เฉพาะกลุ่มเดียวกัน (เช่น คอมพ์หลัก ↔ ทีมสำรอง) */
  group?: string
  /** กดการ์ดในแถบ → ใส่ช่องว่างถัดไป */
  onQuickAdd?: (kind: 'hero' | 'pet', unitId: string) => void
  /** จำนวนอัศวินในทีม + มีสัตว์เลี้ยงหลักหรือยัง (ใช้เก็บแถบอัตโนมัติ) */
  status: () => { heroes: number; pet: boolean }
  /** ตัวที่ใช้ในไม้อื่นแล้ว (ชื่อฐาน → ป้าย) ใช้หรี่ในแถบ */
  blocked?: () => Record<string, string>
}

type Hub = {
  register: (id: string, h: PanelHandlers) => () => void
  /** วางของที่ลากอยู่ (active id) ลงช่อง (over id) แล้วเกิดผลจริงไหม — ใช้ทั้งตอนปล่อยและวงทองตอนลากผ่าน */
  canDrop: (activeId: string, overId: string) => boolean
  focused: string | null
  setFocused: (id: string) => void
  quickAdd: (kind: 'hero' | 'pet', unitId: string) => string | null
  focusedLabel: string | null
  /** ตัวที่อยู่ในทีมที่เลือกอยู่ */
  usedInFocused: () => string[]
  /** มีทีมที่แก้ไขได้อยู่ในหน้าไหม */
  hasPanels: boolean
  statusOfFocused: () => { heroes: number; pet: boolean } | null
  blockedInFocused: () => Record<string, string>
  /** แถบอัศวินด้านล่าง: เปิด/เก็บ + แท็บ */
  dockOpen: boolean
  setDockOpen: (v: boolean) => void
  dockTab: 'hero' | 'pet'
  setDockTab: (t: 'hero' | 'pet') => void
  /** ขอเปิดตารางอัศวินหน้าใหญ่ (นับครั้ง — HeroDock ฟังค่านี้) */
  gridReq: number
  /** ตัวที่กำลังลากจากแถบอยู่ (การ์ดในแถบหรี่ลง) */
  openGrid: () => void
}

const Ctx = createContext<Hub | null>(null)
// ตัวที่กำลังลากจากแถบ: แยกบริบทไว้ → เริ่ม/จบการลากไม่ทำให้ทุกช่องในหน้าวาดใหม่ (ใช้แค่แถบอัศวิน)
const DragUnitCtx = createContext<string | null>(null)
export const useDraggingUnit = () => useContext(DragUnitCtx)
export const useDndHub = () => useContext(Ctx)
/** อ่านว่าแถบอัศวินเปิดอยู่ไหม (ใช้ในฟังก์ชัน render ที่เรียก hook ตรง ๆ ไม่ได้) */
export function DockAware({ children }: { children: (dockOpen: boolean) => ReactNode }) {
  return <>{children(!!useContext(Ctx)?.dockOpen)}</>
}

export const keyOf = (r: SlotRef) => (r.kind === 'hero' ? `h:${r.index}` : r.kind === 'pet' ? 'p' : `e:${r.index}`)
export const refOf = (k: string): SlotRef =>
  k === 'p' ? { kind: 'pet', index: 0 } : { kind: k[0] === 'h' ? 'hero' : 'extra', index: Number(k.slice(2)) }
export const groupOfKey = (k: string) => (k[0] === 'h' ? 'hero' : 'pet')

/**
 * การ์ดในแถบอัศวินลากได้ผ่านตัวลากตัวเดียวของทั้งแถบ (id = roster|<kind>|*) — การ์ด 100+ ใบไม่ต้องลงทะเบียนลากทีละใบ
 * (ลงทะเบียนทีละใบ = ทุกครั้งที่ทีมเปลี่ยน การ์ดทุกใบวาดใหม่หมด → กดใส่ตัวหน่วง) · การ์ดที่ถูกกดจำไว้ตอนกดลง
 */
export const rosterPress: { unit: string | null; el: HTMLElement | null; size: number; left: number; top: number; measured: boolean } = { unit: null, el: null, size: 64, left: 0, top: 0, measured: false }
export function pressRoster(target: EventTarget | null) {
  const el = (target as HTMLElement | null)?.closest?.('[data-roster-id]') as HTMLElement | null
  rosterPress.el = el
  rosterPress.unit = el?.dataset.rosterId ?? null
  rosterPress.measured = false // วัดตำแหน่งตอนเริ่มลากจริงเท่านั้น (วัดตอนกด = บังคับคำนวณหน้าใหม่ทุกครั้งที่แตะการ์ด)
}
function measureRoster() {
  if (rosterPress.measured) return rosterPress
  const r = rosterPress.el?.getBoundingClientRect()
  Object.assign(rosterPress, { size: r?.width ?? 64, left: r?.left ?? 0, top: r?.top ?? 0, measured: true })
  return rosterPress
}
/** ตัวลากของแถบคือทั้งแถบ → การ์ดลอยให้เริ่มที่ตำแหน่งการ์ดที่กด (ไม่ใช่มุมซ้ายของแถบ) */
const rosterOffset: Modifier = ({ transform, active, activeNodeRect }) => {
  if (!activeNodeRect || !String(active?.id ?? '').endsWith('|*')) return transform
  const p = measureRoster()
  return { ...transform, x: transform.x + p.left - activeNodeRect.left, y: transform.y + p.top - activeNodeRect.top }
}

/** แยก id ของ dnd-kit */
export function parseDndId(id: string) {
  const [a, b, ...rest] = id.split('|')
  if (a === 'roster') { const u = rest.join('|'); return { roster: true as const, kind: b as 'hero' | 'pet', unit: u === '*' ? rosterPress.unit ?? '' : u } }
  return { roster: false as const, panel: a, key: b }
}

// การ์ดในแถบล่าง: ลากแนวนอน = เลื่อนแถบ, ลากขึ้น/ลง = หยิบการ์ด
const isRoster = (e: Event) => !!(e.target as HTMLElement | null)?.closest?.('[data-roster]')
class SlotMouseSensor extends MouseSensor {
  static activators = [{ eventName: 'onMouseDown' as const, handler: ({ nativeEvent: e }: { nativeEvent: MouseEvent }) => e.button === 0 && !isRoster(e) }]
}
// ใช้ eventName คนละตัวกับ SlotMouseSensor (dnd-kit เก็บได้ 1 handler ต่อ eventName)
class RosterMouseSensor extends PointerSensor {
  static activators = [{
    eventName: 'onPointerDown' as const,
    handler: ({ nativeEvent: e }: { nativeEvent: PointerEvent }) => e.pointerType === 'mouse' && e.button === 0 && isRoster(e),
  }]
}

/**
 * ตำแหน่งนิ้ว/เมาส์จริงล่าสุด (พิกัดจอ) — ใช้หาช่องใต้นิ้วเอง
 * จอคอมย่อทั้งเว็บด้วย CSS zoom (lib/zoom.ts) → ถ้าหน้าต่างเลื่อนระหว่างลาก (ลากใกล้ขอบแล้วเลื่อนเอง / หมุนล้อเมาส์)
 * dnd-kit คำนวณตำแหน่งช่อง/เมาส์คลาดไปตามระยะเลื่อน × zoom → วงทองและที่วางจริงกลายเป็นช่องข้าง ๆ
 * แก้: เทียบตำแหน่งเมาส์จริงกับตำแหน่งช่องบนจอจริง (getBoundingClientRect) ณ ตอนนั้น — ช่องในหน้ามีแค่หลักสิบ
 */
const lastPointer = { x: 0, y: 0, at: 0 }
if (typeof window !== 'undefined') {
  const track = (x: number, y: number) => { lastPointer.x = x; lastPointer.y = y; lastPointer.at = Date.now() }
  window.addEventListener('pointermove', (e) => track(e.clientX, e.clientY), { capture: true, passive: true })
  window.addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) track(t.clientX, t.clientY) }, { capture: true, passive: true })
}
const underPointer: CollisionDetection = ({ droppableContainers }) => {
  if (Date.now() - lastPointer.at > 1500) return []
  const { x, y } = lastPointer
  for (const c of droppableContainers) {
    if (c.disabled) continue
    const r = c.node.current?.getBoundingClientRect()
    if (r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return [{ id: c.id, data: { droppableContainer: c, value: 0 } }]
  }
  return []
}

const collision: CollisionDetection = (args) => {
  const real = underPointer(args)
  if (real.length) return real
  const hit = pointerWithin(args)
  return hit.length ? hit : rectIntersection(args)
}

export function DndHub({ children }: { children: ReactNode }) {
  const panels = useRef(new Map<string, PanelHandlers>())
  const [focused, setFocused] = useState<string | null>(null)
  const [dockOpen, setDockOpen] = useState(false)
  // แถบอัศวินเปิดอยู่ แล้วกดที่อื่น (ไม่ใช่แถบ/ช่องทีม/หน้าต่าง): ครั้งแรก = ยกเลิกช่องที่เลือก · ครั้งถัดไป = ปิดแถบ
  useEffect(() => {
    if (!dockOpen) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null
      if (!t || t.closest('.hero-dock, [data-slot], [data-app-modal], .modal-backdrop')) return
      let cleared = false
      for (const h of panels.current.values()) if (h.clearSelection?.()) cleared = true
      if (!cleared) setDockOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [dockOpen])
  const [dockTab, setDockTab] = useState<'hero' | 'pet'>('hero')
  const [gridReq, setGridReq] = useState(0)
  const openGrid = useCallback(() => setGridReq((n) => n + 1), [])
  const [, force] = useState(0)
  const [drag, setDrag] = useState<{ unit: string; shape: 'hero' | 'pet' | 'round'; size: number } | null>(null)

  const register = useCallback((id: string, h: PanelHandlers) => {
    const first = !panels.current.has(id)
    panels.current.set(id, h)
    if (first) {
      force((x) => x + 1)
      setFocused((f) => f ?? id)
    }
    return () => {
      panels.current.delete(id)
      setFocused((f) => (f === id ? null : f))
      force((x) => x + 1)
    }
  }, [])

  const quickAdd = useCallback(
    (kind: 'hero' | 'pet', unit: string) => {
      const id = focused && panels.current.has(focused) ? focused : [...panels.current.keys()][0]
      if (!id) return null
      panels.current.get(id)?.onQuickAdd?.(kind, unit)
      return id
    },
    [focused],
  )

  // เมาส์: ลากเกิน 6px ถึงนับว่าลาก / มือถือ: กดค้าง 200ms (ปัดเฉย ๆ = เลื่อนแถบ)
  const sensors = useSensors(
    useSensor(SlotMouseSensor, { activationConstraint: { distance: 6 } }),
    // ลากขึ้นเกิน 12px = หยิบการ์ด / เลื่อนแนวนอนเกิน 10px ก่อน = ยกเลิก (ปล่อยให้เป็นการเลื่อนแถบ)
    useSensor(RosterMouseSensor, { activationConstraint: { distance: { y: 12 }, tolerance: { x: 10 } } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  function onDragStart(e: DragStartEvent) {
    const p = parseDndId(String(e.active.id))
    const size = e.active.rect.current.initial?.width ?? 64
    if (p.roster) return p.unit ? setDrag({ unit: p.unit, shape: p.kind === 'hero' ? 'hero' : 'pet', size: measureRoster().size }) : undefined
    const h = panels.current.get(p.panel)
    const unit = h?.valueOf(refOf(p.key))
    if (unit) setDrag({ unit, shape: p.key[0] === 'h' ? 'hero' : p.key === 'p' ? 'pet' : 'round', size })
    setFocused(p.panel)
  }

  /**
   * ลากข้ามการ์ดทีม = สลับตัว 2 ช่อง → ต้องสำเร็จทั้งสองฝั่ง ไม่งั้นตัวหาย
   * - ช่องปลายทางว่าง + ทีมปลายทางมีอัศวินครบแล้ว → วางไม่ได้ (เดิม: ปลายทางไม่รับ แต่ต้นทางถูกล้าง = อัศวินหาย)
   * - ตัวที่ลากมีอยู่ในทีมปลายทางแล้ว / ตัวที่สลับกลับมีอยู่ในทีมต้นทางแล้ว → ซ้ำ ไม่ทำ
   */
  const swapOk = (source: PanelHandlers, target: PanelHandlers, fromKey: string, toKey: string) => {
    const a = source.valueOf(refOf(fromKey))
    const b = target.valueOf(refOf(toKey))
    if (!a) return false
    if (target.used().includes(a) || (b && source.used().includes(b))) return false
    if (groupOfKey(toKey) === 'hero' && !b && target.status().heroes >= MAX_HEROES) return false
    return true
  }
  const canDrop = useCallback((activeId: string, overId: string) => {
    const from = parseDndId(activeId)
    const to = parseDndId(overId)
    if (to.roster) return false
    const target = panels.current.get(to.panel)
    if (!target) return false
    if (from.roster) {
      if ((from.kind === 'hero') !== (groupOfKey(to.key) === 'hero')) return false
      // ช่องว่าง + ทีมครบแล้ว (และไม่ใช่ตัวที่อยู่ในทีมอยู่แล้ว) = วางไม่ได้
      if (from.kind === 'hero' && !target.valueOf(refOf(to.key)) && !target.used().includes(from.unit) && target.status().heroes >= MAX_HEROES) return false
      return true
    }
    if (groupOfKey(from.key) !== groupOfKey(to.key)) return false
    if (from.panel === to.panel) return from.key !== to.key
    const source = panels.current.get(from.panel)
    if (!source || !source.group || source.group !== target.group) return false
    return swapOk(source, target, from.key, to.key)
  }, [])

  function onDragEnd(e: DragEndEvent) {
    setDrag(null)
    if (!e.over) return
    const from = parseDndId(String(e.active.id))
    const to = parseDndId(String(e.over.id))
    if (to.roster) return
    const target = panels.current.get(to.panel)
    if (!target) return
    if (from.roster) {
      if ((from.kind === 'hero') !== (groupOfKey(to.key) === 'hero')) return
      target.onDropUnit?.(refOf(to.key), from.unit)
      setFocused(to.panel)
    } else if (from.panel === to.panel && from.key !== to.key && groupOfKey(from.key) === groupOfKey(to.key)) {
      target.onMove?.(refOf(from.key), refOf(to.key))
    } else if (from.panel !== to.panel && groupOfKey(from.key) === groupOfKey(to.key)) {
      // ลากข้ามการ์ดทีม (ฝั่งเดียวกัน) = สลับตัวระหว่างสองช่อง
      const source = panels.current.get(from.panel)
      if (!source || !source.group || source.group !== target.group) return
      if (!swapOk(source, target, from.key, to.key)) return
      const a = source.valueOf(refOf(from.key))
      const b = target.valueOf(refOf(to.key))
      target.onDropUnit?.(refOf(to.key), a)
      source.onDropUnit?.(refOf(from.key), b)
      setFocused(to.panel)
    }
  }

  const hub = useMemo<Hub>(
    () => ({
      register,
      canDrop,
      focused,
      setFocused,
      quickAdd,
      focusedLabel: focused ? panels.current.get(focused)?.label() ?? null : null,
      usedInFocused: () => (focused ? panels.current.get(focused)?.used() ?? [] : []),
      hasPanels: panels.current.size > 0,
      statusOfFocused: () => (focused ? panels.current.get(focused)?.status() ?? null : null),
      blockedInFocused: () => (focused ? panels.current.get(focused)?.blocked?.() ?? {} : {}),
      dockOpen,
      setDockOpen,
      dockTab,
      setDockTab,
      gridReq,
      openGrid,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [register, canDrop, focused, quickAdd, panels.current.size, dockOpen, dockTab, gridReq, openGrid],
  )

  return (
    <Ctx.Provider value={hub}>
      <DragUnitCtx.Provider value={drag?.unit ?? null}>
      <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDrag(null)}>
        {children}
        {createPortal(
          // will-change: การ์ดที่ลากเป็นเลเยอร์แยก วาดครั้งเดียวแล้วเลื่อนอย่างเดียว (ไม่วาดเงา/เอียงใหม่ทุกครั้งที่ขยับเมาส์)
          <DragOverlay dropAnimation={null} modifiers={[rosterOffset, zoomOverlay]} className="will-change-transform">
            {drag ? (
              <div
                className="rotate-3 scale-105 cursor-grabbing drop-shadow-2xl"
                style={{ width: drag.size, height: drag.shape === 'hero' ? undefined : drag.size, aspectRatio: '1', fontSize: drag.size * (drag.shape === 'round' ? 0.14 : 0.22) }}
              >
                <UnitCard id={drag.unit} shape={drag.shape} />
              </div>
            ) : null}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>
      </DragUnitCtx.Provider>
    </Ctx.Provider>
  )
}

/** ซ่อนลูก ๆ ระหว่างที่แถบเลือกอัศวินเปิดอยู่ (เช่น แถบบันทึก) */
export function HideWhileDock({ children }: { children: ReactNode }) {
  const hub = useDndHub()
  return hub?.dockOpen ? null : <>{children}</>
}

/**
 * เป้าหมายแบบรายชื่อ (เช่น ตัว OP / ชุดที่ยกเลิก) — ใช้แถบอัศวินด้านล่างแทนหน้าต่างเลือก
 * h = null → ไม่ลงทะเบียน (เช่น ไม่ได้อยู่ในโหมดแก้ไข)
 */
export function useListTarget(
  id: string,
  h: { label: string; used: string[]; full: boolean; onAdd: (unit: string) => void } | null,
) {
  const hub = useDndHub()
  const latest = useRef(h)
  latest.current = h
  const register = hub?.register
  const enabled = !!h
  useEffect(() => {
    if (!register || !enabled) return
    return register(id, {
      label: () => latest.current?.label ?? '',
      used: () => latest.current?.used ?? [],
      valueOf: () => null,
      onQuickAdd: (kind, unit) => {
        const c = latest.current
        if (kind !== 'hero' || !c || c.full || c.used.includes(unit)) return
        c.onAdd(unit)
      },
      // ครบแล้ว → ให้แถบเก็บตัวเอง
      status: () => (latest.current?.full ? { heroes: 99, pet: true } : { heroes: 0, pet: false }),
    })
  }, [register, id, enabled])
  return {
    open: () => {
      if (!hub) return
      hub.setFocused(id)
      hub.setDockTab('hero')
      hub.setDockOpen(true)
    },
    active: !!hub?.dockOpen && hub.focused === id,
  }
}
