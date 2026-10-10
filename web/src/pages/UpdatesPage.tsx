import { useEffect } from 'react'
import { Link } from 'react-router'
import { CHANGELOG, markUpdateSeen } from '../lib/changelog'
import PatchNotes, { PatchHeader } from '../components/PatchNotes'
import { TUTORIAL_ON } from '../lib/onboarding'
import { tx, L } from '../lib/i18n'

/** หน้ารวมอัปเดตทั้งหมด (ใหม่สุดบนสุด) */
export default function UpdatesPage() {
  useEffect(() => markUpdateSeen(), [])
  return (
    <div className="mx-auto max-w-3xl">
      <header className="text-center">
        <p className="text-xs font-semibold tracking-[0.3em] text-gold/70">PATCH NOTES</p>
        <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{L('อัปเดต', 'Patch ')}<span className="text-gold">{L('ล่าสุด', 'Notes')}</span></h1>
        <p className="mt-2 text-sm text-white/60">{tx('ฟีเจอร์ใหม่ การเปลี่ยนแปลง และแก้บั๊ก ทุกเวอร์ชัน')}{TUTORIAL_ON && <> · <Link to="/guide" className="text-gold underline underline-offset-4">{tx('คู่มือการใช้งาน')}</Link></>}</p>
      </header>
      <ol className="relative mt-8 space-y-6 border-l border-gold/25 pl-6">
        {CHANGELOG.map((c, i) => (
          <li key={c.id} className="relative">
            <span className={`absolute -left-[31px] top-1.5 grid h-4 w-4 place-items-center rounded-full border ${i === 0 ? 'border-gold bg-gold/30' : 'border-white/30 bg-[var(--surface)]'}`} />
            <div className="panel p-4 sm:p-5">
              <PatchHeader entry={c} latest={i === 0} />
              <div className="mt-4"><PatchNotes entry={c} /></div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
