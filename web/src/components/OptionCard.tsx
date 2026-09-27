import { AlertTriangle, ChevronLeft, ChevronRight, ImageDown, Library, Loader2, Star, Trash2, Users, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { exportPng, waitImages } from '../lib/exportImage'
import type { HeroStats } from '../lib/stats'
import { StatsGrid, StatsImport, upsertStats } from './HeroStats'
import { useEffect, useRef, useState } from 'react'
import EquipmentLoadout from './EquipmentLoadout'
import EquipmentEditor from './EquipmentEditor'
import Modal from './Modal'
import UnitCard from './UnitCard'
import { noteFor } from './HeroDetailModal'
import { hasStats } from '../lib/stats'
import AddHeroNote from './AddHeroNote'
import { baseName, getUnit } from '../data/heroes'
import { changeFormation, moveSlot, placeUnit, type HeroNote, type WarOption } from '../lib/types'
import TeamPanel, { type SlotKind } from './TeamPanel'
import { SkillQueueBoard } from './TeamModals'
import AtlasTeam from './AtlasTeam'

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
  /** ไม้บุก: ทุกทีมเท่ากัน เลือกใช้ทีมไหนก็ได้ */
  attack?: boolean
  /** แยกส่วน: panel = หัว+ทีม (ใช้ในแถว VS), details = โน้ต/ของ/คำเตือน (วางใต้แถว VS) */
  part?: 'all' | 'panel' | 'details'
  onSaveHeroStats?: (hero: string, stats: HeroStats) => Promise<void>
  /** ไม้บุก: ทีมนี้คือทีมหลักที่จะใช้จริง */
  main?: boolean
  onMakeMain?: () => void
  /** ตัวในทีมนี้ที่ชนกับทีมหลักของไม้อื่น */
  conflicts?: { id: string; name: string; slots: number[] }[]
  /** ตัวที่ใช้ในไม้อื่นแล้ว (ส่งต่อให้แถบตัวละคร) */
  blocked?: Record<string, string>
  /** ส่งมา = มีปุ่มบันทึกคอมพ์นี้เป็นรูป (ทีม + โน้ต + รายละเอียดรายตัว) */
  shot?: { guild: string; plan: string; heading: string }
}

const baseId = (id: string) => baseName(getUnit(id)?.name ?? id)

/** ทางเลือก 1 ทีมในไม้นั้น ๆ */
export default function OptionCard({ option, index, total, editing, banned, onChange, onRemove, onMove, onPick, onLibrary, attack, main, onMakeMain, conflicts = [], blocked, part = 'all', onSaveHeroStats, shot }: Props) {
  const [showGear, setShowGear] = useState(false)
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
        alert('สร้างรูปไม่สำเร็จ: ' + (e as Error).message)
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
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-gold px-3 py-0.5 text-sm font-semibold text-ink shadow-[0_0_12px_rgba(244,213,141,.5)]">
              <Star className="h-3.5 w-3.5 fill-current" /> ทีมหลัก
            </span>
          ) : editing && onMakeMain ? (
            <button type="button" onClick={onMakeMain} title="ใช้ทีมนี้เป็นทีมหลักของไม้นี้"
              className="flex shrink-0 items-center gap-1 rounded-full border border-gold/60 px-3 py-0.5 text-sm text-gold hover:bg-gold/15">
              <Star className="h-3.5 w-3.5" /> ใช้ทีมนี้
            </button>
          ) : (
            <span className="shrink-0 rounded-full bg-white/10 px-3 py-0.5 text-sm font-semibold text-white/80">สำรอง {index + 1}</span>
          )
        ) : (
          <span className={`shrink-0 rounded-full px-3 py-0.5 text-sm font-semibold ${index === 0 ? 'bg-gold text-ink' : 'bg-white/10 text-white/80'}`}>
            {index === 0 ? 'ทางเลือกหลัก' : `ทางเลือก ${index + 1}`}
          </span>
        )}
        {editing ? (
          <input
            value={option.condition}
            onChange={(e) => set({ condition: e.target.value })}
            maxLength={60}
            placeholder={attack ? 'เงื่อนไข เช่น ต้องสปีด 210+' : index === 0 ? 'เงื่อนไข เช่น มีซอรัน C6' : 'เงื่อนไข เช่น ถ้าไม่มีซอรัน C6'}
            className="min-w-0 flex-1 rounded-full border border-white/15 bg-black/20 px-3 py-1 text-sm outline-none focus:border-gold"
          />
        ) : (
          option.condition && <span className="min-w-0 truncate text-sm text-gold">{option.condition}</span>
        )}
        {!editing && shot && teamHeroes.length > 0 && (
          <button type="button" data-shot data-noexport onClick={() => setShooting(true)} disabled={shooting} title="บันทึกคอมพ์นี้เป็นรูป (ทีม + รายละเอียด 3 ตัว)"
            className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-gold/50 bg-gold/10 px-3 py-1 text-sm text-gold hover:bg-gold/20 disabled:opacity-50">
            {shooting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageDown className="h-4 w-4" />} บันทึกรูป
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
                <span className="flex shrink-0 items-center gap-2 font-bold"><span className="brand-mark" aria-hidden="true">✦</span> 7K <span className="font-normal text-gold">Note</span></span>
              </div>
              {option.condition && <p className="mb-3 text-lg font-semibold text-gold">{option.condition}</p>}
              <AtlasTeam team={option.team} skills={option.skills} heroNotes={heroNotes} title={teamTitle(option)} />
              {option.skills.length > 0 && (
                <section className="panel mt-5 p-5">
                  <p className="eyebrow mb-3">ลำดับการออกสกิล · AUTO SKILL PRIORITY</p>
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
                  <GearNote key={`${hero}-${i}`} note={{ ...(noteFor(hero, heroNotes) ?? { text: '', sets: [], rings: [] }), hero }} editing={false}
                    onChange={() => {}} onRemove={() => {}} />
                ))}
              </ul>
            </div>
          </div>,
          document.body,
        )}
        {editing && (
          <div className="ml-auto flex shrink-0 items-center">
            <IconBtn title="เลื่อนขึ้นก่อน" disabled={index === 0} onClick={() => onMove?.(-1)}><ChevronLeft className="h-4 w-4" /></IconBtn>
            <IconBtn title="เลื่อนไปหลัง" disabled={index === total - 1} onClick={() => onMove?.(1)}><ChevronRight className="h-4 w-4" /></IconBtn>
            <IconBtn title="ลบทางเลือกนี้" onClick={onRemove} danger><Trash2 className="h-4 w-4" /></IconBtn>
          </div>
        )}
      </div>

      <TeamPanel
        variant="ally"
        className={part === 'panel' ? 'flex-1' : ''}
        team={option.team}
        heroNotes={heroNotes}
        onSaveHeroStats={onSaveHeroStats}
        skills={option.skills}
        editable={editing}
        title={teamTitle(option)}
        label={`${attack ? 'ทีมบุก' : 'ทางเลือก'} ${index + 1}`}
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
      {editing && onLibrary && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(
            <button type="button" onClick={onLibrary} className="flex items-center gap-1.5 rounded-full border border-sky-300/60 px-3 py-1 text-sm text-sky-100 hover:bg-sky-400/10">
              <Library className="h-4 w-4" /> เลือกจากคลังคอมพ์
            </button>
          )}
        </div>
      )}

      {conflicts.length > 0 && (
        <p className={`mt-3 flex items-start gap-1.5 rounded-lg px-3 py-1.5 text-sm ${main ? 'bg-red-500/20 text-red-100' : 'bg-amber-500/10 text-amber-100/90'}`}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {main ? 'ใช้ตัวซ้ำกับไม้อื่น: ' : 'ถ้าใช้ทีมนี้จะชน: '}
            {conflicts.map((c) => `${c.name} (${c.slots.map((s) => `ไม้ ${s + 1}`).join(', ')})`).join(' · ')}
          </span>
        </p>
      )}

      {badCombos.map((g, i) => (
        <p key={i} className="mt-3 flex items-center gap-1.5 rounded-lg bg-red-500/15 px-3 py-1.5 text-sm text-red-200">
          <AlertTriangle className="h-4 w-4 shrink-0" /> ตรงกับชุดที่ยกเลิก: {g.map((id) => getUnit(id)?.name).join(' + ')}
        </p>
      ))}

      {(teamHeroes.length > 0 || editing) && (
        <div className="mt-3">
          {!editing && (
            <button type="button" onClick={() => setShowGear(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-gold/35 bg-gold/5 px-4 py-3 text-sm font-medium text-gold transition-colors hover:bg-gold/15 focus-visible:outline-2 focus-visible:outline-gold">
              <Users className="h-4 w-4" /> ดูรายละเอียดทั้งทีม ({teamHeroes.length})
            </button>
          )}
          {!editing && showGear && (
            <Modal open wide title={`รายละเอียดทั้งทีม (${teamHeroes.length})`} onClose={() => setShowGear(false)}>
              <ul className="grid items-start gap-4 lg:grid-cols-3">
                {teamHeroes.map((hero, i) => (
                  <GearNote key={`${hero}-${i}`} note={{ ...(noteFor(hero, heroNotes) ?? { text: '', sets: [], rings: [] }), hero }} editing={false}
                    onChange={() => {}} onRemove={() => {}} />
                ))}
              </ul>
              <button type="button" onClick={() => setShowGear(false)} className="btn-gold mt-5 w-full">ปิดรายละเอียด</button>
            </Modal>
          )}
          {editing && (
            <ul className="mt-2 space-y-2">
              {heroNotes.map((n, i) => (
                <GearNote
                  key={i}
                  note={n}
                  editing={editing}
                  onChange={(v) => set({ heroNotes: heroNotes.map((x, j) => (j === i ? v : x)) })}
                  onRemove={() => set({ heroNotes: heroNotes.filter((_, j) => j !== i) })}
                />
              ))}
            </ul>
          )}
          {editing && <StatsImport team={option.team.slots} onApply={(hero, stats) => set({ heroNotes: upsertStats(heroNotes, hero, stats) })} />}
          {editing && <AddHeroNote team={option.team.slots} have={heroNotes.map((n) => n.hero)}
            onAdd={(hero) => set({ heroNotes: [...heroNotes, { hero, text: '', sets: [], rings: [] }].slice(0, 5) })} />}
        </div>
      )}

      {editing ? (
        <textarea
          value={option.notes}
          onChange={(e) => set({ notes: e.target.value })}
          maxLength={500}
          rows={3}
          placeholder={'โน้ต บรรทัดละ 1 ข้อ เช่น\nสปีด 180+ เฟรย่าแบกสปีด\nอาริส จุด 100 บล็อค 78'}
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

function GearNote({ note, editing, onChange, onRemove }: { note: HeroNote; editing: boolean; onChange: (n: HeroNote) => void; onRemove: () => void }) {
  return (
    <li className="min-w-0 rounded-xl bg-black/20 p-3 text-sm">
      <div className="flex items-center gap-2">
        {!editing && <div className="h-16 w-16 shrink-0"><UnitCard id={note.hero} showName={false} /></div>}
        <span className="break-words font-semibold text-gold">{getUnit(note.hero)?.name ?? note.hero}</span>
        {editing && (
          <button type="button" onClick={onRemove} className="ml-auto rounded-full p-0.5 text-white/50 hover:bg-white/10" aria-label="ลบ">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {editing ? (
        <input
          value={note.text}
          onChange={(e) => onChange({ ...note, text: e.target.value })}
          maxLength={300}
          className="mt-1 w-full rounded-lg border border-white/15 bg-black/20 px-2 py-1 outline-none focus:border-gold"
        />
      ) : (
        note.text && <p className="mt-3 whitespace-pre-wrap break-words text-white/80">{note.text}</p>
      )}
      {editing
        ? <EquipmentEditor sets={note.sets} rings={note.rings} onChange={(sets, rings) => onChange({ ...note, sets, rings })} />
        : <EquipmentLoadout sets={note.sets} rings={note.rings} />}
      <StatsGrid stats={note.stats} />
      {!editing && !hasStats(note.stats) && !note.text.trim() && <p className="mt-3 text-white/45">ยังไม่ได้ระบุสเตตัส</p>}
      {!editing && !note.sets.length && !note.rings.length && <p className="mt-2 text-white/45">ยังไม่ได้ระบุอุปกรณ์</p>}
    </li>
  )
}

function teamTitle(o: WarOption) {
  const names = o.team.slots.filter(Boolean).map((id) => baseName(getUnit(id)!.name))
  return names.length ? names.join(' · ') : 'ยังไม่ได้เลือกฮีโร่'
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
