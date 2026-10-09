import { ChevronLeft } from 'lucide-react'
import { Link } from 'react-router'
import TeamPractice from '../components/TeamPractice'

/** หน้าสนามฝึก (/guide/practice) */
export default function PracticePage() {
  return (
    <div>
      <div className="mx-auto max-w-5xl">
        <Link to="/guide#team" className="inline-flex items-center gap-1 text-white/70 hover:text-white">
          <ChevronLeft className="h-5 w-5" /> คู่มือ
        </Link>
        <header className="mb-6 mt-3 text-center">
          <p className="text-xs font-semibold tracking-[0.3em] text-gold/70">PRACTICE · บทที่ 1</p>
          <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">สนามฝึก<span className="text-gold">จัดทีม</span></h1>
          <p className="mt-2 text-sm text-white/60">ลองกดของจริงได้เลย — หน้านี้ไม่บันทึกลงกิลด์ไหน</p>
        </header>
      </div>
      <TeamPractice />
    </div>
  )
}
