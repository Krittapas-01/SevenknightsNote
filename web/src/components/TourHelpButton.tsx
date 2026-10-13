import { CircleHelp } from 'lucide-react'
import { closeAllTours, startTour, useTourState } from '../lib/tour'
import { tx } from '../lib/i18n'
import { useAuth } from '../lib/auth'

/** ปุ่ม ? บนหัวเว็บ: เล่นการสอนของหน้านี้อีกครั้ง (โผล่เฉพาะหน้าที่มีการสอน) */
export default function TourHelpButton() {
  const { available, active } = useTourState()
  const id = available.at(-1)
  // ล็อกอินแล้ว: มือถือย้ายไปอยู่ในเมนูรูปโปรไฟล์ (หัวเว็บไม่เบียด)
  const loggedIn = !!useAuth().user
  if (!id) return null
  return (
    <button type="button" data-tour="help-button" onClick={() => (active ? closeAllTours() : startTour(id))} title={tx('ดูการสอนใช้หน้านี้')} aria-label={tx('ดูการสอนใช้หน้านี้')}
      className={`mr-1 h-9 w-9 shrink-0 place-items-center rounded-full text-white/80 hover:bg-white/10 hover:text-gold ${loggedIn ? 'hidden sm:grid' : 'grid'}`}>
      <CircleHelp className="h-5 w-5" />
    </button>
  )
}
