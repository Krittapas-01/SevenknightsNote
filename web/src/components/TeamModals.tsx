import { RotateCcw } from 'lucide-react'
import { queueStyle } from '../lib/queue'
import { FORMATIONS, MAX_SKILL_QUEUE, SLOT_COUNT, type SkillStep, type Team } from '../lib/types'
import { baseName, getUnit } from '../data/heroes'
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
          {heroes.map((h) => (
            <div key={h.slot} className="relative h-[104px] w-[146px] shrink-0 sm:h-[124px] sm:w-[176px]">
              <svg aria-hidden="true" viewBox="0 0 128 128" className="pointer-events-none absolute -left-1 -top-1 h-28 w-28 text-gold/50 sm:h-[132px] sm:w-[132px]" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M5 71A59 59 0 0 1 53 6M72 6A59 59 0 0 1 122 59M14 91A57 57 0 0 0 34 114M50 122A60 60 0 0 0 100 108M98 101l20 19" />
                <circle cx="64" cy="64" r="53" strokeOpacity=".5" />
                <circle cx="53" cy="6" r="2" /><circle cx="72" cy="6" r="2" /><circle cx="14" cy="91" r="2" /><circle cx="34" cy="114" r="2" /><circle cx="118" cy="120" r="2" fill="currentColor" />
              </svg>
              <div className="absolute left-1 top-1 h-24 w-24 overflow-hidden rounded-full border-2 border-gold/60 shadow-[0_2px_8px_#0006] sm:h-[116px] sm:w-[116px]" style={{ fontSize: 16 }}>
                <UnitCard id={h.id} shape="round" className="[&>img]:origin-[50%_24%] [&>img]:scale-[1.6]" />
              </div>
              <div className="absolute right-0 top-0 flex flex-col gap-2 sm:gap-3">
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
                      className={`relative h-12 w-12 rounded-lg border-2 bg-[#101727] text-xs font-semibold shadow-[0_2px_6px_#0008] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold sm:h-14 sm:w-14 ${
                        q >= 0 ? 'border-gold text-white shadow-[0_0_10px_rgba(244,213,141,.4)]'
                          : 'border-white/25 text-white/80 enabled:hover:border-gold/70'
                      }`}
                    >
                      {art ? (
                        <>
                          <img src={art.src} alt="" width={52} height={52} loading="lazy" decoding="async" draggable={false} className={`h-full w-full rounded-md object-cover ${q < 0 && full ? 'opacity-55' : ''}`} />
                          <span className="absolute inset-x-0 bottom-0 rounded-b-md bg-gradient-to-t from-black/95 to-black/40 pb-0.5 pt-1 text-[10px] leading-tight text-white">{k === 1 ? 'บน' : 'ล่าง'}</span>
                        </>
                      ) : label}
                      {q >= 0 && (
                        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 text-[10px] font-bold ring-1 ring-white/60" style={queueStyle(q + 1)}>
                          ลำดับ {q + 1}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
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
