import { useDraggable, useDroppable } from '@dnd-kit/core'
import { queueStyle } from '../lib/queue'
import { Footprints, PawPrint, Plus, RotateCcw } from 'lucide-react'
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  EXTRA_COUNT, MAX_SKILL_QUEUE, SLOT_COUNT, formationLabel, formationName, nextEmpty, type SkillStep, type SlotRef, type Team,
} from '../lib/types'
import { FormationModal, SkillQueueModal } from './TeamModals'
import { groupOfKey, keyOf, refOf, useDndHub } from './DndHub'
import UnitCard, { UNIT_SLOT_RADIUS } from './UnitCard'
import HeroDetailModal from './HeroDetailModal'
import type { HeroNote } from '../lib/types'
import type { HeroStats } from '../lib/stats'
import { unitLabel } from '../data/heroes'
import { tx, L } from '../lib/i18n'
import { motionOK, useTeamMotion } from '../lib/teamMotion'

const getName = (id: string) => unitLabel(id)

export type SlotKind = SlotRef['kind']

type Props = {
  team: Team
  variant: 'ally' | 'enemy'
  title?: ReactNode
  /** ชื่อสั้น ๆ ของทีมนี้ (โชว์ในแถบอัศวินว่ากำลังใส่ทีมไหน) */
  label?: string
  size?: 'md' | 'sm'
  editable?: boolean
  heroNotes?: HeroNote[]
  /** ดูอย่างเดียวแต่มีสิทธิ์แก้: อัปโหลดรูปค่าความสามารถจากหน้ารายละเอียดแล้วบันทึกเลย */
  onSaveHeroStats?: (hero: string, stats: HeroStats) => Promise<void>
  /** กดช่องว่าง → เปิดหน้าเลือก */
  onSlotClick?: (kind: SlotKind, index: number) => void
  onReset?: () => void
  onFormation?: (front: number) => void
  onSpeed?: (speed: number) => void
  /** ลำดับการใช้สกิล */
  skills?: SkillStep[]
  /** ถ้าส่งมา = แก้ลำดับสกิลได้ (กดวงกลมดาวล่างสุด) */
  onSkills?: (s: SkillStep[]) => void
  /** เปลี่ยนค่า (มากกว่า 0) = เปิดหน้าต่างลำดับการใช้สกิลให้เลย (เช่น กด "กลับไปตั้งลำดับการใช้สกิล") */
  skillsReq?: number
  /** สลับตำแหน่งในทีม */
  onMove?: (from: SlotRef, to: SlotRef) => void
  /** ใส่อัศวินลงช่อง (null = เอาออก) */
  onPlace?: (ref: SlotRef, unit: string | null) => void
  /** ตัวที่ใช้ในไม้อื่นแล้ว (ชื่อฐาน → ป้าย) */
  blocked?: Record<string, string>
  className?: string
}

const GAP = 8
/** ระยะห่างการ์ดอัศวินบน-ล่าง */
const ROW_GAP = GAP

export default function TeamPanel({
  team, variant, title, label, size = 'md', editable, onSlotClick, onReset, onFormation, onSpeed,
  skills = [], onSkills, onMove, onPlace, blocked, heroNotes, onSaveHeroStats, className = '', skillsReq = 0,
}: Props) {
  const hub = useDndHub()
  const panelId = useId().replace(/[:|]/g, '')
  const active = !!editable
  const [detailHero, setDetailHero] = useState<string | null>(null)
  const [modal, setModal] = useState<'formation' | 'skills' | null>(null)
  useEffect(() => { if (skillsReq) setModal('skills') }, [skillsReq])
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
  // ตำแหน่งเปลี่ยน (เปลี่ยนรูปแบบ/ลากย้าย) → ยกเลิกการเลือก
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
  // ทุกทีมจะลงทะเบียนใหม่ แล้วโฟกัสเด้งไปทีมแรกของหน้า → กดอัศวินแล้วไปเข้าทีมอื่น
  const register = hub?.register
  useEffect(() => {
    if (!register || !active) return
    const units = () => {
      const t = latest.current.team
      return [...t.slots, t.pet, ...t.extras].filter(Boolean) as string[]
    }
    return register(panelId, {
      label: () => latest.current.label ?? tx('ทีมนี้'),
      valueOf: (r) => {
        const t = latest.current.team
        return r.kind === 'hero' ? t.slots[r.index] ?? null : r.kind === 'pet' ? t.pet : t.extras[r.index] ?? null
      },
      used: units,
      onMove: (a, b) => latest.current.onMove?.(a, b),
      onDropUnit: (r, u) => latest.current.onPlace?.(r, u),
      // กดที่อื่น (นอกแถบอัศวิน/ช่อง): ยกเลิกช่องที่เลือกไว้ก่อน — คืน true ถ้ามีให้ยกเลิก
      clearSelection: () => {
        const had = !!selectedRef.current || !!pendingRef.current
        setSelected(null)
        setPending(null)
        return had
      },
      group: variant,
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

  // ดับเบิลคลิกช่องว่าง (ภายใน 400ms) = เปิดตารางอัศวินหน้าใหญ่
  const lastClick = useRef<{ k: string; t: number } | null>(null)
  function clickSlot(r: SlotRef) {
    if (!active) return
    hub?.setFocused(panelId)
    const now = Date.now()
    const dbl = !!hub && !valueOf(r) && lastClick.current?.k === keyOf(r) && now - lastClick.current.t < 400
    lastClick.current = { k: keyOf(r), t: now }
    if (dbl) {
      hub.setDockTab(r.kind === 'hero' ? 'hero' : 'pet')
      hub.setDockOpen(true)
      setSelected(null)
      setPending(r)
      hub.openGrid()
      lastClick.current = null
      return
    }
    // แตะช่องไหนก็ตาม = เปิดแถบอัศวินด้านล่าง (แท็บตามชนิดช่อง)
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
    ? [{ key: 'back', label: tx('หลัง'), idx: backIdx }, { key: 'front', label: tx('หน้า'), idx: frontIdx }]
    : [{ key: 'front', label: tx('หน้า'), idx: frontIdx }, { key: 'back', label: tx('หลัง'), idx: backIdx }]

  /** ลำดับการใช้สกิลของช่องนี้ เช่น [1, 3] */
  const queueOf = (slot: number) => skills.map((s, i) => ({ n: i + 1, skill: s.skill, slot: s.slot })).filter((q) => q.slot === slot)
  const lit = Math.min(skills.length, MAX_SKILL_QUEUE)
  // แอนิเมชันตอนแก้ทีม: ใส่ตัว = เด้งเข้า · ย้าย/สลับ/เปลี่ยนรูปแบบ = เลื่อนไปที่ใหม่ · ตั้งลำดับสกิล = ป้ายเด้ง
  const rootRef = useRef<HTMLDivElement>(null)
  useTeamMotion(rootRef, `${team.front}|${team.slots.join(',')}|${team.pet}|${team.extras.join(',')}|${skills.map((q) => `${q.slot}.${q.skill}`).join(',')}`, active)
  // เพิ่งกดแก้ (การ์ดเดิมกลายเป็นแก้ได้): การ์ดเด้งรับนิด ๆ + ขอบทองวาบ ให้รู้ว่าแก้ตรงนี้
  const wasActive = useRef(active)
  useEffect(() => {
    if (active && !wasActive.current && motionOK()) {
      const el = rootRef.current
      if (el) {
        const base = getComputedStyle(el).boxShadow
        const keep = base && base !== 'none' ? `${base}, ` : ''
        el.animate(
          [{ transform: 'scale(.97)', boxShadow: `${keep}0 0 0 0 #f4d58d00, 0 0 0 0 #f4d58d00` }, { transform: 'scale(1.01)', boxShadow: `${keep}0 0 0 3px #f4d58d99, 0 0 24px 2px #f4d58d44`, offset: 0.45 }, { transform: 'none', boxShadow: `${keep}0 0 0 0 #f4d58d00, 0 0 0 0 #f4d58d00` }],
          { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' },
        )
      }
    }
    wasActive.current = active
  }, [active])
  const hasExtras = team.extras.some(Boolean)
  const isSm = size === 'sm'

  const slotProps = (r: SlotRef) => ({
    id: `${panelId}|${keyOf(r)}`,
    enabled: dnd,
    filled: !!valueOf(r),
    selected: selected === keyOf(r) || (!!pending && keyOf(pending) === keyOf(r)),
    kind: r.kind,
  })

  return (
    <div
      ref={rootRef}
      style={style}
      data-tour-editing={active ? '' : undefined}
      onPointerDown={() => active && hub?.setFocused(panelId)}
      className={`team-panel panel ${variant === 'ally' ? 'panel-gold' : 'panel-enemy'} flex flex-col ${isSm ? 'px-3 pb-3 pt-2.5' : 'px-4 pb-4 pt-3 sm:px-5'} ${
        focused && active ? 'panel-focused' : ''
      } ${className}`}
    >
      {/* header */}
      {/* ไม่มี title = ไม่มีแถบหัว (หน้าที่วางชื่อไว้นอกการ์ด) เหลือแค่ปุ่มล้างทีม */}
      <div className={`flex items-center gap-2 ${title ? `border-b border-white/10 ${isSm ? 'pb-1.5' : 'pb-2.5'}` : ''}`}>
        {title && <div className={`min-w-0 flex-1 truncate text-center font-semibold ${isSm ? 'text-sm' : 'text-base sm:text-lg'}`}>{title}</div>}
        {editable && onReset && (
          <button
            type="button"
            onClick={() => { onReset(); setSelected(null) }}
            title={tx('ล้างทีม')}
            className="absolute -right-3 -top-3 grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-[var(--surface-3)] shadow-lg hover:bg-[var(--surface-2)]"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* speed */}
      <div data-noexport={!team.speed && !editable ? '' : undefined} className={`flex justify-end ${isSm ? 'mt-1.5' : 'mt-2.5'}`}>
        <label data-tour="team-speed" className={`pill flex items-center gap-1.5 border-gold-deep/60 ${isSm ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-base'}`}>
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
      {/* จองความสูงไว้ 4 แถวเสมอ (+ป้าย หน้า/หลัง) ทุกรูปแบบจะได้สูงเท่ากัน แล้วจัดกลางแนวตั้ง */}
      <div
        data-tour="team-body"
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
                    slotIndex={i}
                    side="left" // ป้ายลำดับสกิลอยู่ซ้ายเสมอ ทั้งทีมเราและทีมศัตรู
                    small={isSm}
                  />
                </DnDSlot>
              )
            })}
            {!isSm && <div className="mt-0.5 text-[11px] text-white/45">{col.label}</div>}
          </div>
        ))}

        {/* ขวาสุดแบบในเกม: สัตว์เลี้ยง · รูปแบบ · ตั้งลำดับการใช้สกิล */}
        <div className="ml-1 flex flex-col items-center" style={{ gap: GAP }}>
          <DnDSlot {...slotProps({ kind: 'pet', index: 0 })} round={false}>
            <button
              type="button"
              disabled={!active}
              onClick={() => clickSlot({ kind: 'pet', index: 0 })}
              data-tour="team-pet"
              className="relative block"
              style={{ width: 'var(--s)', height: 'var(--s)', fontSize: 'calc(var(--s) * 0.22)' }}
              title={tx('สัตว์เลี้ยง')}
            >
              {team.pet ? (
                <span data-mp={`hero:pet:${team.pet}`} className="block h-full w-full"><UnitCard id={team.pet} shape="pet" small={isSm} sizes={isSm ? undefined : MD_PET_SIZES} /></span>
              ) : (
                <div data-mp="empty:pet" className="slot-empty grid h-full w-full place-items-center" style={{ borderRadius: UNIT_SLOT_RADIUS }}>
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
            data-tour="team-formation"
            title={formationLabel(team.front)}
            className="orb mt-1.5 grid place-items-center"
            style={{ width: 'var(--s)', height: 'var(--s)' }}
          >
            <span data-mp={`orb:f${team.front}`} className="absolute inset-0"><FormationStars front={team.front} /></span>
            <span className="absolute -bottom-1.5 rounded-full bg-black/70 px-1.5 text-[10px] leading-4 text-white/85">{formationName(team.front)}</span>
          </button>

          <button
            type="button"
            disabled={!(active && onSkills) && (skills.length === 0 || isSm)}
            onClick={() => setModal('skills')}
            data-tour="team-skills"
            title={skills.length ? L(`ตั้งลำดับการใช้สกิล ${skills.length} ครั้ง — กดดู`, `Skill queue set ${skills.length} times — tap to view`) : tx('ตั้งลำดับการใช้สกิล')}
            className="orb mt-4 grid place-items-center"
            style={{ width: 'var(--s)', height: 'var(--s)' }}
          >
            <span data-mp={`orb:q${lit}`} className="absolute inset-0"><QueueStars lit={lit} /></span>
          </button>
        </div>
      </div>

      {/* สัตว์เลี้ยงสำรอง (ใช้แทนได้) */}
      {/* การ์ดเล็ก: ไม่มีสัตว์สำรองก็เว้นที่ไว้ (ซ่อน) ทุกใบจะได้สูงเท่ากัน */}
      {(

        <div className={`flex items-center justify-center gap-1.5 ${isSm ? 'mt-2' : 'mt-3'} ${!active && !hasExtras ? 'invisible' : ''}`} aria-hidden={!active && !hasExtras}>
          <span className="text-[11px] text-white/45">{tx('สัตว์เลี้ยงสำรอง')}</span>
          {Array.from({ length: EXTRA_COUNT }, (_, i) => team.extras[i] ?? null).map((x, i) => (
            <div key={i} style={{ width: isSm ? 28 : 30 }}>
              <DnDSlot {...slotProps({ kind: 'extra', index: i })} round>
                <button
                  type="button"
                  disabled={!active}
                  onClick={() => clickSlot({ kind: 'extra', index: i })}
                  title={x ? getName(x) : L(`สัตว์เลี้ยงสำรอง ${i + 1}`, `Backup pet ${i + 1}`)}
                  className="block aspect-square w-full"
                  style={{ fontSize: isSm ? 8 : 9 }}
                >
                  {x ? (
                    <span data-mp={`hero:x${i}:${x}`} className="block h-full w-full"><UnitCard id={x} shape="round" small /></span>
                  ) : (
                    <div data-mp={`empty:x${i}`} className="round-slot grid h-full w-full place-items-center">
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
      {!active && heroNotes !== undefined && <p data-noexport className="mt-2 text-center text-[11px] text-white/45">{tx('กดอัศวินเพื่อดูค่าความสามารถและอุปกรณ์')}</p>}
      {!active && detailHero && heroNotes !== undefined && (
        <HeroDetailModal hero={detailHero} notes={heroNotes} onClose={() => setDetailHero(null)} onSaveStats={onSaveHeroStats} />
      )}

      {onFormation && <FormationModal open={modal === 'formation'} front={team.front} onSelect={onFormation} onClose={() => setModal(null)} />}
      {(onSkills || skills.length > 0) && (
        <SkillQueueModal open={modal === 'skills'} team={team} skills={skills} onChange={active ? onSkills : undefined} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

/** ห่อช่องให้ลากได้ (ถ้ามีตัว) และรับการวาง (ช่องกลุ่มเดียวกัน หรือการ์ดจากแถบล่าง) */
function DnDSlot({ id, enabled, filled, selected, round, kind, children }: { id: string; enabled: boolean; filled: boolean; selected: boolean; round: boolean; kind: SlotKind; children: ReactNode }) {
  const drag = useDraggable({ id, disabled: !enabled || !filled })
  const drop = useDroppable({ id, disabled: !enabled })
  const hub = useDndHub()
  // วงทอง = ปล่อยตรงนี้แล้วเกิดผลจริง (กติกาเดียวกับตอนปล่อยใน DndHub เช่น ทีมครบ 3 ตัวแล้ววางช่องว่างไม่ได้)
  const canDrop = !!(drop.isOver && drop.active && hub?.canDrop(String(drop.active.id), id))
  return (
    <div data-slot={kind} data-empty={filled ? undefined : ''}
      ref={(el) => { drag.setNodeRef(el); drop.setNodeRef(el) }}
      {...(enabled && filled ? { ...drag.listeners, ...drag.attributes } : {})}
      style={!round ? { borderRadius: UNIT_SLOT_RADIUS } : undefined}
      className={`relative ${round ? 'aspect-square w-full rounded-full' : ''} ${drag.isDragging ? 'opacity-30' : ''} ${
        canDrop ? 'ring-2 ring-gold ring-offset-2 ring-offset-transparent' : ''
      } ${selected ? 'slot-selected' : ''} ${enabled && filled ? 'cursor-grab touch-manipulation' : ''}`}
    >
      {children}
    </div>
  )
}

// ทีมขนาดกลาง (md): ช่อง clamp(58px, 17vw, 84px) · รูปอัศวินขยาย 1.6 เท่าในช่อง → บอกขนาดจริงให้เบราว์เซอร์เลือกรูปเอง
// จอคอม/จอธรรมดาได้รูปย่อ 256px (คมพอ ไฟล์เล็กกว่าครึ่ง) · มือถือจอคมมากได้รูปเต็ม 512px เหมือนเดิม
const MD_HERO_SIZES = '(min-width: 495px) 135px, 27vw'
const MD_PET_SIZES = '(min-width: 495px) 84px, 17vw'

function HeroSlot({ id, editable, inspectable, onClick, queue, side, small, slotIndex }: {
  id: string | null
  /** ลำดับช่อง (คีย์แอนิเมชันของช่องว่าง) */
  slotIndex?: number
  editable: boolean
  inspectable?: boolean
  onClick: () => void
  /** ตั้งลำดับการใช้สกิลของช่องนี้: n = ลำดับ, skill = บน(1)/ล่าง(2) */
  queue: { n: number; skill: 1 | 2 | 3 }[]
  side: 'left' | 'right'
  /** การ์ดเล็ก → รูปย่อ */
  small?: boolean
}) {
  // เลขอยู่ตามตำแหน่งสกิลแบบในเกม: สกิลบน = ป้ายบน, สกิลล่าง = ป้ายล่าง
  const top = queue.filter((q) => q.skill === 1).map((q) => q.n)
  const bottom = queue.filter((q) => q.skill === 2).map((q) => q.n)
  const awake = queue.filter((q) => q.skill === 3).map((q) => q.n)
  // ป้ายยื่นออกข้างการ์ด · สกิลบน = มุมบน · สกิลล่าง = มุมล่าง (ขยับเข้าในนิดนึง ไม่ให้ชนการ์ดบน/ล่าง)
  const badge = (nums: number[], pos: string, label: string) => (
    <span className={`pointer-events-none absolute ${pos} z-10 flex gap-0.5`} title={L(`${label} ลำดับ ${nums.join(', ')}`, `${label} order ${nums.join(', ')}`)}>
      {nums.map((n) => (
        <span key={n} data-mp={`badge:${id}:${label}:${n}`} className="grid h-[18px] w-[18px] place-items-center rounded-full border border-white/90 text-[11px] font-bold leading-none shadow-[0_1px_3px_rgba(0,0,0,.6)]" style={queueStyle(n)}>
          {n}
        </span>
      ))}
    </span>
  )
  return (
    <div className="relative" data-m={id ? `h:${id}` : undefined} style={{ width: 'var(--s)', height: 'var(--s)', fontSize: 'calc(var(--s) * 0.22)' }}>
      <button type="button" disabled={!editable && !inspectable} onClick={onClick}
        aria-label={inspectable && id ? L(`ดูรายละเอียด ${getName(id)}`, `View details of ${getName(id)}`) : undefined}
        style={{ borderRadius: UNIT_SLOT_RADIUS }}
        className="block h-full w-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">
        {id ? (
          <UnitCard id={id} small={small} sizes={small ? undefined : MD_HERO_SIZES} />
        ) : (
          <div data-mp={`empty:${slotIndex}`} className="slot-empty grid h-full w-full place-items-center" style={{ borderRadius: UNIT_SLOT_RADIUS }}>
            {editable && <Plus className="h-[45%] w-[45%] text-white drop-shadow" strokeWidth={3} />}
          </div>
        )}
      </button>
      {/* ป้ายแดงแบบในเกม = ลำดับการใช้สกิล (บน = สกิลบน, ล่าง = สกิลล่าง) */}
      {id && top.length > 0 && badge(top, `top-0 ${side === 'left' ? '-left-1.5' : '-right-1.5'}`, tx('สกิลบน'))}
      {id && awake.length > 0 && badge(awake, `top-1/2 -translate-y-1/2 ${side === 'left' ? '-left-1.5' : '-right-1.5'}`, tx('สกิลอเวค'))}
      {id && bottom.length > 0 && badge(bottom, `bottom-0 ${side === 'left' ? '-left-1.5' : '-right-1.5'}`, tx('สกิลล่าง'))}
    </div>
  )
}

/** ดาว 4 แฉกเว้าลึกแบบในเกม (ใช้ทั้งรูปแบบและตั้งลำดับการใช้สกิล) */
const STAR = 'M0-12 C1 -3 3 -1 12 0 C3 1 1 3 0 12 C-1 3 -3 1 -12 0 C-3 -1 -1 -3 0-12Z'

/**
 * ไอคอนรูปแบบแบบในเกม: ดาวแดง = แถวหลัง (ซ้าย), ดาวน้ำเงิน = แถวหน้า (ขวา)
 * เรียงเฉียงขึ้นขวานิด ๆ จำนวนเปลี่ยนตามรูปแบบ
 */
export function FormationStars({ front }: { front: number }) {
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

/** ดาว 3 ดวงแบบในเกม: สว่างตามจำนวนสกิลที่ตั้งลำดับไว้ · still = ไม่กระพริบ (การ์ดในรายการยาว) */
export function QueueStars({ lit, still = false }: { lit: number; still?: boolean }) {
  // ตำแหน่งวัดจากภาพในเกม (วงกลม 100x100)
  const pos = [[30, 52], [57, 33], [61, 64]]
  const star = (i: number) => {
    const on = i < lit
    return (
      <path
        key={i}
        transform={`translate(${pos[i][0]} ${pos[i][1]})`}
        d={STAR}
        fill={on ? '#ffd45c' : 'var(--queue-off)'}
        stroke={on ? '#fff6d0' : 'var(--queue-off-line)'}
        strokeWidth="1.2"
        style={on ? { filter: 'drop-shadow(0 0 5px rgba(255,205,80,.95))' } : undefined}
      />
    )
  }
  const twinkle = !still && lit > 0
  return (
    <>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        {/* เส้นวงในบาง ๆ แบบในเกม */}
        <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="1" strokeDasharray="30 6 2 6" />
        {pos.map((_, i) => (!twinkle || i >= lit) && star(i))}
      </svg>
      {/* ดาวที่สว่างกระพริบตอนโผล่: แยกเป็น svg ดวงละอัน แล้วให้ svg ชั้นนอกจางเข้าออก (การ์ดจอทำให้)
          — ถ้าทำกับดาวข้างใน svg เบราว์เซอร์ต้องวาดใหม่ทุกเฟรม */}
      {twinkle && pos.map((_, i) => i < lit && (
        <svg key={i} viewBox="0 0 100 100" className="queue-star pointer-events-none absolute inset-0 h-full w-full" style={{ animationDelay: `${i * 180}ms` }}>
          {star(i)}
        </svg>
      ))}
    </>
  )
}
