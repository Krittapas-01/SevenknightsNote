import { Database, LogOut, Monitor, Trash2, User } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { editKeyGuilds, forgetEditKey, forgetRecent, getRecent } from '../lib/api'
import { loginWithDiscord, logout, useAuth } from '../lib/auth'
import { clearSaved, savedCount } from '../lib/myStats'
import { setPrefs, usePrefs, type LangPref, type ThemePref, type ZoomPref } from '../lib/prefs'
import { clearGuildCache } from '../lib/useGuild'
import { resetTours } from '../lib/tour'
import { useSlidePill } from '../lib/slide'
import { DiscordIcon } from '../components/ContactFab'
import { LANG, L, setLang, tx } from '../lib/i18n'

/** ตั้งค่าส่วนตัว (เก็บในเครื่องนี้) — ตั้งค่าของกิลด์ (Discord/ตารางสงคราม) อยู่ที่หน้ากิลด์ */
export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <p className="eyebrow mb-1.5">SETTINGS</p>
      <h1 className="gold-title text-3xl font-extrabold">{tx('ตั้งค่า')}</h1>
      <SettingsBody />
    </div>
  )
}

/** เนื้อหาตั้งค่า — ใช้ทั้งหน้า /settings และป๊อปอัปจากเมนู */
export function SettingsBody({ onNavigate }: { onNavigate?: () => void }) {
  const p = usePrefs()
  const auth = useAuth()
  // ข้อมูลในเครื่อง: อ่านใหม่หลังกดลบ
  const [, bump] = useState(0)
  const refresh = () => bump((n) => n + 1)
  const [done, setDone] = useState<string | null>(null)
  const flash = (m: string) => { setDone(m); setTimeout(() => setDone(null), 1800) }

  const recent = getRecent()
  const nameOf = (id: string) => recent.find((r) => r.id === id)?.name ?? id
  const keys = editKeyGuilds()
  const stats = savedCount()

  return (
    <div>
      <p className="mt-1 text-sm text-white/55">{tx('ตั้งค่าเหล่านี้เก็บในเครื่องนี้เท่านั้น · มุมมองคนแก้/คนดู สลับได้ที่หน้ากิลด์')}</p>

      <Section icon={<Monitor className="h-5 w-5" />} title={tx('การแสดงผล')}>
        <Row label={tx('ขนาดหน้าเว็บ')} hint={tx('จอคอมเท่านั้น · อัตโนมัติ = ดูจากความละเอียดจอ')}>
          <Seg<ZoomPref> value={p.zoom} onChange={(zoom) => setPrefs({ zoom })}
            options={[['auto', tx('อัตโนมัติ')], ['0.8', '80%'], ['0.9', '90%'], ['1', '100%']]} />
        </Row>
        <Row label="ภาษา / Language" hint={L('เปลี่ยนแล้วหน้าเว็บจะโหลดใหม่', 'The page reloads after switching')}>
          <Seg<LangPref> value={LANG} onChange={(lang) => setLang(lang)}
            options={[['th', 'ไทย'], ['en', 'English']]} />
        </Row>
        <Row label={tx('ธีม')} hint={tx('ตามเครื่อง = ตามที่ตั้งไว้ในมือถือ/คอม')}>
          <Seg<ThemePref> value={p.theme} onChange={(theme) => setPrefs({ theme })}
            options={[['dark', tx('มืด')], ['light', tx('สว่าง')], ['system', tx('ตามเครื่อง')]]} />
        </Row>
        <Row label={tx('ลดแอนิเมชัน')} hint={tx('ปิดเอฟเฟกต์เคลื่อนไหว (เครื่องช้า/ไม่ชอบ)')}>
          <Toggle on={p.reduceMotion} onChange={(reduceMotion) => setPrefs({ reduceMotion })} />
        </Row>
        <Row label={tx('เลื่อนหน้านุ่ม (ลูกกลิ้งเมาส์)')} hint={tx('หน้ากิลด์ · ปิดถ้ารู้สึกเลื่อนแปลก ๆ')}>
          <Toggle on={p.smoothScroll} onChange={(smoothScroll) => setPrefs({ smoothScroll })} />
        </Row>
      </Section>

      <Section icon={<Database className="h-5 w-5" />} title={tx('ข้อมูลในเครื่อง')}>
        <Sub title={L(`กิลด์ที่เคยเข้า (${recent.length})`, `Visited guilds (${recent.length})`)}>
          {recent.length ? recent.map((r) => (
            <Item key={r.id} label={<Link to={`/g/${r.id}`} onClick={onNavigate} className="hover:text-gold">{r.name}</Link>}
              action={tx('เอาออก')} onAction={() => { forgetRecent(r.id); refresh() }} />
          )) : <Empty />}
        </Sub>
        <Sub title={L(`รหัสแก้ไขที่จำไว้ (${keys.length})`, `Saved edit codes (${keys.length})`)} hint={tx('ใช้คอมร่วมกับคนอื่น → ลืมรหัสออกได้')}>
          {keys.length ? keys.map((id) => (
            <Item key={id} label={nameOf(id)} action={tx('ลืมรหัส')} danger onAction={() => { forgetEditKey(id); refresh(); flash(tx('ลืมรหัสแล้ว')) }} />
          )) : <Empty />}
        </Sub>
        <Sub title={tx('ค่าความสามารถอัศวินที่จำไว้')} hint={tx('ปุ่ม "ใช้ค่าความสามารถล่าสุดของฉัน" ดึงจากตรงนี้')}>
          <Item label={L(`${stats} ตัว`, `${stats} heroes`)} action={tx('ล้างทั้งหมด')} danger disabled={!stats} onAction={() => { clearSaved(); refresh(); flash(tx('ล้างค่าความสามารถที่จำไว้แล้ว')) }} />
        </Sub>
        <Sub title={tx('แคชข้อมูลกิลด์')} hint={tx('ข้อมูลที่เก็บไว้ให้เปิดเร็ว · ล้างเมื่อข้อมูลดูค้าง')}>
          <Item label={tx('ข้อมูลกิลด์ล่าสุด 3 กิลด์')} action={tx('ล้างแคช')} onAction={() => { clearGuildCache(); flash(tx('ล้างแคชแล้ว')) }} />
        </Sub>
        <Sub title={L('การสอนใช้', 'Guides')} hint={L('สอนเล่นเองตอนเข้าแต่ละหน้าครั้งแรก · ดูซ้ำได้ที่ปุ่ม ? บนหัวเว็บ', 'Plays the first time you open each page · replay with the ? button at the top')}>
          <Item label={L('สอนใหม่ตั้งแต่ต้น', 'Show all guides again')} action={L('รีเซ็ต', 'Reset')} onAction={() => { resetTours(); flash(L('รีเซ็ตแล้ว — เข้าแต่ละหน้าจะสอนอีกครั้ง', 'Done — each page will show its guide again')) }} />
        </Sub>
      </Section>

      <Section icon={<User className="h-5 w-5" />} title={tx('บัญชี Discord')}>
        {auth.user ? (
          <div className="flex flex-wrap items-center gap-3">
            {auth.user.avatar && <img src={auth.user.avatar} alt="" className="h-10 w-10 rounded-full" />}
            <span className="font-semibold">{auth.user.name}</span>
            <Link to="/favorites" onClick={onNavigate} className="text-sm text-gold hover:underline">{tx('พรีเซต & ทีมที่ชอบ')}</Link>
            <button type="button" onClick={() => void logout()} className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/15">
              <LogOut className="h-4 w-4" />{' '}{tx('ออกจากระบบ')}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-white/60">{tx('ยังไม่ได้ล็อกอิน — ล็อกอินเพื่อกดถูกใจทีมแก้และเก็บพรีเซต')}</span>
            <button type="button" onClick={loginWithDiscord} className="btn-gold ml-auto flex items-center gap-1.5 px-4 py-1.5 text-sm">
              <DiscordIcon className="h-4 w-4" />{' '}{tx('ล็อกอินด้วย Discord')}
            </button>
          </div>
        )}
      </Section>

      {done && <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink shadow-lg">{done}</div>}
    </div>
  )
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="panel mt-6 p-5">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gold">{icon}{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}
function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{label}</p>
        {hint && <p className="text-xs text-white/45">{hint}</p>}
      </div>
      {children}
    </div>
  )
}
function Sub({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <p className="font-medium">{title}</p>
      {hint && <p className="text-xs text-white/45">{hint}</p>}
      <div className="mt-2 divide-y divide-white/5 rounded-xl border border-white/10 bg-black/20">{children}</div>
    </div>
  )
}
function Item({ label, action, onAction, danger, disabled }: { label: ReactNode; action: string; onAction: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 text-sm">
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <button type="button" disabled={disabled} onClick={onAction}
        className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs disabled:opacity-30 ${danger ? 'text-red-300 hover:bg-red-500/15' : 'text-white/70 hover:bg-white/10'}`}>
        {danger && <Trash2 className="h-3.5 w-3.5" />}{action}
      </button>
    </div>
  )
}
const Empty = () => <p className="px-3 py-2 text-sm text-white/40">{tx('ไม่มี')}</p>

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? 'bg-gold' : 'bg-white/15'}`}>
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
    </button>
  )
}
function Seg<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  const p = useSlidePill(value)
  return (
    <div ref={p.box} className="pill relative flex p-0.5 text-sm">
      <span aria-hidden className="slide-pill" style={p.pill} />
      {options.map(([v, label]) => (
        <button key={v} ref={p.item(v)} type="button" onClick={() => onChange(v)}
          className={`relative z-10 rounded-full px-3 py-1 transition-colors ${value === v ? 'font-semibold text-ink' : 'text-white/70 hover:bg-white/10'}`}>{label}</button>
      ))}
    </div>
  )
}
