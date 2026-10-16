import { useDragScroll } from '../lib/useDragScroll'
import { useDraggable } from '@dnd-kit/core'
import { Filter, LayoutGrid, Search, Trash2, X } from 'lucide-react'
import { memo, startTransition, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSlidePill } from '../lib/slide'
import { MAX_HEROES } from '../lib/types'
import { HEROES, HERO_TYPES, PETS, TIERS, baseName, matchUnit, tierOf, type HeroType, type Tier, type Unit, unitLabel } from '../data/heroes'
import { pressRoster, useDndHub, useDraggingUnit } from './DndHub'
import Modal from './Modal'
import UnitCard from './UnitCard'
import { tx, L } from '../lib/i18n'

const HISTORY = '7knote:search-history'
const readHistory = (): string[] => {
  try { return JSON.parse(localStorage.getItem(HISTORY) ?? '[]') } catch { return [] }
}
const writeHistory = (h: string[]) => {
  try { localStorage.setItem(HISTORY, JSON.stringify(h)) } catch { /* ignore */ }
}

/**
 * แถบอัศวินด้านล่างแบบในเกม
 * - เลื่อนซ้ายขวา (ล้อเมาส์ / ปัดนิ้ว)
 * - กดการ์ด = ใส่ทีมที่เลือกอยู่ / ลากการ์ดขึ้นไปวางช่องไหนก็ได้
 * - ปุ่ม: ตารางใหญ่ · ค้นหาชื่อ · กรองประเภท
 */
/** z = ลำดับชั้นทับ (ใช้ตอนอยู่บนหน้าต่างซ้อน เช่น สนามฝึก) */
export default function HeroDock({ bottom = 0, z }: { bottom?: number; z?: number }) {
  const hub = useDndHub()
  const draggingUnit = useDraggingUnit()
  const tab = hub?.dockTab ?? 'hero'
  const setTab = (t: 'hero' | 'pet') => hub?.setDockTab(t)
  const [query, setQuery] = useState('')
  const tabPill = useSlidePill(tab)
  const [types, setTypes] = useState<HeroType[]>([])
  const [tiers, setTiers] = useState<Tier[]>([])
  const [modal, setModal] = useState<'grid' | 'search' | 'filter' | null>(null)
  // ดับเบิลคลิกช่องว่างในทีม → เปิดหน้าใหญ่
  const gridReq = hub?.gridReq ?? 0
  useEffect(() => { if (gridReq) setModal('grid') }, [gridReq])
  const strip = useRef<HTMLDivElement>(null)
  const dragScroll = useDragScroll(strip)
  // ตัวลากเดียวของทั้งแถบ (ดู rosterPress ใน DndHub)
  const rosterDrag = useDraggable({ id: `roster|${tab}|*` })
  // ตัวลากคือทั้งแถบ → เริ่มลากได้เฉพาะตอนกดบนการ์ด (กดที่ว่างในแถบ = เลื่อนแถบอย่างเดียว)
  const onCard = (e: React.SyntheticEvent) => !!(e.target as HTMLElement | null)?.closest?.('[data-roster-id]')
  const cardOnly = (h?: Function) => (h ? (e: React.SyntheticEvent) => { if (onCard(e)) h(e) } : undefined)
  const gridRef = useRef<HTMLDivElement>(null)
  const gridScroll = useDragScroll(gridRef, 'y')

  const used = new Set(hub?.usedInFocused() ?? [])
  // ตัวที่ใช้ในไม้อื่นแล้ว → หรี่ + ป้ายไม้ (ยังกดใส่ได้ ถ้าตั้งใจ)
  const blocked = hub?.blockedInFocused() ?? {} // ป้ายนี้มีแค่อัศวิน (แถวอัศวินค้างไว้ตอนอยู่แท็บสัตว์เลี้ยงด้วย)
  const usedIn = (u: Unit) => blocked[baseName(u.name)]
  const heroList = useMemo(
    () => HEROES.filter((u) => matchUnit(u, query) && (!types.length || (u.type && types.includes(u.type))) && (!tiers.length || tiers.includes(tierOf(u.name)!))),
    [query, types, tiers],
  )
  const petList = useMemo(() => PETS.filter((u) => matchUnit(u, query)), [query])
  const list = tab === 'hero' ? heroList : petList
  // หน้าใหญ่: แยกเป็นหมวดตาม tier (สัตว์เลี้ยง = หมวดเดียว)
  const groups = useMemo(() => {
    if (tab !== 'hero') return list.length ? [{ key: 'pet', tier: null as Tier | null, units: list }] : []
    return (Object.keys(TIERS) as Tier[])
      .map((t) => ({ key: t, tier: t as Tier | null, units: list.filter((u) => tierOf(u.name) === t) }))
      .filter((g) => g.units.length)
  }, [tab, list])

  // ใส่ครบแล้วเก็บแถบเอง: อัศวินครบ → ไปแท็บสัตว์เลี้ยง (ถ้ายังไม่มี) → ครบหมด → เก็บ
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

  // กดการ์ดในแถบ/ตารางหน้าใหญ่: ฟังก์ชันเดิมทุกครั้ง (ผ่าน ref) → การ์ด 100+ ใบไม่ต้องวาดใหม่ทุกครั้งที่ใส่ตัวในทีม
  const addRef = useRef<(u: Unit) => void>(() => {})
  addRef.current = (u: Unit) => hub?.quickAdd(tab, u.id)
  const onPick = useCallback((u: Unit) => addRef.current(u), [])

  // เตรียมแถบไว้ล่วงหน้าตอนเครื่องว่าง (ซ่อนอยู่) → กด + แล้วขึ้นทันที ไม่ต้องสร้างการ์ด 100+ ใบตอนกด
  const open = !!hub?.dockOpen
  const hasPanels = !!hub?.hasPanels
  const [warm, setWarm] = useState(false)
  useEffect(() => {
    if (!hasPanels || warm) return
    const go = () => startTransition(() => setWarm(true))
    const w = window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void }
    if (w.requestIdleCallback) { const id = w.requestIdleCallback(go, { timeout: 2500 }); return () => w.cancelIdleCallback?.(id) }
    const t = setTimeout(go, 800)
    return () => clearTimeout(t)
  }, [hasPanels, warm])
  // เปิดใหม่/สลับแท็บ → เริ่มจากต้นแถบ
  useEffect(() => { if (open && strip.current) strip.current.scrollLeft = 0 }, [open, tab])
  // เก็บแถบ = ปิดหน้าต่างของแถบด้วย (เดิมแถบหายทั้งก้อน)
  useEffect(() => { if (!open) setModal(null) }, [open])

  if (!hub || !hasPanels) return null
  // เปิดเฉพาะตอนแตะช่องในทีม (ปิดอยู่ = ซ่อนไว้เฉย ๆ ถ้าเตรียมแล้ว)
  if (!open && !warm) return null

  return (
    <>
      {/* พื้นทึบ (ไม่เบลอ): เบลอพื้นหลังต้องวาดใหม่ทั้งแถบทุกครั้งที่หน้าขยับ → เลื่อน/ลากหน่วง */}
      {/* ปิดอยู่ = ซ่อนด้วย content-visibility (เบราว์เซอร์จำหน้าตาไว้ เปิดแล้วไม่ต้องคำนวณการ์ดทั้งแถบใหม่)
          อย่าใช้ visibility / pointer-events / inert สลับเปิดปิด: ค่าพวกนี้สืบทอดลงลูก → ต้องคำนวณสไตล์การ์ดทุกใบใหม่ */}
      <div data-tour={open ? 'hero-dock' : undefined}
        className={`${open ? 'hero-dock' : 'hero-dock-idle'} fixed inset-x-0 z-30 border-t border-gold/30 bg-[var(--dock)]`} style={{ bottom, ...(z ? { zIndex: z } : {}) }}>
        {/* ปุ่มเก็บแถบตรงกลางแบบในเกม */}
        <button
          onClick={() => hub.setDockOpen(false)}
          title={tx('เก็บแถบ')}
          className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[55%] transition hover:brightness-125"
        >
          <svg viewBox="0 0 120 34" className="h-7 w-28 drop-shadow-[0_2px_4px_rgba(0,0,0,.6)]">
            <path d="M0 6 H44 L60 30 L76 6 H120" fill="none" stroke="#c9b17a" strokeWidth="1.5" />
            <path d="M40 6 L60 33 L80 6 L60 16 Z" fill="#2a2d3a" stroke="#e8d6a4" strokeWidth="1.5" />
            <path d="M60 3 C61 8 62 9 67 10 C62 11 61 12 60 17 C59 12 58 11 53 10 C58 9 59 8 60 3Z" fill="#fff4d0" />
          </svg>
        </button>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-3 pt-2">
          <RoundBtn title={tx('ดูทั้งหมด')} onClick={() => setModal('grid')}><LayoutGrid className="h-5 w-5" /></RoundBtn>
          <RoundBtn title={tx('ค้นหาชื่อ')} onClick={() => setModal('search')} active={!!query}><Search className="h-5 w-5" /></RoundBtn>
          {tab === 'hero' && (
            <RoundBtn title={tx('กรองประเภท')} onClick={() => setModal('filter')} active={types.length + tiers.length > 0}><Filter className="h-5 w-5" /></RoundBtn>
          )}
          <div ref={tabPill.box} className="pill relative ml-1 flex p-0.5 text-sm">
            <span aria-hidden className="slide-pill" style={tabPill.pill} />
            {(['hero', 'pet'] as const).map((k) => (
              <button
                key={k}
                ref={tabPill.item(k)}
                onClick={() => setTab(k)}
                className={`relative z-10 rounded-full px-3 py-1 transition-colors ${tab === k ? 'font-semibold text-ink' : 'text-white/70'}`}
              >
                {k === 'hero' ? tx('อัศวิน') : tx('สัตว์เลี้ยง')}
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
          ref={(el) => { strip.current = el; rosterDrag.setNodeRef(el) }}
          onTouchStart={cardOnly(rosterDrag.listeners?.onTouchStart)}
          onMouseDown={cardOnly(rosterDrag.listeners?.onMouseDown)}
          {...dragScroll}
          // ไม่ใช้ active:cursor-grabbing: cursor สืบทอดลงการ์ดทุกใบ → กดทีไรคำนวณสไตล์ทั้งแถบใหม่
          // จำการ์ดที่กดก่อน (ตัวลากอ่านตอนเริ่มลาก) แล้วส่งต่อให้ทั้งตัวลากและตัวเลื่อนแถบ
          onPointerDownCapture={(e) => pressRoster(e.target)}
          onTouchStartCapture={(e) => pressRoster(e.target)}
          onMouseDownCapture={(e) => pressRoster(e.target)}
          onPointerDown={(e) => { if (onCard(e)) rosterDrag.listeners?.onPointerDown?.(e); dragScroll.onPointerDown(e) }}
          onWheel={(e) => {
            if (strip.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) strip.current.scrollLeft += e.deltaY
          }}
          className="no-scrollbar dock-fade relative mx-auto max-w-6xl cursor-grab select-none overflow-x-auto px-3 pb-3 pt-2"
        >
          {/* อัศวิน + สัตว์เลี้ยงสร้างค้างไว้ทั้งสองแถว สลับแท็บ = ซ่อน/โชว์เฉย ๆ (เดิมสร้างการ์ด 100+ ใบใหม่ทุกครั้งที่สลับ) */}
          {(['hero', 'pet'] as const).map((k) => {
            const shown = (k === 'hero' ? heroList : petList).filter((u) => !used.has(u.id))
            return (
              <div key={k} data-roster-group={k} className={`flex w-max gap-2 ${k === tab ? '' : 'roster-group-idle'}`}>
                {shown.map((u) => (
                  <RosterCard key={u.id} unit={u} kind={k} onPick={onPick} usedIn={k === 'hero' ? usedIn(u) : undefined} dragging={draggingUnit === u.id} />
                ))}
                {shown.length === 0 && <p className="py-6 text-sm text-white/45">{tx('ไม่พบอัศวิน')}</p>}
              </div>
            )
          })}
        </div>
      </div>

      {/* ตารางใหญ่ตรงกลาง */}
      <Modal open={modal === 'grid'} title={L(`${tab === 'hero' ? 'อัศวิน' : 'สัตว์เลี้ยง'}ทั้งหมด · ใส่ใน ${hub.focusedLabel ?? '—'}`, `All ${tab === 'hero' ? 'heroes' : 'pets'} · adding to ${hub.focusedLabel ?? '—'}`)} onClose={() => setModal(null)} wide>
        <div className="mb-3 flex gap-2">
          <RoundBtn title={tx('กรองประเภท')} onClick={() => setModal('filter')} active={types.length + tiers.length > 0} hidden={tab !== 'hero'}><Filter className="h-5 w-5" /></RoundBtn>
          <RoundBtn title={tx('ค้นหาชื่อ')} onClick={() => setModal('search')} active={!!query}><Search className="h-5 w-5" /></RoundBtn>
          {query && <span className="self-center text-sm text-white/60">{tx('ค้นหา: “')}{query}”</span>}
        </div>
        <div ref={gridRef} {...gridScroll} data-tour="hero-grid" className="hero-grid cursor-grab select-none space-y-5">
          {groups.map((g) => (
            <section key={g.key}>
              {g.tier && (
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-4 w-1.5 rounded-full" style={{ background: TIERS[g.tier].color }} />
                  <span className="font-semibold" style={{ color: TIERS[g.tier].color }}>{TIER_TITLE[g.tier]}</span>
                  <span className="text-xs text-white/45">{g.units.length}{' '}{tx('ตัว')}</span>
                  <span className="h-px flex-1 bg-white/10" />
                </div>
              )}
              <div className="hero-grid-group grid grid-cols-4 gap-2.5 sm:grid-cols-6 lg:grid-cols-10">
                {g.units.map((u) => (
                  <GridCard key={u.id} unit={u} kind={tab} onPick={onPick} inTeam={used.has(u.id)} usedIn={usedIn(u)} />
                ))}
              </div>
            </section>
          ))}
          {!groups.length && <p className="py-8 text-center text-white/50">{tx('ไม่พบอัศวิน')}</p>}
        </div>
      </Modal>

      <SearchModal open={modal === 'search'} onClose={() => setModal(null)} onSearch={(q) => { setQuery(q); setModal(null) }} />

      {/* กรอง: ระดับ (tier) + ธาตุ */}
      <Modal open={modal === 'filter'} title={tx('กรองอัศวิน')} onClose={() => setModal(null)}>
        <div className="mb-1.5 text-xs text-white/55">{tx('ระดับ')}</div>
        <div className="mb-4 grid grid-cols-3 gap-2">
          <FilterBtn active={!tiers.length} onClick={() => setTiers([])}>{tx('ทั้งหมด')}</FilterBtn>
          {(Object.keys(TIERS) as Tier[]).map((t) => (
            <FilterBtn
              key={t}
              active={tiers.includes(t)}
              onClick={() => setTiers((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]))}
              color={TIERS[t].color}
            >
              {TIERS[t].label}
            </FilterBtn>
          ))}
        </div>
        <div className="mb-1.5 text-xs text-white/55">{tx('ธาตุ')}</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <FilterBtn active={!types.length} onClick={() => setTypes([])}>{tx('ทั้งหมด')}</FilterBtn>
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
        <p className="mt-3 text-xs text-white/45">{tx('อัศวินที่ยังไม่ได้ระบุประเภทจะไม่ขึ้นตอนกรอง (ใส่เพิ่มได้ใน web/src/data/heroes.ts)')}</p>
        <button onClick={() => setModal(null)} className="btn-gold mt-4 w-full py-2">{tx('ตกลง')}</button>
      </Modal>
    </>
  )
}


function UsedBadge({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute inset-x-0 top-[38%] bg-red-600/85 py-0.5 text-center text-[11px] font-semibold text-white shadow">
      {tx('ใช้แล้ว ·')}{' '}{label}
    </span>
  )
}

const RosterCard = memo(function RosterCard({ unit, kind, onPick, usedIn, dragging }: { unit: Unit; kind: 'hero' | 'pet'; onPick: (u: Unit) => void; usedIn?: string; dragging: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onPick(unit)}
      data-roster
      data-roster-id={unit.id}
      draggable={false}
      className={`relative w-[68px] shrink-0 text-[13px] sm:w-[80px] ${dragging ? 'opacity-30' : usedIn ? 'opacity-55 hover:opacity-90' : 'hover:-translate-y-1'} transition`}
      style={{ aspectRatio: '4 / 5', touchAction: 'pan-x' }}
      title={unitLabel(unit.id)}
    >
      {/* การ์ดกว้าง 68–80px (อัศวินซูมรูป 1.6 เท่า) → จอทั่วไปใช้รูปย่อ 256px พอ ถอด/วาดเร็วกว่ารูปเต็มมาก */}
      <UnitCard id={unit.id} shape={kind === 'hero' ? 'hero' : 'pet'} sizes={kind === 'hero' ? '(min-width: 640px) 128px, 109px' : '(min-width: 640px) 80px, 68px'} />
      {usedIn && <UsedBadge label={usedIn} />}
    </button>
  )
})

/** การ์ดในตารางหน้าใหญ่: memo เหมือนการ์ดในแถบ → ใส่ตัวแล้ววาดใหม่แค่ใบที่เปลี่ยน ไม่ใช่ทั้ง 100+ ใบ
 *  ไม่มีแอนิเมชันลอยตอนชี้ (ดู .hero-grid ใน index.css) */
const GridCard = memo(function GridCard({ unit, kind, onPick, inTeam, usedIn }: { unit: Unit; kind: 'hero' | 'pet'; onPick: (u: Unit) => void; inTeam: boolean; usedIn?: string }) {
  return (
    <button
      type="button"
      onClick={() => !inTeam && onPick(unit)}
      className={`relative aspect-[4/5] text-[13px] ${inTeam ? 'opacity-35' : usedIn ? 'opacity-60 hover:opacity-90' : ''}`}
      title={inTeam ? tx('อยู่ในทีมแล้ว') : L(`ใส่ ${unitLabel(unit.id)}`, `Add ${unitLabel(unit.id)}`)}
    >
      <UnitCard id={unit.id} shape={kind === 'hero' ? 'hero' : 'pet'} small />
      {inTeam && <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-[#000]/60 py-0.5 text-center text-xs text-[#fff]">{tx('ในทีม')}</span>}
      {!inTeam && usedIn && <UsedBadge label={usedIn} />}
    </button>
  )
})

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
    <Modal open={open} title={tx('ค้นหาชื่อ')} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); submit() }} className="flex gap-2">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tx('ชื่ออัศวิน (ไทยหรืออังกฤษ)')}
          className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/90 px-4 py-2 text-ink outline-none placeholder:text-ink/40"
        />
        <button className="btn-gold px-5">{tx('ค้นหา')}</button>
      </form>
      <div className="mt-4 flex items-center justify-between rounded-lg bg-black/25 px-3 py-2">
        <span className="font-semibold">{tx('✦ ค้นหาล่าสุด')}</span>
        <button
          onClick={() => { setHistory([]); writeHistory([]) }}
          className="flex items-center gap-1 rounded-full border border-white/20 px-3 py-0.5 text-sm hover:bg-white/10"
        >
          <Trash2 className="h-3.5 w-3.5" />{' '}{tx('ลบทั้งหมด')}
        </button>
      </div>
      {history.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {history.map((h) => (
            <button key={h} onClick={() => submit(h)} className="rounded-full bg-white/10 px-3 py-1 text-sm hover:bg-white/20">{h}</button>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-white/40">{tx('ยังไม่มีประวัติการค้นหา')}</p>
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

const TIER_TITLE: Record<Tier, string> = {
  o7k: 'O7K · Seven Knights of Old',
  lp: tx('ทองบน (L+)'),
  l: tx('ทองล่าง (L)'),
  r: tx('ม่วง (Rare)'),
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
