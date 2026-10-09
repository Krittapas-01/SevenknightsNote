import { Gamepad2 } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import { GUIDE } from '../lib/guide'

export default function GuidePage() {
  const { hash } = useLocation()
  // เปิดจากปุ่ม ? (เช่น /guide#plans) → เลื่อนไปหัวข้อนั้น
  useEffect(() => {
    const id = hash.slice(1)
    if (!id) return
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    return () => clearTimeout(t)
  }, [hash])

  return (
    <div className="mx-auto max-w-4xl">
      <header className="text-center">
        <p className="text-xs font-semibold tracking-[0.3em] text-gold/70">HOW TO USE</p>
        <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">คู่มือ<span className="text-gold">การใช้งาน</span></h1>
        <p className="mt-2 text-sm text-white/60">ทุกฟีเจอร์ของ 7K Note ในหน้าเดียว · <Link to="/updates" className="text-gold underline underline-offset-4">ดูอัปเดตล่าสุด</Link></p>
      </header>

      {/* สนามฝึก — เรียนจากการลงมือทำ */}
      <Link to="/guide/practice" className="panel panel-gold group mt-6 flex items-center gap-4 p-4 transition hover:-translate-y-0.5 sm:p-5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-gold/60 bg-gold/15 text-gold"><Gamepad2 className="h-6 w-6" /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">ลองเองเลยที่สนามฝึก</span>
          <span className="block text-sm text-white/60">ทำภารกิจจัดทีมด้วยหน้าจอจริง · ไม่บันทึกลงกิลด์ กดได้ไม่ต้องกลัวพัง</span>
        </span>
        <span className="btn-gold shrink-0 px-4 py-2 text-sm font-semibold">เริ่มฝึก</span>
      </Link>

      {/* สารบัญ */}
      <nav className="panel mt-6 flex flex-wrap justify-center gap-2 p-3">
        {GUIDE.map(({ id, icon: Icon, title }) => (
          <a key={id} href={`#${id}`} className="pill flex items-center gap-1.5 px-3 py-1 text-xs text-white/80 hover:border-gold/60 hover:text-gold">
            <Icon className="h-3.5 w-3.5" /> {title}
          </a>
        ))}
      </nav>

      <div className="mt-6 space-y-5">
        {GUIDE.map(({ id, icon: Icon, title, intro, steps, tips, practice }) => (
          <section key={id} id={id} className="panel scroll-mt-24 p-5 sm:p-6">
            <h2 className="flex items-center gap-2.5 text-xl font-bold">
              <span className="grid h-9 w-9 place-items-center rounded-full border border-gold/50 bg-gold/10 text-gold"><Icon className="h-5 w-5" /></span>
              {title}
            </h2>
            <p className="mt-2 text-sm text-white/65">{intro}</p>
            <ol className="mt-4 space-y-2.5">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed text-white/85">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold/15 text-xs font-bold text-gold">{i + 1}</span>
                  <span className="pt-0.5">{s}</span>
                </li>
              ))}
            </ol>
            {practice && (
              <Link to={practice === 'team' ? '/guide/practice' : `/g/demo?lesson=${practice}`} className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-gold/60 bg-gold/10 px-4 py-1.5 text-sm font-semibold text-gold hover:bg-gold/20">
                <Gamepad2 className="h-4 w-4" /> ลองเลยในสนามฝึก
              </Link>
            )}
            {tips && (
              <ul className="mt-4 space-y-1.5 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/60">
                {tips.map((t, i) => <li key={i} className="flex gap-2"><span className="text-gold">✦</span><span>{t}</span></li>)}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
