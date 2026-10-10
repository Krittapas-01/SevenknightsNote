import { History } from 'lucide-react'
import { agoText, recallNote, sameAsSaved } from '../lib/myStats'
import type { HeroNote } from '../lib/types'
import { tx } from '../lib/i18n'

/** ปุ่ม "ใช้ค่าความสามารถล่าสุดของฉัน" — เติมค่าความสามารถ/เซต/เครื่องประดับ (และโน้ตถ้ายังว่าง) จากที่เครื่องนี้เคยบันทึก */
export default function RecallStats({ note, onApply }: { note: HeroNote; onApply: (n: HeroNote) => void }) {
  const saved = recallNote(note.hero)
  if (!saved || sameAsSaved(note, saved)) return null
  return (
    <button
      type="button"
      onClick={() => onApply({ ...note, stats: saved.note.stats, sets: saved.note.sets, rings: saved.note.rings, text: note.text.trim() ? note.text : saved.note.text })}
      className="mt-2 flex items-center gap-1 rounded-full border border-sky-300/40 px-2.5 py-0.5 text-xs text-sky-100 hover:bg-sky-400/10"
      title={tx('เติมค่าความสามารถ เซต และเครื่องประดับ จากที่เครื่องนี้บันทึกไว้ล่าสุด')}
    >
      <History className="h-3.5 w-3.5" />{' '}{tx('ใช้ค่าความสามารถล่าสุดของฉัน (')}{agoText(saved.at)})
    </button>
  )
}
