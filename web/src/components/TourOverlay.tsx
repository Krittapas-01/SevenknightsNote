import { ChevronLeft, ChevronRight, CircleHelp, MousePointerClick, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { endTour, goStep, registerTours, startTour, useTourState } from '../lib/tour'
import { TOURS } from '../lib/tours'
import { tx, L } from '../lib/i18n'
import { uiZoom } from '../lib/zoom'

registerTours(TOURS)

type Box = { top: number; left: number; width: number; height: number }
const PAD = 6
const visible = (el: Element) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 }
/** ขอบบนที่ใช้ได้จริง (ใต้หัวเว็บ + แถบ Season/ประกาศที่ติดด้านบน) — พิกเซลจอ */
const safeTop = () => Math.max(0, ...[...document.querySelectorAll('[data-sticky-top]')].map((e) => e.getBoundingClientRect().bottom))
const find = (sel: string) => [...document.querySelectorAll(sel)].find(visible) ?? null

/** ชั้นสอนใช้: ส่องสิ่งที่สอน (ที่เหลือมืดลง) + กล่องอธิบายข้าง ๆ · อยู่ใน Layout ทุกหน้า */
export default function TourOverlay() {
  const { active } = useTourState()
  const step = active?.tour.steps[active.i]
  const [box, setBox] = useState<Box | null>(null)
  const [ready, setReady] = useState(false)
  const card = useRef<HTMLDivElement>(null)
  const [cardH, setCardH] = useState(180)

  // หาสิ่งที่ต้องส่อง (รอให้โผล่ได้สักพัก — เช่น เมนูเพิ่งเปิด) · ไม่เจอ = ข้ามขั้นนี้
  useEffect(() => {
    setReady(false)
    setBox(null)
    if (!active || !step) return
    if (!step.sel) { setReady(true); return }
    const sel = step.sel
    const until = performance.now() + (step.wait ?? 1500)
    let raf = 0
    let el: Element | null = null
    const measure = () => {
      if (!el || !el.isConnected) el = find(sel)
      if (el) {
        // จอคอมย่อทั้งเว็บด้วย zoom → ตำแหน่งจริงต้องหารกลับเป็นพิกเซลของหน้า
        const z = uiZoom(), q = el.getBoundingClientRect()
        const r = { top: q.top / z, left: q.left / z, width: q.width / z, height: q.height / z }
        setBox((b) => (b && Math.abs(b.top - r.top) < 0.5 && Math.abs(b.left - r.left) < 0.5 && b.width === r.width && b.height === r.height ? b : { top: r.top, left: r.left, width: r.width, height: r.height }))
      }
      raf = requestAnimationFrame(measure)
    }
    const look = () => {
      el = find(sel)
      if (el) {
        const r = el.getBoundingClientRect()
        // อยู่นอกจอ/ใต้แถบที่ติดด้านบน → เลื่อนมาไว้กลางพื้นที่ที่มองเห็น (เว้นที่ให้กล่องอธิบาย)
        const top = safeTop()
        if (r.top < top + 12 || r.bottom > window.innerHeight - 140) {
          const h = el as HTMLElement
          const prev = h.style.scrollMarginTop
          h.style.scrollMarginTop = `${(top + 16) / uiZoom()}px`
          h.scrollIntoView({ block: r.height > window.innerHeight - top - 200 ? 'start' : 'center', behavior: 'smooth' })
          h.style.scrollMarginTop = prev
        }
        setReady(true)
        measure()
      } else if (performance.now() < until) raf = requestAnimationFrame(look)
      else goStep(active.i + 1)
    }
    look()
    return () => cancelAnimationFrame(raf)
  }, [active, step])

  // ขั้น "ลองกดเอง": กดสิ่งที่ส่องแล้วไปขั้นต่อไป
  useEffect(() => {
    if (!active || !step?.sel || step.action !== 'click' || !ready) return
    const el = find(step.sel)
    if (!el) return
    const i = active.i
    const onClick = () => window.setTimeout(() => goStep(i + 1), 350)
    el.addEventListener('click', onClick, { once: true, capture: true })
    return () => el.removeEventListener('click', onClick, { capture: true })
  }, [active, step, ready])

  // คีย์บอร์ด: Esc ปิด · ←/→ ย้อน/ถัดไป
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') endTour()
      else if (e.key === 'ArrowRight' && step?.action !== 'click') goStep(active.i + 1)
      else if (e.key === 'ArrowLeft' && active.i > 0) goStep(active.i - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, step])

  useLayoutEffect(() => { if (card.current) setCardH(card.current.offsetHeight) }, [step, ready])

  if (!active || !step || !ready) return null
  const n = active.tour.steps.length
  const last = active.i === n - 1
  const z = uiZoom()
  const vw = window.innerWidth / z, vh = window.innerHeight / z
  const W = Math.min(360, vw - 24)
  // กล่องอธิบาย: ใต้สิ่งที่ส่อง ถ้าที่ไม่พอไว้ด้านบน · ไม่มีสิ่งที่ส่อง = กลางจอ
  let pos: { top: number; left: number }
  if (box) {
    const below = box.top + box.height + PAD + 12
    const above = box.top - PAD - 12 - cardH
    // ใต้ → บน → (สิ่งที่ส่องสูงเกินจอ) ชิดล่างจอ
    const top = below + cardH < vh - 8 ? below : above >= safeTop() / z + 8 ? above : vh - cardH - 8
    pos = { top, left: Math.min(vw - W - 12, Math.max(12, box.left + box.width / 2 - W / 2)) }
  } else pos = { top: Math.max(12, vh / 2 - cardH / 2), left: vw / 2 - W / 2 }

  return createPortal(
    <div className="tour-layer" role="dialog" aria-modal="false" aria-label={step.title}>
      {box
        ? <div className="tour-spot" style={{ top: box.top - PAD, left: box.left - PAD, width: box.width + PAD * 2, height: box.height + PAD * 2 }} />
        : <div className="tour-dim" />}
      <div ref={card} key={`${active.tour.id}-${active.i}`} className="tour-card panel panel-gold" style={{ top: pos.top, left: pos.left, width: W }}>
        <div className="flex items-start gap-2">
          <p className="flex-1 text-xs font-semibold tabular-nums text-gold/80">{L(`สอนใช้ · ${active.i + 1}/${n}`, `Guide · ${active.i + 1}/${n}`)}</p>
          <button type="button" onClick={endTour} aria-label={tx('ปิดการสอน')} className="-mr-1 -mt-1 rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 className="mt-1 text-base font-bold text-gold">{step.title}</h3>
        <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-white/80">{step.body}</p>
        {step.action === 'click' && (
          <p className="tour-try mt-3 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-gold">
            <MousePointerClick className="h-4 w-4 shrink-0" />{' '}{tx('ลองกดที่ปุ่มที่ส่องไว้ได้เลย')}
          </p>
        )}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex flex-1 gap-1" aria-hidden>
            {active.tour.steps.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === active.i ? 'w-4 bg-gold' : i < active.i ? 'w-1.5 bg-gold/50' : 'w-1.5 bg-white/20'}`} />)}
          </div>
          {active.i > 0 && (
            <button type="button" onClick={() => goStep(active.i - 1)} className="pill flex items-center px-2.5 py-1 text-sm" aria-label={tx('ย้อนกลับ')}>
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {step.action === 'click'
            ? <button type="button" onClick={() => goStep(active.i + 1)} className="pill px-3 py-1 text-sm text-white/70">{tx('ข้ามขั้นนี้')}</button>
            : (
              <button type="button" onClick={() => goStep(active.i + 1)} className="btn-gold flex items-center gap-1 px-4 py-1.5 text-sm">
                {last ? tx('เข้าใจแล้ว') : <>{tx('ถัดไป')}<ChevronRight className="h-4 w-4" /></>}
              </button>
            )}
        </div>
        {active.i === 0 && n > 1 && (
          <button type="button" onClick={endTour} className="mt-2 text-xs text-white/45 underline-offset-2 hover:text-white/70 hover:underline">{tx('ข้ามการสอนทั้งหมด')}</button>
        )}
      </div>
    </div>,
    document.body,
  )
}

/** ปุ่ม ? บนหัวเว็บ: เล่นการสอนของหน้านี้อีกครั้ง (โผล่เฉพาะหน้าที่มีการสอน) */
export function TourHelpButton() {
  const { available, active } = useTourState()
  const id = available.at(-1)
  if (!id) return null
  return (
    <button type="button" data-tour="help-button" onClick={() => (active ? endTour() : startTour(id))} title={tx('ดูการสอนใช้หน้านี้')} aria-label={tx('ดูการสอนใช้หน้านี้')}
      className="mr-2 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/20 text-white/80 hover:border-gold hover:text-gold">
      <CircleHelp className="h-5 w-5" />
    </button>
  )
}
