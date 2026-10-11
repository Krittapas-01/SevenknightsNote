import { CircleHelp } from 'lucide-react'
import { closeAllTours, startTour, useTourState } from '../lib/tour'
import { tx } from '../lib/i18n'

/** ปุ่ม ? บนหัวเว็บ: เล่นการสอนของหน้านี้อีกครั้ง (โผล่เฉพาะหน้าที่มีการสอน) */
export default function TourHelpButton() {
  const { available, active } = useTourState()
  const id = available.at(-1)
  if (!id) return null
  return (
    <button type="button" data-tour="help-button" onClick={() => (active ? closeAllTours() : startTour(id))} title={tx('ดูการสอนใช้หน้านี้')} aria-label={tx('ดูการสอนใช้หน้านี้')}
      className="mr-2 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/20 text-white/80 hover:border-gold hover:text-gold">
      <CircleHelp className="h-5 w-5" />
    </button>
  )
}
