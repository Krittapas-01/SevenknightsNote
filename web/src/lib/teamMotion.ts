import { useLayoutEffect, useRef, type RefObject } from 'react'
import { uiZoom } from './zoom'

/** ตั้งค่าเครื่อง "ลดการเคลื่อนไหว" — จำค่าไว้ (อัปเดตตอนเปลี่ยน) อ่าน .matches กลางจังหวะกดอาจทำให้เบราว์เซอร์คำนวณหน้าใหม่ */
let sysReduce = false
if (typeof matchMedia !== 'undefined') {
  const mq = matchMedia('(prefers-reduced-motion: reduce)')
  sysReduce = mq.matches
  mq.addEventListener?.('change', (e) => { sysReduce = e.matches })
}

/** เล่นแอนิเมชันได้ไหม (ตั้งค่า "ลดแอนิเมชัน" / ตั้งค่าเครื่อง) — WAAPI ไม่โดนกฎ CSS เลยต้องเช็กเอง */
export function motionOK() {
  if (typeof document === 'undefined') return false
  if (document.documentElement.classList.contains('reduce-motion')) return false
  return !sysReduce
}

const EASE = 'cubic-bezier(.2,.8,.2,1)'
const BOUNCE = 'cubic-bezier(.34,1.56,.64,1)'

/** แบบเด้งของชิ้นที่เพิ่งโผล่ (data-mp="ชนิด:คีย์") */
const POP: Record<string, { k: Keyframe[]; o: KeyframeAnimationOptions }> = {
  // อัศวิน/สัตว์เลี้ยงเพิ่งใส่: ขยายจากเล็ก + เด้งนิด ๆ (คู่กับแสงทองวาบ)
  hero: { k: [{ transform: 'scale(.7)', opacity: 0 }, { transform: 'scale(1.07)', opacity: 1, offset: 0.55 }, { transform: 'none', opacity: 1 }], o: { duration: 340, easing: EASE } },
  // ป้ายลำดับสกิล
  badge: { k: [{ transform: 'scale(0)' }, { transform: 'none' }], o: { duration: 300, easing: BOUNCE } },
  // ช่องว่างหลังเอาตัวออก: ค่อย ๆ โผล่
  empty: { k: [{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'none' }], o: { duration: 260, easing: EASE } },
  // วงรูปแบบ / วงลำดับสกิล: หมุนเข้า
  orb: { k: [{ transform: 'rotate(-70deg) scale(.75)' }, { transform: 'none' }], o: { duration: 420, easing: BOUNCE } },
}

/** ทำหลังเฟรมที่ตอบการกดวาดเสร็จแล้ว (rAF ซ้อน 2 ชั้น) — ของประดับที่เริ่มจากมองไม่เห็นอยู่แล้ว ไม่ต้องแย่งเวลาเฟรมแรกหลังกด */
function nextFrame(cb: () => void) {
  requestAnimationFrame(() => requestAnimationFrame(cb))
}

/** แสงทองวาบบนการ์ดที่เพิ่งลงช่อง (แบบในเกม): ขึ้นเร็ว ค้างนิดหนึ่ง แล้วจางออก — ใส่ไว้ในการ์ด (ตัดขอบตามรูปทรงการ์ดเอง) */
export function flashCard(card: Element | null) {
  if (card) nextFrame(() => { if (card.isConnected) flash(card) })
}
function flash(card: Element) {
  const f = document.createElement('span')
  f.className = 'slot-flash'
  f.setAttribute('aria-hidden', 'true')
  card.appendChild(f)
  f.animate([{ opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 0.85, offset: 0.38 }, { opacity: 0 }], { duration: 560, easing: 'ease-out' })
    .finished.catch(() => {}).finally(() => f.remove())
}

/**
 * ประกายดาวเล็ก ๆ กระจายออกจากกลางช่อง (ตอนเอาตัวออก แบบในเกม)
 * ดาวแต่ละดวงอยู่ในกล่องขนาดเท่าช่อง → เลื่อนเป็น % ของขนาดช่องได้เลย ไม่ต้องวัดขนาด · ขยับแค่ transform/opacity
 */
export function sparkle(host: Element, count = 8) {
  nextFrame(() => { if (host.isConnected) sparks(host, count) })
}
function sparks(host: Element, count: number) {
  const box = document.createElement('span')
  box.className = host.getAttribute('data-mhost') === 'sm' ? 'slot-sparks slot-sparks-sm' : 'slot-sparks'
  box.setAttribute('aria-hidden', 'true')
  const anims: Promise<unknown>[] = []
  const turn = Math.random() * 360
  for (let i = 0; i < count; i++) {
    const s = document.createElement('i')
    s.textContent = '✦'
    box.appendChild(s)
    const a = turn + (360 / count) * i + (Math.random() - 0.5) * 30
    const d0 = 8 + Math.random() * 10
    const d1 = 30 + Math.random() * 22
    const big = 0.7 + Math.random() * 0.6
    anims.push(s.animate([
      { opacity: 0, transform: `rotate(${a}deg) translateY(-${d0}%) scale(.2)` },
      { opacity: 1, transform: `rotate(${a}deg) translateY(-${(d0 + d1) / 2}%) scale(${big})`, offset: 0.3 },
      { opacity: 0, transform: `rotate(${a}deg) translateY(-${d1}%) scale(.35)` },
    ], { duration: 520 + Math.random() * 220, delay: Math.random() * 90, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'backwards' }).finished)
  }
  host.appendChild(box)
  Promise.all(anims).catch(() => {}).finally(() => box.remove())
}

/** การ์ดที่เพิ่งถูกเอาออก: เอาการ์ดเดิม (ที่ React ถอดออกแล้ว) มาวางทับช่องเดิม แล้วย่อ+จางหาย พร้อมประกายดาว */
function ghostOut(host: Element, card: Element) {
  const g = document.createElement('span')
  g.className = 'slot-ghost'
  g.setAttribute('aria-hidden', 'true')
  g.appendChild(card)
  host.appendChild(g)
  g.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.82)' }], { duration: 240, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' })
    .finished.catch(() => {}).finally(() => g.remove())
  sparkle(host)
}

/** ตัวที่เพิ่งลากมาวาง (ตั้งตอนปล่อย) → ช่องปลายทางวาบทองตรงที่ปล่อย แทนการเลื่อนจากช่องเดิม (การ์ดอยู่ใต้นิ้วแล้ว) */
let dropped: { unit: string; at: number } | null = null
export function markDrop(unit: string | null | undefined) {
  dropped = unit ? { unit, at: performance.now() } : null
}
const justDropped = (key: string) => !!dropped && performance.now() - dropped.at < 600 && key.slice(key.indexOf(':') + 1) === dropped.unit

type Snap = {
  sig: string
  w: number
  h: number
  /** ตำแหน่งชิ้นที่ย้ายได้ (เทียบมุมกล่อง) */
  pos: Map<string, { x: number; y: number }>
  /** กรอบช่องที่ชิ้นนั้นอยู่ (data-mhost) */
  hosts: Map<string, Element | null>
  pops: Set<string>
  /** การ์ดตัวละครในตอนนั้น (ไว้ทำเงาตอนถูกเอาออก) */
  cards: Map<string, { card: Element; host: Element | null }>
}

function snap(el: HTMLElement, sig: string): Snap {
  const z = uiZoom()
  const base = el.getBoundingClientRect()
  const pos = new Map<string, { x: number; y: number }>()
  const hosts = new Map<string, Element | null>()
  const cards = new Map<string, { card: Element; host: Element | null }>()
  const keep = (k: string, m: Element) => {
    const card = m.querySelector('.unit-card')
    const host = m.closest('[data-mhost]')
    if (card) cards.set(k, { card, host })
    return host
  }
  for (const m of Array.from(el.querySelectorAll<HTMLElement>('[data-m]'))) {
    const r = m.getBoundingClientRect()
    pos.set(m.dataset.m!, { x: (r.left - base.left) / z, y: (r.top - base.top) / z })
    hosts.set(m.dataset.m!, keep(`m|${m.dataset.m}`, m))
  }
  const pops = new Set<string>()
  for (const p of Array.from(el.querySelectorAll<HTMLElement>('[data-mp]'))) {
    const k = p.dataset.mp!
    pops.add(k)
    if (k.startsWith('hero:')) keep(`p|${k}`, p)
  }
  return { sig, w: base.width, h: base.height, pos, hosts, pops, cards }
}

/**
 * แอนิเมชันตอนจัดทีม (เฉพาะส่วนที่แก้อยู่) — ใช้กับทุกที่ที่ใส่/เอาออก/สลับตัวละคร
 * - data-m="คีย์" : ชิ้นที่ย้ายที่ได้ (อัศวิน) → ย้ายช่อง/เปลี่ยนรูปแบบ = เลื่อนไปที่ใหม่ (FLIP)
 * - data-mp="ชนิด:คีย์" : ชิ้นที่เพิ่งโผล่ (คีย์ใหม่) → เด้งเข้าตามชนิดใน POP
 * - ตัวละครเพิ่งลงช่อง (data-m ใหม่ / data-mp "hero:") → เด้ง + แสงทองวาบ
 * - ตัวละครถูกเอาออก → การ์ดเดิมย่อจางหายในช่องเดิม (data-mhost = กรอบช่อง) + ประกายดาว
 * - ลากมาวาง (markDrop) → วาบทองที่ช่องปลายทาง ไม่เลื่อนจากช่องเดิม
 * เล่นเฉพาะตอนทีมเปลี่ยน (sig เปลี่ยน) ไม่เล่นตอนเปิดหน้า · ใช้ transform/opacity อย่างเดียว
 * วัดตำแหน่งเฉพาะตอน sig เปลี่ยน (เดิมวัดทุกครั้งที่วาดใหม่ เช่น กดเลือกช่อง = บังคับคำนวณหน้าในจังหวะกด)
 */
export function useTeamMotion(root: RefObject<HTMLElement | null>, sig: string, enabled: boolean) {
  const prev = useRef<Snap | null>(null)
  useLayoutEffect(() => {
    const el = root.current
    if (!enabled || !el) { prev.current = null; return }
    const old = prev.current
    if (old && old.sig === sig) return
    const now = snap(el, sig)
    prev.current = now
    if (!old || !motionOK()) return
    // ขนาดกล่องเปลี่ยน (หมุนจอ/ย่อหน้าต่าง) = ตำแหน่งที่จำไว้ใช้ไม่ได้ → ไม่เลื่อน (ยังเด้ง/วาบได้)
    const sameBox = Math.abs(old.w - now.w) < 1 && Math.abs(old.h - now.h) < 1
    const z = uiZoom()
    for (const m of Array.from(el.querySelectorAll<HTMLElement>('[data-m]'))) {
      const k = m.dataset.m!
      const a = old.pos.get(k), b = now.pos.get(k)!
      // การ์ดใบใหม่ในช่อง (ใส่/ย้าย) ไม่ต้องเล่น card-arrive ของ CSS (จางจาก .35) ซ้อน — ย้ายช่องแล้วการ์ดจะดูโปร่ง ๆ ตอนเลื่อน
      const card = m.querySelector<HTMLElement>('.unit-card')
      if (card && (!a || !old.cards.has(`m|${k}`) || old.cards.get(`m|${k}`)!.card !== card)) card.style.animation = 'none'
      if (!a) {
        m.animate(POP.hero.k, POP.hero.o) // เพิ่งใส่เข้ามา
        flashCard(card)
        continue
      }
      if (justDropped(k)) {
        m.animate([{ transform: 'scale(1.1)' }, { transform: 'none' }], { duration: 280, easing: EASE })
        flashCard(card)
        continue
      }
      // ย้ายช่อง: ช่องเดิมยังอยู่ = วัดช่องเดิมกับช่องใหม่ตอนนี้เลย (ตำแหน่งสด แม้หน้าเพิ่งขยับ)
      // ช่องเดิมหายไป / ช่องเดิมแต่ตำแหน่งเปลี่ยน (เปลี่ยนรูปแบบ) = ใช้ตำแหน่งที่จำไว้
      const ho = old.hosts.get(k), hn = now.hosts.get(k)
      let dx = 0, dy = 0
      if (ho && hn && ho !== hn && ho.isConnected) {
        const r1 = ho.getBoundingClientRect(), r2 = hn.getBoundingClientRect()
        dx = (r1.left - r2.left) / z; dy = (r1.top - r2.top) / z
      } else if (sameBox) {
        dx = a.x - b.x; dy = a.y - b.y
      }
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) m.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 340, easing: EASE })
    }
    for (const p of Array.from(el.querySelectorAll<HTMLElement>('[data-mp]'))) {
      const k = p.dataset.mp!
      if (old.pops.has(k)) continue
      const kind = k.slice(0, k.indexOf(':'))
      const anim = POP[kind]
      if (anim) p.animate(anim.k, anim.o)
      if (kind === 'hero') flashCard(p.querySelector('.unit-card'))
    }
    // ตัวที่หายไปจากทีม: React ถอดการ์ดออกแล้ว (ยังไม่วาดเฟรมใหม่) → เอาการ์ดเดิมมาเล่นจางออกในช่องเดิม
    for (const [k, { card, host }] of old.cards) {
      if (now.cards.has(k) || card.isConnected || !host?.isConnected) continue
      ghostOut(host, card)
    }
  })
}

/* ---------- ลำดับการใช้สกิล (แบบในเกม) ---------- */

/**
 * ปิดหน้าตั้งลำดับสกิลแล้ว (หรือคิวเปลี่ยน) → วงลำดับสกิลเล่นแบบในเกม (เทียบจากคลิปในเกมทีละเฟรม):
 * ฟองแก้วใส ขอบม่วงเรืองโผล่ → เส้นแสงเส้นเดียวหมุนรอบจุดกลางวง จากแนวตั้งลงมาเป็นแนวนอน แล้วยืดยาวเกินวงก่อนจางหาย
 * → ดาวที่ตั้งแล้วติดพร้อมกันระหว่างเส้นหมุน → ป้ายเลขบนการ์ดเด้งตามลำดับ
 * ขยับแค่ transform/opacity · ของประดับสร้างแล้วลบทิ้งเมื่อจบ
 */
export function queueOrbFx(orb: HTMLElement | null, lit: number, badges?: Element | null, delay = 0) {
  if (!orb || !motionOK()) return
  // ดาวหายไปก่อนทันที (ตั้งแต่เฟรมแรกที่หน้าต่างเริ่มปิด) แล้วค่อยโผล่ตอนเส้นแสงหมุน
  hideQueueStars(orb, true)
  const run = () => nextFrame(() => {
    if (orb.isConnected) orbFx(orb, lit, badges ?? null)
    else hideQueueStars(orb, false)
  })
  if (delay > 0) setTimeout(run, delay)
  else run()
}
/** ซ่อน/คืนดาวทั้งหมดในวงลำดับสกิล (กล่อง data-qstars) */
export function hideQueueStars(orb: HTMLElement | null, hide: boolean) {
  const w = orb?.querySelector<HTMLElement>('[data-qstars]')
  if (w) w.style.opacity = hide ? '0' : ''
}
function orbFx(orb: HTMLElement, lit: number, badges: Element | null) {
  // ฟองแก้วอยู่ใต้ดาว (ใส่ก่อนดาว) · เส้นแสงอยู่บนดาว (ใส่ท้าย)
  const layer = () => {
    const l = document.createElement('span')
    l.className = 'orb-fx'
    l.setAttribute('aria-hidden', 'true')
    return l
  }
  const back = layer()
  const fx = layer()
  const glass = document.createElement('span')
  glass.className = 'orb-glass'
  back.appendChild(glass)
  const ray = document.createElement('span')
  ray.className = 'orb-ray'
  const core = document.createElement('span')
  core.className = 'orb-core'
  fx.append(ray, core)
  const anims: Promise<unknown>[] = []
  const go = (el: Element, k: Keyframe[], o: KeyframeAnimationOptions) => { anims.push(el.animate(k, { fill: 'backwards', ...o }).finished) }
  // ฟองแก้ว: โผล่เร็ว ค้างไว้ระหว่างเส้นแสงหมุน แล้วค่อย ๆ จาง
  go(glass, [{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'none', offset: 0.16 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }], { duration: 720, easing: 'ease-out' })
  // เส้นแสง: หมุนรอบจุดกลางจากแนวตั้ง → แนวนอน (ยาวพอดีวง) แล้วยืดออกเกินวง ค้างนิดหนึ่ง แล้วจาง
  go(ray, [
    { opacity: 0, transform: 'translate(-50%, -50%) rotate(-95deg) scaleX(.55)' },
    { opacity: 1, transform: 'translate(-50%, -50%) rotate(-60deg) scaleX(.85)', offset: 0.12 },
    { opacity: 1, transform: 'translate(-50%, -50%) rotate(0deg) scaleX(1)', offset: 0.36 },
    { opacity: 0.9, transform: 'translate(-50%, -50%) rotate(0deg) scaleX(1.9)', offset: 0.68 },
    { opacity: 0, transform: 'translate(-50%, -50%) rotate(0deg) scaleX(2.2)' },
  ], { duration: 640, delay: 60, easing: 'cubic-bezier(.3,.6,.3,1)' })
  // จุดแสงตรงกลางวง (จุดหมุนของเส้น)
  go(core, [{ opacity: 0, transform: 'translate(-50%, -50%) scale(.3)' }, { opacity: 1, transform: 'translate(-50%, -50%) scale(1)', offset: 0.2 }, { opacity: 0.9, transform: 'translate(-50%, -50%) scale(1.15)', offset: 0.5 }, { opacity: 0, transform: 'translate(-50%, -50%) scale(.6)' }], { duration: 600, delay: 60, easing: 'ease-out' })
  // ดาวที่ติดแล้ว (svg.queue-star ดวงละอัน) ติดพร้อมกันตอนเส้นแสงหมุนผ่าน
  const t0 = 130
  // ดาวทั้งวง (ทั้งดวงที่ติดและดวงมืด) จางเข้าพร้อมกัน แทนที่การซ่อนไว้ก่อนหน้า
  const wrap = orb.querySelector<HTMLElement>('[data-qstars]')
  if (wrap) {
    go(wrap, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: t0, easing: 'ease-out' })
    wrap.style.opacity = ''
  }
  for (const s of Array.from(orb.querySelectorAll<SVGElement>('svg.queue-star')).slice(0, lit)) {
    s.style.transformOrigin = '50% 50%'
    go(s, [{ transform: 'scale(.8)' }, { transform: 'scale(1.08)', offset: 0.6 }, { transform: 'none' }], { duration: 260, delay: t0, easing: 'ease-out' })
  }
  orb.prepend(back)
  orb.appendChild(fx)
  // ป้ายเลขลำดับบนการ์ดอัศวิน: เด้งตามลำดับ 1 → 2 → 3 คู่กับดาว
  if (badges) {
    const list = Array.from(badges.querySelectorAll<HTMLElement>('[data-mp^="badge:"]'))
    const num = (b: HTMLElement) => Number(b.dataset.mp!.slice(b.dataset.mp!.lastIndexOf(':') + 1)) || 0
    list.sort((a, b) => num(a) - num(b))
    list.forEach((b, i) => b.animate(POP.badge.k, { ...POP.badge.o, delay: t0 + 120 + i * 120, fill: 'backwards' }))
  }
  Promise.all(anims).catch(() => {}).finally(() => { back.remove(); fx.remove() })
}

/**
 * หน้าตั้งลำดับสกิล: กดเลือกสกิล = ไอคอนเด้ง + แสงทองวาบ + ประกายดาว + ป้ายลำดับเด้ง (แบบตอนใส่อัศวิน)
 * กดเอาออก/รีเซต = ประกายดาวที่ไอคอนนั้น · ลำดับที่เลื่อน = ป้ายเด้งเบา ๆ
 * ปุ่มสกิลมี data-sq="ช่อง.สกิล" · ป้ายลำดับมี data-sqb
 */
export function useSkillPickMotion(root: RefObject<HTMLElement | null>, keys: string, enabled: boolean) {
  const prev = useRef<string | null>(null)
  useLayoutEffect(() => {
    const old = prev.current
    prev.current = keys
    const el = root.current
    if (old === null || old === keys || !enabled || !el || !motionOK()) return
    const was = old ? old.split(',') : []
    const now = keys ? keys.split(',') : []
    const btn = (k: string) => el.querySelector<HTMLElement>(`[data-sq="${k}"]`)
    now.forEach((k, i) => {
      const b = btn(k)
      if (!b) return
      const badge = b.querySelector<HTMLElement>('[data-sqb]')
      const j = was.indexOf(k)
      if (j < 0) {
        b.animate([{ transform: 'scale(.82)' }, { transform: 'scale(1.1)', offset: 0.5 }, { transform: 'none' }], { duration: 320, easing: EASE })
        flashCard(b)
        sparkle(b, 6)
        badge?.animate([{ scale: '0' }, { scale: '1' }], { duration: 320, delay: 60, easing: BOUNCE, fill: 'backwards' })
      } else if (j !== i) {
        badge?.animate([{ scale: '.55' }, { scale: '1' }], { duration: 280, easing: BOUNCE })
      }
    })
    for (const k of was) {
      if (now.includes(k)) continue
      const b = btn(k)
      if (b) sparkle(b, 6)
    }
  }, [keys, enabled, root])
}
