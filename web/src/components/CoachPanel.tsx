import { Check, ChevronDown, ChevronUp, Copy, Gamepad2, LogOut, MessageSquare, PartyPopper, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { demoState, resetDemo, subscribeDemo } from '../lib/demo'
import { LESSONS, type LessonKey } from '../lib/lessons'

const LKEY = '7k-note:demo-lesson'
const isLesson = (v: string | null): v is LessonKey => v === 'targets' || v === 'plans' || v === 'discord'

/** แผงภารกิจลอยในกิลด์ทดลอง: ติ๊กเองเมื่อทำสำเร็จบนหน้าจริง */
export default function CoachPanel() {
  const [params] = useSearchParams()
  const [lesson, setLesson] = useState<LessonKey>(() => {
    const q = params.get('lesson')
    if (isLesson(q)) return q
    try { const v = sessionStorage.getItem(LKEY); if (isLesson(v)) return v } catch { /* */ }
    return 'targets'
  })
  const [open, setOpen] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)
  const [, force] = useState(0)
  useEffect(() => subscribeDemo(() => force((n) => n + 1)), [])
  useEffect(() => {
    const q = params.get('lesson')
    if (isLesson(q)) { setLesson(q); setOpen(true) }
  }, [params])
  useEffect(() => { try { sessionStorage.setItem(LKEY, lesson) } catch { /* */ } }, [lesson])

  const s = demoState()
  const L = LESSONS[lesson]
  const status = L.missions.map((m) => (s ? m.done(s) : false))
  const count = status.filter(Boolean).length
  const next = status.findIndex((x) => !x)
  const copy = (t: string) => navigator.clipboard?.writeText(t).then(() => { setCopied(t); setTimeout(() => setCopied(null), 1500) }).catch(() => {})

  return (
    <div data-noexport className="coach-panel fixed left-3 z-30 w-[min(21rem,calc(100vw-1.5rem))]" style={{ top: '7.5rem' }}>
      <div className="panel panel-gold overflow-hidden text-sm shadow-2xl">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left">
          <Gamepad2 className="h-4 w-4 shrink-0 text-gold" />
          <span className="min-w-0 flex-1 truncate font-semibold">ฝึก: {L.title}</span>
          <span className="tabular-nums text-gold">{count}/{L.missions.length}</span>
          {open ? <ChevronUp className="h-4 w-4 text-white/60" /> : <ChevronDown className="h-4 w-4 text-white/60" />}
        </button>
        <div className="h-1 bg-black/40"><div className="h-full bg-gradient-to-r from-[#e2bf72] to-[#fff1c9] transition-all duration-500" style={{ width: `${(count / L.missions.length) * 100}%` }} /></div>

        {open && (
          <div className="max-h-[calc(100dvh-12rem)] overflow-y-auto p-3">
            <p className="rounded-lg bg-black/25 px-2.5 py-1.5 text-[11px] text-white/60">กิลด์ทดลอง · ข้อมูลไม่บันทึกจริง ลองกดได้ทุกอย่าง</p>
            <div className="mt-2 flex gap-1">
              {(Object.keys(LESSONS) as LessonKey[]).map((k) => (
                <button key={k} type="button" onClick={() => setLesson(k)}
                  className={`flex-1 rounded-full px-2 py-1 text-xs ${k === lesson ? 'bg-gradient-to-b from-[#fff1c9] to-[#e2bf72] font-semibold text-ink' : 'text-white/60 hover:bg-white/10'}`}>
                  {LESSONS[k].title}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-white/60">{L.intro}</p>
            <ol className="mt-2 space-y-1.5">
              {L.missions.map((m, i) => {
                const ok = status[i]
                const cur = i === next
                return (
                  <li key={m.title} className={`rounded-lg border p-2 ${ok ? 'border-emerald-400/30 bg-emerald-400/5' : cur ? 'border-gold/60 bg-gold/10' : 'border-white/10 bg-black/15'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${ok ? 'bg-emerald-400 text-ink' : cur ? 'bg-gold text-ink' : 'bg-white/10 text-white/50'}`}>
                        {ok ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                      </span>
                      <span className={ok ? 'text-white/45 line-through' : 'font-medium'}>{m.title}</span>
                    </div>
                    {cur && (
                      <div className="mt-1 pl-7 text-xs leading-relaxed text-white/70">
                        {m.how}
                        {m.copy && (
                          <button type="button" onClick={() => copy(m.copy!)} className="mt-1.5 flex w-full items-center gap-1.5 rounded-md border border-white/15 bg-black/30 px-2 py-1 text-left font-mono text-[10px] text-white/80 hover:border-gold/60">
                            <span className="min-w-0 flex-1 truncate">{m.copy}</span>
                            {copied === m.copy ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5 text-gold" />}
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>
            {count === L.missions.length && (
              <p className="mt-3 flex items-center gap-2 rounded-lg bg-gold/15 p-2 text-xs text-gold"><PartyPopper className="h-4 w-4" /> ผ่านบทนี้แล้ว! ลองบทอื่นด้านบนได้เลย</p>
            )}

            {/* กล่อง Discord จำลอง */}
            {lesson === 'discord' && (
              <div className="mt-3 rounded-lg border border-white/10 bg-[#1e1f22] p-2.5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-white/60"><MessageSquare className="h-3.5 w-3.5" /> # ห้องกิลด์ (จำลอง)</p>
                {s?.sent.length ? s.sent.slice(0, 4).map((m) => (
                  <div key={m.at} className="mt-2 border-l-2 border-gold/50 pl-2 text-xs">
                    <p className="font-semibold text-gold/90">7K Note <span className="font-normal text-white/40">{new Date(m.at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span></p>
                    <p className="whitespace-pre-wrap text-white/80">{m.text}</p>
                  </div>
                )) : <p className="mt-1.5 text-xs text-white/40">ยังไม่มีข้อความ</p>}
              </div>
            )}

            <div className="mt-3 flex gap-2 text-xs">
              <button type="button" onClick={() => { void resetDemo().then(() => window.location.reload()) }} className="flex flex-1 items-center justify-center gap-1 rounded-full border border-white/15 py-1.5 text-white/60 hover:border-gold/50 hover:text-gold">
                <RotateCcw className="h-3.5 w-3.5" /> เริ่มใหม่
              </button>
              <Link to="/" className="flex flex-1 items-center justify-center gap-1 rounded-full border border-white/15 py-1.5 text-white/60 hover:border-gold/50 hover:text-gold">
                <LogOut className="h-3.5 w-3.5" /> ออกจากกิลด์ทดลอง
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
