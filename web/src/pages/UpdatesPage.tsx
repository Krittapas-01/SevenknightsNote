import { ChevronDown, ChevronsDownUp, ChevronsUpDown, ScrollText } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { CHANGELOG, markUpdateSeen, unseenUpdates, type ChangelogEntry } from '../lib/changelog'
import PatchNotes, { KindChips, PatchHeader, isPatch, itemCount } from '../components/PatchNotes'
import { TUTORIAL_ON } from '../lib/onboarding'
import { motionOK } from '../lib/overlayMotion'
import { tx, L } from '../lib/i18n'

/** แพทช์เล็ก (รายการน้อย) เปิดไว้เลย ไม่ต้องกดดู */
const SMALL = 6
const anchor = (e: ChangelogEntry) => `v${e.version}`

/** "วันนี้" / "เมื่อวาน" / "7 วันที่แล้ว" จาก id (YYYY-MM-DD…) นับตามวันที่ไทย · เกิน 60 วันไม่บอก */
function ago(id: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(id)
  if (!m) return undefined
  const today = new Date(Date.now() + 7 * 3600e3)
  const days = Math.round((Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - Date.UTC(+m[1], +m[2] - 1, +m[3])) / 86400e3)
  if (days < 0 || days > 60) return undefined
  if (days === 0) return L('วันนี้', 'today')
  if (days === 1) return L('เมื่อวาน', 'yesterday')
  return L(`${days} วันที่แล้ว`, `${days} days ago`)
}

/** หน้ารวมอัปเดตทั้งหมด (ใหม่สุดบนสุด) · คอม: แถบเวอร์ชันซ้ายติดจอ · มือถือ: ปุ่มเวอร์ชันเลื่อนข้าง */
export default function UpdatesPage() {
  // แพทช์ที่เครื่องนี้ยังไม่เห็น — อ่านก่อน markUpdateSeen (ใน effect) จะบันทึกว่าเห็นแล้ว
  const [fresh] = useState(() => new Set(unseenUpdates().map((c) => c.id)))
  const [open, setOpen] = useState(() => new Set(CHANGELOG.filter((c, i) => i === 0 || fresh.has(c.id) || itemCount(c) <= SMALL).map((c) => c.id)))
  const [active, setActive] = useState<string | undefined>(CHANGELOG[0]?.id)
  const list = useRef<HTMLOListElement>(null)
  const chips = useRef<HTMLDivElement>(null)
  useEffect(() => markUpdateSeen(), [])

  const allOpen = open.size === CHANGELOG.length
  const toggleAll = () => setOpen(allOpen ? new Set([CHANGELOG[0]?.id]) : new Set(CHANGELOG.map((c) => c.id)))
  const toggle = (id: string) => {
    const closing = open.has(id)
    setOpen((s) => { const n = new Set(s); if (closing) n.delete(id); else n.add(id); return n })
    // ย่อจากปุ่มล่างการ์ดยาว ๆ → หัวการ์ดหลุดขึ้นไปบนจอ เลื่อนกลับมาให้เห็นการ์ดที่เพิ่งย่อ
    if (closing) requestAnimationFrame(() => {
      const el = document.getElementById(anchor(CHANGELOG.find((c) => c.id === id)!))
      if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' })
    })
  }
  const jump = (e: ChangelogEntry) => {
    setOpen((s) => (s.has(e.id) ? s : new Set(s).add(e.id)))
    setActive(e.id)
    history.replaceState(history.state, '', `#${anchor(e)}`)
    requestAnimationFrame(() => document.getElementById(anchor(e))?.scrollIntoView({ behavior: motionOK() ? 'smooth' : 'auto', block: 'start' }))
  }

  // เปิดจากลิงก์ /updates#v1.4 → เปิดการ์ดนั้นแล้วเลื่อนไป
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1))
    const e = CHANGELOG.find((c) => anchor(c) === id)
    if (!e) return
    setOpen((s) => new Set(s).add(e.id))
    setActive(e.id)
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }), 60)
    return () => clearTimeout(t)
  }, [])

  // เวอร์ชันที่กำลังอ่านอยู่ (การ์ดที่อยู่ช่วงบนของจอ) → ไฮไลต์ในแถบเวอร์ชัน
  useEffect(() => {
    const ol = list.current
    if (!ol || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver((recs) => {
      const hit = recs.filter((r) => r.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (hit) setActive((hit.target as HTMLElement).dataset.entry)
    }, { rootMargin: '-140px 0px -55% 0px' })
    ol.querySelectorAll('[data-entry]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  // มือถือ: เลื่อนปุ่มเวอร์ชันที่เลือกให้อยู่ในแถบ (เลื่อนเฉพาะแถบ ไม่เลื่อนหน้า)
  useEffect(() => {
    const row = chips.current
    const b = row?.querySelector<HTMLElement>(`[data-chip="${active}"]`)
    if (!row || !b || row.scrollWidth <= row.clientWidth) return
    row.scrollTo({ left: b.offsetLeft - 16, behavior: motionOK() ? 'smooth' : 'auto' })
  }, [active])

  // การ์ดชุดแรกลอยขึ้นตอนเปิดหน้า (ตัวครอบมีของ sticky → แอนิเมชันเข้าหน้าปกติไม่ขยับให้)
  useLayoutEffect(() => {
    if (!motionOK()) return
    list.current?.querySelectorAll(':scope > li').forEach((el, i) => {
      if (i < 3) el.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 480, delay: 120 + i * 60, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'backwards' })
    })
  }, [])

  return (
    <div className="mx-auto max-w-5xl">
      <header className="updates-hero relative text-center">
        <p className="eyebrow">PATCH NOTES</p>
        <div className="mt-4 hidden sm:block" aria-hidden="true"><div className="hero-crest mx-auto"><ScrollText className="h-7 w-7" strokeWidth={1.3} /></div></div>
        <h1 className="mt-1.5 text-3xl sm:mt-4 font-extrabold sm:text-5xl">{L('อัปเดต', 'Patch ')}<span className="gold-title">{L('ล่าสุด', 'Notes')}</span></h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-white/60">{tx('ฟีเจอร์ใหม่ การเปลี่ยนแปลง และแก้บั๊ก ทุกเวอร์ชัน')}</p>
      </header>

      {/* มือถือ/แท็บเล็ต: ปุ่มเวอร์ชันเลื่อนข้าง */}
      <nav aria-label={L('เวอร์ชัน', 'Versions')} className="mt-6 lg:hidden">
        <div ref={chips} className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {CHANGELOG.map((c) => (
            <button key={c.id} type="button" data-chip={c.id} onClick={() => jump(c)} aria-current={active === c.id ? 'true' : undefined}
              className={`updates-chip snap-start ${active === c.id ? 'is-active' : ''}`}>
              <span className="font-bold text-gold">v{c.version}</span>
              <span className="max-w-[9rem] truncate">{c.title}</span>
              {fresh.has(c.id) && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" aria-label={L('ใหม่', 'New')} />}
            </button>
          ))}
        </div>
      </nav>

      <div className="mt-5 lg:mt-10 lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        {/* คอม: แถบเวอร์ชันติดจอ (เส้นเวลา) */}
        <aside className="sticky top-32 hidden lg:block">
          <p className="eyebrow mb-3 pl-1">VERSIONS</p>
          <ol className="updates-rail scrollbar-thin max-h-[calc(100svh/var(--ui-zoom,1)-15rem)] overflow-y-auto pr-1">
            {CHANGELOG.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => jump(c)} aria-current={active === c.id ? 'true' : undefined}
                  className={`updates-rail-item ${isPatch(c.version) ? 'is-patch' : ''} ${active === c.id ? 'is-active' : ''}`}>
                  <span className="updates-rail-dot" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="font-bold text-gold">v{c.version}</span>
                      {fresh.has(c.id) && <span className="h-1.5 w-1.5 rounded-full bg-red-400" aria-label={L('ใหม่', 'New')} />}
                      <span className="ml-auto shrink-0 text-[11px] text-white/35">{c.date}</span>
                    </span>
                    <span className="block truncate text-[13px] text-white/70">{c.title}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <div className="mt-4 space-y-1.5 pl-1 text-xs">
            <button type="button" onClick={toggleAll} className="flex items-center gap-1.5 text-white/55 hover:text-gold">
              {allOpen ? <ChevronsDownUp className="h-3.5 w-3.5" /> : <ChevronsUpDown className="h-3.5 w-3.5" />}
              {allOpen ? L('ย่อทั้งหมด', 'Collapse all') : L('เปิดดูทุกเวอร์ชัน', 'Expand all')}
            </button>
            {TUTORIAL_ON && <Link to="/guide" className="block text-white/55 hover:text-gold">{tx('คู่มือการใช้งาน')} →</Link>}
          </div>
        </aside>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3 text-xs text-white/45 lg:hidden">
            <span>{L(`ทั้งหมด ${CHANGELOG.length} เวอร์ชัน`, `${CHANGELOG.length} versions`)}</span>
            <button type="button" onClick={toggleAll} className="flex items-center gap-1 text-white/60 hover:text-gold">
              {allOpen ? <ChevronsDownUp className="h-3.5 w-3.5" /> : <ChevronsUpDown className="h-3.5 w-3.5" />}
              {allOpen ? L('ย่อทั้งหมด', 'Collapse all') : L('เปิดทั้งหมด', 'Expand all')}
            </button>
          </div>
          <ol ref={list} className="space-y-5 sm:space-y-6">
            {CHANGELOG.map((c, i) => {
              const isOpen = open.has(c.id)
              const first = i === 0
              const patch = isPatch(c.version)
              const n = itemCount(c)
              return (
                <li key={c.id} id={anchor(c)} data-entry={c.id} className="scroll-mt-44 lg:scroll-mt-32">
                  <article className={`panel ${first ? 'panel-gold updates-featured' : ''} ${patch && !first ? 'updates-patch' : ''} ${first ? 'p-4 sm:p-7' : patch ? 'p-4 sm:p-5' : 'p-4 sm:p-6'}`}>
                    <PatchHeader entry={c} latest={first} fresh={fresh.has(c.id) && !first} ago={ago(c.id)} size={first ? 'lg' : patch ? 'sm' : 'md'}>
                      <KindChips entry={c} className="mt-3" />
                    </PatchHeader>
                    {isOpen ? (
                      <div className={first ? 'mt-6' : 'mt-5'}><PatchNotes entry={c} /></div>
                    ) : null}
                    {!first && n > SMALL && (
                      <button type="button" onClick={() => toggle(c.id)} aria-expanded={isOpen}
                        className="updates-more mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-sm text-white/70 hover:text-gold">
                        {isOpen ? L('ย่อ', 'Show less') : L(`ดูรายละเอียด ${n} รายการ`, `See all ${n} changes`)}
                        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </article>
                </li>
              )
            })}
          </ol>
          <p className="section-divider mt-10" aria-hidden="true">✦</p>
        </div>
      </div>
    </div>
  )
}
