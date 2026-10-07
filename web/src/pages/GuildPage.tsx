import { Check, ChevronLeft, ChevronRight, ClipboardList, LayoutGrid, Link2, Plus, Search, Shield, Swords } from 'lucide-react'
import { sortTags, tagColor, tagStyle } from '../lib/tags'
import { useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import Modal from '../components/Modal'
import TeamPanel from '../components/TeamPanel'
import UnitCard from '../components/UnitCard'
import WarBoard from '../components/WarBoard'
import { activePlanId } from '../lib/war'
import { getUnit } from '../data/heroes'
import { EditLogin, EditSettings } from '../components/EditAccess'
import { PLAN_KIND_LABEL, planKind, type Plan, type PlanKind, type Target, type Team } from '../lib/types'
import { useGuild } from '../lib/useGuild'
import NotFound from './NotFound'

const names = (t: Team) => t.slots.map((id) => getUnit(id)?.name ?? '').join(' ')
const matches = (t: Target, q: string) =>
  [names(t.team), ...t.counters.map((c) => names(c.team)), t.note, ...t.tags].join(' ').toLowerCase().includes(q)

export default function GuildPage() {
  const { gid = '' } = useParams()
  const { data, error, canEdit, setCanEdit, recheck, reload } = useGuild(gid)
  const [q, setQ] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'targets' ? 'targets' : 'plans'

  const allTags = useMemo(() => sortTags([...new Set(data?.targets.flatMap((t) => t.tags) ?? [])]), [data])
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    // แก้ล่าสุดอยู่บนสุด (ตัวทีมเป้าหมายหรือทีมแก้ข้างใน — เวลาเดียวกับจุดเขียว)
    const last = (t: Target) => Math.max(t.updatedAt, ...t.counters.map((c) => c.updatedAt))
    return (data?.targets ?? []).filter((t) => (!tag || t.tags.includes(tag)) && (!s || matches(t, s))).sort((a, b) => last(b) - last(a))
  }, [data, q, tag])

  if (error) return <NotFound message={error} />
  if (!data) return <p className="py-24 text-center text-white/50">กำลังโหลด...</p>

  async function copy(kind: 'view') {
    const url = `${location.origin}/g/${gid}`
    await navigator.clipboard.writeText(url).catch(() => prompt('คัดลอกลิงก์นี้', url))
    setCopied(kind)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div>
      <div className="guild-banner flex flex-wrap items-end justify-between gap-5">
        <div className="relative min-w-0">
          <p className="eyebrow mb-3">GUILD HEADQUARTERS</p>
          <h1 className="gold-title break-words text-3xl font-extrabold sm:text-5xl">{data.guild.name}</h1>
          <p className="mt-1 text-sm text-white/55">
            {data.plans.length} แผนวอร์ · {data.targets.length} ทีมเป้าหมาย {!canEdit && '· ดูอย่างเดียว'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => copy('view')} className="pill flex items-center gap-1.5 px-4 py-2 text-sm hover:border-gold">
            {copied === 'view' ? <Check className="h-4 w-4 text-green-400" /> : <Link2 className="h-4 w-4" />} ลิงก์ดูอย่างเดียว
          </button>
          {canEdit
            ? <EditSettings gid={gid} guildName={data.guild.name} onLogout={recheck} />
            : <EditLogin gid={gid} onLogin={() => setCanEdit(true)} />}
        </div>
      </div>

      <WarBoard gid={gid} data={data} canEdit={canEdit} reload={reload} />

      {/* แท็บ */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div className="pill flex p-1">
          {([
            ['plans', 'แผนวอร์', ClipboardList],
            ['targets', 'จดทีมศัตรู', Swords],
          ] as const).map(([k, label, Icon]) => (
            <button
              key={k}
              onClick={() => setParams(k === 'plans' ? {} : { tab: k }, { replace: true })}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 sm:px-5 ${tab === k ? 'bg-gradient-to-b from-[#fff1c9] to-[#e2bf72] font-semibold text-ink' : 'text-white/70 hover:bg-white/10'}`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
        {canEdit && tab !== 'plans' && (
          <Link to={`/g/${gid}/t/new`} className="btn-gold flex items-center gap-1.5 px-4 py-2 text-sm">
            <Plus className="h-4 w-4" /> เพิ่มทีมเป้าหมาย
          </Link>
        )}
      </div>

      {tab === 'plans' ? (
        <div className="space-y-10">
          {(['attack', 'defense'] as const).map((k) => (
            <section key={k}>
              <h2 className={`mt-8 flex items-center gap-2 text-xl font-bold ${k === 'attack' ? 'text-red-200' : 'text-sky-100'}`}>
                {k === 'attack' ? <Swords className="h-5 w-5" /> : <Shield className="h-5 w-5" />} {PLAN_KIND_LABEL[k]}
                <span className="text-sm font-normal text-white/45">{data.plans.filter((p) => planKind(p.data) === k).length} แผน</span>
                {canEdit && (
                  <Link to={`/g/${gid}/p/new?kind=${k}`} className="btn-gold ml-auto flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold">
                    <Plus className="h-4 w-4" /> สร้าง{PLAN_KIND_LABEL[k]}
                  </Link>
                )}
              </h2>
              <PlanList gid={gid} kind={k} plans={data.plans.filter((p) => planKind(p.data) === k)} canEdit={canEdit} activeId={activePlanId(data)} usedAt={lastUsed(data.announcements)} />
            </section>
          ))}
        </div>
      ) : (
        <>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <label className="pill flex min-w-60 flex-1 items-center gap-2 px-4 py-2">
          <Search className="h-4 w-4 text-white/50" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อฮีโร่, โน้ต, แท็ก..." className="w-full bg-transparent outline-none placeholder:text-white/40" />
        </label>
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <TagChip active={!tag} onClick={() => setTag(null)}>ทั้งหมด</TagChip>
            {allTags.map((t) => (
              <TagChip key={t} active={tag === t} onClick={() => setTag(tag === t ? null : t)}>{t}</TagChip>
            ))}
          </div>
        )}
      </div>

      {list.length === 0 ? (
        <div className="panel mt-8 p-10 text-center text-white/60">
          {data.targets.length === 0 ? (canEdit ? 'ยังไม่มีทีม กด “เพิ่มทีมเป้าหมาย” เพื่อเริ่มจด' : 'ยังไม่มีทีมที่จดไว้') : 'ไม่พบทีมที่ค้นหา'}
        </div>
      ) : (
        <div className="mt-8 grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((t) => {
            // แก้/เพิ่มภายใน 24 ชม. (ตัวทีมศัตรูหรือทีมแก้ข้างใน) → จุดเขียว ให้คนในกิลรู้ว่ามีการแก้
            const last = Math.max(t.updatedAt, ...t.counters.map((c) => c.updatedAt))
            const ago = Date.now() - last
            const recent = ago < 24 * 3600_000
            return (
            <Link key={t.id} to={`/g/${gid}/t/${t.id}`} className="group flex flex-col transition hover:-translate-y-1" style={t.tags[0] ? ({ '--tag': tagColor(t.tags[0]) } as React.CSSProperties) : undefined}>
              <TeamPanel
                variant="enemy"
                size="sm"
                team={t.team}
                skills={t.team.skills ?? []}
                className={`flex-1 group-hover:border-gold ${t.tags[0] ? 'tag-accent' : ''}`}
                title={
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex flex-wrap gap-1">
                      {t.tags.length ? t.tags.map((x) => (
                        <span key={x} className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={tagStyle(x)}>{x}</span>
                      )) : <span className="text-white/50">ทีมเป้าหมาย</span>}
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-xs font-normal">
                      {recent && (
                        <span className="flex items-center gap-1 text-emerald-300/90" title="มีการแก้ใน 24 ชม.">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          {ago < 3600_000 ? `${Math.max(1, Math.floor(ago / 60_000))} นาที` : `${Math.floor(ago / 3600_000)} ชม.`}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-gold"><Swords className="h-3.5 w-3.5" /> {t.counters.length} ทีมแก้</span>
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
      <div className="panel mt-4 p-8 text-center text-white/60">
        {canEdit ? `ยังไม่มี${PLAN_KIND_LABEL[kind]} กด “สร้าง${PLAN_KIND_LABEL[kind]}” เพื่อจัดทีม 5 ไม้` : `ยังไม่มี${PLAN_KIND_LABEL[kind]}`}
      </div>
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
        <button type="button" onClick={() => scroll(-1)} aria-label="แผนก่อนหน้า" className="pill p-1.5 hover:border-gold"><ChevronLeft className="h-4 w-4" /></button>
        <button type="button" onClick={() => scroll(1)} aria-label="แผนถัดไป" className="pill p-1.5 hover:border-gold"><ChevronRight className="h-4 w-4" /></button>
        <button type="button" onClick={() => setShowAll(true)} className="pill flex items-center gap-1.5 px-3 py-1 text-sm hover:border-gold">
          <LayoutGrid className="h-4 w-4" /> ดูทั้งหมด ({plans.length})
        </button>
      </div>
      {/* ดูทั้งหมด = หน้าต่างใหม่ (แบบดูรายละเอียดทั้งทีม) */}
      <Modal open={showAll} wide title={`${PLAN_KIND_LABEL[kind]}ทั้งหมด (${plans.length})`} onClose={() => setShowAll(false)}>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{cards}</div>
        <button type="button" onClick={() => setShowAll(false)} className="btn-gold mt-5 w-full">ปิด</button>
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
            const dx = e.clientX - d.x
            if (Math.abs(dx) > 5) {
              d.moved = true
              rail.current.style.scrollSnapType = 'none'
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
          {active && <span className="mb-1 inline-block rounded-full bg-gold px-2 text-xs font-semibold text-ink">ใช้อยู่ตอนนี้</span>}
          <h3 className="break-words text-2xl font-bold">{p.title}</h3>
          <p className="text-sm text-white/50">
            อัปเดต {new Date(p.updatedAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
          {!active && usedAt && (
            <p className="text-sm text-gold/70">ใช้ล่าสุด {new Date(usedAt).toLocaleString('th-TH', { dateStyle: 'medium' })}</p>
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
        {used.length === 0 && <li className="text-white/40">ยังไม่มีทีม</li>}
        {used.map((s, i) => (
          <li key={i} className="flex items-center gap-2 text-white/80">
            {s.kind === 'attack' ? <Swords className="h-4 w-4 text-red-300" /> : <Shield className="h-4 w-4 text-sky-300" />}
            <span className="truncate">{s.name}</span>
            <span className="ml-auto shrink-0 text-white/45">{s.options.length} แบบ</span>
          </li>
        ))}
      </ul>
    </Link>
  )
}
