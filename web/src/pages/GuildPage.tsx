import { Check, ChevronLeft, ChevronRight, ClipboardList, LayoutGrid, Link2, Plus, Search, Shield, Swords } from 'lucide-react'
import { sortTags, tagColor, tagStyle, tagText } from '../lib/tags'
import { useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import Modal from '../components/Modal'
import TeamCardLite from '../components/TeamCardLite'
import UnitCard from '../components/UnitCard'
import WarBoard from '../components/WarBoard'
import ViewAsToggle from '../components/ViewAsToggle'
import { activePlanId } from '../lib/war'
import { useSlideDir, useSlidePill } from '../lib/slide'
import { getUnit, englishOf, unitBase } from '../data/heroes'
import { EditLogin, EditSettings } from '../components/EditAccess'
import { PLAN_KIND_LABEL, planKind, type Plan, type PlanKind, type Target, type Team, slotLabel } from '../lib/types'
import { useGuild } from '../lib/useGuild'
import { renderAhead } from '../lib/renderAhead'
import HelpLink from '../components/HelpLink'
import GuildTour from '../components/GuildTour'
import { isDemo } from '../lib/demo'
import GuildOnboarding from '../components/GuildOnboarding'
import { markShared, onboardFlags } from '../lib/onboarding'
import { useSmoothWheel } from '../lib/smoothWheel'
import NotFound from './NotFound'
import { tx, L, LOCALE } from '../lib/i18n'

// ค้นได้ทั้งชื่อไทยและอังกฤษ (ไม่ขึ้นกับภาษาที่ตั้ง)
const names = (t: Team) => [...t.slots, t.pet].map((id) => (id ? `${getUnit(id)?.name ?? ''} ${englishOf(id) ?? ''} ${unitBase(id)}` : '')).join(' ')
const matches = (t: Target, q: string) =>
  [names(t.team), t.note, ...t.tags].join(' ').toLowerCase().includes(q)

export default function GuildPage() {
  const { gid = '' } = useParams()
  const { data, error, canEdit, realCanEdit, setCanEdit, recheck, reload } = useGuild(gid)
  const [q, setQ] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'targets' ? 'targets' : 'plans'
  const tabPill = useSlidePill(tab)
  const tabSlide = useSlideDir(tab === 'plans' ? 0 : 1)
  useSmoothWheel(tab === 'targets')

  const allTags = useMemo(() => sortTags([...new Set(data?.targets.flatMap((t) => t.tags) ?? [])]), [data])
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    // แก้ล่าสุดอยู่บนสุด (ตัวบ้านศัตรูหรือทีมแก้ข้างใน — เวลาเดียวกับจุดเขียว)
    const last = (t: Target) => Math.max(t.updatedAt, ...t.counters.map((c) => c.updatedAt))
    return (data?.targets ?? []).filter((t) => (!tag || t.tags.includes(tag)) && (!s || matches(t, s))).sort((a, b) => last(b) - last(a))
  }, [data, q, tag])

  if (error) return <NotFound message={error} />
  if (!data) return <p className="py-24 text-center text-white/50">{tx('กำลังโหลด...')}</p>

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
            ? canEdit && <EditSettings gid={gid} guildName={data.guild.name} onLogout={recheck} />
            : <EditLogin gid={gid} onLogin={() => setCanEdit(true)} />}
        </div>
      </div>

      <WarBoard gid={gid} data={data} canEdit={canEdit} reload={reload} />

      {/* แท็บ */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {/* แท็บ: พื้นทองวิ่งตามแท็บที่เลือก */}
        <div ref={tabPill.box} className="pill relative flex p-1">
          <span aria-hidden className="slide-pill" style={tabPill.pill} />
          {([
            ['plans', tx('แผนสงคราม'), ClipboardList],
            ['targets', tx('บ้านศัตรู'), Swords],
          ] as const).map(([k, label, Icon]) => (
            <button
              key={k}
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
      <div className="mt-5 flex flex-wrap items-center gap-2">
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
        <div className="mt-5 grid gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((t) => {
            // แก้/เพิ่มภายใน 24 ชม. (ตัวบ้านศัตรูหรือทีมแก้ข้างใน) → จุดเขียว ให้คนในกิลรู้ว่ามีการแก้
            const last = Math.max(t.updatedAt, ...t.counters.map((c) => c.updatedAt))
            const ago = Date.now() - last
            const recent = ago < 24 * 3600_000
            return (
            <Link key={t.id} ref={renderAhead} to={`/g/${gid}/t/${t.id}`} className="group flex min-w-0 flex-col transition"
              // การ์ดที่ยังไม่อยู่บนจอ: เบราว์เซอร์ข้ามการวาด (กิลด์ที่มีคอมพ์เยอะจะไม่ค้าง) · 560px = ความสูงโดยประมาณของการ์ด
              style={{ contentVisibility: 'auto', containIntrinsicWidth: 'none', containIntrinsicHeight: 'auto 480px', ...(t.tags[0] ? { '--tag': tagColor(t.tags[0]) } : {}) } as React.CSSProperties}>
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
            </Link>
            )
          })}
        </div>
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
    <Link to={`/g/${gid}/p/${p.id}`} className={`plan-card panel ${active ? 'panel-gold' : ''} block select-none p-5 transition hover:-translate-y-1`}>
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
    </Link>
  )
}
