import { Ban } from 'lucide-react'
import { ringImage, setIcon } from '../data/equipment'
import { getUnit } from '../data/heroes'
import { queueStyle } from '../lib/queue'
import { SLOT_COUNT, type HeroNote, type SkillStep, type Team } from '../lib/types'
import { noteFor } from './HeroDetailModal'
import UnitCard from './UnitCard'

/**
 * ทีมแบบ 7K Atlas (ใช้ในรูปที่บันทึก): สัตว์เลี้ยงบนกลาง · 5 ช่องแนวนอน แถวหลังยกสูง แถวหน้าต่ำลง
 * ช่องว่าง = ⊘ · ใต้ฮีโร่มีไอคอนเซ็ต + แหวน · มุมรูปมีเลขลำดับสกิล
 */
// ตำแหน่งคอลัมน์ (0-4 ซ้ายไปขวา) ของแถวหลัง/หน้า ตามจำนวนช่องแถวหน้า (ค่ายกลในเกม)
const COLUMNS: Record<number, { back: number[]; front: number[] }> = {
  1: { back: [0, 1, 3, 4], front: [2] },
  2: { back: [0, 2, 4], front: [1, 3] },
  3: { back: [1, 3], front: [0, 2, 4] },
  4: { back: [2], front: [0, 1, 3, 4] },
}

export default function AtlasTeam({ team, skills, heroNotes = [], title }: { team: Team; skills: SkillStep[]; heroNotes?: HeroNote[]; title?: string }) {
  const cols = COLUMNS[team.front] ?? COLUMNS[2]
  // คอลัมน์ → ช่องในทีม (แถวหน้า index 0..front-1, แถวหลัง front..4)
  const cells: { slot: number; back: boolean }[] = Array(SLOT_COUNT)
  cols.front.forEach((c, i) => { cells[c] = { slot: i, back: false } })
  cols.back.forEach((c, i) => { cells[c] = { slot: team.front + i, back: true } })
  const queueOf = (slot: number) => skills.map((q, n) => ({ n: n + 1, ...q })).filter((q) => q.slot === slot)
  const pet = team.pet ? getUnit(team.pet) : null

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold tracking-[.2em] text-[#8f9cff]">{title ?? 'TEAM'}</span>
        <span className="rounded-lg border border-white/10 bg-black/30 px-3 py-1 text-sm">หลัง {SLOT_COUNT - team.front} / หน้า {team.front}</span>
      </div>

      {/* สัตว์เลี้ยง */}
      <div className="mt-2 flex flex-col items-center">
        {pet ? (
          <>
            <div className="h-24 w-24"><UnitCard id={team.pet!} shape="pet" showName={false} /></div>
            <span className="mt-1 text-sm font-semibold text-[#f0a74b]">{pet.name}</span>
          </>
        ) : <div className="h-24" />}
      </div>

      {/* 5 ช่อง: หลังยกขึ้น หน้าต่ำลง */}
      <div className="mt-4 grid grid-cols-5 items-start gap-3">
        {cells.map(({ slot, back }, c) => {
          const id = team.slots[slot]
          return (
            <div key={c} className={`flex flex-col items-center ${back ? '' : 'mt-12'}`}>
              {id ? (
                <>
                  <div className="relative h-[132px] w-[132px]">
                    <UnitCard id={id} className="h-full w-full" />
                    <span className="absolute -left-2 -top-2 flex flex-col gap-1">
                      {queueOf(slot).map((q) => (
                        <span key={q.n} className="grid h-7 w-7 place-items-center rounded-full border-2 border-white/90 text-sm font-bold shadow-[0_1px_3px_rgba(0,0,0,.6)]" style={queueStyle(q.n)}>{q.n}</span>
                      ))}
                    </span>
                  </div>
                  <Gear note={noteFor(id, heroNotes)} />
                </>
              ) : (
                <div className="grid h-[132px] w-[132px] place-items-center rounded-xl border border-white/10 bg-white/[.03] text-white/25">
                  <Ban className="h-10 w-10" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** ไอคอนเซ็ต (ชิ้นแรกของเซ็ต) + แหวน ใต้ฮีโร่ */
function Gear({ note }: { note?: HeroNote }) {
  const icons = [
    ...(note?.sets ?? []).map((s) => ({ src: setIcon(s), label: `ชุด${s}` })),
    ...(note?.rings ?? []).map((r) => ({ src: ringImage(r), label: r })),
  ].filter((x) => x.src)
  if (!icons.length) return null
  return (
    <div className="mt-2 flex max-w-[140px] flex-wrap justify-center gap-1.5">
      {icons.map((x, i) => (
        <img key={i} src={x.src} alt={x.label} title={x.label} loading="eager" draggable={false}
          className="h-[46px] w-[46px] rounded-lg border border-gold/30 bg-black/30 object-contain p-0.5" />
      ))}
    </div>
  )
}
