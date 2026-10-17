import { X } from 'lucide-react'
import { useDeferredValue, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { tx } from '../lib/i18n'
import { lockScroll } from '../lib/scrollLock'
import { afterPaint, fadeIn, ghostable, motionOK, popIn, popOut, rise } from '../lib/overlayMotion'

type Props = {
  open: boolean
  title: ReactNode
  onClose: () => void
  children: ReactNode
  wide?: boolean
  /**
   * หน้าต่างสูงเต็มกรอบเสมอ (เนื้อหายาวเกินจออยู่แล้ว เช่น ตารางอัศวิน) → กดแล้วกรอบเด้งขึ้นทันทีในขนาดจริง
   * แล้วเนื้อหาค่อยวาดตามมาข้างใน (กรอบไม่ยืด/หด = ไม่มี layout shift)
   */
  tall?: boolean
  /** ปิดแล้วเก็บเนื้อหาไว้ (ซ่อน ไม่ทิ้ง) → เปิดครั้งต่อไปไม่ต้องสร้างใหม่ · 'prerender' = สร้างรอไว้ตั้งแต่ยังไม่เคยเปิด (ใช้กับ tall) */
  keep?: boolean | 'prerender'
}

/**
 * หน้าต่างกลางจอ (มือถือ = แผ่นชิดขอบล่าง)
 * เปิด: พื้นหลังมืดลงทันที → กรอบเด้งขึ้น + ดาวขอบกรอบวิ้ง → เนื้อหาลอยขึ้นทีละชิ้น · ปิด: ย่อ/จางลง (lib/overlayMotion)
 */
export default function Modal({ open, title, onClose, children, wide, tall, keep }: Props) {
  const backdrop = useRef<HTMLDivElement>(null)
  const surface = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const frameFirst = !!(tall || keep)
  // เนื้อหาวาดตามหลัง (ไม่ด่วน) → กดปุ่มแล้วพื้นหลังมืดขึ้นทันที ไม่ค้างรอวาดเนื้อหาหนัก ๆ (INP)
  // หน้าต่างทั่วไป: รอวาดกรอบพร้อมเนื้อหา ไม่ขึ้นกรอบเปล่าไปก่อน (กรอบเล็กแล้วยืดทีหลัง = หน้าต่างกระโดด CLS)
  // หน้าต่าง tall: กรอบสูงเต็มอยู่แล้ว ขึ้นกรอบก่อนได้เลย ไม่กระโดด
  const ready = useDeferredValue(open, false)

  // ปิด = เล่นแอนิเมชันออกก่อนค่อยถอด
  const [closing, setClosing] = useState(false)
  const [prevOpen, setPrevOpen] = useState(open)
  if (prevOpen !== open) {
    setPrevOpen(open)
    setClosing(!open && motionOK())
  }
  const show = open || closing

  // ระหว่างเล่นแอนิเมชันปิด ยังโชว์หัวเรื่อง/เนื้อหาชุดสุดท้ายตอนเปิด (ข้างนอกมักล้างข้อมูลไปแล้ว เช่น setEdit(null))
  const last = useRef({ title, children })
  if (open) last.current = { title, children }
  const view = open ? { title, children } : last.current

  // กรอบ/เนื้อหาขึ้นแล้วหรือยัง (ค้างไว้จนปิดเสร็จ · keep = เนื้อหาค้างไว้ตลอด)
  const [frameUp, setFrameUp] = useState(false)
  const [bodyUp, setBodyUp] = useState(keep === 'prerender')
  if ((frameFirst ? open : open && ready) && !frameUp) setFrameUp(true)
  if (open && ready && !bodyUp) setBodyUp(true)
  if (!show && frameUp) setFrameUp(false)
  if (!show && bodyUp && !keep) setBodyUp(false)
  const kept = !!keep && bodyUp
  const mounted = show || kept
  const idle = !show // keep: ซ่อนรอไว้
  const surfaceOn = frameUp || kept

  // ปิดเมื่อกดและปล่อยบนพื้นหลังเท่านั้น — ลากคลุมข้อความในช่องแล้วเมาส์หลุดออกนอกกรอบจะไม่ปิดหน้าต่าง
  const downOnBackdrop = useRef(false)
  const titleId = useId()
  // onClose มักเป็นฟังก์ชันใหม่ทุก render → เก็บใน ref ไม่ให้ effect ด้านล่างรันซ้ำ
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      const dialogs = document.querySelectorAll('[data-app-modal]')
      if (e.key === 'Escape' && dialogs[dialogs.length - 1] === surface.current) closeRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // ล็อกการเลื่อนหน้าแบบนับจำนวน — เปิดซ้อนกันหลายหน้าต่าง ปลดล็อกเมื่อปิดครบทุกอัน (lib/scrollLock)
  // ปลดตั้งแต่เริ่มปิด (ระหว่างแอนิเมชันปิด หน้าหลังเลื่อนได้แล้ว)
  useEffect(() => (open ? lockScroll() : undefined), [open])

  // --- แอนิเมชันเปิด ---
  // พื้นหลัง: มืดลงทันทีที่กด
  useLayoutEffect(() => {
    if (open && backdrop.current) fadeIn(backdrop.current)
  }, [open])
  // กรอบ: เด้งขึ้นตอนโผล่ (หน้าต่างทั่วไป = ตอนเนื้อหาวาดเสร็จ · tall = ทันทีที่กด)
  // tall/keep ไล่ทีละเฟรม: เฟรมแรกหลังกด = พื้นหลังมืดอย่างเดียว (ตอบสนองไว) → เฟรมถัดไป กรอบเด้ง → แล้วค่อยวาดเนื้อหา + ลอยขึ้น
  // (การ์ดเป็นร้อยใบใช้เวลาวาดนาน ถ้าวาดพร้อมกรอบ กรอบจะโผล่ช้าตาม) · ซ่อนเนื้อหาก่อนสั่งอะไรเสมอ จะได้ไม่เผลอคำนวณการ์ดทั้งตารางในจังหวะกด
  const surfaceOpen = open && surfaceOn
  const bodyShown = useRef(false)
  const showBody = (frames: number) => {
    const el = body.current
    bodyShown.current = true
    if (!el || !motionOK()) return undefined
    el.style.contentVisibility = 'hidden'
    el.scrollTop = 0 // keep: เปิดใหม่เริ่มจากบนสุดเหมือนเดิม (ตั้งตอนซ่อน = ไม่ต้องคำนวณตำแหน่งการ์ดทั้งตารางก่อน)
    return afterPaint(() => {
      el.style.contentVisibility = ''
      rise(el, 0, 70)
    }, frames)
  }
  useLayoutEffect(() => {
    bodyShown.current = false
    const s = surface.current
    if (!surfaceOpen || !s) return
    if (!frameFirst) {
      popIn(s)
      // เนื้อหามากับกรอบ → ไล่ชิ้นในเนื้อหาตามหลังกรอบนิดหนึ่ง
      if (body.current) rise(body.current, 90, 45)
      return
    }
    const cancelBody = bodyUp ? showBody(2) : undefined
    if (!motionOK()) return cancelBody
    s.style.visibility = 'hidden' // ข้างในตอนนี้มีแค่หัวกรอบ (เนื้อหาซ่อนอยู่) → สลับ visibility ไม่หนัก
    const cancelFrame = afterPaint(() => { s.style.visibility = ''; popIn(s) })
    return () => { cancelFrame(); cancelBody?.() }
  }, [surfaceOpen])
  // tall ที่ยังไม่เคยสร้างเนื้อหา: กรอบขึ้นไปก่อนแล้ว เนื้อหามาถึงทีหลัง
  useLayoutEffect(() => {
    if (surfaceOpen && frameFirst && bodyUp && !bodyShown.current) return showBody(1)
  }, [surfaceOpen, frameFirst, bodyUp])

  // --- แอนิเมชันปิด ---
  useLayoutEffect(() => {
    if (!closing || !backdrop.current) return
    const anims = popOut(surface.current, backdrop.current)
    Promise.all(anims.map((a) => a.finished)).then(() => setClosing(false), () => {})
    // เปิดกลับระหว่างกำลังปิด / ปิดเสร็จ (keep: ซ่อนรอไว้) → ล้างแอนิเมชัน (fill: forwards) ให้กลับเป็นปกติ
    return () => { for (const a of anims) a.cancel() }
  }, [closing])

  // ข้างนอกถอดหน้าต่างทิ้งทั้งก้อนตอนเปิดอยู่ ({x && <Modal open />}) → เล่นแอนิเมชันปิดด้วยเงาที่โคลนไว้
  const live = useRef(false)
  live.current = open && surfaceOn
  useLayoutEffect(() => {
    const bd = backdrop.current
    if (!mounted || !bd) return
    const ghost = ghostable(bd)
    return () => ghost(bd.querySelector('.modal-surface'), live.current)
  }, [mounted])

  if (!mounted) return null
  // portal ไปที่ body: ถ้าอยู่ใน .panel (มี backdrop-filter) ตำแหน่ง fixed จะเพี้ยน
  // พื้นหลังมืดเฉย ๆ ไม่เบลอ: เบลอเต็มจอต้องเบลอใหม่ทั้งจอทุกเฟรมที่ในหน้าต่างขยับ (เลื่อน/ชี้การ์ด) → ตารางอัศวินหน้าใหญ่เลื่อนกระตุก
  // keep + ปิดอยู่: ซ่อนด้วย content-visibility + เลื่อนออกนอกจอ (.modal-idle) — ไม่สลับ visibility/pointer-events/inert (สืบทอดลงการ์ดทุกใบ)
  return createPortal(
    <div ref={backdrop} aria-hidden={idle || undefined}
      className={`modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4 ${idle ? 'modal-idle' : ''}`}
      onPointerDown={(e) => { downOnBackdrop.current = e.target === e.currentTarget }}
      onClick={(e) => { if (open && e.target === e.currentTarget && downOnBackdrop.current) onClose(); downOnBackdrop.current = false }}>
      {/* เนื้อหาหนัก (กรอบยังไม่ขึ้น) นานเกินเสี้ยววิ → ดาวหมุนกลางจอบอกว่ากำลังเปิด */}
      {open && !surfaceOn && <span aria-hidden className="modal-wait self-center">✦</span>}
      {surfaceOn && (
        <div
          ref={surface} data-app-modal={open ? '' : undefined} role={open ? 'dialog' : undefined} aria-modal={open || undefined} aria-labelledby={titleId}
          className={`modal-surface panel panel-gold relative flex ${frameFirst ? 'h-[88dvh]' : 'max-h-[88dvh]'} w-full ${wide ? 'max-w-6xl' : 'max-w-2xl'} flex-col rounded-b-none sm:rounded-b-[18px]`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
            <h2 id={titleId} className="text-lg font-semibold text-gold">{view.title}</h2>
            <button type="button" onClick={onClose} disabled={!open} className="rounded-full p-1.5 hover:bg-white/10" aria-label={tx('ปิด')}>
              <X className="h-5 w-5" />
            </button>
          </div>
          <div ref={body} className={`scrollbar-thin overflow-y-auto p-5 ${frameFirst ? 'min-h-0 flex-1' : ''}`}>{bodyUp && view.children}</div>
          {/* กำลังปิด: กันกดของในกรอบที่กำลังจางหาย */}
          {closing && <div className="absolute inset-0" />}
        </div>
      )}
    </div>
  ,
    document.body,
  )
}
