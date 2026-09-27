import { useDraggable, useDroppable } from '@dnd-kit/core'
import { queueStyle } from '../lib/queue'
import { Footprints, PawPrint, Plus, RotateCcw } from 'lucide-react'
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  EXTRA_COUNT, MAX_SKILL_QUEUE, SLOT_COUNT, formationLabel, formationName, nextEmpty, type SkillStep, type SlotRef, type Team,
} from '../lib/types'
import { FormationModal, SkillQueueModal } from './TeamModals'
import { groupOfKey, keyOf, parseDndId, refOf, useDndHub } from './DndHub'
import UnitCard from './UnitCard'
import HeroDetailModal from './HeroDetailModal'
import type { HeroNote } from '../lib/types'
import { getUnit } from '../data/heroes'

const getName = (id: string) => getUnit(id)?.name ?? id

export type SlotKind = SlotRef['kind']

type Props = {
  team: Team
  variant: 'ally' | 'enemy'
  title?: ReactNode
  /** ชื่อสั้น ๆ ของทีมนี้ (โชว์ในแถบฮีโร่ว่ากำลังใส่ทีมไหน) */
  label?: string
  size?: 'md' | 'sm'
  editable?: boolean
  heroNotes?: HeroNote[]
  /** กดช่องว่าง → เปิดหน้าเลือก */
  onSlotClick?: (kind: SlotKind, index: number) => void
  onReset?: () => void
  onFormation?: (front: number) => void
  onSpeed?: (speed: number) => void
  /** ลำดับจองสกิล */
  skills?: SkillStep[]
  /** ถ้าส่งมา = แก้ลำดับสกิลได้ (กดวงกลมดาวล่างสุด) */
  onSkills?: (s: SkillStep[]) => void
  /** สลับตำแหน่งในทีม */
  onMove?: (from: SlotRef, to: SlotRef) => void
  /** ใส่ตัวละครลงช่อง (null = เอาออก) */
  onPlace?: (ref: SlotRef, unit: string | null) => void
  /** ตัวที่ใช้ในไม้อื่นแล้ว (ชื่อฐาน → ป้าย) */
  blocked?: Record<string, string>
  className?: string
}

const GAP = 8
/** ระยะห่างการ์ดฮีโร่บน-ล่าง */
const ROW_GAP = GAP

export default function TeamPanel({
  team, variant, title, label, size = 'md', editable, onSlotClick, onReset, onFormation, onSpeed,
  skills = [], onSkills, onMove, onPlace, blocked, heroNotes, className = '',
}: Props) {
  const hub = useDndHub()
  const panelId = useId().replace(/[:|]/g, '')
  const active = !!editable
  const [detailHero, setDetailHero] = useState<string | null>(null)
  const [modal, setModal] = useState<'formation' | 'skills' | null>(null)
  const dnd = active && !!hub
  const focused = hub?.focused === panelId

  // ช่องที่เลือกไว้ (กดครั้งแรก = เรืองแสง, ครั้งที่สอง = เอาออก)
  const [selected, setSelected] = useState<string | null>(null)
  /** ช่องว่างที่แตะไว้ → การ์ดถัดไปจากแถบล่างจะลงช่องนี้ */
  const [pending, setPending] = useState<SlotRef | null>(null)
  const pendingRef = useRef<SlotRef | null>(null)
  pendingRef.current = pending
  const selectedRef = useRef<string | null>(null)
  selectedRef.current = selected
  useEffect(() => {
    if (!active) setSelected(null)
  }, [active])
  // ตำแหน่งเปลี่ยน (เปลี่ยนค่ายกล/ลากย้าย) → ยกเลิกการเลือก
  const layoutKey = `${team.front}|${team.slots.join(',')}|${team.pet}|${team.extras.join(',')}`
  useEffect(() => setSelected(null), [layoutKey])
  // ช่องที่รอไว้ถูกใส่แล้ว / ไม่ได้เลือกทีมนี้แล้ว → ล้าง
  useEffect(() => {
    if (pending && valueOf(pending)) setPending(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey])
  useEffect(() => {
    if (hub && hub.focused !== panelId) setPending(null)
  }, [hub, panelId])

  const valueOf = (r: SlotRef) =>
    r.kind === 'hero' ? team.slots[r.index] ?? null : r.kind === 'pet' ? team.pet : team.extras[r.index] ?? null

  // ลงทะเบียนกับศูนย์ลากวาง (เก็บค่าล่าสุดใน ref จะได้ไม่ต้องลงทะเบียนใหม่ทุกครั้งที่ทีมเปลี่ยน)
  const latest = useRef({ team, onMove, onPlace, label, blocked })
  latest.current = { team, onMove, onPlace, label, blocked }
  // ลงทะเบียนครั้งเดียว (ผูกกับ register ที่ไม่เปลี่ยน) — ถ้าผูกกับ hub ทั้งก้อน ทุกครั้งที่เปลี่ยนทีมที่เลือก
  // ทุกทีมจะลงทะเบียนใหม่ แล้วโฟกัสเด้งไปทีมแรกของหน้า → กดตัวละครแล้วไปเข้าทีมอื่น
  const register = hub?.register
  useEffect(() => {
    if (!register || !active) return
    const units = () => {
      const t = latest.current.team
      return [...t.slots, t.pet, ...t.extras].filter(Boolean) as string[]
    }
    return register(panelId, {
      label: () => latest.current.label ?? 'ทีมนี้',
      valueOf: (r) => {
        const t = latest.current.team
        return r.kind === 'hero' ? t.slots[r.index] ?? null : r.kind === 'pet' ? t.pet : t.extras[r.index] ?? null
      },
      used: units,
      onMove: (a, b) => latest.current.onMove?.(a, b),
      onDropUnit: (r, u) => latest.current.onPlace?.(r, u),
      onQuickAdd: (kind, u) => {
        const t = latest.current.team
        // มีตัวที่เรืองแสงอยู่ (ช่องมีตัว) → กดตัวในแถบ = ใส่แทนตัวนั้น
        const sel = selectedRef.current
        if (sel && (groupOfKey(sel) === 'hero') === (kind === 'hero')) {
          latest.current.onPlace?.(refOf(sel), u)
          setSelected(null)
          return
        }
        if (units().includes(u)) return
        const p = pendingRef.current
        const pendingOk = p && (p.kind === 'hero') === (kind === 'hero') &&
          !(p.kind === 'hero' ? t.slots[p.index] : p.kind === 'pet' ? t.pet : t.extras[p.index])
        const r = pendingOk ? p : nextEmpty(t, kind)
        if (r) latest.current.onPlace?.(r, u)
        setPending(null)
      },
      blocked: () => latest.current.blocked ?? {},
      status: () => {
        const t = latest.current.team
        return { heroes: t.slots.filter(Boolean).length, pet: !!t.pet }
      },
    })
  }, [register, active, panelId])

  function clickSlot(r: SlotRef) {
    if (!active) return
    hub?.setFocused(panelId)
    // แตะช่องไหนก็ตาม = เปิดแถบตัวละครด้านล่าง (แท็บตามชนิดช่อง)
    if (hub) {
      hub.setDockTab(r.kind === 'hero' ? 'hero' : 'pet')
      hub.setDockOpen(true)
    }
    const k = keyOf(r)
    if (selected) {
      if (selected === k) {
        onPlace?.(r, null) // กดซ้ำ = เอาออก
        setSelected(null)
        return
      }
      if (groupOfKey(selected) === groupOfKey(k)) {
        onMove?.(refOf(selected), r) // เลือกไว้แล้วกดช่องอื่น = ย้าย/สลับ
        setSelected(null)
        return
      }
    }
    if (valueOf(r)) {
      setSelected(k)
      setPending(null)
    } else {
      setSelected(null)
      if (hub) setPending(r)
      else onSlotClick?.(r.kind, r.index)
    }
  }

  const S = size === 'md' ? 'clamp(58px, 17vw, 84px)' : 'clamp(54px, 15vw, 68px)'
  const style = { '--s': S } as CSSProperties

  const frontIdx = Array.from({ length: team.front }, (_, i) => i)
  const backIdx = Array.from({ length: SLOT_COUNT - team.front }, (_, i) => team.front + i)
  // ฝั่งเรา: [หลัง][หน้า] (หน้าอยู่ใกล้ VS) — ฝั่งศัตรู: [หน้า][หลัง]
  const cols = variant === 'ally'
    ? [{ key: 'back', label: 'หลัง', idx: backIdx }, { key: 'front', label: 'หน้า', idx: frontIdx }]
    : [{ key: 'front', label: 'หน้า', idx: frontIdx }, { key: 'back', label: 'หลัง', idx: backIdx }]

  /** ลำดับจองสกิลของช่องนี้ เช่น [1, 3] */
  const queueOf = (slot: number) => skills.map((s, i) => ({ n: i + 1, skill: s.skill, slot: s.slot })).filter((q) => q.slot === slot)
  const lit = Math.min(skills.length, MAX_SKILL_QUEUE)
  const hasExtras = team.extras.some(Boolean)
  const isSm = size === 'sm'

  const slotProps = (r: SlotRef) => ({
    id: `${panelId}|${keyOf(r)}`,
    enabled: dnd,
    filled: !!valueOf(r),
    selected: selected === keyOf(r) || (!!pending && keyOf(pending) === keyOf(r)),
  })

  return (
    <div
      style={style}
      onPointerDown={() => active && hub?.setFocused(panelId)}
      className={`team-panel panel ${variant === 'ally' ? 'panel-gold' : 'panel-enemy'} flex flex-col ${isSm ? 'px-3 pb-3 pt-2.5' : 'px-4 pb-4 pt-3 sm:px-5'} ${
        focused && active ? 'panel-focused' : ''
      } ${className}`}
    >
      {/* header */}
      <div className={`flex items-center gap-2 border-b border-white/10 ${isSm ? 'pb-1.5' : 'pb-2.5'}`}>
        <div className={`min-w-0 flex-1 truncate text-center font-semibold ${isSm ? 'text-sm' : 'text-base sm:text-lg'}`}>{title}</div>
        {editable && onReset && (
          <button
            type="button"
            onClick={() => { onReset(); setSelected(null) }}
            title="ล้างทีม"
            className="absolute -right-3 -top-3 grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-[#1b2032] shadow-lg hover:bg-[#262c44]"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* speed */}
      <div className={`flex justify-end ${isSm ? 'mt-1.5' : 'mt-2.5'}`}>
        <label className={`pill flex items-center gap-1.5 border-gold-deep/60 ${isSm ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-base'}`}>
          <Footprints className={isSm ? 'h-3.5 w-3.5 text-gold' : 'h-5 w-5 text-gold'} />
          {editable && onSpeed ? (
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={team.speed || ''}
              placeholder="0"
              onChange={(e) => onSpeed(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
              className="w-16 bg-transparent text-right font-bold tabular-nums text-gold outline-none placeholder:text-gold/60"
            />
          ) : (
            <span className="min-w-6 text-right font-bold tabular-nums text-gold">{team.speed || 0}</span>
          )}
        </label>
      </div>

      {/* body */}
      {/* จองความสูงไว้ 4 แถวเสมอ (+ป้าย หน้า/หลัง) ทุกค่ายกลจะได้สูงเท่ากัน แล้วจัดกลางแนวตั้ง */}
      <div
        className={`flex flex-1 items-center justify-center ${isSm ? 'mt-2 gap-2' : 'mt-3 gap-2.5 sm:gap-3'}`}
        style={{ minHeight: `calc(var(--s) * 4 + ${ROW_GAP * 3}px${isSm ? '' : ' + 20px'})` }}
      >
        {cols.map((col) => (
          <div
            key={col.key}
            className="flex flex-col items-center"
            // จัดกลางด้วย items-center ของแถว (ไม่ต้องดันลงเอง)
            style={{ gap: ROW_GAP }}
          >
            {col.idx.map((i) => {
              const r: SlotRef = { kind: 'hero', index: i }
              return (
                <DnDSlot key={i} {...slotProps(r)} round={false}>
                  <HeroSlot
                    id={team.slots[i]}
                    editable={active}
                    inspectable={!active && heroNotes !== undefined && !!team.slots[i]}
                    onClick={() => active ? clickSlot(r) : setDetailHero(team.slots[i])}
                    queue={queueOf(i)}
                    side={variant === 'ally' ? 'left' : 'right'}
                  />
                </DnDSlot>
              )
            })}
            {!isSm && <div className="mt-0.5 text-[11px] text-white/45">{col.label}</div>}
          </div>
        ))}

        {/* ขวาสุดแบบในเกม: สัตว์เลี้ยง · ค่ายกล · จองสกิล */}
        <div className="ml-1 flex flex-col items-center" style={{ gap: GAP }}>
          <DnDSlot {...slotProps({ kind: 'pet', index: 0 })} round={false}>
            <button
              type="button"
              disabled={!active}
              onClick={() => clickSlot({ kind: 'pet', index: 0 })}
              className="relative block"
              style={{ width: 'var(--s)', height: 'var(--s)', fontSize: 'calc(var(--s) * 0.22)' }}
              title="สัตว์เลี้ยง"
            >
              {team.pet ? (
                <UnitCard id={team.pet} shape="pet" />
              ) : (
                <div className="slot-empty grid h-full w-full place-items-center">
                  <PawPrint className="absolute h-[55%] w-[55%] text-white/15" />
                  {active && <Plus className="relative h-[45%] w-[45%] text-white drop-shadow" strokeWidth={3} />}
                </div>
              )}
            </button>
          </DnDSlot>

          <button
            type="button"
            disabled={!active || !onFormation}
            onClick={() => setModal('formation')}
            title={formationLabel(team.front)}
            className="orb mt-1.5 grid place-items-center"
            style={{ width: 'var(--s)', height: 'var(--s)' }}
          >
            <FormationStars front={team.front} />
            <span className="absolute -bottom-1.5 rounded-full bg-black/70 px-1.5 text-[10px] leading-4 text-white/85">{formationName(team.front)}</span>
          </button>

          <button
            type="button"
            disabled={!(active && onSkills) && (skills.length === 0 || isSm)}
            onClick={() => setModal('skills')}
            title={skills.length ? `จองสกิล ${skills.length} ครั้ง — กดดู` : 'จองสกิล'}
            className="orb mt-4 grid place-items-center"
            style={{ width: 'var(--s)', height: 'var(--s)' }}
          >
            <QueueStars lit={lit} />
          </button>
        </div>
      </div>

      {/* สัตว์เลี้ยงสำรอง (ใช้แทนได้) */}
      {/* การ์ดเล็ก: ไม่มีสัตว์สำรองก็เว้นที่ไว้ (ซ่อน) ทุกใบจะได้สูงเท่ากัน */}
      {(

        <div className={`flex items-center justify-center gap-1.5 ${isSm ? 'mt-2' : 'mt-3'} ${!active && !hasExtras ? 'invisible' : ''}`} aria-hidden={!active && !hasExtras}>
          <span className="text-[11px] text-white/45">สัตว์เลี้ยงสำรอง</span>
          {Array.from({ length: EXTRA_COUNT }, (_, i) => team.extras[i] ?? null).map((x, i) => (
            <div key={i} style={{ width: isSm ? 28 : 30 }}>
              <DnDSlot {...slotProps({ kind: 'extra', index: i })} round>
                <button
                  type="button"
                  disabled={!active}
                  onClick={() => clickSlot({ kind: 'extra', index: i })}
                  title={x ? getName(x) : `สัตว์เลี้ยงสำรอง ${i + 1}`}
                  className="block aspect-square w-full"
                  style={{ fontSize: isSm ? 8 : 9 }}
                >
                  {x ? (
                    <UnitCard id={x} shape="round" />
                  ) : (
                    <div className="round-slot grid h-full w-full place-items-center">
                      {active && <Plus className="h-[50%] w-[50%] text-white/70" strokeWidth={3} />}
                    </div>
                  )}
                </button>
              </DnDSlot>
            </div>
          ))}
        </div>
      )}


      <div className={isSm ? 'h-1' : 'h-2'} />
      {!active && heroNotes !== undefined && <p className="mt-2 text-center text-[11px] text-white/45">กดตัวละครเพื่อดูสเตตัสและของ</p>}
      {!active && detailHero && heroNotes !== undefined && (
        <HeroDetailModal hero={detailHero} notes={heroNotes} onClose={() => setDetailHero(null)} />
      )}

      {onFormation && <FormationModal open={modal === 'formation'} front={team.front} onSelect={onFormation} onClose={() => setModal(null)} />}
      {(onSkills || skills.length > 0) && (
        <SkillQueueModal open={modal === 'skills'} team={team} skills={skills} onChange={active ? onSkills : undefined} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

/** ห่อช่องให้ลากได้ (ถ้ามีตัว) และรับการวาง (ช่องกลุ่มเดียวกัน หรือการ์ดจากแถบล่าง) */
function DnDSlot({ id, enabled, filled, selected, round, children }: { id: string; enabled: boolean; filled: boolean; selected: boolean; round: boolean; children: ReactNode }) {
  const drag = useDraggable({ id, disabled: !enabled || !filled })
  const drop = useDroppable({ id, disabled: !enabled })
  let canDrop = false
  if (drop.isOver && drop.active) {
    const from = parseDndId(String(drop.active.id))
    const to = parseDndId(id)
    if (!to.roster) {
      canDrop = from.roster
        ? (from.kind === 'hero') === (groupOfKey(to.key) === 'hero')
        : from.panel === to.panel && from.key !== to.key && groupOfKey(from.key) === groupOfKey(to.key)
    }
  }
  return (
    <div
      ref={(el) => { drag.setNodeRef(el); drop.setNodeRef(el) }}
      {...(enabled && filled ? { ...drag.listeners, ...drag.attributes } : {})}
      className={`relative ${round ? 'aspect-square w-full rounded-full' : 'rounded-[12px]'} ${drag.isDragging ? 'opacity-30' : ''} ${
        canDrop ? 'ring-2 ring-gold ring-offset-2 ring-offset-transparent' : ''
      } ${selected ? 'slot-selected' : ''} ${enabled && filled ? 'cursor-grab touch-manipulation' : ''}`}
    >
      {children}
    </div>
  )
}

function HeroSlot({ id, editable, inspectable, onClick, queue, side }: {
  id: string | null
  editable: boolean
  inspectable?: boolean
  onClick: () => void
  /** จองสกิลของช่องนี้: n = ลำดับ, skill = บน(1)/ล่าง(2) */
  queue: { n: number; skill: 1 | 2 }[]
  side: 'left' | 'right'
}) {
  // เลขอยู่ตามตำแหน่งสกิลแบบในเกม: สกิลบน = ป้ายบน, สกิลล่าง = ป้ายล่าง
  const top = queue.filter((q) => q.skill === 1).map((q) => q.n)
  const bottom = queue.filter((q) => q.skill === 2).map((q) => q.n)
  // ป้ายยื่นออกข้างการ์ด · สกิลบน = มุมบน · สกิลล่าง = มุมล่าง (ขยับเข้าในนิดนึง ไม่ให้ชนการ์ดบน/ล่าง)
  const badge = (nums: number[], pos: string, label: string) => (
    <span className={`pointer-events-none absolute ${pos} z-10 flex gap-0.5`} title={`${label} ลำดับ ${nums.join(', ')}`}>
      {nums.map((n) => (
        <span key={n} className="grid h-[18px] w-[18px] place-items-center rounded-full border border-white/90 text-[11px] font-bold leading-none shadow-[0_1px_3px_rgba(0,0,0,.6)]" style={queueStyle(n)}>
          {n}
        </span>
      ))}
    </span>
  )
  return (
    <div className="relative" style={{ width: 'var(--s)', height: 'var(--s)', fontSize: 'calc(var(--s) * 0.22)' }}>
      <button type="button" disabled={!editable && !inspectable} onClick={onClick}
        aria-label={inspectable && id ? `ดูรายละเอียด ${getName(id)}` : undefined}
        className="block h-full w-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">
        {id ? (
          <UnitCard id={id} />
        ) : (
          <div className="slot-empty grid h-full w-full place-items-center">
            {editable && <Plus className="h-[45%] w-[45%] text-white drop-shadow" strokeWidth={3} />}
          </div>
        )}
      </button>
      {/* ป้ายแดงแบบในเกม = ลำดับจองสกิล (บน = สกิลบน, ล่าง = สกิลล่าง) */}
      {id && top.length > 0 && badge(top, `top-0 ${side === 'left' ? '-left-1.5' : '-right-1.5'}`, 'สกิลบน')}
      {id && bottom.length > 0 && badge(bottom, `bottom-0 ${side === 'left' ? '-left-1.5' : '-right-1.5'}`, 'สกิลล่าง')}
    </div>
  )
}

/** ดาว 4 แฉกเว้าลึกแบบในเกม (ใช้ทั้งค่ายกลและจองสกิล) */
const STAR = 'M0-12 C1 -3 3 -1 12 0 C3 1 1 3 0 12 C-1 3 -3 1 -12 0 C-3 -1 -1 -3 0-12Z'

/**
 * ไอคอนค่ายกลแบบในเกม: ดาวแดง = แถวหลัง (ซ้าย), ดาวน้ำเงิน = แถวหน้า (ขวา)
 * เรียงเฉียงขึ้นขวานิด ๆ จำนวนเปลี่ยนตามค่ายกล
 */
function FormationStars({ front }: { front: number }) {
  const back = SLOT_COUNT - front
  const col = (n: number, cx: number, color: string, glow: string) => {
    const gap = n >= 4 ? 13 : n === 3 ? 16 : 18
    const size = n >= 4 ? 0.62 : n === 3 ? 0.72 : 0.82
    const top = 50 - ((n - 1) * gap) / 2
    return Array.from({ length: n }, (_, i) => {
      const y = top + i * gap
      const x = cx + (n > 1 ? (i - (n - 1) / 2) * -2.5 : 0) // เฉียงเล็กน้อย
      return (
        <path
          key={`${cx}-${i}`}
          transform={`translate(${x} ${y}) scale(${size})`}
          d={STAR}
          fill={color}
          stroke="rgba(255,255,255,.55)"
          strokeWidth="0.8"
          style={{ filter: `drop-shadow(0 0 3px ${glow})` }}
        />
      )
    })
  }
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
      <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="1" strokeDasharray="30 6 2 6" />
      {col(back, 36, '#ff5d78', 'rgba(255,80,110,.8)')}
      {col(front, 64, '#6f8fff', 'rgba(100,140,255,.85)')}
    </svg>
  )
}

/** ดาว 3 ดวงแบบในเกม: สว่างตามจำนวนสกิลที่จอง */
function QueueStars({ lit }: { lit: number }) {
  // ตำแหน่งวัดจากภาพในเกม (วงกลม 100x100)
  const pos = [[30, 52], [57, 33], [61, 64]]
  const star = STAR
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
      {/* เส้นวงในบาง ๆ แบบในเกม */}
      <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="1" strokeDasharray="30 6 2 6" />
      {pos.map(([x, y], i) => {
        const on = i < lit
        return (
          <path
            key={i}
            className={on ? 'queue-star' : undefined}
            transform={`translate(${x} ${y})`}
            d={star}
            fill={on ? '#ffd45c' : '#2a2e40'}
            stroke={on ? '#fff6d0' : '#555a70'}
            strokeWidth="1.2"
            style={on ? { filter: 'drop-shadow(0 0 5px rgba(255,205,80,.95))', animationDelay: `${i * 180}ms` } : undefined}
          />
        )
      })}
    </svg>
  )
}
