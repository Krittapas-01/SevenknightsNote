import { ChevronDown, ChevronsDownUp, ChevronsUpDown, ScrollText } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { CHANGELOG, markUpdateSeen, unseenUpdates, type ChangelogEntry } from '../lib/changelog'
import PatchNotes, { KindChips, VersionBadge, isPatch, itemCount } from '../components/PatchNotes'
import { TUTORIAL_ON } from '../lib/onboarding'
import { motionOK } from '../lib/overlayMotion'
import { tx, L } from '../lib/i18n'

/** แพทช์เล็ก (รายการน้อย) เปิดไว้เลย ไม่ต้องกดดู */
const SMALL = 6
const anchor = (e: ChangelogEntry) => `v${e.version}`

/**
 * แพทช์ใหญ่ (x.y ทุก ~2 สัปดาห์) + อัปเดตย่อยระหว่างแพทช์ (x.y.z) อยู่ในการ์ดเดียวกัน
 * changelog ยังเป็นรายการเรียงใหม่สุดก่อนเหมือนเดิม — จับกลุ่มจากเลขเวอร์ชันตรงนี้
 */
type Patch = { key: string; main?: ChangelogEntry; subs: ChangelogEntry[]; all: ChangelogEntry[] }
const majorOf = (v: string) => v.split('.').slice(0, 2).join('.')
function groupPatches(list: ChangelogEntry[]): Patch[] {
  const by = new Map<string, Patch>()
  for (const c of list) {
    const key = majorOf(c.version)
    let p = by.get(key)
    if (!p) by.set(key, (p = { key, subs: [], all: [] }))
    p.all.push(c)
    if (isPatch(c.version)) p.subs.push(c)
    else p.main = c
  }
  return [...by.values()]
}
const PATCHES = groupPatches(CHANGELOG)
const patchOf = (id: string) => PATCHES.find((p) => p.all.some((c) => c.id === id))
/** ชื่อ/วันที่ของแพทช์: ใช้ตัวแพทช์ใหญ่ ถ้ายังไม่มีใช้อัปเดตย่อยตัวแรก */
const headOf = (p: Patch) => p.main ?? p.subs[p.subs.length - 1]

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

/** หน้ารวมอัปเดตทั้งหมด (แพทช์ใหม่สุดบนสุด) · คอม: แถบแพทช์ซ้ายติดจอ · มือถือ: ปุ่มแพทช์เลื่อนข้าง */
export default function UpdatesPage() {
  // ส่วนที่เครื่องนี้ยังไม่เห็น — อ่านก่อน markUpdateSeen (ใน effect) จะบันทึกว่าเห็นแล้ว
  const [fresh] = useState(() => new Set(unseenUpdates().map((c) => c.id)))
  const [open, setOpen] = useState(() => new Set(CHANGELOG.filter((c, i) => i === 0 || fresh.has(c.id) || itemCount(c) <= SMALL).map((c) => c.id)))
  const [active, setActive] = useState<string | undefined>(PATCHES[0]?.key)
  const list = useRef<HTMLOListElement>(null)
  const chips = useRef<HTMLDivElement>(null)
  useEffect(() => markUpdateSeen(), [])

  const allOpen = open.size === CHANGELOG.length
  const toggleAll = () => setOpen(allOpen ? new Set([CHANGELOG[0]?.id]) : new Set(CHANGELOG.map((c) => c.id)))
  const toggle = (e: ChangelogEntry) => {
    const closing = open.has(e.id)
    setOpen((s) => { const n = new Set(s); if (closing) n.delete(e.id); else n.add(e.id); return n })
    // ย่อจากปุ่มล่างรายการยาว ๆ → หัวหลุดขึ้นไปบนจอ เลื่อนกลับมาให้เห็นส่วนที่เพิ่งย่อ
    if (closing) requestAnimationFrame(() => {
      const el = document.getElementById(`part-${e.id}`)
      if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' })
    })
  }
  /** ไปที่แพทช์ (เปิดทุกส่วนในแพทช์) หรือไปที่อัปเดตย่อยตัวเดียว */
  const go = (p: Patch, target: ChangelogEntry | null, smooth: boolean) => {
    setOpen((s) => { const n = new Set(s); for (const c of target ? [target] : p.all) n.add(c.id); return n })
    setActive(p.key)
    const id = target ? anchor(target) : `v${p.key}`
    history.replaceState(history.state, '', `#${id}`)
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: smooth && motionOK() ? 'smooth' : 'auto', block: 'start' }))
  }

  // เปิดจากลิงก์ /updates#v1.4 หรือ #v1.5.2 → เปิดส่วนนั้นแล้วเลื่อนไป
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1))
    const e = CHANGELOG.find((c) => anchor(c) === id)
    const p = e ? patchOf(e.id) : PATCHES.find((x) => `v${x.key}` === id)
    if (!p) return
    const t = setTimeout(() => go(p, e && isPatch(e.version) ? e : null, false), 60)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // แพทช์ที่กำลังอ่านอยู่ (การ์ดที่อยู่ช่วงบนของจอ) → ไฮไลต์ในแถบแพทช์
  useEffect(() => {
    const ol = list.current
    if (!ol || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver((recs) => {
      const hit = recs.filter((r) => r.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (hit) setActive((hit.target as HTMLElement).dataset.patch)
    }, { rootMargin: '-140px 0px -55% 0px' })
    ol.querySelectorAll('[data-patch]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  // มือถือ: เลื่อนปุ่มแพทช์ที่เลือกให้อยู่ในแถบ (เลื่อนเฉพาะแถบ ไม่เลื่อนหน้า)
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

  /** ปุ่มดู/ย่อรายละเอียดของส่วนที่ยาว */
  const more = (c: ChangelogEntry, label: string) => (
    <button type="button" onClick={() => toggle(c)} aria-expanded={open.has(c.id)}
      className="updates-more mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-sm text-white/70 hover:text-gold">
      {open.has(c.id) ? L('ย่อ', 'Show less') : label}
      <ChevronDown className={`h-4 w-4 transition-transform ${open.has(c.id) ? 'rotate-180' : ''}`} />
    </button>
  )
  const freshBadge = (c: ChangelogEntry) => fresh.has(c.id) && c !== CHANGELOG[0] && <span className="patch-fresh">{L('ใหม่สำหรับคุณ', 'New for you')}</span>
  const subCount = (p: Patch) => L(`+${p.subs.length} อัปเดตย่อย`, `+${p.subs.length} update${p.subs.length > 1 ? 's' : ''}`)
  const hasFresh = (p: Patch) => p.all.some((c) => fresh.has(c.id))

  return (
    <div className="mx-auto max-w-5xl">
      <header className="updates-hero relative text-center">
        <p className="eyebrow">PATCH NOTES</p>
        <div className="mt-4 hidden sm:block" aria-hidden="true"><div className="hero-crest mx-auto"><ScrollText className="h-7 w-7" strokeWidth={1.3} /></div></div>
        <h1 className="mt-1.5 text-3xl font-extrabold sm:mt-4 sm:text-5xl">{L('อัปเดต', 'Patch ')}<span className="gold-title">{L('ล่าสุด', 'Notes')}</span></h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-white/60">{tx('ฟีเจอร์ใหม่ การเปลี่ยนแปลง และแก้บั๊ก ทุกเวอร์ชัน')}</p>
      </header>

      {/* มือถือ/แท็บเล็ต: ปุ่มแพทช์เลื่อนข้าง */}
      <nav aria-label={L('แพทช์', 'Patches')} className="mt-6 lg:hidden">
        <div ref={chips} className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {PATCHES.map((p) => (
            <button key={p.key} type="button" data-chip={p.key} onClick={() => go(p, null, true)} aria-current={active === p.key ? 'true' : undefined}
              className={`updates-chip snap-start ${active === p.key ? 'is-active' : ''}`}>
              <span className="font-bold text-gold">v{p.key}</span>
              <span className="max-w-[9rem] truncate">{headOf(p).title}</span>
              {hasFresh(p) && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" aria-label={L('ใหม่', 'New')} />}
            </button>
          ))}
        </div>
      </nav>

      <div className="mt-5 lg:mt-10 lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        {/* คอม: แถบแพทช์ติดจอ (เส้นเวลา) */}
        <aside className="sticky top-32 hidden lg:block">
          <p className="eyebrow mb-3 pl-1">PATCHES</p>
          <ol className="updates-rail scrollbar-thin max-h-[calc(100svh/var(--ui-zoom,1)-15rem)] overflow-y-auto pr-1">
            {PATCHES.map((p) => (
              <li key={p.key}>
                <button type="button" onClick={() => go(p, null, true)} aria-current={active === p.key ? 'true' : undefined}
                  className={`updates-rail-item ${active === p.key ? 'is-active' : ''}`}>
                  <span className="updates-rail-dot" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="font-bold text-gold">v{p.key}</span>
                      {hasFresh(p) && <span className="h-1.5 w-1.5 rounded-full bg-red-400" aria-label={L('ใหม่', 'New')} />}
                      <span className="ml-auto shrink-0 text-[11px] text-white/35">{headOf(p).date}</span>
                    </span>
                    <span className="block truncate text-[13px] text-white/70">{headOf(p).title}</span>
                    {p.subs.length > 0 && <span className="block text-[11px] text-white/40">{subCount(p)}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <div className="mt-4 space-y-1.5 pl-1 text-xs">
            <button type="button" onClick={toggleAll} className="flex items-center gap-1.5 text-white/55 hover:text-gold">
              {allOpen ? <ChevronsDownUp className="h-3.5 w-3.5" /> : <ChevronsUpDown className="h-3.5 w-3.5" />}
              {allOpen ? L('ย่อทั้งหมด', 'Collapse all') : L('เปิดดูทุกแพทช์', 'Expand all')}
            </button>
            {TUTORIAL_ON && <Link to="/guide" className="block text-white/55 hover:text-gold">{tx('คู่มือการใช้งาน')} →</Link>}
          </div>
        </aside>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3 text-xs text-white/45 lg:hidden">
            <span>{L(`ทั้งหมด ${PATCHES.length} แพทช์`, `${PATCHES.length} patches`)}</span>
            <button type="button" onClick={toggleAll} className="flex items-center gap-1 text-white/60 hover:text-gold">
              {allOpen ? <ChevronsDownUp className="h-3.5 w-3.5" /> : <ChevronsUpDown className="h-3.5 w-3.5" />}
              {allOpen ? L('ย่อทั้งหมด', 'Collapse all') : L('เปิดทั้งหมด', 'Expand all')}
            </button>
          </div>
          <ol ref={list} className="space-y-5 sm:space-y-6">
            {PATCHES.map((p, i) => {
              const first = i === 0
              const head = headOf(p)
              const newest = p.all[0]
              const newestAgo = ago(newest.id)
              return (
                <li key={p.key} id={`v${p.key}`} data-patch={p.key} className="scroll-mt-44 lg:scroll-mt-32">
                  <article className={`panel ${first ? 'panel-gold updates-featured p-4 sm:p-7' : 'p-4 sm:p-6'}`}>
                    {/* หัวแพทช์ */}
                    <div className="flex items-start gap-3 sm:gap-4">
                      <VersionBadge version={p.key} size={first ? 'lg' : 'md'} />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/50">
                          <span>{head.date}</span>
                          {p.subs.length > 0
                            ? <span className="text-white/35">· {L('อัปเดตล่าสุด', 'last update')} {newest.date}{newestAgo ? ` (${newestAgo})` : ''}</span>
                            : newestAgo && <span className="text-white/35">· {newestAgo}</span>}
                          {first && <span className="rounded-full bg-gold/20 px-2 py-0.5 font-medium text-gold">{tx('ล่าสุด')}</span>}
                        </p>
                        <h2 className={`mt-1 font-extrabold leading-snug ${first ? 'text-2xl sm:text-[1.75rem]' : 'text-lg sm:text-xl'}`}>
                          <span className="sr-only">7K Note {p.key} — </span>{head.title}
                        </h2>
                        {head.summary && <p className={`mt-1 leading-relaxed text-white/65 ${first ? 'text-sm sm:text-[15px]' : 'text-sm'}`}>{head.summary}</p>}
                        <KindChips entries={p.all} className="mt-3" />
                      </div>
                    </div>

                    {/* อัปเดตย่อยระหว่างแพทช์ (ใหม่สุดก่อน) */}
                    {p.subs.length > 0 && (
                      <div className="mt-6">
                        <p className="patch-part-label">{L('อัปเดตย่อยในแพทช์นี้', 'Updates in this patch')}</p>
                        <ol className="patch-subs mt-3 space-y-5">
                          {p.subs.map((c) => {
                            const n = itemCount(c)
                            return (
                              <li key={c.id} id={anchor(c)} className="patch-sub scroll-mt-44 lg:scroll-mt-32">
                                <div id={`part-${c.id}`} className="scroll-mt-44 lg:scroll-mt-32">
                                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/50">
                                    <VersionBadge version={c.version} />
                                    <span>{c.date}</span>
                                    {ago(c.id) && <span className="text-white/35">· {ago(c.id)}</span>}
                                    {freshBadge(c)}
                                  </p>
                                  <h3 className="mt-1 text-base font-bold leading-snug">{c.title}</h3>
                                  {c.summary && <p className="mt-0.5 text-sm leading-relaxed text-white/60">{c.summary}</p>}
                                </div>
                                {open.has(c.id) && <div className="mt-3"><PatchNotes entry={c} /></div>}
                                {n > SMALL && more(c, L(`ดูรายละเอียด ${n} รายการ`, `See all ${n} changes`))}
                              </li>
                            )
                          })}
                        </ol>
                      </div>
                    )}

                    {/* เนื้อแพทช์ใหญ่ (มีอัปเดตย่อย = ส่วน "เปิดตัวแพทช์" ต่อท้าย) */}
                    {p.main && (() => {
                      const c = p.main
                      const n = itemCount(c)
                      const withSubs = p.subs.length > 0
                      return (
                        <div id={`part-${c.id}`} className={`scroll-mt-44 lg:scroll-mt-32 ${withSubs ? 'patch-launch mt-6 pt-5' : first ? 'mt-6' : 'mt-5'}`}>
                          {withSubs && (
                            <p className="patch-part-label flex flex-wrap items-center gap-x-2 gap-y-1">
                              {L(`เปิดตัวแพทช์ ${p.key}`, `Patch ${p.key} launch`)}
                              <span className="font-normal text-white/40">{c.date}</span>
                              {freshBadge(c)}
                            </p>
                          )}
                          {open.has(c.id) && <div className={withSubs ? 'mt-4' : ''}><PatchNotes entry={c} /></div>}
                          {(withSubs || !first) && n > SMALL && more(c, withSubs ? L(`ดูรายละเอียดแพทช์ ${p.key} · ${n} รายการ`, `See all ${n} changes in ${p.key}`) : L(`ดูรายละเอียด ${n} รายการ`, `See all ${n} changes`))}
                        </div>
                      )
                    })()}
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
