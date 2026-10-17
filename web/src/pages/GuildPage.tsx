import { Check, ChevronLeft, ChevronRight, ClipboardList, LayoutGrid, Link2, Plus, Search, Shield, Swords } from 'lucide-react'
import { ImgPriority } from '../components/UnitCard'
import PageSkeleton from '../components/PageSkeleton'
import { sortTags, tagColor, tagStyle, tagText } from '../lib/tags'
import { memo, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigationType, useParams, useSearchParams } from 'react-router'
import Modal from '../components/Modal'
import TeamCardLite, { CARD_HEIGHT } from '../components/TeamCardLite'
import UnitCard from '../components/UnitCard'
import WarBoard from '../components/WarBoard'
import ViewAsToggle from '../components/ViewAsToggle'
import { activePlanId } from '../lib/war'
import { useSlideDir, useSlidePill } from '../lib/slide'
import { getUnit, englishOf, unitBase } from '../data/heroes'
import { EditLogin, EditSettings } from '../components/EditAccess'
import { PLAN_KIND_LABEL, planKind, type Plan, type PlanKind, type Target, type Team, slotLabel } from '../lib/types'
import { useGuild } from '../lib/useGuild'
import HelpLink from '../components/HelpLink'
import GuildTour from '../components/GuildTour'
import { isDemo } from '../lib/demo'
import { useTour } from '../lib/tour'
import GuildOnboarding from '../components/GuildOnboarding'
import { markShared, onboardFlags } from '../lib/onboarding'
import { useSmoothWheel } from '../lib/smoothWheel'
import { useMountLater } from '../lib/mountLater'
import { uiZoom } from '../lib/zoom'
import NotFound from './NotFound'
import { tx, L, LOCALE } from '../lib/i18n'

// ค้นได้ทั้งชื่อไทยและอังกฤษ (ไม่ขึ้นกับภาษาที่ตั้ง)
const names = (t: Team) => [...t.slots, t.pet].map((id) => (id ? `${getUnit(id)?.name ?? ''} ${englishOf(id) ?? ''} ${unitBase(id)}` : '')).join(' ')
const matches = (t: Target, q: string) =>
  [names(t.team), t.note, ...t.tags].join(' ').toLowerCase().includes(q)

export default function GuildPage() {
  const { gid = '' } = useParams()
  const { data, error, canEdit, realCanEdit, isOwner, setCanEdit, recheck, reload } = useGuild(gid)
  const [copied, setCopied] = useState<string | null>(null)
  const [params, setParams] = useSearchParams()
  // ค้นหา/แท็กเก็บใน URL → กดเข้าบ้านแล้วกดย้อนกลับ ยังเป็นตัวกรองเดิม (ไม่เด้งกลับเป็น "ทั้งหมด")
  const q = params.get('q') ?? ''
  const tag = params.get('tag')
  const setParam = (k: 'q' | 'tag', v: string | null) => setParams((p) => {
    const n = new URLSearchParams(p)
    if (v) n.set(k, v); else n.delete(k)
    return n
  }, { replace: true })
  const setQ = (v: string) => setParam('q', v)
  const setTag = (v: string | null) => setParam('tag', v)
  // ตำแหน่งเลื่อนจอ: จำไว้ตอนออกจากหน้า · กดย้อนกลับมา = เลื่อนกลับไปที่เดิม
  const loc = useLocation()
  const navType = useNavigationType()
  const scrollKey = `7k-note:scroll:${loc.key}`
  // useLayoutEffect: บันทึกก่อนหน้าใหม่วาด (ถ้ารอทีหลัง หน้าใหม่ที่สั้นกว่าจะทำให้ตำแหน่งถูกตัดไปแล้ว)
  // จำการ์ดบ้านแรกที่เห็นบนจอ + ระยะจากขอบบน (การ์ดนอกจอยังไม่รู้ความสูงจริง เลยยึดการ์ดแทนตัวเลข scrollY)
  // อัปเดตตอนเลื่อนจอ/กด (ค่าล่าสุดก่อนออก) แล้วเขียนตอนออกจากหน้า — อ่านตอนออกไม่ได้ เพราะหน้าใหม่/เลื่อนนุ่มขยับไปแล้ว
  // วัดที่ช่องการ์ด ([data-target-cell] ขนาดล็อก) ไม่ใช่ตัวการ์ดข้างใน — วัดการ์ดที่อยู่นอกจอ = บังคับเบราว์เซอร์วาดการ์ดใบนั้นทันที (เคยกินเกือบ 0.3 วิตอนย้อนกลับ)
  // ทำทุกเฟรมที่เลื่อน → ต้องถูก: รายการช่องแบบ live (ไม่ querySelectorAll ทั้งหน้าทุกเฟรม) + ค้นแบบแบ่งครึ่ง (ช่องเรียงบนลงล่างตามแถว)
  const snap = useRef<{ y: number; id: string; top: number } | null>(null)
  useEffect(() => {
    let raf = 0, frozen = false
    const cells = document.getElementsByClassName('target-cell') as HTMLCollectionOf<HTMLElement>
    const take = () => {
      raf = 0
      if (frozen) return
      let lo = 0, hi = cells.length
      while (lo < hi) { const mid = (lo + hi) >> 1; if (cells[mid].getBoundingClientRect().bottom > 120) hi = mid; else lo = mid + 1 }
      const card = cells[lo]
      snap.current = { y: window.scrollY, id: card?.dataset.targetCell ?? '', top: card ? card.getBoundingClientRect().top : 0 }
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(take) }
    window.addEventListener('scroll', onScroll, { passive: true })
    // กดการ์ดบ้าน = จับค่าทันทีแล้วล็อก (ระหว่างเปลี่ยนหน้า จอจะขยับเอง ไม่ให้ทับค่าที่ถูก)
    const onDown = (e: PointerEvent) => { frozen = false; take(); if ((e.target as HTMLElement | null)?.closest?.('a[data-target-card]')) frozen = true }
    document.addEventListener('pointerdown', onDown, true)
    return () => {
      window.removeEventListener('scroll', onScroll); document.removeEventListener('pointerdown', onDown, true); cancelAnimationFrame(raf)
      try { if (snap.current) sessionStorage.setItem(scrollKey, JSON.stringify(snap.current)) } catch { /* ไม่มี storage */ }
    }
  }, [scrollKey])
  const restored = useRef(false)
  // กดย้อนกลับมา: การ์ดที่เคยดูอยู่ (สร้างการ์ดรอบ ๆ ใบนี้ก่อน ใบอื่นทยอยตามมา)
  const [anchor] = useState(() => navType === 'POP' ? readSnap(scrollKey)?.id ?? null : null)
  const tab = params.get('tab') === 'targets' ? 'targets' : 'plans'
  const tabPill = useSlidePill(tab)
  const tabSlide = useSlideDir(tab === 'plans' ? 0 : 1)
  useSmoothWheel(tab === 'targets')
  // สอนใช้: คนแก้ได้ = สอนจัดการกิลด์ · คนดูอย่างเดียว = สอนดูแผน + เข้าแก้ไข
  useTour('guild-editor', !!data && canEdit && !isDemo(gid))
  useTour('guild-viewer', !!data && !realCanEdit && !isDemo(gid))

  const allTags = useMemo(() => sortTags([...new Set(data?.targets.flatMap((t) => t.tags) ?? [])]), [data])
  // ค้นหา/กรองแท็กแบบเลื่อนไปทำทีหลัง: ช่องพิมพ์/ปุ่มแท็กตอบทันที รายการค่อยตามมา (INP)
  const dq = useDeferredValue(q)
  const dTag = useDeferredValue(tag)
  const sorted = useMemo(() => {
    const s = dq.trim().toLowerCase()
    // แก้ล่าสุดอยู่บนสุด (ตัวบ้านศัตรูหรือทีมแก้ข้างใน — เวลาเดียวกับจุดเขียว)
    const last = (t: Target) => Math.max(t.updatedAt, ...t.counters.map((c) => c.updatedAt))
    return (data?.targets ?? []).filter((t) => (!dTag || t.tags.includes(dTag)) && (!s || matches(t, s))).sort((a, b) => last(b) - last(a))
  }, [data, dq, dTag])
  // ลำดับการ์ดบนจอไม่สลับเอง: ข้อมูลใหม่มาเบื้องหลัง (มีคนแก้ / โหลดเสร็จทีหลัง) → การ์ดอยู่ที่เดิม เนื้อหาในการ์ดอัปเดต
  // บ้านใหม่ต่อท้าย · ขึ้นปุ่ม "เรียงใหม่" ให้กดเอง (การ์ดสลับที่เองโดยไม่ได้กด = หน้ากระโดด CLS)
  // เรียงใหม่ทันทีเมื่อ: เปลี่ยนคำค้น/แท็ก หรือกดปุ่มเรียงใหม่
  const [resort, setResort] = useState(0)
  const shown = useRef<{ key: string; ids: string[] } | null>(null)
  const openedAt = useRef(Date.now())
  const orderKey = `${dq}|${dTag}|${resort}`
  const { list, stale } = useMemo(() => {
    const ids = sorted.map((t) => t.id)
    const o = shown.current
    // ช่วงเปิดหน้าแรก ๆ (ข้อมูลในเครื่อง → ข้อมูลจากเซิร์ฟเวอร์ตามมาติด ๆ) ยังเรียงใหม่ได้ ไม่ต้องรอกดปุ่ม
    if (!o || o.key !== orderKey || !o.ids.length || Date.now() - openedAt.current < 1500) {
      shown.current = { key: orderKey, ids }
      return { list: sorted, stale: false }
    }
    const pos = new Map(o.ids.map((id, i) => [id, i]))
    const arranged = [...sorted.filter((t) => pos.has(t.id)).sort((a, b) => pos.get(a.id)! - pos.get(b.id)!), ...sorted.filter((t) => !pos.has(t.id))]
    return { list: arranged, stale: arranged.some((t, i) => t.id !== ids[i]) }
  }, [sorted, orderKey])

  useLayoutEffect(() => {
    if (restored.current || navType !== 'POP' || !data) return
    restored.current = true
    const saved = readSnap(scrollKey)
    if (!saved || saved.y <= 0) return
    const { y, id, top } = saved
    // เลื่อนไปที่การ์ดเดิม แล้วแก้ซ้ำอีกไม่กี่เฟรม (ส่วนบนของหน้าอาจสูงขึ้นหลังวาด)
    const fix = () => {
      const el = id ? document.querySelector<HTMLElement>(`[data-target-cell="${CSS.escape(id)}"]`) : null
      window.scrollTo({ top: el ? window.scrollY + el.getBoundingClientRect().top - top : y, behavior: 'instant' })
    }
    fix()
    let n = 0
    const again = () => { fix(); if (++n < 6) requestAnimationFrame(again) }
    requestAnimationFrame(again)
  }, [navType, data, scrollKey])

  if (error) return <NotFound message={error} />
  if (!data) return <PageSkeleton kind="guild" />

  async function copy(kind: 'view') {
    const url = `${location.origin}/g/${gid}`
    await navigator.clipboard.writeText(url).catch(() => prompt(tx('คัดลอกลิงก์นี้'), url))
    markShared(gid)
    setCopied(kind)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div>
      {!isDemo(gid) && !onboardFlags(gid)?.on && <GuildTour />}
      <GuildOnboarding gid={gid} data={data} canEdit={canEdit} />
      <div className="guild-banner flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
        <div className="relative min-w-0">
          <p className="eyebrow mb-1.5">GUILD HEADQUARTERS</p>
          <h1 className="gold-title break-words text-3xl font-extrabold sm:text-4xl">{data.guild.name}</h1>
          <p className="mt-0.5 text-sm text-white/55">
            {L(`${data.plans.length} แผนสงคราม · ${data.targets.length} บ้านศัตรู`, `${data.plans.length} war plan${data.plans.length === 1 ? '' : 's'} · ${data.targets.length} enemy defense${data.targets.length === 1 ? '' : 's'}`)}{' '}{!canEdit && tx('· ดูอย่างเดียว')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button data-onboard="share" onClick={() => copy('view')} className="pill flex items-center gap-1.5 px-4 py-2 text-sm hover:border-gold">
            {copied === 'view' ? <Check className="h-4 w-4 text-green-400" /> : <Link2 className="h-4 w-4" />}{' '}{tx('ลิงก์ดูอย่างเดียว')}
          </button>
          {/* คนที่แก้ได้: สลับมุมมองคนแก้/คนดู */}
          {realCanEdit && !isDemo(gid) && <ViewAsToggle gid={gid} />}
          {realCanEdit
            // ตั้งรหัส/ลบกิลด์/ออกจากโหมดแก้ = ของคนที่ใช้รหัสเท่านั้น (คนที่แก้ได้เพราะยศ Discord ไม่เห็น)
            ? canEdit && isOwner && <EditSettings gid={gid} guildName={data.guild.name} onLogout={recheck} />
            : <EditLogin gid={gid} onLogin={() => setCanEdit(true)} />}
        </div>
      </div>

      <WarBoard gid={gid} data={data} canEdit={canEdit} isOwner={isOwner} reload={reload} />

      {/* แท็บ */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {/* แท็บ: พื้นทองวิ่งตามแท็บที่เลือก */}
        <div ref={tabPill.box} data-tour="guild-tabs" className="pill relative flex p-1">
          <span aria-hidden className="slide-pill" style={tabPill.pill} />
          {([
            ['plans', tx('แผนสงคราม'), ClipboardList],
            ['targets', tx('บ้านศัตรู'), Swords],
          ] as const).map(([k, label, Icon]) => (
            <button
              key={k}
              data-tour={`tab-${k}`}
              ref={tabPill.item(k)}
              onClick={() => setParams(k === 'plans' ? {} : { tab: k }, { replace: true })}
              className={`relative z-10 flex items-center gap-1.5 rounded-full px-4 py-1.5 transition-colors sm:px-5 ${tab === k ? 'font-semibold text-ink' : 'text-white/70 hover:bg-white/10'}`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
        <HelpLink section={tab === 'plans' ? ['plans', 'announce', 'discord', 'edit'] : ['targets', 'team', 'stats', 'edit']} />
        {canEdit && tab !== 'plans' && (
          <Link data-onboard="add-target" to={`/g/${gid}/t/new`} className="btn-gold ml-auto flex items-center gap-1.5 px-4 py-2 text-sm">
            <Plus className="h-4 w-4" />{' '}{tx('เพิ่มบ้านศัตรู')}
          </Link>
        )}
      </div>

      {/* เนื้อหาเลื่อนเข้าตามทิศแท็บ (แผนสงคราม ← → บ้านศัตรู) */}
      <div key={tab} className={tabSlide}>
      {tab === 'plans' ? (
        <div className="space-y-10">
          {(['attack', 'defense'] as const).map((k) => (
            <section key={k}>
              <h2 className={`mt-8 flex items-center gap-2 text-xl font-bold ${k === 'attack' ? 'text-red-200' : 'text-sky-100'}`}>
                {k === 'attack' ? <Swords className="h-5 w-5" /> : <Shield className="h-5 w-5" />} {PLAN_KIND_LABEL[k]}
                <span className="text-sm font-normal text-white/45">{L(`${data.plans.filter((p) => planKind(p.data) === k).length} แผน`, `${data.plans.filter((p) => planKind(p.data) === k).length} plans`)}</span>
                {canEdit && (
                  <Link data-onboard={`new-${k}`} to={`/g/${gid}/p/new?kind=${k}`} className="btn-gold ml-auto flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold">
                    <Plus className="h-4 w-4" />{' '}{L('สร้าง', 'New ')}{PLAN_KIND_LABEL[k]}
                  </Link>
                )}
              </h2>
              <PlanList gid={gid} kind={k} plans={data.plans.filter((p) => planKind(p.data) === k)} canEdit={canEdit} activeId={activePlanId(data, k)} usedAt={lastUsed(data.announcements)} />
            </section>
          ))}
        </div>
      ) : (
        <>
      <div data-tour="target-search" className="mt-5 flex flex-wrap items-center gap-2">
        <label className="pill flex min-w-60 flex-1 items-center gap-2 px-4 py-2">
          <Search className="h-4 w-4 text-white/50" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx('ค้นหาชื่ออัศวิน, โน้ต, แท็ก...')} className="w-full bg-transparent outline-none placeholder:text-white/40" />
        </label>
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <TagChip active={!tag} onClick={() => setTag(null)}>{tx('ทั้งหมด')}</TagChip>
            {allTags.map((t) => (
              <TagChip key={t} active={tag === t} onClick={() => setTag(tag === t ? null : t)}>{tagText(t)}</TagChip>
            ))}
          </div>
        )}
      </div>

      {list.length === 0 ? (
        data.targets.length === 0 && canEdit ? (
          // กิลด์ยังว่าง: การ์ดใหญ่ "เริ่มจากตรงนี้"
          <div className="panel panel-gold mx-auto mt-8 max-w-lg p-8 text-center">
            <Swords className="mx-auto h-10 w-10 text-gold" />
            <p className="mt-3 text-lg font-bold">{tx('เริ่มจากจดบ้านศัตรูที่เจอ')}</p>
            <p className="mt-1 text-sm text-white/60">{tx('กด “เพิ่มบ้านศัตรู” ด้านบน จดบ้านที่เจอ แล้วเพิ่มทีมแก้ — ทั้งกิลด์จะได้ดูข้อมูลเดียวกัน และดึงไปใช้ในแผนสงครามได้')}</p>
          </div>
        ) : (
          <div className="panel mt-8 p-10 text-center text-white/60">
            {data.targets.length === 0 ? tx('ยังไม่มีทีมที่จดไว้') : tx('ไม่พบทีมที่ค้นหา')}
          </div>
        )
      ) : (
        <>
        <TargetGrid list={list} gid={gid} anchor={anchor} />
        {/* ปุ่มลอย (fixed = ไม่ดันหน้า) · portal: แท็บมีแอนิเมชันเลื่อน (transform) ทำให้ fixed ข้างในเพี้ยน */}
        {stale && createPortal(
          <button type="button" data-testid="resort" onClick={() => setResort((n) => n + 1)}
            className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full border border-gold/60 bg-[var(--surface-deep)] px-4 py-2 text-sm font-semibold text-gold shadow-lg hover:bg-gold/15">
            {L('มีการแก้ใหม่ · เรียงล่าสุดขึ้นก่อน', 'New edits · sort latest first')}
          </button>,
          document.body,
        )}
        </>
      )}
        </>
      )}
      </div>
    </div>
  )
}

function TagChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm ${active ? 'border-gold bg-gold/15 text-gold' : 'border-white/15 text-white/70 hover:bg-white/5'}`}
    >
      {children}
    </button>
  )
}

/** เวลาที่แต่ละแผนถูกประกาศใช้ล่าสุด */
function lastUsed(announcements: { planId: string | null; createdAt: number }[]) {
  const m = new Map<string, number>()
  for (const a of announcements) if (a.planId && !(m.get(a.planId)! >= a.createdAt)) m.set(a.planId, a.createdAt)
  return m
}

function PlanList({ gid, kind, plans, canEdit, activeId, usedAt }: { gid: string; kind: PlanKind; plans: Plan[]; canEdit: boolean; activeId: string | null; usedAt: Map<string, number> }) {
  const [showAll, setShowAll] = useState(false)
  const rail = useRef<HTMLDivElement>(null)
  // ลากด้วยเมาส์ (มือถือปัดได้อยู่แล้ว) — ลากแล้วไม่นับเป็นการกดเข้าแผน
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null)
  if (plans.length === 0)
    return (
      canEdit ? (
        <div className="panel mt-4 flex flex-col items-center gap-3 p-8 text-center sm:flex-row sm:text-left">
          {kind === 'attack' ? <Swords className="h-9 w-9 shrink-0 text-red-200" /> : <Shield className="h-9 w-9 shrink-0 text-sky-100" />}
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{L(`ยังไม่มี${PLAN_KIND_LABEL[kind]}`, `No ${PLAN_KIND_LABEL[kind].toLowerCase()}s yet`)}</p>
            <p className="mt-0.5 text-sm text-white/55">{kind === 'attack'
              ? L(`กด “สร้าง${PLAN_KIND_LABEL[kind]}” ด้านบน — วางว่าแต่ละไม้ใช้ทีมไหนตีบ้านไหน เลือกบ้านจากที่จดไว้ ทีมแก้จะมาให้เลย`, `Tap “New ${PLAN_KIND_LABEL[kind]}” above — set which team attacks which defense in each slot; pick defenses from your saved ones and their counters come along`)
              : L(`กด “สร้าง${PLAN_KIND_LABEL[kind]}” ด้านบน — วางบ้านกันของกิลด์ แต่ละไม้ใส่ทีมสำรองได้ตามลำดับ`, `Tap “New ${PLAN_KIND_LABEL[kind]}” above — set up the guild's defenses; each slot can have backup teams in order`)}</p>
          </div>
        </div>
      ) : (
        <div className="panel mt-4 p-8 text-center text-white/60">{L(`ยังไม่มี${PLAN_KIND_LABEL[kind]}`, `No ${PLAN_KIND_LABEL[kind].toLowerCase()}s yet`)}</div>
      )
    )
  // เรียง: แผนที่ใช้อยู่ → ใช้ล่าสุด (ตามประกาศ) → แก้ล่าสุด · การ์ดถัดไปโผล่ขอบขวาให้รู้ว่าเลื่อนได้
  const sorted = [...plans].sort((a, b) =>
    Number(b.id === activeId) - Number(a.id === activeId)
    || (usedAt.get(b.id) ?? 0) - (usedAt.get(a.id) ?? 0)
    || b.updatedAt - a.updatedAt)
  const cards = sorted.map((p) => <PlanCard key={p.id} gid={gid} plan={p} active={p.id === activeId} usedAt={usedAt.get(p.id)} />)
  if (plans.length <= 2) return <div className="mt-4 grid gap-6 md:grid-cols-2">{cards}</div>

  const scroll = (dir: -1 | 1) => rail.current?.scrollBy({ left: dir * rail.current.clientWidth * 0.9, behavior: 'smooth' })
  return (
    <div className="mt-4">
      <div className="mb-3 flex items-center justify-end gap-2">
        <button type="button" onClick={() => scroll(-1)} aria-label={tx('แผนก่อนหน้า')} className="pill p-1.5 hover:border-gold"><ChevronLeft className="h-4 w-4" /></button>
        <button type="button" onClick={() => scroll(1)} aria-label={tx('แผนถัดไป')} className="pill p-1.5 hover:border-gold"><ChevronRight className="h-4 w-4" /></button>
        <button type="button" onClick={() => setShowAll(true)} className="pill flex items-center gap-1.5 px-3 py-1 text-sm hover:border-gold">
          <LayoutGrid className="h-4 w-4" />{' '}{tx('ดูทั้งหมด (')}{plans.length})
        </button>
      </div>
      {/* ดูทั้งหมด = หน้าต่างใหม่ (แบบดูรายละเอียดทั้งทีม) */}
      <Modal open={showAll} wide title={L(`${PLAN_KIND_LABEL[kind]}ทั้งหมด (${plans.length})`, `All ${PLAN_KIND_LABEL[kind].toLowerCase()}s (${plans.length})`)} onClose={() => setShowAll(false)}>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{cards}</div>
        <button type="button" onClick={() => setShowAll(false)} className="btn-gold mt-5 w-full">{tx('ปิด')}</button>
      </Modal>
        <div
          ref={rail}
          className="plan-rail -mx-1 flex snap-x snap-mandatory gap-6 overflow-x-auto px-1 pb-3 [scrollbar-width:thin] [&>*]:w-[85%] [&>*]:shrink-0 [&>*]:snap-start md:[&>*]:w-[calc(50%-48px)]"
          onPointerDown={(e) => {
            if (e.pointerType !== 'mouse' || !rail.current) return
            drag.current = { x: e.clientX, left: rail.current.scrollLeft, moved: false }
          }}
          onPointerMove={(e) => {
            const d = drag.current
            if (!d || !rail.current) return
            // ปล่อยเมาส์นอกแถบไปแล้ว (ไม่มีปุ่มกดค้าง) → จบการลาก ไม่ให้เลื่อนตามเมาส์ต่อ
            if (e.buttons === 0) { drag.current = null; rail.current.style.scrollSnapType = ''; return }
            const dx = e.clientX - d.x
            if (Math.abs(dx) > 5 && !d.moved) {
              d.moved = true
              rail.current.style.scrollSnapType = 'none'
              // จับเมาส์ไว้ — ลากออกนอกขอบแล้วปล่อย แถบยังรู้ว่าปล่อยแล้ว
              rail.current.setPointerCapture(e.pointerId)
            }
            if (d.moved) rail.current.scrollLeft = d.left - dx
          }}
          onPointerUp={() => {
            if (rail.current) rail.current.style.scrollSnapType = ''
            setTimeout(() => { drag.current = null }, 0)
          }}
          onPointerLeave={() => {
            if (rail.current) rail.current.style.scrollSnapType = ''
            if (drag.current && !drag.current.moved) drag.current = null
          }}
          onPointerCancel={() => { if (rail.current) rail.current.style.scrollSnapType = ''; drag.current = null }}
          onClickCapture={(e) => { if (drag.current?.moved) { e.preventDefault(); e.stopPropagation() } }}
          onDragStart={(e) => e.preventDefault()}
        >
          {cards}
        </div>
    </div>
  )
}

function PlanCard({ gid, plan: p, active, usedAt }: { gid: string; plan: Plan; active: boolean; usedAt?: number }) {
  const used = p.data.slots.filter((s) => s.options.length)
  return (
    <Link to={`/g/${gid}/p/${p.id}`} className="plan-card-link block select-none">
    <div className={`plan-card panel ${active ? 'panel-gold' : ''} h-full p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {active && <span className="mb-1 inline-block rounded-full bg-gold px-2 text-xs font-semibold text-ink">{tx('ใช้อยู่ตอนนี้')}</span>}
          <h3 className="break-words text-2xl font-bold">{p.title}</h3>
          <p className="text-sm text-white/50">
            {tx('อัปเดต')}{' '}{new Date(p.updatedAt).toLocaleString(LOCALE, { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
          {!active && usedAt && (
            <p className="text-sm text-gold/70">{tx('ใช้ล่าสุด')}{' '}{new Date(usedAt).toLocaleString(LOCALE, { dateStyle: 'medium' })}</p>
          )}
        </div>
        {p.data.op.length > 0 && (
          <div className="flex -space-x-2">
            {p.data.op.slice(0, 4).map((id) => (
              <span key={id} className="h-9 w-9 rounded-full ring-2 ring-[#232c46]" style={{ fontSize: 9 }}>
                <UnitCard id={id} shape="round" />
              </span>
            ))}
          </div>
        )}
      </div>
      <ul className="mt-4 space-y-1.5 text-sm">
        {used.length === 0 && <li className="text-white/40">{tx('ยังไม่มีทีม')}</li>}
        {used.map((s, i) => (
          <li key={i} className="flex items-center gap-2 text-white/80">
            {s.kind === 'attack' ? <Swords className="h-4 w-4 text-red-300" /> : <Shield className="h-4 w-4 text-sky-300" />}
            <span className="truncate">{slotLabel(s.name, i)}</span>
            <span className="ml-auto shrink-0 text-white/45">{L(`${s.options.length} แบบ`, `${s.options.length} option${s.options.length === 1 ? '' : 's'}`)}</span>
          </li>
        ))}
      </ul>
    </div>
    </Link>
  )
}

/** ตำแหน่งที่จำไว้ตอนออกจากหน้า (ดู snap ใน GuildPage) */
function readSnap(key: string): { y: number; id: string; top: number } | null {
  try { return JSON.parse(sessionStorage.getItem(key) || 'null') } catch { return null } // ไม่มี storage
}

/**
 * ช่วงการ์ดที่สร้างทันทีตอนเปิดหน้า [เริ่ม, จบ) = เท่าที่เห็นบนจอแรก + เผื่อ 1 แถว (กดย้อนกลับ = รอบ ๆ การ์ดที่เคยดูอยู่)
 * ใบอื่นเป็นช่องเปล่าขนาดเท่าการ์ดไปก่อน แล้วทยอยสร้างตามมา (useMountLater)
 * ไม่ใช้ matchMedia (บังคับเบราว์เซอร์คำนวณสไตล์กลางการวาด) — คอลัมน์ตาม sm:/lg: ของตาราง
 */
function eagerRange(list: Target[], anchor: string | null): [number, number] {
  const vw = window.innerWidth
  const cols = vw >= 1024 ? 3 : vw >= 640 ? 2 : 1
  const rowH = 3 * Math.min(68, Math.max(54, vw * 0.15)) + 229 // การ์ด (CARD_HEIGHT) + ช่องว่างระหว่างแถว
  const rows = Math.ceil(window.innerHeight / uiZoom() / rowH) + 1
  const at = anchor ? list.findIndex((t) => t.id === anchor) : -1
  const start = at > 0 ? Math.max(0, (Math.floor(at / cols) - 1) * cols) : 0
  return [start, start + (rows + 1) * cols]
}

/** การ์ดบ้านศัตรูทั้งหมด — แยก + memo: พิมพ์ค้นหา/กดแท็ก แล้วช่องพิมพ์ตอบทันที การ์ดค่อยวาดตามหลัง (ไม่วาดซ้ำถ้ารายการเดิม) */
const TargetGrid = memo(function TargetGrid({ list, gid, anchor }: { list: Target[]; gid: string; anchor: string | null }) {
  const [from, to] = eagerRange(list, anchor)
  return (
    <div className="mt-5 grid gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((t, i) => <TargetCell key={t.id} t={t} gid={gid} priority={i < 3} eager={i >= from && i < to} />)}
    </div>
  )
})

/**
 * ช่องการ์ดบ้าน 1 ใบ (.target-cell ใน index.css): ขนาดล็อก + การ์ดนอกจอไม่วาด
 * ล็อกขนาด (contain: size) = เลื่อนถึงการ์ดใหม่ เบราว์เซอร์วาดแค่ใบนั้น ไม่ต้องวัดการ์ดทั้งตารางใหม่ (เคยค้างหลายวินาทีตอนเปิดหน้า)
 * กล่องขยายเกินการ์ด (padding + margin ติดลบ) ให้เงา/✦ ไม่โดนตัด · ความสูง = การ์ด (CARD_HEIGHT) + ส่วนที่ขยาย
 * eager = สร้างการ์ดทันที · ไม่งั้นเป็นช่องเปล่าจนกว่าจะเลื่อนเข้าใกล้จอหรือเครื่องว่าง (useMountLater)
 */
const TargetCell = memo(function TargetCell({ t, gid, priority, eager }: { t: Target; gid: string; priority: boolean; eager: boolean }) {
  const [cell, on] = useMountLater<HTMLDivElement>(eager)
  return (
    <div ref={cell} data-target-cell={t.id} className="target-cell" style={{ height: `calc(${CARD_HEIGHT} + ${CELL_BLEED}px)` }}>
      {on && <TargetCard t={t} gid={gid} priority={priority} />}
    </div>
  )
})

function TargetCard({ t, gid, priority }: { t: Target; gid: string; priority: boolean }) {
  // แก้/เพิ่มภายใน 24 ชม. (ตัวบ้านศัตรูหรือทีมแก้ข้างใน) → จุดเขียว ให้คนในกิลรู้ว่ามีการแก้
  const last = Math.max(t.updatedAt, ...t.counters.map((c) => c.updatedAt))
  const ago = Date.now() - last
  const recent = ago < 24 * 3600_000
  return (
    <Link data-target-card={t.id} to={`/g/${gid}/t/${t.id}`} className="group flex h-full min-w-0 flex-col"
      style={t.tags[0] ? { '--tag': tagColor(t.tags[0]) } as React.CSSProperties : undefined}>
      <ImgPriority value={priority}>
      <TeamCardLite
        team={t.team}
        skills={t.team.skills ?? []}
        className={`flex-1 group-hover:border-gold ${t.tags[0] ? 'tag-accent' : ''}`}
        title={
          <span className="flex items-center justify-between gap-2">
            <span className="flex flex-wrap gap-1">
              {t.tags.length ? t.tags.map((x) => (
                <span key={x} className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={tagStyle(x)}>{tagText(x)}</span>
              )) : <span className="text-white/50">{tx('บ้านศัตรู')}</span>}
            </span>
            <span className="flex shrink-0 items-center gap-2 text-xs font-normal">
              {recent && (
                <span className="flex items-center gap-1 text-emerald-300/90" title={tx('มีการแก้ใน 24 ชม.')}>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {ago < 3600_000 ? L(`${Math.max(1, Math.floor(ago / 60_000))} นาที`, `${Math.max(1, Math.floor(ago / 60_000))}m`) : L(`${Math.floor(ago / 3600_000)} ชม.`, `${Math.floor(ago / 3600_000)}h`)}
                </span>
              )}
              <span className="flex items-center gap-1 text-gold"><Swords className="h-3.5 w-3.5" /> {L(`${t.counters.length} ทีมแก้`, `${t.counters.length} counter${t.counters.length === 1 ? '' : 's'}`)}</span>
            </span>
          </span>
        }
      />
      </ImgPriority>
    </Link>
  )
}

/** ส่วนที่ช่องการ์ดขยายเกินตัวการ์ด (บน 16 + ล่าง 40 — ต้องตรงกับ padding ของ .target-cell) */
const CELL_BLEED = 56
