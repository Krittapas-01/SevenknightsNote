import { AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, Library, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import EquipmentLoadout from './EquipmentLoadout'
import { baseName, getUnit } from '../data/heroes'
import { changeFormation, moveSlot, placeUnit, type HeroNote, type WarOption } from '../lib/types'
import TeamPanel, { type SlotKind } from './TeamPanel'

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
}

const baseId = (id: string) => baseName(getUnit(id)?.name ?? id)

/** ทางเลือก 1 ทีมในไม้นั้น ๆ */
export default function OptionCard({ option, index, total, editing, banned, onChange, onRemove, onMove, onPick, onLibrary, attack }: Props) {
  const [showGear, setShowGear] = useState(false)
  const heroNotes = option.heroNotes ?? []
  const inTeam = new Set(option.team.slots.filter(Boolean).map((id) => baseId(id!)))
  const badCombos = banned.filter((g) => g.length > 0 && g.every((id) => inTeam.has(baseId(id))))
  const notes = option.notes.split('\n').map((l) => l.trim()).filter(Boolean)
  const set = (patch: Partial<WarOption>) => onChange?.({ ...option, ...patch })

  return (
    <div className="flex flex-col">
      {/* หัวการ์ด: ลำดับทางเลือก + เงื่อนไข */}
      <div className="mb-4 flex min-h-8 items-center gap-2">
        <span className={`shrink-0 rounded-full px-3 py-0.5 text-sm font-semibold ${index === 0 && !attack ? 'bg-gold text-ink' : 'bg-white/10 text-white/80'}`}>
          {attack ? `ทีมบุก ${index + 1}` : index === 0 ? 'ทางเลือกหลัก' : `ทางเลือก ${index + 1}`}
        </span>
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
        team={option.team}
        skills={option.skills}
        editable={editing}
        title={teamTitle(option)}
        label={`${attack ? 'ทีมบุก' : 'ทางเลือก'} ${index + 1}`}
        onSlotClick={onPick}
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

      {editing && onLibrary && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(
            <button type="button" onClick={onLibrary} className="flex items-center gap-1.5 rounded-full border border-sky-300/60 px-3 py-1 text-sm text-sky-100 hover:bg-sky-400/10">
              <Library className="h-4 w-4" /> เลือกจากคลังคอมพ์
            </button>
          )}
        </div>
      )}

      {badCombos.map((g, i) => (
        <p key={i} className="mt-3 flex items-center gap-1.5 rounded-lg bg-red-500/15 px-3 py-1.5 text-sm text-red-200">
          <AlertTriangle className="h-4 w-4 shrink-0" /> ตรงกับชุดที่ยกเลิก: {g.map((id) => getUnit(id)?.name).join(' + ')}
        </p>
      ))}

      {heroNotes.length > 0 && (
        <div className="mt-3">
          {!editing && (
            <button type="button" onClick={() => setShowGear((v) => !v)} className="flex items-center gap-1 text-sm text-white/60 hover:text-white">
              <ChevronDown className={`h-4 w-4 transition ${showGear ? 'rotate-180' : ''}`} /> ของ/สเตตัสรายตัว ({heroNotes.length})
            </button>
          )}
          {(editing || showGear) && (
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
    </div>
  )
}

function GearNote({ note, editing, onChange, onRemove }: { note: HeroNote; editing: boolean; onChange: (n: HeroNote) => void; onRemove: () => void }) {
  return (
    <li className="rounded-xl bg-black/20 p-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-gold">{getUnit(note.hero)?.name ?? note.hero}</span>
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
        note.text && <p className="mt-1 text-white/80">{note.text}</p>
      )}
      <EquipmentLoadout sets={note.sets} rings={note.rings} />
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
