import { useDraggable } from '@dnd-kit/core'
import { Filter, LayoutGrid, Search, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { MAX_HEROES } from '../lib/types'
import { HEROES, HERO_TYPES, PETS, matchUnit, type HeroType, type Unit } from '../data/heroes'
import { useDndHub } from './DndHub'
import Modal from './Modal'
import UnitCard from './UnitCard'

const HISTORY = '7knote:search-history'
const readHistory = (): string[] => {
  try { return JSON.parse(localStorage.getItem(HISTORY) ?? '[]') } catch { return [] }
}
const writeHistory = (h: string[]) => {
  try { localStorage.setItem(HISTORY, JSON.stringify(h)) } catch { /* ignore */ }
}

/**
 * แถบฮีโร่ด้านล่างแบบในเกม
 * - เลื่อนซ้ายขวา (ล้อเมาส์ / ปัดนิ้ว)
 * - กดการ์ด = ใส่ทีมที่เลือกอยู่ / ลากการ์ดขึ้นไปวางช่องไหนก็ได้
 * - ปุ่ม: ตารางใหญ่ · ค้นหาชื่อ · กรองประเภท
 */
export default function HeroDock({ bottom = 0 }: { bottom?: number }) {
  const hub = useDndHub()
  const tab = hub?.dockTab ?? 'hero'
  const setTab = (t: 'hero' | 'pet') => hub?.setDockTab(t)
  const [query, setQuery] = useState('')
  const [types, setTypes] = useState<HeroType[]>([])
  const [modal, setModal] = useState<'grid' | 'search' | 'filter' | null>(null)
  const strip = useRef<HTMLDivElement>(null)
  const dragScroll = useDragScroll(strip)

  const used = new Set(hub?.usedInFocused() ?? [])
  const list = useMemo(() => {
    const src = tab === 'hero' ? HEROES : PETS
    return src.filter((u) => matchUnit(u, query) && (tab === 'pet' || !types.length || (u.type && types.includes(u.type))))
  }, [tab, query, types])
  const visible = list.filter((u) => !used.has(u.id))

  // ใส่ครบแล้วเก็บแถบเอง: ฮีโร่ครบ → ไปแท็บสัตว์เลี้ยง (ถ้ายังไม่มี) → ครบหมด → เก็บ
  const st = hub?.statusOfFocused() ?? null
  const prev = useRef<{ heroes: number; pet: boolean } | null>(null)
  useEffect(() => {
    if (!hub || !st) return
    const p = prev.current
    prev.current = st
    if (!p || !hub.dockOpen) return
    const grew = st.heroes > p.heroes || (st.pet && !p.pet)
    if (!grew) return
    if (st.heroes >= MAX_HEROES && st.pet) hub.setDockOpen(false)
    else if (st.heroes >= MAX_HEROES && tab === 'hero') hub.setDockTab('pet')
    else if (st.pet && !p.pet && st.heroes < MAX_HEROES) hub.setDockTab('hero')
  }, [hub, st?.heroes, st?.pet, tab])

  if (!hub?.hasPanels) return null

  // เปิดเฉพาะตอนแตะช่องในทีม
  if (!hub.dockOpen) return null

  const add = (u: Unit) => hub.quickAdd(tab, u.id)

  return (
    <>
      <div className="hero-dock fixed inset-x-0 z-30 border-t border-gold/30 bg-gradient-to-b from-[#1d2438]/95 to-[#121726]/95 backdrop-blur" style={{ bottom }}>
        {/* ปุ่มเก็บแถบตรงกลางแบบในเกม */}
        <button
          onClick={() => hub.setDockOpen(false)}
          title="เก็บแถบ"
          className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[55%] transition hover:brightness-125"
        >
          <svg viewBox="0 0 120 34" className="h-7 w-28 drop-shadow-[0_2px_4px_rgba(0,0,0,.6)]">
            <path d="M0 6 H44 L60 30 L76 6 H120" fill="none" stroke="#c9b17a" strokeWidth="1.5" />
            <path d="M40 6 L60 33 L80 6 L60 16 Z" fill="#2a2d3a" stroke="#e8d6a4" strokeWidth="1.5" />
            <path d="M60 3 C61 8 62 9 67 10 C62 11 61 12 60 17 C59 12 58 11 53 10 C58 9 59 8 60 3Z" fill="#fff4d0" />
          </svg>
        </button>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-3 pt-2">
          <RoundBtn title="ดูทั้งหมด" onClick={() => setModal('grid')}><LayoutGrid className="h-5 w-5" /></RoundBtn>
          <RoundBtn title="ค้นหาชื่อ" onClick={() => setModal('search')} active={!!query}><Search className="h-5 w-5" /></RoundBtn>
          {tab === 'hero' && (
            <RoundBtn title="กรองประเภท" onClick={() => setModal('filter')} active={types.length > 0}><Filter className="h-5 w-5" /></RoundBtn>
          )}
          <div className="pill ml-1 flex p-0.5 text-sm">
            {(['hero', 'pet'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`rounded-full px-3 py-1 ${tab === k ? 'bg-gold font-semibold text-ink' : 'text-white/70'}`}
              >
                {k === 'hero' ? 'ฮีโร่' : 'สัตว์เลี้ยง'}
              </button>
            ))}
          </div>
          {query && (
            <button onClick={() => setQuery('')} className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-xs">
              “{query}” <X className="h-3 w-3" />
            </button>
          )}

        </div>
        <div
          ref={strip}
          {...dragScroll}
          onWheel={(e) => {
            if (strip.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) strip.current.scrollLeft += e.deltaY
          }}
          className="no-scrollbar dock-fade mx-auto flex max-w-6xl cursor-grab select-none gap-2 overflow-x-auto px-3 pb-3 pt-2 active:cursor-grabbing"
        >
          {visible.map((u) => (
            <RosterCard key={u.id} unit={u} kind={tab} onClick={() => add(u)} />
          ))}
          {visible.length === 0 && <p className="py-6 text-sm text-white/45">ไม่พบตัวละคร</p>}
        </div>
      </div>

      {/* ตารางใหญ่ตรงกลาง */}
      <Modal open={modal === 'grid'} title={`${tab === 'hero' ? 'ฮีโร่' : 'สัตว์เลี้ยง'}ทั้งหมด · ใส่ใน ${hub.focusedLabel ?? '—'}`} onClose={() => setModal(null)} wide>
        <div className="mb-3 flex gap-2">
          <RoundBtn title="กรองประเภท" onClick={() => setModal('filter')} active={types.length > 0} hidden={tab !== 'hero'}><Filter className="h-5 w-5" /></RoundBtn>
          <RoundBtn title="ค้นหาชื่อ" onClick={() => setModal('search')} active={!!query}><Search className="h-5 w-5" /></RoundBtn>
          {query && <span className="self-center text-sm text-white/60">ค้นหา: “{query}”</span>}
        </div>
        <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6 lg:grid-cols-10">
          {list.map((u) => {
            const inTeam = used.has(u.id)
            return (
              <button
                key={u.id}
                onClick={() => !inTeam && add(u)}
                className={`relative aspect-[4/5] text-[13px] transition ${inTeam ? 'opacity-35' : 'hover:-translate-y-0.5'}`}
                title={inTeam ? 'อยู่ในทีมแล้ว' : `ใส่ ${u.name}`}
              >
                <UnitCard id={u.id} shape={tab === 'hero' ? 'hero' : 'pet'} />
                {inTeam && <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-black/60 py-0.5 text-center text-xs">ในทีม</span>}
              </button>
            )
          })}
        </div>
      </Modal>

      <SearchModal open={modal === 'search'} onClose={() => setModal(null)} onSearch={(q) => { setQuery(q); setModal(null) }} />

      {/* กรองประเภท (อย่างเดียว) */}
      <Modal open={modal === 'filter'} title="กรองประเภท" onClose={() => setModal(null)}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <FilterBtn active={!types.length} onClick={() => setTypes([])}>ทั้งหมด</FilterBtn>
          {(Object.keys(HERO_TYPES) as HeroType[]).map((t) => (
            <FilterBtn
              key={t}
              active={types.includes(t)}
              onClick={() => setTypes((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]))}
              color={HERO_TYPES[t].color}
            >
              {HERO_TYPES[t].label}
            </FilterBtn>
          ))}
        </div>
        <p className="mt-3 text-xs text-white/45">ฮีโร่ที่ยังไม่ได้ระบุประเภทจะไม่ขึ้นตอนกรอง (ใส่เพิ่มได้ใน web/src/data/heroes.ts)</p>
        <button onClick={() => setModal(null)} className="btn-gold mt-4 w-full py-2">ตกลง</button>
      </Modal>
    </>
  )
}

/**
 * ลากแถบด้วยเมาส์เหมือนในเกม (ลากไปซ้าย = เลื่อนไปขวา) + ไถลต่อนิดหน่อยตอนปล่อย
 * มือถือใช้การปัดของเบราว์เซอร์อยู่แล้ว
 */
function useDragScroll(ref: React.RefObject<HTMLDivElement | null>) {
  const st = useRef({ down: false, x: 0, left: 0, moved: 0, v: 0, lastX: 0, lastT: 0, raf: 0 })
  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || !ref.current) return
      cancelAnimationFrame(st.current.raf)
      Object.assign(st.current, { down: true, x: e.clientX, left: ref.current.scrollLeft, moved: 0, v: 0, lastX: e.clientX, lastT: performance.now() })
    },
    onPointerMove: (e: React.PointerEvent) => {
      const s = st.current
      if (!s.down || !ref.current) return
      const dx = e.clientX - s.x
      s.moved = Math.max(s.moved, Math.abs(dx))
      ref.current.scrollLeft = s.left - dx
      const now = performance.now()
      s.v = (e.clientX - s.lastX) / Math.max(1, now - s.lastT)
      s.lastX = e.clientX
      s.lastT = now
    },
    onPointerUp: () => {
      const s = st.current
      if (!s.down) return
      s.down = false
      // ไถลต่อ (momentum)
      let v = -s.v * 16
      const step = () => {
        if (!ref.current || Math.abs(v) < 0.5) return
        ref.current.scrollLeft += v
        v *= 0.92
        s.raf = requestAnimationFrame(step)
      }
      if (s.moved > 10) s.raf = requestAnimationFrame(step)
    },
    onPointerLeave: () => { st.current.down = false },
    // ถ้าเพิ่งลากเลื่อน อย่านับเป็นการกดการ์ด
    onClickCapture: (e: React.MouseEvent) => {
      if (st.current.moved > 6) {
        e.stopPropagation()
        e.preventDefault()
        st.current.moved = 0
      }
    },
  }
}

function RosterCard({ unit, kind, onClick }: { unit: Unit; kind: 'hero' | 'pet'; onClick: () => void }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: `roster|${kind}|${unit.id}` })
  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      data-roster
      draggable={false}
      className={`relative w-[68px] shrink-0 text-[13px] sm:w-[80px] ${isDragging ? 'opacity-30' : 'hover:-translate-y-1'} transition`}
      style={{ aspectRatio: '4 / 5', touchAction: 'pan-x' }}
      title={unit.name}
    >
      <UnitCard id={unit.id} shape={kind === 'hero' ? 'hero' : 'pet'} />
    </button>
  )
}

function SearchModal({ open, onClose, onSearch }: { open: boolean; onClose: () => void; onSearch: (q: string) => void }) {
  const [q, setQ] = useState('')
  const [history, setHistory] = useState<string[]>(readHistory)
  function submit(v = q) {
    const s = v.trim()
    if (s) {
      const h = [s, ...history.filter((x) => x !== s)].slice(0, 10)
      setHistory(h)
      writeHistory(h)
    }
    onSearch(s)
    setQ('')
  }
  return (
    <Modal open={open} title="ค้นหาชื่อ" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); submit() }} className="flex gap-2">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ชื่อฮีโร่ (ไทยหรืออังกฤษ)"
          className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/90 px-4 py-2 text-ink outline-none placeholder:text-ink/40"
        />
        <button className="btn-gold px-5">ค้นหา</button>
      </form>
      <div className="mt-4 flex items-center justify-between rounded-lg bg-black/25 px-3 py-2">
        <span className="font-semibold">✦ ค้นหาล่าสุด</span>
        <button
          onClick={() => { setHistory([]); writeHistory([]) }}
          className="flex items-center gap-1 rounded-full border border-white/20 px-3 py-0.5 text-sm hover:bg-white/10"
        >
          <Trash2 className="h-3.5 w-3.5" /> ลบทั้งหมด
        </button>
      </div>
      {history.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {history.map((h) => (
            <button key={h} onClick={() => submit(h)} className="rounded-full bg-white/10 px-3 py-1 text-sm hover:bg-white/20">{h}</button>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-white/40">ยังไม่มีประวัติการค้นหา</p>
      )}
    </Modal>
  )
}

function RoundBtn({ children, onClick, title, active, hidden }: { children: ReactNode; onClick: () => void; title: string; active?: boolean; hidden?: boolean }) {
  if (hidden) return null
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 shadow ${
        active ? 'border-gold bg-gold/20 text-gold' : 'border-[#8c7a55] bg-gradient-to-b from-[#3b3a44] to-[#23232b] text-[#f1e3c0]'
      }`}
    >
      {children}
    </button>
  )
}

function FilterBtn({ children, active, onClick, color }: { children: ReactNode; active: boolean; onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 ${active ? 'border-gold bg-gold/15 font-semibold text-gold' : 'border-white/15 hover:bg-white/5'}`}
    >
      {color && <span className="h-3 w-3 rounded-sm" style={{ background: color }} />}
      {children}
    </button>
  )
}
