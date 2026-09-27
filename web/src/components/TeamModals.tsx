import { RotateCcw } from 'lucide-react'
import { useId } from 'react'
import { queueStyle } from '../lib/queue'
import { FORMATIONS, MAX_SKILL_QUEUE, SLOT_COUNT, type SkillStep, type Team } from '../lib/types'
import { baseName, getUnit, HERO_TYPES, isAwake, RARE } from '../data/heroes'
import { getSkillArt } from '../data/skills'
import Modal from './Modal'
import UnitCard from './UnitCard'

/**
 * รูปค่ายกลแบบในเกม: แถวหลัง = หมากแดง, แถวหน้า = โล่น้ำเงิน
 * เรียงเฉียงขึ้นขวา ตัวเลข = ลำดับตำแหน่ง
 */
function FormationDiagram({ front }: { front: number }) {
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
export function SkillQueueModal({
  open, team, skills, onChange, onClose,
}: { open: boolean; team: Team; skills: SkillStep[]; onChange?: (s: SkillStep[]) => void; onClose: () => void }) {
  const frameId = useId()
  // ไม่ส่ง onChange = ดูอย่างเดียว
  const readOnly = !onChange
  const heroes = team.slots.map((id, slot) => ({ id, slot })).filter((h) => h.id) as { id: string; slot: number }[]
  const full = skills.length >= MAX_SKILL_QUEUE
  function toggle(slot: number, skill: 1 | 2) {
    const i = skills.findIndex((s) => s.slot === slot && s.skill === skill)
    if (!onChange) return
    if (i >= 0) onChange(skills.filter((_, j) => j !== i))
    else if (!full) onChange([...skills, { slot, skill }])
  }
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
      {heroes.length === 0 ? (
        <p className="py-8 text-center text-white/45">ใส่ฮีโร่ในทีมก่อน</p>
      ) : (
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-6 rounded-2xl bg-black/20 px-1 py-5 sm:gap-x-6 sm:px-4">
          {heroes.map((h) => {
            const unit = getUnit(h.id)
            const innerColor = unit && isAwake(unit.name) ? '#c79bff'
              : unit && RARE.has(baseName(unit.name)) ? '#9b7fd6'
              : unit?.type ? HERO_TYPES[unit.type].color : '#7c86a8'
            return (
            <div key={h.slot} className="relative h-[134px] w-[160px] shrink-0">
              <svg aria-hidden="true" viewBox="0 0 128 128" className="pointer-events-none absolute left-0 top-[2px] z-10 h-[128px] w-[128px]" fill="none" stroke={`url(#${frameId}-${h.slot})`} strokeWidth="1.25" strokeLinecap="round">
                <defs>
                  <linearGradient id={`${frameId}-${h.slot}`} x1="0" y1="0" x2="0.3" y2="1">
                    <stop offset="0" stopColor="#f0d990" /><stop offset=".35" stopColor="#c5b47f" /><stop offset=".72" stopColor="#827281" /><stop offset="1" stopColor="#a49b83" />
                  </linearGradient>
                </defs>
                {/* Broken concentric metal tracks, with the portrait inside the inner track. */}
                <path d="M4 78A61 61 0 0 1 60 4M73 6A61 61 0 0 1 121 50M10 93A61 61 0 0 0 29 115M39 121A61 61 0 0 0 109 107" />
                <path d="M34 17A53 53 0 0 1 117 65A53 53 0 0 1 69 117M60 117A53 53 0 0 1 24 25" stroke={innerColor} strokeWidth="1.7" />
                <path d="M81 113l16 15M96 110l18 13" />
                <g fill="#57606a">
                  <circle cx="60" cy="4" r="1.6" /><circle cx="73" cy="6" r="1.6" />
                  <circle cx="10" cy="93" r="1.6" /><circle cx="29" cy="115" r="1.6" />
                </g>
                <g fill="#57606a" stroke={innerColor}>
                  <circle cx="34" cy="17" r="1.6" /><circle cx="24" cy="25" r="1.6" />
                  <circle cx="60" cy="117" r="1.4" /><circle cx="69" cy="117" r="1.4" />
                </g>
                <circle cx="114" cy="123" r="2.2" fill="#a49b83" stroke="none" />
              </svg>
              <div className="absolute left-[12px] top-[14px] h-[104px] w-[104px] rounded-full" style={{ fontSize: 16 }}>
                <UnitCard id={h.id} shape="round" className="skill-queue-portrait [&>img]:origin-[50%_24%] [&>img]:scale-[1.85]" />
              </div>
              <div className="absolute left-[98px] top-[8px] z-20 flex flex-col gap-[6px]">
                {([1, 2] as const).map((k) => {
                  const q = skills.findIndex((s) => s.slot === h.slot && s.skill === k)
                  const art = getSkillArt(h.id, k)
                  const label = k === 1 ? 'สกิลบน' : 'สกิลล่าง'
                  const description = `${getUnit(h.id)?.name} · ${label}${art ? ` · ${art.name}` : ''}`
                  return (
                    <button
                      key={k}
                      aria-label={`${description}${q >= 0 ? ` · ลำดับ ${q + 1}` : ''}`}
                      aria-pressed={q >= 0}
                      title={description}
                      onClick={() => toggle(h.slot, k)}
                      disabled={readOnly || (q < 0 && full)}
                      className={`relative h-[56px] w-[56px] rounded-[10px] border-2 bg-[#101727] p-[2px] text-[10px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold ${
                        q >= 0 ? 'border-gold shadow-[0_0_0_1px_#6b5220,0_0_14px_rgba(244,213,141,.55)]'
                          : 'border-[#d5d8dc] shadow-[0_0_0_1px_#4a525c,0_3px_8px_#000a] enabled:hover:border-gold/80'
                      }`}
                    >
                      {art ? (
                        <>
                          <img src={art.src} alt="" width={52} height={52} loading="lazy" decoding="async" draggable={false} className={`h-full w-full rounded-[7px] object-cover ${q < 0 && full && !readOnly ? 'opacity-50' : ''}`} />
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
          {skills.map((s, i) => `${i + 1}. ${baseName(getUnit(team.slots[s.slot])?.name ?? '')} ${s.skill === 1 ? 'บน' : 'ล่าง'}`).join('  →  ')}
        </p>
      )}
      <button onClick={onClose} className="btn-gold mt-5 w-full py-2">{readOnly ? 'ปิด' : 'เสร็จ'}</button>
    </Modal>
  )
}
