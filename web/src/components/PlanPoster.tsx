import { forwardRef } from 'react'
import { getUnit } from '../data/heroes'
import { queueStyle } from '../lib/queue'
import { SLOT_COUNT, formationName, type PlanData, type SkillStep, type Team, type WarOption, type WarSlot } from '../lib/types'

/**
 * โครงรูป "Update GVG" สำหรับบันทึกเป็นรูป (ไม่แสดงบนหน้าเว็บ — render นอกจอตอนกดบันทึก)
 * โครงสร้าง: หัวข้อ → ✅ ตัว OP → ❌ บ้านที่ยกเลิก → โน้ตแผน → แต่ละไม้ (การ์ดทีมเรียงซ้ายขวา + เงื่อนไข + ❗ โน้ต)
 * สไตล์ทั้งหมดอยู่ใน class `poster-*` ใน index.css ให้ตกแต่งต่อได้โดยไม่ต้องแตะโครง
 */
type Props = { title: string; guildName: string; data: PlanData }

const nameOf = (id: string) => getUnit(id)?.name ?? id
const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean)

const PlanPoster = forwardRef<HTMLDivElement, Props>(function PlanPoster({ title, guildName, data }, ref) {
  const defense = (data.kind ?? 'attack') === 'defense'
  return (
    <div ref={ref} className="poster">
      <header className="poster-head">
        <p className="poster-guild">{guildName}</p>
        <h1 className="poster-title">{title}</h1>
      </header>

      {(data.op.length > 0 || data.banned.length > 0 || data.note.trim()) && (
        <section className="poster-summary">
          {data.op.length > 0 && (
            <p className="poster-line poster-line--ok"><span className="poster-mark">✅</span> ตัวที่ OP ที่สุดตอนนี้ {data.op.map(nameOf).join(' , ')}</p>
          )}
          {data.banned.length > 0 && (
            <p className="poster-line poster-line--no"><span className="poster-mark">❌</span> ยกเลิกบ้าน {data.banned.map((g) => g.map(nameOf).join(' ')).join(' · ')}</p>
          )}
          {lines(data.note).map((l, i) => <p key={i} className="poster-line">{l}</p>)}
        </section>
      )}

      {data.slots.map((slot, s) => slot.options.some((o) => o.team.slots.some(Boolean)) && (
        <SlotBlock key={s} slot={slot} index={s} defense={defense} />
      ))}

      <footer className="poster-foot">7K Note</footer>
    </div>
  )
})
export default PlanPoster

function SlotBlock({ slot, index, defense }: { slot: WarSlot; index: number; defense: boolean }) {
  // ชื่อไม้ค่าเริ่มต้น ("ไม้ 1") → ใช้ชื่อแบบรูป เช่น "บ้านกันทีมที่ 1"
  const custom = slot.name?.trim() && !/^ไม้\s*\d+$/.test(slot.name.trim()) ? slot.name.trim() : ''
  const heading = custom || (defense ? `บ้านกันทีมที่ ${index + 1}` : `ไม้ที่ ${index + 1}`)
  const options = slot.options.map((o, i) => ({ o, i })).filter(({ o }) => o.team.slots.some(Boolean))
  const main = (i: number) => !defense && (slot.main ?? 0) === i && options.length > 1
  options.sort((x, y) => Number(main(y.i)) - Number(main(x.i))) // ทีมหลักขึ้นก่อน
  // มีการ์ดไหนมีหัวเงื่อนไข → ทุกการ์ดเว้นที่หัวไว้ การ์ดจะได้เสมอกัน
  const withHeader = options.some(({ o, i }) => o.condition.trim() || main(i))
  return (
    <section className="poster-slot">
      <h2 className="poster-slot-title">
        {heading}
        {!defense && slot.vsTag && <span className="poster-chip">{slot.vsTag}</span>}
      </h2>
      {!defense && slot.vs && slot.vs.slots.some(Boolean) && (
        <div className="poster-vs">
          <span className="poster-vs-label">บ้านที่ตี</span>
          <TeamCard team={slot.vs} skills={slot.vs.skills ?? []} enemy />
        </div>
      )}
      <div className="poster-options">
        {options.map(({ o, i }) => (
          <OptionBlock key={i} option={o} main={main(i)} header={withHeader} />
        ))}
      </div>
    </section>
  )
}

function OptionBlock({ option, main, header }: { option: WarOption; main: boolean; header: boolean }) {
  const notes = lines(option.notes)
  return (
    <div className="poster-option">
      {header && (
        <p className="poster-condition">
          {main && <span className="poster-chip poster-chip--main">ทีมหลัก</span>}
          {option.condition.trim()}
        </p>
      )}
      <TeamCard team={option.team} skills={option.skills} />
      {notes.length > 0 && (
        <ul className="poster-notes">
          {notes.map((n, i) => <li key={i}><span className="poster-bang">❗</span> {n}</li>)}
        </ul>
      )}
    </div>
  )
}

/** การ์ดทีม: แถวหลัง (บน) / แถวหน้า (ล่าง) + เลขจองสกิล | ค่ายกล + สัตว์เลี้ยง + ช่องเสริม */
function TeamCard({ team, skills, enemy }: { team: Team; skills: SkillStep[]; enemy?: boolean }) {
  const back = Array.from({ length: SLOT_COUNT - team.front }, (_, i) => team.front + i)
  const front = Array.from({ length: team.front }, (_, i) => i)
  const rows = [
    { key: 'B', idx: back },
    { key: 'F', idx: front },
  ]
  const queueOf = (slot: number) => skills.map((q, n) => ({ n: n + 1, ...q })).filter((q) => q.slot === slot)
  return (
    <div className={`poster-card ${enemy ? 'poster-card--enemy' : ''}`}>
      <div className="poster-rows">
        {rows.map((r) => (
          <div key={r.key} className="poster-row">
            <span className="poster-row-label">{r.key}</span>
            <div className="poster-row-heroes">
              {r.idx.map((i) => {
                const id = team.slots[i]
                if (!id) return <span key={i} className="poster-empty">×</span>
                return (
                  <figure key={i} className="poster-hero">
                    <Portrait id={id} />
                    <span className="poster-queue">
                      {queueOf(i).map((q) => (
                        <span key={q.n} className="poster-queue-dot" style={queueStyle(q.n)} title={`สกิล ${q.skill}`}>{q.n}</span>
                      ))}
                    </span>
                    <figcaption className="poster-hero-name">{nameOf(id)}</figcaption>
                  </figure>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <aside className="poster-side">
        <span className="poster-formation">{formationName(team.front)} · {team.front}-{SLOT_COUNT - team.front}</span>
        {team.pet && <Portrait id={team.pet} big />}
        <div className="poster-extras">
          {team.extras.filter(Boolean).map((id, i) => <Portrait key={i} id={id!} small />)}
        </div>
        {team.speed > 0 && <span className="poster-speed">สปีด {team.speed}</span>}
      </aside>
    </div>
  )
}

function Portrait({ id, big, small }: { id: string; big?: boolean; small?: boolean }) {
  const u = getUnit(id)
  return (
    <span className={`poster-portrait ${big ? 'poster-portrait--big' : ''} ${small ? 'poster-portrait--small' : ''}`}>
      {u?.img ? <img src={u.img} alt={u.name} loading="eager" decoding="sync" draggable={false} /> : <span className="poster-portrait-fallback">{(u?.name ?? id).slice(0, 2)}</span>}
    </span>
  )
}
