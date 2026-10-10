import { BookOpen, Check, PartyPopper, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { DndHub } from './DndHub'
import HeroDock from './HeroDock'
import TeamPanel from './TeamPanel'
import { EXTRA_COUNT, MAX_HEROES, changeFormation, emptyTeam, heroCount, moveSlot, placeUnit, type SkillStep, type Team } from '../lib/types'

/**
 * สนามฝึก: ลองจัดทีมด้วยการ์ดตัวจริงของเว็บ — ข้อมูลอยู่ในหน้านี้อย่างเดียว ไม่บันทึกที่ไหน
 * ภารกิจติ๊กถูกเองเมื่อทำสำเร็จ
 */
type Done = { moved: boolean; removed: boolean; formation: boolean }
type Mission = { key: string; title: string; how: string; done: (t: Team, s: SkillStep[], d: Done) => boolean }

const MISSIONS: Mission[] = [
  { key: 'fill', title: `ใส่อัศวินให้ครบ ${MAX_HEROES} ตัว`, how: `แตะช่องว่าง → แตะอัศวินในแถบด้านล่าง (ค้นหาชื่อได้) · ทีมสงครามกิลด์ใช้ ${MAX_HEROES} ตัว วางได้ 5 ช่องตามรูปแบบ`, done: (t) => heroCount(t) >= MAX_HEROES },
  { key: 'pet', title: 'ใส่สัตว์เลี้ยง', how: 'แตะช่องรูปเท้าขวาบน → แถบด้านล่างจะเปลี่ยนเป็นสัตว์เลี้ยง', done: (t) => !!t.pet },
  { key: 'move', title: 'สลับตำแหน่ง 2 ตัว', how: 'แตะตัวที่จะย้าย 1 ครั้ง (เรืองแสง) แล้วแตะอีกช่อง · บนคอมลากวางได้', done: (_t, _s, d) => d.moved },
  { key: 'remove', title: 'เอาตัวออก 1 ตัว', how: 'แตะตัวเดิมซ้ำ 2 ครั้ง (ครั้งแรกเรืองแสง ครั้งที่สองเอาออก)', done: (_t, _s, d) => d.removed },
  { key: 'formation', title: 'เปลี่ยนรูปแบบ', how: 'แตะวงกลมดาวแดง/น้ำเงินใต้สัตว์เลี้ยง แล้วเลือกรูปแบบอื่น', done: (_t, _s, d) => d.formation },
  { key: 'skills', title: 'ตั้งลำดับการใช้สกิล 3 ครั้ง', how: 'แตะวงกลมดาวล่างสุด แล้วแตะสกิลตามลำดับที่จะกด — เลขสีจะขึ้นบนการ์ด', done: (_t, s) => s.length >= 3 },
  { key: 'speed', title: 'ใส่ความเร็วทีม', how: 'พิมพ์ตัวเลขในช่องรูปรอยเท้า มุมขวาบนของการ์ด', done: (t) => (t.speed || 0) > 0 },
  { key: 'extra', title: 'ใส่สัตว์เลี้ยงสำรอง', how: `แตะวงกลมเล็กแถว "สัตว์เลี้ยงสำรอง" ใต้ทีม (ใส่ได้ ${EXTRA_COUNT} ตัว)`, done: (t) => t.extras.some(Boolean) },
]

const fresh = () => ({ team: emptyTeam(), skills: [] as SkillStep[], d: { moved: false, removed: false, formation: false } as Done })

/** สนามฝึกบท "จัดทีม" — ใช้ทั้งหน้า /guide/practice และหน้าต่างซ้อนในหน้าฟีเจอร์ (overlay = ซ้อนบนหน้าอื่น) */
export default function TeamPractice({ overlay = false, onClose }: { overlay?: boolean; onClose?: () => void }) {
  const [st, setSt] = useState(fresh)
  const { team, skills, d } = st
  const status = MISSIONS.map((m) => m.done(team, skills, d))
  const count = status.filter(Boolean).length
  const all = count === MISSIONS.length
  const next = status.findIndex((x) => !x)

  return (
    <DndHub>
      <div className="mx-auto max-w-5xl pb-64">
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="lg:order-2">
            {/* ความคืบหน้า */}
            <div className="panel panel-gold p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">ภารกิจ</span>
                <span className="tabular-nums text-gold">{count}/{MISSIONS.length}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/40">
                <div className="h-full rounded-full bg-gradient-to-r from-[#e2bf72] to-[#fff1c9] transition-all duration-500" style={{ width: `${(count / MISSIONS.length) * 100}%` }} />
              </div>
              <ol className="mt-4 space-y-2">
                {MISSIONS.map((m, i) => {
                  const ok = status[i]
                  const cur = i === next
                  return (
                    <li key={m.key} className={`rounded-xl border p-2.5 transition ${ok ? 'border-emerald-400/30 bg-emerald-400/5' : cur ? 'border-gold/60 bg-gold/10' : 'border-white/10 bg-black/15'}`}>
                      <div className="flex items-center gap-2.5 text-sm">
                        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${ok ? 'bg-emerald-400 text-ink' : cur ? 'bg-gold text-ink' : 'bg-white/10 text-white/50'}`}>
                          {ok ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                        </span>
                        <span className={ok ? 'text-white/50 line-through' : 'font-medium'}>{m.title}</span>
                      </div>
                      {cur && <p className="mt-1.5 pl-[34px] text-xs leading-relaxed text-white/70">{m.how}</p>}
                    </li>
                  )
                })}
              </ol>
              <button onClick={() => setSt(fresh())} className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full border border-white/15 py-1.5 text-xs text-white/60 hover:border-gold/50 hover:text-gold">
                <RotateCcw className="h-3.5 w-3.5" /> เริ่มใหม่
              </button>
            </div>
          </div>

          <div className="lg:order-1">
            {all && (
              <div className="panel panel-gold mb-5 p-5 text-center">
                <PartyPopper className="mx-auto h-9 w-9 text-gold" />
                <p className="mt-2 text-lg font-bold">ผ่านบทจัดทีมแล้ว!</p>
                <p className="mt-1 text-sm text-white/65">การ์ดทีมแบบนี้ใช้เหมือนกันทุกที่ ทั้งบ้านศัตรู ทีมแก้ และแผนสงคราม</p>
                {overlay
                  ? <button onClick={onClose} className="btn-gold mt-4 inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold">กลับไปใช้งานจริง</button>
                  : <Link to="/guide#targets" className="btn-gold mt-4 inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold"><BookOpen className="h-4 w-4" /> อ่านต่อ: บ้านศัตรู</Link>}
              </div>
            )}
            <div className="mx-auto max-w-md">
              <TeamPanel
                variant="ally"
                team={team}
                skills={skills}
                editable
                label="ทีมฝึก"
                title="ทีมฝึกของฉัน"
                onPlace={(ref, unit) => setSt((s) => {
                  const r = placeUnit(s.team, s.skills, ref, unit)
                  if (!r) return s
                  const removed = s.d.removed || (unit === null && ref.kind === 'hero' && !!s.team.slots[ref.index])
                  return { ...s, ...r, d: { ...s.d, removed } }
                })}
                onMove={(from, to) => setSt((s) => ({ ...s, ...moveSlot(s.team, s.skills, from, to), d: { ...s.d, moved: s.d.moved || (from.kind === 'hero' && to.kind === 'hero') } }))}
                onFormation={(f) => setSt((s) => ({ ...s, ...changeFormation(s.team, s.skills, f), d: { ...s.d, formation: s.d.formation || f !== s.team.front } }))}
                onSkills={(sk) => setSt((s) => ({ ...s, skills: sk }))}
                onSpeed={(sp) => setSt((s) => ({ ...s, team: { ...s.team, speed: sp } }))}
                onReset={() => setSt((s) => ({ ...s, team: emptyTeam(), skills: [] }))}
              />
            </div>
          </div>
        </div>
      </div>
      <HeroDock z={overlay ? 46 : undefined} />
    </DndHub>
  )
}
