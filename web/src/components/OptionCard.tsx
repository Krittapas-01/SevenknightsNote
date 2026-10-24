import { AlertTriangle, ChevronLeft, ChevronRight, ImageDown, Library, Loader2, Star, Trash2, Users } from 'lucide-react'
import { createPortal } from 'react-dom'
import { EXPORT_ON, exportPng, waitImages } from '../lib/exportImage'
import type { HeroStats } from '../lib/stats'
import { StatsGrid, upsertStats } from './HeroStats'
import HeroNotesTable from './HeroNotesTable'
import { BrandMark } from './BrandMark'
import { startTransition, useEffect, useId, useRef, useState } from 'react'
import EquipmentLoadout from './EquipmentLoadout'
import Modal from './Modal'
import UnitCard from './UnitCard'
import { noteFor } from './HeroDetailModal'
import { hasStats } from '../lib/stats'
import { baseName, getUnit, unitBase, unitLabel } from '../data/heroes'
import { addHeroToTeam, changeFormation, moveSlot, placeUnit, type HeroNote, type SkillStep, type Team, type WarOption } from '../lib/types'
import TeamPanel, { type SlotKind } from './TeamPanel'
import { SkillQueueBoard } from './TeamModals'
import AtlasTeam from './AtlasTeam'
import TeamCardLite from './TeamCardLite'
import { SkillDetail, SkillStrip, hasSkillInfo, type SkillKind } from './HeroSkills'
import { tx, L } from '../lib/i18n'

type Props = {
  option: WarOption
  index: number
  total: number
  editing: boolean
  /** ชุดทีมที่ยกเลิก (เทียบแบบไม่สน awake) */
  banned: string[][]
  onChange?: (o: WarOption) => void
  onRemove?: () => void
  onMove?: (dir: -1 | 1) => void
  onPick?: (kind: SlotKind, index: number) => void
  onLibrary?: () => void
  /** ไม้: ทุกทีมเท่ากัน เลือกใช้ทีมไหนก็ได้ */
  attack?: boolean
  /** แยกส่วน: panel = หัว+ทีม (ใช้ในแถว VS), details = โน้ต/อุปกรณ์/คำเตือน (วางใต้แถว VS) */
  part?: 'all' | 'panel' | 'details'
  onSaveHeroStats?: (hero: string, stats: HeroStats) => Promise<void>
  /** ไม้: ทีมนี้คือทีมหลักที่จะใช้จริง */
  main?: boolean
  onMakeMain?: () => void
  /** ตัวในทีมนี้ที่ชนกับทีมหลักของไม้อื่น */
  conflicts?: { id: string; name: string; slots: number[] }[]
  /** ตัวที่ใช้ในไม้อื่นแล้ว (ส่งต่อให้แถบอัศวิน) */
  blocked?: Record<string, string>
  /** ส่งมา = มีปุ่มบันทึกคอมพ์นี้เป็นรูป (ทีม + โน้ต + รายละเอียดรายตัว) */
  shot?: { guild: string; plan: string; heading: string }
  /** เปิดหน้าต่างลำดับการใช้สกิลของทีมนี้ (ส่งต่อให้ TeamPanel) */
  skillsReq?: number
}

const baseId = (id: string) => baseName(getUnit(id)?.name ?? id)

/** ทางเลือก 1 ทีมในไม้นั้น ๆ */
export default function OptionCard({ option, index, total, editing, banned, onChange, onRemove, onMove, onPick, onLibrary, attack, main, onMakeMain, conflicts = [], blocked, part = 'all', onSaveHeroStats, shot, skillsReq }: Props) {
  // บันทึกคอมพ์นี้เป็นรูป: render การ์ดแบบเว็บนอกจอ → รอรูปโหลด → ถ่าย
  const shotRef = useRef<HTMLDivElement>(null)
  const [shooting, setShooting] = useState(false)
  useEffect(() => {
    if (!shooting || !shot) return
    let alive = true
    ;(async () => {
      await new Promise((r) => requestAnimationFrame(() => r(null)))
      try {
        if (shotRef.current) {
          await waitImages(shotRef.current)
          await exportPng(shotRef.current, `${shot.guild} - ${shot.heading} - ${teamTitle(option)}`)
        }
      } catch (e) {
        alert(tx('สร้างรูปไม่สำเร็จ: ') + (e as Error).message)
      } finally {
        if (alive) setShooting(false)
      }
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shooting])
  const heroNotes = option.heroNotes ?? []
  const teamHeroes = option.team.slots.filter((id): id is string => !!id)
  const inTeam = new Set(option.team.slots.filter(Boolean).map((id) => baseId(id!)))
  const badCombos = banned.filter((g) => g.length > 0 && g.every((id) => inTeam.has(baseId(id))))
  const notes = option.notes.split('\n').map((l) => l.trim()).filter(Boolean)
  const set = (patch: Partial<WarOption>) => onChange?.({ ...option, ...patch })

  return (
    <div className={`flex flex-col transition ${part === 'panel' ? 'h-full' : ''} ${attack && !main && part === 'all' ? 'opacity-75 hover:opacity-100' : ''}`}>
      {part !== 'details' && (<>
      {/* หัวการ์ด: ลำดับทางเลือก + เงื่อนไข */}
      <div className="mb-4 flex min-h-8 items-center gap-2">
        {attack ? (
          main ? (
            <span className={`${editing ? 'tag-pop ' : ''}flex shrink-0 items-center gap-1 rounded-full bg-gold px-3 py-0.5 text-sm font-semibold text-ink shadow-[0_0_12px_rgba(244,213,141,.5)]`}>
              <Star className="h-3.5 w-3.5 fill-current" />{' '}{tx('ทีมหลัก')}
            </span>
          ) : editing && onMakeMain ? (
            <button type="button" onClick={onMakeMain} title={tx('ใช้ทีมนี้เป็นทีมหลักของไม้นี้')}
              className="flex shrink-0 items-center gap-1 rounded-full border border-gold/60 px-3 py-0.5 text-sm text-gold hover:bg-gold/15">
              <Star className="h-3.5 w-3.5" />{' '}{tx('ใช้ทีมนี้')}
            </button>
          ) : (
            <span className="shrink-0 rounded-full bg-white/10 px-3 py-0.5 text-sm font-semibold text-white/80">{tx('สำรอง')}{' '}{index + 1}</span>
          )
        ) : (
          <span className={`shrink-0 rounded-full px-3 py-0.5 text-sm font-semibold ${index === 0 ? 'bg-gold text-ink' : 'bg-white/10 text-white/80'}`}>
            {index === 0 ? (attack ? tx('ทีมแก้หลัก') : tx('บ้านกันหลัก')) : L(`ทีมสำรอง ${index}`, `Backup team ${index}`)}
          </span>
        )}
        {editing ? (
          <input
            value={option.condition}
            onChange={(e) => set({ condition: e.target.value })}
            maxLength={60}
            placeholder={attack ? tx('เงื่อนไข เช่น ต้องความเร็ว 210+') : index === 0 ? tx('เงื่อนไข เช่น มีซอรัน C6') : tx('เงื่อนไข เช่น ถ้าไม่มีซอรัน C6')}
            className="min-w-0 flex-1 rounded-full border border-white/15 bg-black/20 px-3 py-1 text-sm outline-none focus:border-gold"
          />
        ) : (
          option.condition && <span className="min-w-0 truncate text-sm text-gold">{option.condition}</span>
        )}
        {EXPORT_ON && !editing && shot && teamHeroes.length > 0 && (
          <button type="button" data-shot data-noexport onClick={() => setShooting(true)} disabled={shooting} title={tx('บันทึกคอมพ์นี้เป็นรูป (ทีม + รายละเอียด 3 ตัว)')}
            className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-gold/50 bg-gold/10 px-3 py-1 text-sm text-gold hover:bg-gold/20 disabled:opacity-50">
            {shooting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageDown className="h-4 w-4" />}{' '}{tx('บันทึกรูป')}
          </button>
        )}
        {shooting && shot && createPortal(
          <div aria-hidden className="pointer-events-none fixed left-[-20000px] top-0">
            <div ref={shotRef} className="w-[1180px] bg-[#101626] p-8 text-white">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <p className="eyebrow mb-1">{shot.guild} · {shot.plan}</p>
                  <h2 className="gold-title text-4xl font-extrabold">{shot.heading}</h2>
                </div>
                <span className="flex shrink-0 items-center gap-2 font-bold"><BrandMark /> 7K <span className="font-normal text-gold">Note</span></span>
              </div>
              {option.condition && <p className="mb-3 text-lg font-semibold text-gold">{option.condition}</p>}
              <AtlasTeam team={option.team} skills={option.skills} heroNotes={heroNotes} title={teamTitle(option)} />
              {option.skills.length > 0 && (
                <section className="panel mt-5 p-5">
                  <p className="eyebrow mb-3">{tx('ลำดับการออกสกิล · AUTO SKILL PRIORITY')}</p>
                  <SkillQueueBoard team={option.team} skills={option.skills} />
                </section>
              )}
              {notes.length > 0 && (
                <ul className="mt-5 space-y-1.5">
                  {notes.map((n, i) => (
                    <li key={i} className="flex gap-2 text-lg text-white/90"><span className="font-bold text-red-400">!</span> {n}</li>
                  ))}
                </ul>
              )}
              <ul className="mt-6 grid grid-cols-3 items-start gap-4">
                {teamHeroes.map((hero, i) => (
                  <GearNote key={`${hero}-${i}`} note={{ ...(noteFor(hero, heroNotes) ?? { text: '', sets: [], rings: [] }), hero }} />
                ))}
              </ul>
            </div>
          </div>,
          document.body,
        )}
        {editing && (
          <div className="ml-auto flex shrink-0 items-center">
            {/* เลื่อนลำดับคอมพ์ — มีคอมพ์เดียวไม่ต้องโชว์ */}
            {total > 1 && <>
              <IconBtn title={tx('เลื่อนขึ้นก่อน')} disabled={index === 0} onClick={() => onMove?.(-1)}><ChevronLeft className="h-4 w-4" /></IconBtn>
              <IconBtn title={tx('เลื่อนไปหลัง')} disabled={index === total - 1} onClick={() => onMove?.(1)}><ChevronRight className="h-4 w-4" /></IconBtn>
            </>}
            {onRemove && <IconBtn title={tx('ลบทีมนี้')} onClick={onRemove} danger><Trash2 className="h-4 w-4" /></IconBtn>}
          </div>
        )}
      </div>

      <TeamPanel
        skillsReq={skillsReq}
        variant="ally"
        className={part === 'panel' ? 'flex-1' : ''}
        team={option.team}
        heroNotes={heroNotes}
        onSaveHeroStats={onSaveHeroStats}
        skills={option.skills}
        editable={editing}
        title={teamTitle(option)}
        label={index === 0 ? (attack ? tx('ทีมแก้หลัก') : tx('บ้านกันหลัก')) : L(`ทีมสำรอง ${index}`, `Backup team ${index}`)}
        onSlotClick={onPick}
        blocked={blocked}
        onReset={() => set({ team: { ...option.team, slots: [null, null, null, null, null], pet: null, extras: [null, null, null, null] }, skills: [] })}
        onFormation={(front) => set(changeFormation(option.team, option.skills, front))}
        onMove={(from, to) => set(moveSlot(option.team, option.skills, from, to))}
        onSpeed={(speed) => set({ team: { ...option.team, speed } })}
        onSkills={(skills) => set({ skills })}
        onPlace={(ref, unit) => {
          const r = placeUnit(option.team, option.skills, ref, unit)
          if (r) set(r)
        }}
      />
      </>)}

      {part !== 'panel' && (<>

      {conflicts.length > 0 && (
        <p className={`mt-3 flex items-start gap-1.5 rounded-lg px-3 py-1.5 text-sm ${main ? 'border border-red-400/60 bg-red-500/20 font-semibold text-red-200' : 'border border-red-400/40 bg-red-500/10 font-semibold text-red-300'}`}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {main || !attack ? tx('ใช้ตัวซ้ำกับไม้อื่น: ') : tx('ถ้าใช้ทีมนี้จะชน: ')}
            {conflicts.map((c) => `${c.name} (${c.slots.map((s) => L(`ไม้ ${s + 1}`, `Slot ${s + 1}`)).join(', ')})`).join(' · ')}
          </span>
        </p>
      )}

      {badCombos.map((g, i) => (
        <p key={i} className="mt-3 flex items-center gap-1.5 rounded-lg bg-red-500/15 px-3 py-1.5 text-sm text-red-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />{' '}{tx('ตรงกับชุดที่ยกเลิก:')}{' '}{g.map((id) => unitLabel(id)).join(' + ')}
        </p>
      ))}

      {(teamHeroes.length > 0 || editing) && (
        <div className="mt-3">
          {!editing && <TeamGearButton team={option.team} skills={option.skills} heroNotes={heroNotes} />}
          {/* แก้ไข: ตารางอุปกรณ์/ค่าความสามารถรายตัวตัวเดียวกับหน้าบ้านศัตรู */}
          {editing && (
            <HeroNotesTable notes={heroNotes} editing team={option.team.slots}
              // ปุ่มที่จดไว้อยู่แถวเดียวกับ "อ่านค่าความสามารถจากรูป"
              leading={onLibrary && (
                <button type="button" onClick={onLibrary} className="mt-2 flex items-center gap-1.5 rounded-full border border-sky-300/60 px-3 py-1 text-sm text-sky-100 hover:bg-sky-400/10">
                  <Library className="h-4 w-4" />{' '}{tx('เลือกจากที่จดไว้')}
                </button>
              )}
              onChange={(n) => set({ heroNotes: n })}
              onAddHero={(hero) => set({ team: addHeroToTeam(option.team, hero) })}
              onAddWithStats={(hero, stats, extra) => set({ team: addHeroToTeam(option.team, hero), heroNotes: upsertStats(heroNotes, hero, stats, extra) })} />
          )}
        </div>
      )}

      {editing ? (
        <textarea
          value={option.notes}
          onChange={(e) => set({ notes: e.target.value })}
          maxLength={500}
          rows={3}
          placeholder={L('โน้ต บรรทัดละ 1 ข้อ เช่น\nความเร็ว 180+ เฟรย่าแบกความเร็ว\nอาริส จุด 100 บล็อค 78', 'Notes, one per line, e.g.\nSpeed 180+, Freyja carries speed\nAris weakness 100, block 78')}
          className="mt-3 w-full rounded-xl border border-white/15 bg-black/20 p-3 text-sm outline-none focus:border-gold"
        />
      ) : (
        notes.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {notes.map((n, i) => (
              <li key={i} className="flex gap-2 text-[15px] text-white/85">
                <span className="font-bold text-red-400">!</span> {n}
              </li>
            ))}
          </ul>
        )
      )}
      </>)}
    </div>
  )
}

/** ปุ่ม "ดูรายละเอียดทั้งทีม" + หน้าต่างการ์ดอุปกรณ์/ค่าความสามารถรายตัว — ใช้ทุกที่ที่ดูทีม (แผน · หน้าบ้านศัตรู) */
export function TeamGearButton({ team, skills = [], heroNotes, title, label, className = '' }: { team: Team; skills?: SkillStep[]; heroNotes: HeroNote[]; title?: string; label?: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const heroes = team.slots.filter((id): id is string => !!id)
  if (!heroes.length) return null
  return (
    <>
      {/* เปิดแบบ transition: หน้าต่างนี้หนัก (การ์ดทีม + ของ/ค่าความสามารถทุกตัว) → กดแล้วไม่ค้าง (INP) */}
      <button type="button" onClick={() => startTransition(() => setOpen(true))} className={`flex w-full items-center justify-center gap-2 rounded-xl border border-gold/35 bg-gold/5 px-4 py-3 text-sm font-medium text-gold transition-colors hover:bg-gold/15 focus-visible:outline-2 focus-visible:outline-gold ${className}`}>
        <Users className="h-4 w-4" /> {label ?? tx('ดูรายละเอียดทั้งทีม')} ({heroes.length})
      </button>
      {open && (
        <Modal open wide title={title ?? L(`รายละเอียดทั้งทีม (${heroes.length})`, `Full team details (${heroes.length})`)} onClose={() => setOpen(false)}>
          {/* คอมพ์ (รูปแบบ/สัตว์เลี้ยง/ตั้งลำดับการใช้สกิล) ซ้าย · อุปกรณ์/ค่าความสามารถรายตัวขวา */}
          <div className="grid items-start gap-5 lg:grid-cols-[300px_1fr]">
            {/* คอมพ์อยู่กึ่งกลางแนวตั้งของรายการอัศวิน (จอใหญ่) และค้างไว้ตอนเลื่อน */}
            <div className="@container mx-auto w-full max-w-[300px] lg:sticky lg:top-0 lg:self-center">
              <TeamCardLite variant="ally" team={team} skills={skills}
                title={<span className="text-gold">{heroes.map((id) => unitBase(id)).join(' · ')}</span>} />
            </div>
            {/* 1 ตัว/แถว แบบกว้าง: อัศวิน+ของ ซ้าย · ค่าความสามารถขวา (ชื่อค่าความสามารถไม่โดนตัด) */}
            <ul className="space-y-3">
              {heroes.map((hero, i) => (
                <GearNote wide key={`${hero}-${i}`} note={{ ...(noteFor(hero, heroNotes) ?? { text: '', sets: [], rings: [] }), hero }} />
              ))}
            </ul>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="btn-gold mt-5 w-full">{tx('ปิดรายละเอียด')}</button>
        </Modal>
      )}
    </>
  )
}

/** อุปกรณ์/ค่าความสามารถของอัศวิน 1 ตัว (ดูอย่างเดียว — ตอนแก้ใช้ HeroNotesTable) */
function GearNote({ note, wide }: { note: HeroNote; wide?: boolean }) {
  // กดไอคอนสกิล = คำอธิบายสกิลโผล่ใต้แถวนี้ (เต็มความกว้าง) · กดซ้ำ = ปิด
  const [skill, setSkill] = useState<SkillKind | null>(null)
  const panelId = useId()
  if (wide) return (
    <li className="grid min-w-0 gap-4 rounded-xl bg-black/20 p-4 text-sm md:grid-cols-[minmax(0,13rem)_1fr]">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <div className="h-16 w-16 shrink-0"><UnitCard id={note.hero} showName={false} small /></div>
          <span className="break-words text-base font-semibold text-gold">{unitLabel(note.hero)}</span>
        </div>
        <EquipmentLoadout sets={note.sets} rings={note.rings} />
        {!note.sets.length && !note.rings.length && <p className="mt-2 text-white/45">{tx('ยังไม่ได้ระบุอุปกรณ์')}</p>}
        {note.text && <p className="mt-3 whitespace-pre-wrap break-words text-white/80">{note.text}</p>}
        {hasSkillInfo(note.hero) && <SkillStrip hero={note.hero} open={skill} onPick={setSkill} panelId={panelId} />}
      </div>
      {/* มือถือ (คอลัมน์เดียว) = ต่อใต้ไอคอนสกิลเลย · จอกว้าง = แถวล่างเต็มความกว้าง ต่อจากค่าความสามารถ */}
      {skill && <SkillDetail hero={note.hero} kind={skill} id={panelId} className="md:order-last md:col-span-2" />}
      <div className="min-w-0">
        {hasStats(note.stats) ? <StatsGrid stats={note.stats} size="lg" className="!mt-0" /> : <p className="text-white/45">{tx('ยังไม่ได้ระบุค่าความสามารถ')}</p>}
      </div>
    </li>
  )
  return (
    <li className="min-w-0 rounded-xl bg-black/20 p-3 text-sm">
      <div className="flex items-center gap-2">
        <div className="h-16 w-16 shrink-0"><UnitCard id={note.hero} showName={false} small /></div>
        <span className="break-words font-semibold text-gold">{unitLabel(note.hero)}</span>
      </div>
      {note.text && <p className="mt-3 whitespace-pre-wrap break-words text-white/80">{note.text}</p>}
      <EquipmentLoadout sets={note.sets} rings={note.rings} />
      <StatsGrid stats={note.stats} />
      {!hasStats(note.stats) && !note.text.trim() && <p className="mt-3 text-white/45">{tx('ยังไม่ได้ระบุค่าความสามารถ')}</p>}
      {!note.sets.length && !note.rings.length && <p className="mt-2 text-white/45">{tx('ยังไม่ได้ระบุอุปกรณ์')}</p>}
    </li>
  )
}

function teamTitle(o: WarOption) {
  const names = o.team.slots.filter(Boolean).map((id) => unitBase(id))
  return names.length ? names.join(' · ') : tx('ยังไม่ได้เลือกอัศวิน')
}

function IconBtn({ children, onClick, disabled, title, danger }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; title: string; danger?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full p-1.5 disabled:opacity-25 ${danger ? 'text-red-300 hover:bg-red-500/15' : 'text-white/70 hover:bg-white/10'}`}
    >
      {children}
    </button>
  )
}
