import { BookOpen, Bug, Sparkles, Wrench } from 'lucide-react'
import { Link } from 'react-router'
import { PATCH_KIND, type ChangelogEntry, type PatchKind } from '../lib/changelog'
import { TUTORIAL_ON } from '../lib/onboarding'
import { tx } from '../lib/i18n'

const KIND_STYLE: Record<PatchKind, { icon: typeof Sparkles; color: string }> = {
  new: { icon: Sparkles, color: 'text-emerald-300' },
  change: { icon: Wrench, color: 'text-sky-300' },
  fix: { icon: Bug, color: 'text-amber-300' },
}

/** หัวแพทช์: "7K Note 1.3 — Light & Words" + วันที่ */
export function PatchHeader({ entry, latest }: { entry: ChangelogEntry; latest?: boolean }) {
  return (
    <div>
      <p className="flex flex-wrap items-center gap-2 text-xs text-white/50">
        {entry.date}
        {latest && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-gold">{tx('ล่าสุด')}</span>}
      </p>
      <h2 className="mt-1 text-lg font-extrabold leading-snug sm:text-xl">
        <span className="text-white/60">7K Note</span> <span className="text-gold">{entry.version}</span>
        <span className="text-white/40"> — </span>{entry.title}
      </h2>
      {entry.summary && <p className="mt-1 text-sm text-white/65">{entry.summary}</p>}
    </div>
  )
}

/** เนื้อแพทช์แบบ Minecraft: หมวด (ใหม่/เปลี่ยน/แก้บั๊ก) → หัวข้อย่อย → รายการ */
export default function PatchNotes({ entry, onNavigate }: { entry: ChangelogEntry; onNavigate?: () => void }) {
  return (
    <div className="space-y-5">
      {entry.sections.map((sec) => {
        const { icon: Icon, color } = KIND_STYLE[sec.kind]
        return (
          <section key={sec.kind}>
            <h3 className={`flex items-center gap-2 border-b border-white/10 pb-1.5 text-sm font-bold uppercase tracking-wide ${color}`}>
              <Icon className="h-4 w-4" /> {PATCH_KIND[sec.kind]}
            </h3>
            <div className="mt-2.5 space-y-3">
              {sec.groups.map((grp, i) => (
                <div key={i}>
                  {grp.title && <h4 className="text-sm font-semibold text-white/90">{grp.title}</h4>}
                  <ul className={`space-y-1 ${grp.title ? 'mt-1 pl-3' : ''}`}>
                    {grp.items.map((it, j) => (
                      <li key={j} className="flex gap-2 text-sm leading-relaxed text-white/75">
                        <span className="select-none text-white/35">•</span>
                        <span>
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
