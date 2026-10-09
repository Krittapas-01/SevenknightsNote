import { CircleHelp, Gamepad2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { GUIDE } from '../lib/guide'
import PracticeButton from './PracticeButton'

/**
 * ปุ่ม "วิธีใช้" — เปิดแผงด้านข้างบนหน้าเดิม เฉพาะหัวข้อของหน้านี้ (ไม่ต้องไปหน้าคู่มือ)
 * แต่ละหัวข้อมีปุ่มลองฝึก: จัดทีม = สนามฝึกซ้อนบนหน้า · ที่เหลือ = บทเรียนในกิลด์ทดลอง
 */
export default function HelpLink({ section, className = '' }: { section: string | string[]; className?: string }) {
  const [open, setOpen] = useState(false)
  const ids = Array.isArray(section) ? section : [section]
  const list = ids.map((id) => GUIDE.find((g) => g.id === id)).filter((g): g is NonNullable<typeof g> => !!g)

  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[data-app-modal]')) setOpen(false) }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open])

  return (
    <>
      <button type="button" data-noexport onClick={() => setOpen(true)} title="วิธีใช้หน้านี้"
        className={`inline-flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-xs text-white/60 hover:border-gold/60 hover:text-gold ${className}`}>
        <CircleHelp className="h-3.5 w-3.5" /> วิธีใช้
      </button>
      {open && (
        <div data-noexport className="fixed inset-0" style={{ zIndex: 44 }}>
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="help-drawer absolute inset-y-0 right-0 flex w-[min(26rem,100vw)] flex-col border-l border-gold/25 bg-[#11162a] shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              <CircleHelp className="h-5 w-5 text-gold" />
              <span className="font-bold">วิธีใช้หน้านี้</span>
              <button onClick={() => setOpen(false)} aria-label="ปิด" className="ml-auto rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {list.map(({ id, icon: Icon, title, intro, steps, tips, practice }) => (
                <section key={id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <h3 className="flex items-center gap-2 font-bold"><Icon className="h-4 w-4 text-gold" /> {title}</h3>
                  <p className="mt-1 text-xs text-white/60">{intro}</p>
                  <ol className="mt-3 space-y-2">
                    {steps.map((s, i) => (
                      <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-white/85">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gold/15 text-[11px] font-bold text-gold">{i + 1}</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ol>
                  {tips && <ul className="mt-3 space-y-1 text-xs text-white/55">{tips.map((t, i) => <li key={i} className="flex gap-1.5"><span className="text-gold">✦</span><span>{t}</span></li>)}</ul>}
                  {practice === 'team' && <PracticeButton className="mt-3 px-3 py-1.5 text-sm font-semibold" />}
                  {practice && practice !== 'team' && (
                    <Link to={`/g/demo?lesson=${practice}`} onClick={() => setOpen(false)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-sm font-semibold text-gold hover:bg-gold/20">
                      <Gamepad2 className="h-4 w-4" /> ลองฝึกในกิลด์ทดลอง
                    </Link>
                  )}
                </section>
              ))}
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
