import { RotateCcw } from 'lucide-react'
import { useId } from 'react'
import { queueStyle } from '../lib/queue'
import { FORMATIONS, MAX_SKILL_QUEUE, SKILL_LABEL, SLOT_COUNT, type SkillKey, type SkillStep, type Team } from '../lib/types'
import { baseName, getUnit } from '../data/heroes'
import { getSkillArt, skillKeysOf } from '../data/skills'
import Modal from './Modal'
import UnitCard from './UnitCard'

/**
 * รูปค่ายกลแบบในเกม: แถวหลัง = หมากแดง, แถวหน้า = โล่น้ำเงิน
 * เรียงเฉียงขึ้นขวา ตัวเลข = ลำดับตำแหน่ง
 */
export function FormationDiagram({ front }: { front: number }) {
  const back = SLOT_COUNT - front
  const row = (n: number, start: number, x0: number, y0: number, kind: 'back' | 'front') =>
    Array.from({ length: n }, (_, i) => {
      const x = x0 + i * 13
      const y = y0 - i * 9
      return kind === 'front' ? (
        <g key={`f${i}`} transform={`translate(${x} ${y})`}>
          <path d="M0-13 L11-8 L10 4 Q6 11 0 14 Q-6 11 -10 4 L-11-8Z" fill="url(#gBlue)" stroke="#dfe6ff" strokeWidth="1.2" />
          <text y="4" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff">{start + i}</text>
        </g>
      ) : (
        <g key={`b${i}`} transform={`translate(${x} ${y})`}>
          <ellipse cx="0" cy="9" rx="9" ry="3.5" fill="#9b2c43" />
          <circle cx="0" cy="-1" r="9.5" fill="url(#gRed)" stroke="#ffe0e6" strokeWidth="1.2" />
          <text y="3.5" textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff">{start + i}</text>
        </g>
      )
    })
  // หมากหลังวางด้านซ้ายบน โล่หน้าวางขวาล่าง (ซ้อนหน้า)
  return (
    <svg viewBox="0 0 150 90" className="mx-auto h-24 w-full max-w-[210px]">
      <defs>
        <linearGradient id="gBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8fb0ff" /><stop offset="1" stopColor="#3453c9" /></linearGradient>
        <linearGradient id="gRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff8a9a" /><stop offset="1" stopColor="#c02a48" /></linearGradient>
      </defs>
      {row(back, front + 1, 22, 70 - (5 - back) * 4, 'back')}
      {row(front, 1, 22 + back * 13 + 6, 74 - back * 3, 'front')}
    </svg>
  )
}

export function FormationModal({ open, front, onSelect, onClose }: { open: boolean; front: number; onSelect: (f: number) => void; onClose: () => void }) {
  return (
    <Modal open={open} title="ค่ายกล (Formation)" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        {FORMATIONS.map((f) => (
          <button
            key={f.front}
            onClick={() => { onSelect(f.front); onClose() }}
            className={`rounded-2xl border-2 p-2 text-center transition ${
              f.front === front ? 'border-gold bg-gold/15 shadow-[0_0_18px_rgba(244,213,141,.45)]' : 'border-white/15 bg-black/20 hover:border-white/40'
            }`}
          >
            <FormationDiagram front={f.front} />
            <div className="font-semibold">{f.front === front && '✓ '}ค่าย{f.name}</div>
            <div className="text-xs text-white/55">{f.en} · หน้า {f.front} หลัง {SLOT_COUNT - f.front}</div>
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-white/45"><span className="text-[#7fa8ff]">โล่น้ำเงิน</span> = แถวหน้า · <span className="text-[#f47c8a]">หมากแดง</span> = แถวหลัง</p>
    </Modal>
  )
}

/** จองสกิล: กดสกิลตามลำดับที่ต้องการ (กดซ้ำ = ยกเลิก) สูงสุด MAX_SKILL_QUEUE */
/* ---------- กรอบหน้าจองสกิล (วัดจากภาพในเกม แล้วย่อสเกลให้รูปฮีโร่รัศมี 54) ----------
 * พิกัดอิงจุดกลางรูปฮีโร่ = (0,0) · องศาเริ่มที่ 12 นาฬิกา หมุนตามเข็ม
 * เก็บเฉพาะวงนอกที่เว้นช่วงและเครื่องประดับปลายเส้น
 */
type Pt = readonly [number, number]
const at = (c: Pt, r: number, deg: number): Pt => {
  const a = ((deg - 90) * Math.PI) / 180
  return [+(c[0] + r * Math.cos(a)).toFixed(2), +(c[1] + r * Math.sin(a)).toFixed(2)]
}
const arcPath = (c: Pt, r: number, a0: number, a1: number) => {
  const [x0, y0] = at(c, r, a0)
  const [x1, y1] = at(c, r, a1)
  const sweep = (a1 - a0 + 360) % 360
  return `M${x0} ${y0}A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${x1} ${y1}`
}
const C1: Pt = [8.6, -7.6] // ศูนย์ของวงนอก
/** [ศูนย์, รัศมี, องศาเริ่ม, องศาจบ, จุดวงกลมที่ปลายไหน] */
const FRAME_ARCS: [Pt, number, number, number, ('start' | 'end')[]][] = [
  [C1, 72.7, 258, 1.6, ['end']], //  วงนอกซ้าย→บน
  [C1, 72.7, 15, 60, ['start']], //  วงนอกต่อทางขวา (ลอดใต้ไอคอน)
  [C1, 72.7, 208, 242, ['start', 'end']], // เส้นล่างซ้ายอยู่บนวงเดียวกัน
  [C1, 72.7, 148, 202, []], //       วงนอกด้านล่าง
]
const FRAME_LINES: [Pt, Pt][] = [[[33.3, 56], [50, 72.2]], [[60.6, 53], [73.7, 65.1]]]
const FRAME_DOTS: [number, number, number][] = [[73.7, 65.1, 3], [80.2, 71.7, 1.5], [54, 76.7, 1.3]]

function SkillFrame({ gid }: { gid: string }) {
  return (
    <svg aria-hidden="true" viewBox="-66 -82 170 164" className="pointer-events-none absolute inset-0 h-full w-full" fill="none" strokeLinecap="round">
      <defs>
        <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1="0" y1="-80" x2="-20" y2="80">
          <stop offset="0" stopColor="#dcc38f" /><stop offset=".55" stopColor="#bba98a" /><stop offset="1" stopColor="#9d8b98" />
        </linearGradient>
      </defs>
      <g stroke={`url(#${gid})`} strokeWidth="1.3">
        {FRAME_ARCS.map(([c, r, a0, a1], i) => <path key={i} d={arcPath(c, r, a0, a1)} />)}
        {FRAME_LINES.map(([p, q], i) => <path key={i} d={`M${p[0]} ${p[1]}L${q[0]} ${q[1]}`} />)}
      </g>
      <g fill="#1d2436" stroke={`url(#${gid})`} strokeWidth="1.2">
        {FRAME_ARCS.flatMap(([c, r, a0, a1, ends]) => ends.map((e) => at(c, r, e === 'start' ? a0 : a1)))
          .map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.3" />)}
      </g>
      <g fill={`url(#${gid})`}>{FRAME_DOTS.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} />)}</g>
    </svg>
  )
}

/** Enlarged portrait with a close silver rim, centered inside the unchanged outer ornament. */
function SkillPortrait({ id }: { id: string }) {
  return (
    // Same center as C1 in the SVG viewBox: (74.6, 74.4), with a 128px diameter.
    <div className="skill-queue-face absolute aspect-square w-[75.294118%] overflow-hidden rounded-full" style={{ left: '6.235294%', top: '6.341463%', fontSize: 16 }}>
      <UnitCard id={id} shape="round" className="skill-queue-portrait [&>img]:origin-[50%_22%] [&>img]:scale-[1.9]" />
    </div>
  )
}

/** ฮีโร่ + สกิลบน/ล่าง + ป้ายคิว (แบบในเกม/Atlas) — ใช้ในหน้าต่างจองสกิล และในรูปที่บันทึก */
export function SkillQueueBoard({ team, skills, onChange }: { team: Team; skills: SkillStep[]; onChange?: (s: SkillStep[]) => void }) {
  const frameId = useId().replace(/:/g, '')
  const readOnly = !onChange
  const heroes = team.slots.map((id, slot) => ({ id, slot })).filter((h) => h.id) as { id: string; slot: number }[]
  const full = skills.length >= MAX_SKILL_QUEUE
  function toggle(slot: number, skill: SkillKey) {
    const i = skills.findIndex((s) => s.slot === slot && s.skill === skill)
    if (!onChange) return
    if (i >= 0) onChange(skills.filter((_, j) => j !== i))
    else if (!full) onChange([...skills, { slot, skill }])
  }
  return (
    <>
      {heroes.length === 0 ? (
        <p className="py-8 text-center text-white/45">ใส่ฮีโร่ในทีมก่อน</p>
      ) : (
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-6 rounded-2xl bg-black/20 px-1 py-5 sm:gap-x-6 sm:px-4">
          {heroes.map((h) => {
            const keys = skillKeysOf(h.id)
            const three = keys.length === 3
            return (
            <div key={h.slot} className="relative aspect-[170/164] w-[153px] shrink-0 sm:w-[170px]">
              <SkillFrame gid={`${frameId}-${h.slot}`} />
              <SkillPortrait id={h.id} />
              <div className={`absolute left-[95px] z-20 flex flex-col sm:left-[105px] ${three ? '-top-[6%] gap-1' : 'top-[10%] gap-2'}`}>
                {keys.map((k) => {
                  const q = skills.findIndex((s) => s.slot === h.slot && s.skill === k)
                  const art = getSkillArt(h.id, k)
                  const label = `สกิล${SKILL_LABEL[k]}`
                  const description = `${getUnit(h.id)?.name} · ${label}${art ? ` · ${art.name}` : ''}`
                  return (
                    <button
                      key={k}
                      aria-label={`${description}${q >= 0 ? ` · ลำดับ ${q + 1}` : ''}`}
                      aria-pressed={q >= 0}
                      title={description}
                      onClick={() => toggle(h.slot, k)}
                      disabled={readOnly || (q < 0 && full)}
                      className={`relative rounded-[8px] border-[3px] bg-[#101727] p-0 text-[10px] font-semibold ${three ? 'h-[44px] w-[44px] sm:h-[48px] sm:w-[48px]' : 'h-[49px] w-[49px] sm:h-[54px] sm:w-[54px]'} transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold ${
                        q >= 0 ? 'border-gold shadow-[0_0_0_1px_#6b5220,0_0_14px_rgba(244,213,141,.55)]'
                          : k === 3 ? 'border-[#a77bff] shadow-[0_0_0_1px_#5b3aa8,0_2px_6px_#0008] enabled:hover:border-gold/80'
                          : 'border-[#dcdcdc] shadow-[0_0_0_1px_#8c8c8c,0_2px_6px_#0008] enabled:hover:border-gold/80'
                      }`}
                    >
                      {art ? (
                        <>
                          <img src={art.src} alt="" width={52} height={52} loading="lazy" decoding="async" draggable={false} className={`h-full w-full rounded-[5px] object-cover ${q < 0 && full && !readOnly ? 'opacity-50' : ''}`} />
                        </>
                      ) : label}
                      {q >= 0 && (
                        <span className="absolute -bottom-[7px] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-px text-[11px] font-bold leading-4 ring-1 ring-white/70 shadow-[0_1px_4px_#000a]" style={queueStyle(q + 1)}>
                          คิว {q + 1}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
            )
          })}
        </div>
      )}
      {skills.length > 0 && (
        <p className="mt-4 text-center text-sm text-white/70">
          {skills.map((s, i) => `${i + 1}. ${baseName(getUnit(team.slots[s.slot])?.name ?? '')} ${SKILL_LABEL[s.skill]}`).join('  →  ')}
        </p>
      )}
    </>
  )
}

export function SkillQueueModal({
  open, team, skills, onChange, onClose,
}: { open: boolean; team: Team; skills: SkillStep[]; onChange?: (s: SkillStep[]) => void; onClose: () => void }) {
  // ไม่ส่ง onChange = ดูอย่างเดียว
  const readOnly = !onChange
  return (
    <Modal open={open} title={readOnly ? 'ลำดับจองสกิล (Skill Queue)' : 'จองสกิล (Skill Queue)'} onClose={onClose}>
      <div className="mb-3 flex min-h-8 items-center justify-between">
        <span className="text-sm text-white/60">จองแล้ว {skills.length}/{MAX_SKILL_QUEUE}</span>
        {!readOnly && (
          <button onClick={() => onChange([])} className="pill flex items-center gap-1.5 px-4 py-1 text-sm">
            <RotateCcw className="h-4 w-4" /> รีเซ็ต
          </button>
        )}
      </div>
      <SkillQueueBoard team={team} skills={skills} onChange={onChange} />
      <button onClick={onClose} className="btn-gold mt-5 w-full py-2">{readOnly ? 'ปิด' : 'เสร็จ'}</button>
    </Modal>
  )
}
