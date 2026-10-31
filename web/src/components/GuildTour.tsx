import { BookOpen, ChevronLeft, ChevronRight, ClipboardList, KeyRound, MessageCircle, Sparkles, Users, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { seenLatest } from '../lib/changelog'
import Modal from './Modal'

const KEY = '7k-note:tour-guild'
const STEPS: { icon: LucideIcon; title: string; text: string; guide: string }[] = [
  { icon: Sparkles, title: 'ยินดีต้อนรับสู่ 7K Note', text: 'สมุดจดของกิลด์สำหรับ Guild War — ทุกคนที่มีลิงก์นี้เห็นแผนและทีมเดียวกัน', guide: 'start' },
  { icon: ClipboardList, title: 'สองแท็บหลัก', text: '"แผนสงคราม" = แต่ละไม้ใช้ทีมไหนตีบ้านไหน · "บ้านศัตรู" = บ้านศัตรูที่จดไว้ พร้อมทีมแก้', guide: 'targets' },
  { icon: KeyRound, title: 'อยากช่วยแก้แผน?', text: 'กด "ใส่รหัสแก้ไข" (ขอรหัสจากหัวกิลด์) หรือเข้าสู่ระบบ Discord ถ้ากิลด์ตั้งยศที่แก้ได้ไว้', guide: 'edit' },
  { icon: Users, title: 'จัดทีมง่าย ๆ', text: 'แตะช่องว่าง → เลือกตัวจากแถบด้านล่าง · แตะตัวซ้ำเพื่อเอาออก · วงกลมดาว = ตั้งลำดับการใช้สกิล', guide: 'team' },
  { icon: MessageCircle, title: 'สงสัยหรือเจอบั๊ก', text: 'กด "วิธีใช้" ตามหน้าต่าง ๆ เพื่อเปิดคู่มือ หรือทักผ่านปุ่ม Discord มุมขวาล่าง', guide: 'contact' },
]

/** ทัวร์สั้น ๆ ครั้งแรกที่เปิดหน้ากิลด์ (รอให้ป๊อปอัป "มีอะไรใหม่" ปิดก่อน) */
import { TUTORIAL_ON } from '../lib/onboarding'
export default function GuildTour() { return TUTORIAL_ON ? <TourInner /> : null }
function TourInner() {
  const [open, setOpen] = useState(false)
  const [i, setI] = useState(0)

  useEffect(() => {
    try { if (localStorage.getItem(KEY)) return } catch { return }
    let t: ReturnType<typeof setTimeout> | undefined
    const show = () => { t = setTimeout(() => setOpen(true), 400) }
    const onSeen = () => { if (!seenLatest()) return; window.removeEventListener('7k-note:update-seen', onSeen); show() }
    if (seenLatest()) show()
    else window.addEventListener('7k-note:update-seen', onSeen)
    return () => { clearTimeout(t); window.removeEventListener('7k-note:update-seen', onSeen) }
  }, [])

  const close = () => {
    setOpen(false)
    try { localStorage.setItem(KEY, '1') } catch { /* ไม่มี storage ก็ไม่เป็นไร */ }
  }
  const s = STEPS[i]
  const last = i === STEPS.length - 1

  return (
    <Modal open={open} title={<span className="text-sm text-white/60">แนะนำการใช้งาน · {i + 1}/{STEPS.length}</span>} onClose={close}>
      <div className="text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-gold/50 bg-gold/10 text-gold"><s.icon className="h-7 w-7" /></span>
        <h3 className="mt-3 text-lg font-bold">{s.title}</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-white/75">{s.text}</p>
        <Link to={`/guide#${s.guide}`} onClick={close} className="mt-2 inline-flex items-center gap-1 text-xs text-gold/80 hover:text-gold"><BookOpen className="h-3.5 w-3.5" /> อ่านเพิ่มในคู่มือ</Link>
      </div>
      <div className="mt-5 flex justify-center gap-1.5" aria-hidden="true">
        {STEPS.map((_, j) => <span key={j} className={`h-1.5 rounded-full transition-all ${j === i ? 'w-5 bg-gold' : 'w-1.5 bg-white/25'}`} />)}
      </div>
      <div className="mt-5 flex items-center gap-2">
        <button onClick={close} className="px-2 py-2 text-sm text-white/50 hover:text-white">ข้าม</button>
        <div className="ml-auto flex gap-2">
          {i > 0 && <button onClick={() => setI(i - 1)} className="pill flex items-center gap-1 px-3 py-2 text-sm"><ChevronLeft className="h-4 w-4" /> ก่อนหน้า</button>}
          <button onClick={() => (last ? close() : setI(i + 1))} className="btn-gold flex items-center gap-1 px-5 py-2 text-sm font-semibold">
            {last ? 'เริ่มใช้งาน' : <>ถัดไป <ChevronRight className="h-4 w-4" /></>}
          </button>
        </div>
      </div>
    </Modal>
  )
}
