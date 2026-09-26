import { RotateCcw } from 'lucide-react'
import { queueStyle } from '../lib/queue'
import { FORMATIONS, MAX_SKILL_QUEUE, SLOT_COUNT, type SkillStep, type Team } from '../lib/types'
import { baseName, getUnit } from '../data/heroes'
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
        <div className="flex flex-wrap justify-center gap-5 rounded-2xl bg-black/20 p-4">
          {heroes.map((h) => (
            <div key={h.slot} className="flex items-center gap-2">
              <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-gold/60" style={{ fontSize: 16 }}>
                <UnitCard id={h.id} shape="round" />
              </div>
              <div className="flex flex-col gap-1.5">
                {([1, 2] as const).map((k) => {
                  const q = skills.findIndex((s) => s.slot === h.slot && s.skill === k)
                  return (
                    <button
                      key={k}
                      onClick={() => toggle(h.slot, k)}
                      disabled={readOnly || (q < 0 && full)}
                      className={`relative h-10 w-16 rounded-lg border-2 text-xs font-semibold transition ${
                        q >= 0 ? 'border-gold bg-gradient-to-b from-[#5b64d8] to-[#2b2f7a] text-white shadow-[0_0_10px_rgba(244,213,141,.6)]'
                          : readOnly ? 'border-white/15 bg-white/5 text-white/35' : 'border-white/20 bg-white/5 text-white/60 hover:border-white/50 disabled:opacity-30'
                      }`}
                    >
                      {k === 1 ? 'สกิลบน' : 'สกิลล่าง'}
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
