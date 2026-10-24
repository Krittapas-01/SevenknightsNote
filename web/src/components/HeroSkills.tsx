import { Hourglass, Shield, Sparkles, Swords, Timer } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import thUrl from '../data/skillText.th.json?url'
import enUrl from '../data/skillText.en.json?url'
import { getSkillArt } from '../data/skills'
import { getUnit } from '../data/heroes'
import { EN, L } from '../lib/i18n'

/** คำอธิบายสกิลจาก 7K Atlas (scripts/import-skill-text.mjs) — ไฟล์แยก โหลดเฉพาะตอนเปิดดูรายละเอียดทีม */
export type SkillKind = 'awake' | 'top' | 'bottom' | 'passive' | 'basic'
type SkillText = {
  k: SkillKind
  n?: string
  /** คูลดาวน์ (วินาที ตาม Atlas) */
  cd?: number
  /** เกจที่สกิลอเวคใช้ */
  ag?: number
  /** เป้าหมาย → ผล ({buff|ชื่อ} = คำที่มีคำอธิบายใน kw) */
  g: { t: string; e: string[] }[]
  up?: string[]
  tx?: { tier: string; e: string }[]
}
type HeroSkillText = { s: SkillText[]; kw: Record<string, [string, string]> }
type Catalog = Record<string, HeroSkillText>

let cache: Promise<Catalog> | null = null
/** โหลดครั้งเดียวต่อหน้า (ไฟล์ static ของเว็บ ไม่ใช่ API) · พลาด = ลองใหม่ได้ครั้งหน้า */
export function loadSkillText() {
  cache ??= fetch(EN ? enUrl : thUrl)
    .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<Catalog> })
    .catch((e) => { cache = null; throw e })
  return cache
}

function useSkillText(hero: string, enabled: boolean) {
  const [state, setState] = useState<{ data?: HeroSkillText | null; error?: boolean }>({})
  useEffect(() => {
    if (!enabled) return
    let live = true
    loadSkillText().then(
      (c) => live && setState({ data: c[getUnit(hero)?.name ?? hero] ?? null }),
      () => live && setState({ error: true }),
    )
    return () => { live = false }
  }, [hero, enabled])
  return state
}

const ORDER: SkillKind[] = ['awake', 'top', 'bottom', 'passive', 'basic']
const ART: Partial<Record<SkillKind, 1 | 2 | 3>> = { top: 1, bottom: 2, awake: 3 }
const kindLabel = (k: SkillKind) => ({
  awake: L('สกิลอเวค', 'Awake skill'),
  top: L('สกิลบน', 'Top skill'),
  bottom: L('สกิลล่าง', 'Bottom skill'),
  passive: L('แพสซีฟ', 'Passive'),
  basic: L('โจมตีพื้นฐาน', 'Basic attack'),
}[k])

/** มีรูปสกิลในเว็บ = มีข้อมูลสกิลจาก Atlas (จับคู่ด้วยรูปเดียวกัน) · ชื่อที่พิมพ์เองไม่มี */
export const hasSkillInfo = (hero: string) => !!getSkillArt(hero, 1) || !!getSkillArt(hero, 2)

// รูปสกิลพื้นมืดเสมอ · ช่องสัญลักษณ์ (แพสซีฟ/โจมตีพื้นฐาน) ใช้พื้น "หลุม" ที่ธีมสว่างแปลงสีให้
const artBg = (hero: string, kind: SkillKind) => (ART[kind] && getSkillArt(hero, ART[kind]!) ? 'bg-[#101727]' : 'bg-black/30')

function SkillIcon({ hero, kind, size = 36 }: { hero: string; kind: SkillKind; size?: number }) {
  const n = ART[kind]
  const art = n ? getSkillArt(hero, n) : null
  if (art) return <img src={art.src} alt="" width={size} height={size} loading="lazy" decoding="async" draggable={false} className="h-full w-full object-cover" />
  // แพสซีฟ/โจมตีพื้นฐาน ไม่มีรูปในเว็บ → ใช้สัญลักษณ์แทน (ไม่เพิ่มรูปจากเกม)
  const Icon = kind === 'passive' ? Shield : kind === 'basic' ? Swords : Sparkles
  return <Icon className="h-1/2 w-1/2 text-white/60" aria-hidden="true" />
}

/**
 * แถบไอคอนสกิลของอัศวิน 1 ตัว (แบบหน้าต่างสกิลในเกม) — กดไอคอน = เปิด/ปิดคำอธิบาย
 * ใช้คู่กับ <SkillDetail> ที่วางต่ำลงไปได้ (คนเรียกเก็บว่าเปิดสกิลไหนอยู่)
 */
export function SkillStrip({ hero, open, onPick, panelId }: { hero: string; open: SkillKind | null; onPick: (k: SkillKind | null) => void; panelId: string }) {
  // ก่อนโหลดเสร็จ: โชว์สกิลบน/ล่าง/อเวค จากรูปที่มี + แพสซีฟ/โจมตีพื้นฐาน · โหลดเสร็จแล้วใช้รายการจริง
  const { data } = useSkillText(hero, true)
  const kinds = data ? ORDER.filter((k) => data.s.some((s) => s.k === k))
    : ORDER.filter((k) => !ART[k] || getSkillArt(hero, ART[k]!))
  return (
    <div className="mt-3">
      <div className="mb-0.5 text-[11px] text-white/45">{L('สกิล · กดดูรายละเอียด', 'Skills · tap for details')}</div>
      <div className="flex flex-wrap gap-1">
        {kinds.map((k) => {
          const name = data?.s.find((s) => s.k === k)?.n
          const label = `${kindLabel(k)}${name ? ` · ${name}` : ''}`
          const on = open === k
          return (
            <button key={k} type="button" title={label} aria-label={label} aria-expanded={on} aria-controls={on ? panelId : undefined}
              onClick={() => onPick(on ? null : k)}
              className={`grid h-9 w-9 place-items-center overflow-hidden rounded-lg border-2 ${artBg(hero, k)} transition-[border-color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
                on ? 'border-gold shadow-[0_0_0_1px_#6b5220,0_0_12px_rgba(244,213,141,.5)]'
                  : k === 'awake' ? 'border-[#a77bff]/80 hover:border-gold/80' : 'border-white/25 hover:border-gold/70'}`}>
              <SkillIcon hero={hero} kind={k} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

const KW_COLOR: Record<string, string> = { buff: 'text-sky-300', debuff: 'text-red-300', unique: 'text-amber-300' }
const KW_RE = /\{(\w+)\|([^}]*)\}/g

/** ข้อความที่มี {buff|ชื่อ} → ทำสีคำ (บัฟฟ้า · ดีบัฟแดง · ผลเฉพาะตัวส้ม) */
function Rich({ text }: { text: string }) {
  const out: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(KW_RE)) {
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push(<span key={m.index} className={`font-semibold ${KW_COLOR[m[1]] ?? 'text-gold'}`}>{m[2]}</span>)
    last = m.index + m[0].length
  }
  out.push(text.slice(last))
  return <>{out}</>
}
const keywordsIn = (s: SkillText) => {
  const all = [...s.g.flatMap((g) => g.e), ...(s.up ?? []), ...(s.tx ?? []).map((t) => t.e)].join(' ')
  return [...new Set([...all.matchAll(KW_RE)].map((m) => m[2]))]
}

/** คำอธิบายสกิลที่เลือก (เป้าหมาย/ผล · อัปเกรดสกิล · ข้ามขีดจำกัด · คำอธิบายบัฟ/ดีบัฟ) */
export function SkillDetail({ hero, kind, id, className = '' }: { hero: string; kind: SkillKind; id: string; className?: string }) {
  const { data, error } = useSkillText(hero, true)
  const skill = data?.s.find((s) => s.k === kind)
  let body: ReactNode
  if (error) body = <p className="text-white/55">{L('โหลดข้อมูลสกิลไม่สำเร็จ ลองเปิดใหม่อีกครั้ง', 'Could not load skills. Try again.')}</p>
  else if (data === undefined) body = <p className="text-white/55">{L('กำลังโหลดสกิล…', 'Loading skills…')}</p>
  else if (!skill) body = <p className="text-white/55">{L('ยังไม่มีข้อมูลสกิลนี้', 'No data for this skill yet')}</p>
  else {
    const kws = keywordsIn(skill).filter((k) => data?.kw[k])
    body = (
      <>
        <div className="flex items-start gap-3">
          <span className={`grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border-2 ${artBg(hero, kind)} ${kind === 'awake' ? 'border-[#a77bff]' : 'border-white/30'}`}>
            <SkillIcon hero={hero} kind={kind} size={48} />
          </span>
          <div className="min-w-0">
            <h4 className="break-words text-base font-semibold text-gold">{skill.n || kindLabel(kind)}</h4>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-white/55">
              {skill.n && <span>{kindLabel(kind)}</span>}
              {skill.cd != null && <span className="inline-flex items-center gap-1"><Timer className="h-3.5 w-3.5" aria-hidden="true" />{L(`คูลดาวน์ ${skill.cd} วินาที`, `Cooldown ${skill.cd}s`)}</span>}
              {skill.ag != null && <span className="inline-flex items-center gap-1"><Hourglass className="h-3.5 w-3.5" aria-hidden="true" />{L(`ใช้เกจอเวค ${skill.ag}`, `Awakening gauge ${skill.ag}`)}</span>}
            </p>
          </div>
        </div>
        <div className="mt-3 space-y-3">
          {skill.g.map((g, i) => (
            <div key={i}>
              {g.t && <div className="mb-1 inline-block rounded-md bg-white/10 px-2 py-0.5 text-xs font-medium text-white/80">{g.t}</div>}
              <ul className="space-y-1">
                {g.e.map((e, j) => <li key={j} className="flex gap-2 leading-relaxed text-white/85"><span className="text-gold/70">•</span><span className="min-w-0 break-words"><Rich text={e} /></span></li>)}
              </ul>
            </div>
          ))}
        </div>
        {!!skill.up?.length && (
          <section className="mt-3 rounded-lg bg-white/[.04] p-2.5">
            <h5 className="mb-1 text-xs font-semibold text-gold/90">{L('อัปเกรดสกิล', 'Skill upgrades')}</h5>
            <ul className="space-y-1">
              {skill.up.map((e, j) => <li key={j} className="flex gap-2 text-[13px] leading-relaxed text-white/75"><span className="text-white/40">+</span><span className="min-w-0 break-words"><Rich text={e} /></span></li>)}
            </ul>
          </section>
        )}
        {!!skill.tx?.length && (
          <section className="mt-2 rounded-lg bg-white/[.04] p-2.5">
            <h5 className="mb-1 text-xs font-semibold text-gold/90">{L('ข้ามขีดจำกัด', 'Transcendence')}</h5>
            <ul className="space-y-1">
              {skill.tx.map((t, j) => (
                <li key={j} className="flex gap-2 text-[13px] leading-relaxed text-white/75">
                  <span className="h-fit shrink-0 rounded bg-gold/15 px-1.5 text-[11px] font-bold leading-5 text-gold">{t.tier}</span>
                  <span className="min-w-0 break-words"><Rich text={t.e} /></span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {kws.length > 0 && (
          <details className="group mt-2 rounded-lg bg-white/[.04] p-2.5">
            <summary className="cursor-pointer select-none text-xs font-semibold text-gold/90">{L(`คำอธิบายผล (${kws.length})`, `Effect glossary (${kws.length})`)}</summary>
            <dl className="mt-2 space-y-1.5 text-[13px]">
              {kws.map((k) => (
                <div key={k}>
                  <dt className={`inline font-semibold ${KW_COLOR[data!.kw[k][0]] ?? 'text-gold'}`}>{k}</dt>
                  <dd className="inline whitespace-pre-line text-white/70"> — {data!.kw[k][1]}</dd>
                </div>
              ))}
            </dl>
          </details>
        )}
        <p className="mt-2 text-right text-[10px] text-white/35">{L('ข้อมูลสกิล: 7K Atlas', 'Skill data: 7K Atlas')}</p>
      </>
    )
  }
  return <div id={id} role="region" aria-label={kindLabel(kind)} className={`min-w-0 rounded-xl border border-gold/20 bg-black/25 p-3 text-sm ${className}`}>{body}</div>
}
