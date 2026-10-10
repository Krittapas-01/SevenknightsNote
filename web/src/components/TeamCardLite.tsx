import { Footprints, PawPrint } from 'lucide-react'
import { memo, type CSSProperties, type ReactNode } from 'react'
import { queueStyle } from '../lib/queue'
import { EXTRA_COUNT, MAX_SKILL_QUEUE, SLOT_COUNT, formationLabel, formationName, type SkillStep, type Team } from '../lib/types'
import { FormationStars, QueueStars } from './TeamPanel'
import UnitCard, { UNIT_SLOT_RADIUS } from './UnitCard'
import { tx, L } from '../lib/i18n'

/**
 * การ์ดบ้านศัตรูแบบดูอย่างเดียว (หน้ากิลด์) — หน้าตาเหมือน TeamPanel size="sm" ทุกอย่าง
 * แต่ไม่มีลากวาง/state/modal → เบาเครื่องตอนมีหลายสิบทีม
 */
const ROW_GAP = 8
const S = 'clamp(54px, 15vw, 68px)'
/** ขนาดมาตรฐานของการ์ดทีมแบบดูอย่างเดียว (ใช้ทุกที่ ให้การ์ดหน้าตา/สูงเท่ากันหมด) */
export const CARD_UNIT = S
export const CARD_EXTRA = 205
export const CARD_HEIGHT = `calc(${S} * 3 + ${CARD_EXTRA}px)`

type Props = {
  team: Team; skills?: SkillStep[]; title?: ReactNode; className?: string
  /** ally = กรอบทอง (ทีมเรา) · ค่าเริ่มต้น enemy */
  variant?: 'ally' | 'enemy'
  /** ขนาดช่องอัศวิน (CSS) เช่น 'min(60px, 25cqw)' ตอนวางในตารางแคบ */
  unit?: string
  /** ล็อกความสูงการ์ด = ช่อง 3 แถว + ส่วนอื่น (px) — ค่าเริ่มต้น = มาตรฐาน (สูงเท่ากันทุกใบ ไม่ว่ารูปแบบแบบไหน) */
  fixedExtra?: number
  /** ไม่ล็อกความสูง (ยืดตามที่วาง) */
  fluid?: boolean
}

function TeamCardLite({ team, skills = [], title, className = '', variant = 'enemy', unit, fixedExtra = CARD_EXTRA, fluid = false }: Props) {
  const frontIdx = Array.from({ length: team.front }, (_, i) => i)
  const backIdx = Array.from({ length: SLOT_COUNT - team.front }, (_, i) => team.front + i)
  const lit = Math.min(skills.length, MAX_SKILL_QUEUE)
  const hasExtras = team.extras.some(Boolean)

  return (
    <div style={{ '--s': unit ?? S, ...(!fluid ? { height: `calc(var(--s) * 3 + ${fixedExtra}px)`, flex: '0 0 auto' } : {}) } as CSSProperties} className={`team-panel panel ${variant === 'ally' ? 'panel-gold' : 'panel-enemy'} flex flex-col px-3 pb-3 pt-2.5 ${className}`}>
      <div className="flex items-center gap-2 border-b border-white/10 pb-1.5">
        <div className="min-w-0 flex-1 truncate text-center text-sm font-semibold">{title}</div>
      </div>

      <div className="mt-1 flex justify-end">
        <span className="pill flex items-center gap-1.5 border-gold-deep/60 px-2 py-0.5 text-xs">
          <Footprints className="h-3.5 w-3.5 text-gold" />
          <span className="min-w-6 text-right font-bold tabular-nums text-gold">{team.speed || 0}</span>
        </span>
      </div>

      {/* จองความสูงเท่าแถวขวา (สัตว์เลี้ยง + 2 วง) — รูปแบบ 4 ช่องแถวเดียวจะสูงขึ้นเอง และการ์ดในแถวเดียวกันยืดให้เท่ากัน */}
      <div className="mt-1 flex flex-1 items-center justify-center gap-2" style={{ minHeight: `calc(var(--s) * 3 + ${ROW_GAP * 2 + 22}px)` }}>
        {/* ฝั่งเรา: [หลัง][หน้า] (หน้าอยู่ติดคอลัมน์สัตว์เลี้ยง เหมือน TeamPanel/ในเกม) · ฝั่งศัตรู: [หน้า][หลัง] */}
        {(variant === 'ally' ? [backIdx, frontIdx] : [frontIdx, backIdx]).map((idx, c) => (
          <div key={c} className="flex flex-col items-center" style={{ gap: ROW_GAP }}>
            {idx.map((i) => <Hero key={i} id={team.slots[i]} skills={skills} slot={i} />)}
          </div>
        ))}

        <div className="ml-1 flex flex-col items-center" style={{ gap: ROW_GAP }}>
          <div className="relative" style={{ width: 'var(--s)', height: 'var(--s)', fontSize: 'calc(var(--s) * 0.22)', borderRadius: UNIT_SLOT_RADIUS }} title={tx('สัตว์เลี้ยง')}>
            {team.pet ? (
              <UnitCard id={team.pet} shape="pet" small />
            ) : (
              <div className="slot-empty grid h-full w-full place-items-center" style={{ borderRadius: UNIT_SLOT_RADIUS }}>
                <PawPrint className="absolute h-[55%] w-[55%] text-white/15" />
              </div>
            )}
          </div>
          <div title={formationLabel(team.front)} className="orb relative mt-1.5 grid place-items-center" style={{ width: 'var(--s)', height: 'var(--s)' }}>
            <FormationStars front={team.front} />
            <span className="absolute -bottom-1.5 rounded-full bg-black/70 px-1.5 text-[10px] leading-4 text-white/85">{formationName(team.front)}</span>
          </div>
          <div title={skills.length ? L(`ตั้งลำดับการใช้สกิล ${skills.length} ครั้ง`, `Skill queue set ${skills.length} times`) : tx('ตั้งลำดับการใช้สกิล')} className="orb relative mt-4 grid place-items-center" style={{ width: 'var(--s)', height: 'var(--s)' }}>
            <QueueStars lit={lit} />
          </div>
        </div>
      </div>

      <div className={`mt-2 flex items-center justify-center gap-1.5 ${hasExtras ? '' : 'invisible'}`} aria-hidden={!hasExtras}>
        <span className="text-[11px] text-white/45">{tx('สัตว์เลี้ยงสำรอง')}</span>
        {Array.from({ length: EXTRA_COUNT }, (_, i) => team.extras[i] ?? null).map((x, i) => (
          <div key={i} className="aspect-square" style={{ width: 28, fontSize: 8 }}>
            {x ? <UnitCard id={x} shape="round" small /> : <div className="round-slot h-full w-full" />}
          </div>
        ))}
      </div>
      <div className="h-1" />
    </div>
  )
}

function Hero({ id, skills, slot }: { id: string | null; skills: SkillStep[]; slot: number }) {
  const q = skills.map((s, i) => ({ n: i + 1, skill: s.skill, slot: s.slot })).filter((x) => x.slot === slot)
  const badge = (skill: 1 | 2 | 3, pos: string) => {
    const nums = q.filter((x) => x.skill === skill).map((x) => x.n)
    if (!nums.length) return null
    return (
      <span className={`pointer-events-none absolute ${pos} -right-1.5 z-10 flex gap-0.5`}>
        {nums.map((n) => (
          <span key={n} className="grid h-[18px] w-[18px] place-items-center rounded-full border border-white/90 text-[11px] font-bold leading-none shadow-[0_1px_3px_rgba(0,0,0,.6)]" style={queueStyle(n)}>{n}</span>
        ))}
      </span>
    )
  }
  return (
    <div className="relative" style={{ width: 'var(--s)', height: 'var(--s)', fontSize: 'calc(var(--s) * 0.22)', borderRadius: UNIT_SLOT_RADIUS }}>
      {id ? <UnitCard id={id} small /> : <div className="slot-empty h-full w-full" style={{ borderRadius: UNIT_SLOT_RADIUS }} />}
      {id && badge(1, 'top-0')}
      {id && badge(3, 'top-1/2 -translate-y-1/2')}
      {id && badge(2, 'bottom-0')}
    </div>
  )
}

export default memo(TeamCardLite)
