import { BookOpen, Sparkles } from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router'
import { CHANGELOG, markUpdateSeen } from '../lib/changelog'

/** หน้ารวมอัปเดตทั้งหมด (ใหม่สุดบนสุด) */
export default function UpdatesPage() {
  useEffect(() => markUpdateSeen(), [])
  return (
    <div className="mx-auto max-w-3xl">
      <header className="text-center">
        <p className="text-xs font-semibold tracking-[0.3em] text-gold/70">WHAT'S NEW</p>
        <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">อัปเดต<span className="text-gold">ล่าสุด</span></h1>
        <p className="mt-2 text-sm text-white/60">ฟีเจอร์ใหม่และสิ่งที่ปรับปรุง · <Link to="/guide" className="text-gold underline underline-offset-4">คู่มือการใช้งาน</Link></p>
      </header>
      <ol className="relative mt-8 space-y-6 border-l border-gold/25 pl-6">
        {CHANGELOG.map((c, i) => (
          <li key={c.id} className="relative">
            <span className={`absolute -left-[31px] top-1.5 grid h-4 w-4 place-items-center rounded-full border ${i === 0 ? 'border-gold bg-gold/30' : 'border-white/30 bg-[#161c2e]'}`} />
            <p className="text-xs text-white/50">{c.date}{i === 0 && <span className="ml-2 rounded-full bg-gold/20 px-2 py-0.5 text-gold">ล่าสุด</span>}</p>
            <div className="panel mt-1.5 p-4 sm:p-5">
              <h2 className="flex items-center gap-2 font-bold"><Sparkles className="h-4 w-4 text-gold" /> {c.title}</h2>
              <ul className="mt-3 space-y-2">
                {c.items.map((it, j) => (
                  <li key={j} className="flex gap-2 text-sm leading-relaxed text-white/80">
                    <span className="text-gold">✦</span>
                    <span>
                      {it.text}
                      {it.guide && <Link to={`/guide#${it.guide}`} className="ml-1.5 inline-flex items-center gap-1 whitespace-nowrap text-xs text-gold/80 hover:text-gold"><BookOpen className="h-3 w-3" />วิธีใช้</Link>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
