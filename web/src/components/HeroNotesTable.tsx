import { Eraser, PencilLine, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { hasStats } from '../lib/stats'
import { StatsGrid, StatsImport, upsertStats, type NoteExtra } from './HeroStats'
import type { HeroStats } from '../lib/stats'
import { unitBase } from '../data/heroes'
import { RingRow, SetRow } from './EquipmentLoadout'
import type { HeroNote } from '../lib/types'
import UnitCard from './UnitCard'
import EquipmentEditor from './EquipmentEditor'
import AddHeroNote from './AddHeroNote'
import RecallStats from './RecallStats'
import { L, tx } from '../lib/i18n'

/**
 * อุปกรณ์/ค่าความสามารถรายตัว แบบตารางใน 7k-combo:
 * [อัศวิน] [เครื่องประดับ 3 ช่อง / เซตไอเทม 3 ช่อง] [รายละเอียด]
 * editing = แก้ข้อความรายละเอียดได้ + ลบแถวได้ (เครื่องประดับ/เซตมาจากที่จดไว้)
 */
export default function HeroNotesTable({ notes, editing, onChange, team, onAddHero, onAddWithStats, leading }: {
  notes: HeroNote[]
  editing?: boolean
  onChange?: (n: HeroNote[]) => void
  /** ทีม (ใช้ปุ่มเพิ่มแถวตอนแก้ไข) */
  team?: (string | null)[]
  /** เพิ่มอัศวินเข้าทีมจากหน้าต่างอ่านค่าความสามารถ (ทีมยังไม่ครบ 3) */
  onAddHero?: (hero: string) => void
  /** เพิ่มเข้าทีม + ใส่ข้อมูลในครั้งเดียว (ที่ที่ทีมกับโน้ตอยู่ใน state ก้อนเดียว เช่นการ์ดในแผน) */
  onAddWithStats?: (hero: string, stats: HeroStats, extra?: NoteExtra) => void
  /** ปุ่มเพิ่มเติมหน้าแถวปุ่ม (เช่น เลือกจากที่จดไว้) */
  leading?: ReactNode
}) {
  // ปุ่มแก้ค่าความสามารถในแถว → เปิดหน้าต่างอ่านค่า (ตัวเดียวกับปุ่มด้านบน) ที่ช่องกรอกของตัวนั้น
  const [editReq, setEditReq] = useState<{ hero: string; seq: number } | null>(null)
  const addRow = editing && team && (
    <div className="flex flex-wrap items-center gap-x-3">
      {leading}
      <StatsImport team={team} notes={notes} onApply={(hero, stats, extra) => onChange?.(upsertStats(notes, hero, stats, extra))} onAddHero={onAddHero} onAddWithStats={onAddWithStats} editRequest={editReq} />
      <AddHeroNote team={team} have={notes.map((n) => n.hero)} onAdd={(hero) => onChange?.([...notes, { hero, text: '', sets: [], rings: [] }].slice(0, 5))} />
    </div>
  )
  if (!notes.length) return addRow || null
  return (
    <>
    {/* ปุ่มอ่านค่าความสามารถจากรูป / เพิ่มของรายตัว อยู่บนตาราง (เห็นก่อน ไม่ต้องเลื่อนลงไปหา) */}
    {addRow && <div className="mb-2">{addRow}</div>}
    <div className="@container overflow-hidden rounded-2xl border border-white/10">
      {/* กว้างตามกล่องที่วาง (container query) — การ์ดแคบในแผนเรียงซ้อน · หน้าบ้านศัตรูเป็น 2 คอลัมน์ */}
      <div className="hidden grid-cols-[minmax(0,17rem)_1fr] bg-white/5 text-sm font-semibold text-white/70 @xl:grid">
        <div className="border-r border-white/10 px-4 py-2 text-center">{tx('อัศวิน')}</div>
        <div className="px-4 py-2 text-center">{tx('รายละเอียด')}</div>
      </div>
      {notes.map((n, i) => (
        <div key={i} className={`grid grid-cols-1 border-white/10 @xl:grid-cols-[minmax(0,17rem)_1fr] ${i ? 'border-t' : '@xl:border-t'}`}>
          <div className="flex gap-3 border-white/10 p-3 @xl:border-r">
            <div className="w-16 shrink-0 text-center">
              <div className="aspect-[4/5] w-16 text-[12px]"><UnitCard id={n.hero} small /></div>
              <div className="mt-1 truncate text-xs text-white/60">{unitBase(n.hero)}</div>
            </div>
            {editing ? (
              <div className="min-w-0">
                <EquipmentEditor sets={n.sets} rings={n.rings}
                  onChange={(sets, rings) => onChange?.(notes.map((x, j) => (j === i ? { ...x, sets, rings } : x)))} />
                <RecallStats note={n} onApply={(v) => onChange?.(notes.map((x, j) => (j === i ? v : x)))} />
              </div>
            ) : (
              <div className="min-w-0 space-y-1.5">
                <RingRow rings={n.rings} label />
                <SetRow sets={n.sets} label />
              </div>
            )}
          </div>
          <div className="relative p-3 text-[15px] leading-relaxed text-white/85">
            {editing ? (
              <>
                <textarea
                  value={n.text}
                  onChange={(e) => onChange?.(notes.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                  maxLength={300}
                  rows={3}
                  className="block min-h-20 w-full resize-y rounded-lg border border-white/15 bg-black/20 p-2 pr-8 text-sm outline-none focus:border-gold"
                />
                <button type="button" onClick={() => onChange?.(notes.filter((_, j) => j !== i))} title={tx('ลบแถวนี้')}
                  className="absolute right-4 top-4 rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-red-300">
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <p className="whitespace-pre-wrap">{n.text || <span className="text-white/35">—</span>}</p>
            )}
            <StatsGrid stats={n.stats} />
            {/* ล้างข้อมูลของตัวนี้ (ค่าความสามารถ · เซต · เครื่องประดับ · คำอธิบาย) แต่เก็บแถวไว้ — ✕ มุมขวา = เอาแถวออก */}
            {editing && (() => {
              const has = hasStats(n.stats) || n.sets.length > 0 || n.rings.length > 0 || !!n.text.trim()
              return (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                {team && (
                  <button type="button" onClick={() => setEditReq((r) => ({ hero: n.hero, seq: (r?.seq ?? 0) + 1 }))}
                    className="flex items-center gap-1.5 rounded-full border border-gold/50 bg-gold/10 px-3 py-1 text-sm text-gold hover:border-gold hover:bg-gold/15">
                    <PencilLine className="h-4 w-4" />{' '}{hasStats(n.stats) ? L('แก้ค่าความสามารถ', 'Edit stats') : L('ใส่ค่าความสามารถ', 'Add stats')}
                  </button>
                )}
                <button type="button" disabled={!has} title={has ? tx('ล้างค่าความสามารถ เซต เครื่องประดับ และคำอธิบายของตัวนี้') : tx('ยังไม่มีข้อมูล')}
                  onClick={() => onChange?.(notes.map((x, j) => (j === i ? { ...x, stats: undefined, sets: [], rings: [], text: '' } : x)))}
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-red-300/80 hover:bg-red-500/15 hover:text-red-200 disabled:pointer-events-none disabled:opacity-30">
                  <Eraser className="h-3.5 w-3.5" />{' '}{tx('ล้างข้อมูลตัวนี้')}
                </button>
                </div>
              )
            })()}
          </div>
        </div>
      ))}
    </div>
    </>
  )
}
