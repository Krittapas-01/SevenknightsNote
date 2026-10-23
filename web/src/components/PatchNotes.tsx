import { BookOpen, Bug, Sparkles, Wrench } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { PATCH_KIND, type ChangelogEntry, type PatchKind } from '../lib/changelog'
import { TUTORIAL_ON } from '../lib/onboarding'
import { tx, L } from '../lib/i18n'

/** สีของแต่ละหมวด (ธีมสว่างแปลงสีพวกนี้ให้เข้มขึ้นเองใน index.css) */
export const KIND_STYLE: Record<PatchKind, { icon: typeof Sparkles; text: string; chip: string; dot: string }> = {
  new: { icon: Sparkles, text: 'text-emerald-300', chip: 'bg-emerald-400/12 text-emerald-300 ring-emerald-300/25', dot: 'bg-emerald-300' },
  change: { icon: Wrench, text: 'text-sky-300', chip: 'bg-sky-400/12 text-sky-300 ring-sky-300/25', dot: 'bg-sky-300' },
  fix: { icon: Bug, text: 'text-amber-300', chip: 'bg-amber-400/12 text-amber-300 ring-amber-300/25', dot: 'bg-amber-300' },
}
/** ชื่อหมวดแบบสั้น (ใช้บนป้ายนับ) */
const KIND_SHORT: Record<PatchKind, string> = { new: L('ใหม่', 'New'), change: L('เปลี่ยน', 'Changed'), fix: L('แก้บั๊ก', 'Fixed') }

/** เวอร์ชันย่อย เช่น 1.5.1 (แพทช์เล็กระหว่างเวอร์ชันใหญ่) */
export const isPatch = (v: string) => v.split('.').length > 2

const KINDS: PatchKind[] = ['new', 'change', 'fix']
/** จำนวนรายการของแต่ละหมวด รวมทุกแพทช์ที่ส่งมา (ใหม่ → เปลี่ยน → แก้บั๊ก) */
export function kindCounts(entries: ChangelogEntry[]) {
  const n: Record<PatchKind, number> = { new: 0, change: 0, fix: 0 }
  for (const e of entries) for (const s of e.sections) for (const g of s.groups) n[s.kind] += g.items.length
  return KINDS.map((kind) => ({ kind, n: n[kind] })).filter((c) => c.n > 0)
}
export const itemCount = (entry: ChangelogEntry) => kindCounts([entry]).reduce((a, c) => a + c.n, 0)

/** ป้ายนับ "✦ 8 ใหม่ · 🔧 20 เปลี่ยน · 🐞 5 แก้บั๊ก" */
export function KindChips({ entries, className = '' }: { entries: ChangelogEntry[]; className?: string }) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {kindCounts(entries).map(({ kind, n }) => {
        const { icon: Icon, chip } = KIND_STYLE[kind]
        return (
          <span key={kind} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${chip}`}>
            <Icon className="h-3 w-3" aria-hidden="true" />
            <span className="tabular-nums">{n}</span> {KIND_SHORT[kind]}
          </span>
        )
      })}
    </div>
  )
}

/** ป้ายเวอร์ชันสีทอง: เวอร์ชันใหญ่ = ตราสี่เหลี่ยม · เวอร์ชันย่อย = แคปซูลเล็ก */
export function VersionBadge({ version, size = 'md' }: { version: string; size?: 'lg' | 'md' | 'sm' }) {
  const patch = isPatch(version)
  if ((patch && size !== 'lg') || size === 'sm') return <span className="patch-chip shrink-0">v{version}</span>
  return (
    <span className={`patch-crest shrink-0 ${size === 'lg' ? 'patch-crest-lg' : ''} ${version.length > 4 ? 'patch-crest-long' : ''}`} aria-hidden="true">
      <span><span className="patch-crest-v">v</span>{version}</span>
    </span>
  )
}

/** หัวแพทช์: ตราเวอร์ชัน + วันที่ + ชื่อแพทช์ + สรุป */
export function PatchHeader({ entry, latest, fresh, ago, size = 'md', children }: {
  entry: ChangelogEntry
  latest?: boolean
  /** เครื่องนี้ยังไม่เคยเห็น */
  fresh?: boolean
  /** เช่น "7 วันที่แล้ว" */
  ago?: string
  size?: 'lg' | 'md' | 'sm'
  /** ต่อใต้สรุป (เช่น ป้ายนับรายการ) */
  children?: ReactNode
}) {
  // เวอร์ชันย่อย: ป้ายเล็กข้างวันที่ (ยกเว้นการ์ดใหญ่บนสุดที่ใช้ตราเสมอ)
  const chip = isPatch(entry.version) && size !== 'lg'
  return (
    <div className="flex items-start gap-3 sm:gap-4">
      {!chip && <VersionBadge version={entry.version} size={size} />}
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/50">
          {chip && <VersionBadge version={entry.version} />}
          <span>{entry.date}</span>
          {ago && <span className="text-white/35">· {ago}</span>}
          {latest && <span className="rounded-full bg-gold/20 px-2 py-0.5 font-medium text-gold">{tx('ล่าสุด')}</span>}
          {fresh && <span className="patch-fresh">{L('ใหม่สำหรับคุณ', 'New for you')}</span>}
        </p>
        <h2 className={`mt-1 font-extrabold leading-snug ${size === 'lg' ? 'text-2xl sm:text-[1.75rem]' : size === 'sm' ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'}`}>
          <span className="sr-only">7K Note {entry.version} — </span>{entry.title}
        </h2>
        {entry.summary && <p className={`mt-1 leading-relaxed text-white/65 ${size === 'lg' ? 'text-sm sm:text-[15px]' : 'text-sm'}`}>{entry.summary}</p>}
        {children}
      </div>
    </div>
  )
}

/**
 * เนื้อแพทช์: หมวด (ใหม่/เปลี่ยน/แก้บั๊ก) → การ์ดหัวข้อย่อย → รายการ
 * กล่องกว้างพอ (หน้าอัปเดตบนคอม) = การ์ด 2 คอลัมน์ · กล่องแคบ (มือถือ / ป๊อปอัป "มีอะไรใหม่") = คอลัมน์เดียว
 */
export default function PatchNotes({ entry, onNavigate }: { entry: ChangelogEntry; onNavigate?: () => void }) {
  return (
    <div className="@container space-y-5">
      {entry.sections.map((sec) => {
        const { icon: Icon, text, chip, dot } = KIND_STYLE[sec.kind]
        const n = sec.groups.reduce((a, g) => a + g.items.length, 0)
        return (
          <section key={sec.kind} className={`patch-kind-${sec.kind}`}>
            <h3 className={`flex items-center gap-2 text-sm font-bold ${text}`}>
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ring-1 ring-inset ${chip}`}><Icon className="h-4 w-4" aria-hidden="true" /></span>
              {PATCH_KIND[sec.kind]}
              <span className="text-xs font-medium tabular-nums opacity-70">{n}</span>
              <span className="patch-rule ml-1 h-px flex-1" aria-hidden="true" />
            </h3>
            {/* หัวข้อย่อย 3 อันขึ้นไปถึงแบ่ง 2 คอลัมน์ (น้อยกว่านั้นแบ่งแล้วโหว่ครึ่งการ์ด) */}
            <div className={`mt-3 gap-3 ${sec.groups.length >= 3 ? '@2xl:columns-2' : ''}`}>
              {sec.groups.map((grp, i) => (
                <div key={i} className={`patch-group break-inside-avoid ${i < sec.groups.length - 1 ? 'mb-3' : ''}`}>
                  {grp.title && <h4 className="text-sm font-semibold text-white/90">{grp.title}</h4>}
                  <ul className={`space-y-1.5 ${grp.title ? 'mt-1.5' : ''}`}>
                    {grp.items.map((it, j) => (
                      <li key={j} className="flex gap-2.5 text-sm leading-relaxed text-white/75">
                        <span className={`mt-[0.6em] h-1.5 w-1.5 shrink-0 rotate-45 rounded-[1px] opacity-80 ${dot}`} aria-hidden="true" />
                        <span className="min-w-0">
                          {it.text}
                          {TUTORIAL_ON && it.guide && (
                            <Link to={`/guide#${it.guide}`} onClick={onNavigate} className="ml-1.5 inline-flex items-center gap-1 whitespace-nowrap text-xs text-gold/80 hover:text-gold">
                              <BookOpen className="h-3 w-3" />{tx('วิธีใช้')}
                            </Link>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
