import { ArrowUpRight, Calculator, Cookie, Eye, EyeOff, Gem, Shield, Swords } from 'lucide-react'
import { ImgPriority } from '../components/UnitCard'
import { useState, type ComponentType, type FormEvent } from 'react'
import { PACKS_ON } from '../lib/packs'
import { RUBY_ON } from '../lib/rubyFarm'
import { MIN_GAME_NAME, isShortGameName } from '../../../shared/game'
import RubyIcon from '../components/RubyIcon'
import { Link, useNavigate } from 'react-router'
import TeamPanel from '../components/TeamPanel'
import VsArena from '../components/VsArena'
import { api, pushRecent, saveEditKey } from '../lib/api'
import { startOnboarding } from '../lib/onboarding'
import type { Team } from '../lib/types'
import { tx, L } from '../lib/i18n'

const DEMO_ALLY: Team = { front: 2, slots: ['ลูดี้ awake', null, 'ยอนฮี', 'เรเชล', null], pet: 'อีรีน', extras: ['เจโอ', null, null, null], speed: 210 }
const DEMO_ENEMY: Team = { front: 2, slots: ['เดลโลนส์ awake', 'ไอลีน', null, 'วาเนสซา', null], pet: 'ยอนจี', extras: ['ยู', 'โยรัง', 'เจโอ', null], speed: 198 }
const DEMO_SKILLS = [{ slot: 2, skill: 1 as const }, { slot: 2, skill: 2 as const }, { slot: 3, skill: 1 as const }]

// การ์ดเครื่องมือใต้ฟอร์มสร้างกิลด์ (ชื่อเดียวกับในเมนู ☰)
const TOOLS: { to: string; label: string; sub: string; icon: ComponentType<{ className?: string }> }[] = [
  { to: '/biscuit', label: tx('เช็กบัฟบิสกิต'), sub: L('บิสกิตจะบัฟลงตัวไหนในทีม', 'Which knights the biscuit buffs'), icon: Cookie },
  { to: '/atk', label: tx('เทียบพลังโจมตี'), sub: L('ใครตีแรงกว่า คิดแบบในเกม', 'Who hits harder, game math'), icon: Swords },
  { to: '/totalwar', label: tx('คำนวณแต้มเบ็ดเสร็จ'), sub: L('เวลารอบ อันดับ และเป้าคะแนนซีซัน', 'Round timer, ranks and season goals'), icon: Calculator },
  ...(RUBY_ON ? [{ to: '/ruby', label: tx('คำนวณรูบี้ขายวิญญาณ'), sub: L('ฟาร์มรูบี้วันละเท่าไหร่ ใช้กี่ชั่วโมง', 'Daily ruby farm: how much, how long'), icon: RubyIcon }] : []),
  ...(PACKS_ON ? [{ to: '/packs', label: tx('เช็กความคุ้มค่าแพ็ค'), sub: L('แพ็คไหนคุ้มสุดตอนนี้', 'Which packs are worth it now'), icon: Gem }] : []),
]

// ละอองทองหลังหัวเว็บ (ตำแหน่ง/จังหวะคงที่)
const MOTES = [
  { x: 12, d: 0, t: 11, drift: 20 }, { x: 22, d: 4.5, t: 13, drift: -16 }, { x: 31, d: 8, t: 10, drift: 12 }, { x: 40, d: 2, t: 14, drift: -10 },
  { x: 47, d: 6.5, t: 12, drift: 18 }, { x: 55, d: 1, t: 11.5, drift: -22 }, { x: 63, d: 9, t: 13.5, drift: 14 }, { x: 71, d: 3.5, t: 10.5, drift: -12 },
  { x: 80, d: 7, t: 12.5, drift: 16 }, { x: 88, d: 5, t: 14.5, drift: -18 }, { x: 35, d: 11, t: 12, drift: 8 }, { x: 66, d: 12.5, t: 11, drift: -8 },
]

export default function LandingPage() {
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    if (isShortGameName(name)) return setErr(L(`ชื่อกิลด์ต้องยาวอย่างน้อย ${MIN_GAME_NAME} ตัวอักษร (ในเกมตั้งชื่อสั้นกว่านี้ไม่ได้)`, `Guild name must be at least ${MIN_GAME_NAME} characters (the game doesn't allow shorter names)`))
    if (pw.trim().length < 6) return setErr(tx('รหัสแก้ไขต้องยาวอย่างน้อย 6 ตัวอักษร'))
    if (pw.trim() !== pw2.trim()) return setErr(tx('รหัสสองช่องไม่ตรงกัน'))
    setBusy(true)
    setErr(null)
    try {
      const g = await api.createGuild(name.trim(), pw.trim())
      saveEditKey(g.id, g.editKey)
      pushRecent({ id: g.id, name: g.name })
      startOnboarding(g.id) // กิลด์ใหม่ → สอนทีละขั้น
      nav(`/g/${g.id}`)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <section className="landing-hero relative mx-auto pt-7 text-center sm:pt-12">
        <div className="arcane-ring" aria-hidden="true" />
        <div className="hero-motes" aria-hidden="true">
          {MOTES.map((m, i) => <span key={i} style={{ left: `${m.x}%`, animationDelay: `${m.d}s`, animationDuration: `${m.t}s`, ['--drift' as string]: `${m.drift}px` }} />)}
        </div>
        <p className="eyebrow relative">SEVEN KNIGHTS RE:BIRTH</p>
        <div className="hero-crest mx-auto mt-6" aria-hidden="true"><Swords className="h-7 w-7" strokeWidth={1.3} /></div>
        <h1 className="relative mt-5 text-[2.65rem] font-extrabold leading-[1.15] sm:text-7xl">
          {L('เรื่องวอร์ยกให้เรา', 'Leave the war to us')}
          <span className="gold-title mt-2 block">{L('เรื่องดวงช่วยไม่ได้', 'luck is on you')}</span>
        </h1>
        <p className="relative mx-auto mt-5 max-w-lg text-sm leading-relaxed text-white/60 sm:text-base">{tx('จดทีม Guild War จัดทีมแก้และลำดับสกิล')}<br className="sm:hidden" />{' '}{tx('แชร์ให้ทั้งกิลด์ดูได้ในลิงก์เดียว')}</p>

        <form onSubmit={submit} className="panel panel-gold mx-auto mt-7 grid max-w-xl gap-3 p-5 text-left sm:grid-cols-2 sm:p-6">
          <label className="sm:col-span-2">
            <span className="text-sm font-medium text-gold">{tx('ชื่อกิลด์ของคุณ')}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              placeholder={tx('เช่น Seven Knights TH')}
              className="pill mt-1.5 w-full px-4 py-2.5 outline-none focus:border-gold"
            />
            {name.trim() && isShortGameName(name) && <span className="mt-1 block text-xs text-amber-300">{L(`อย่างน้อย ${MIN_GAME_NAME} ตัวอักษร (ในเกมตั้งชื่อสั้นกว่านี้ไม่ได้)`, `At least ${MIN_GAME_NAME} characters (the game doesn't allow shorter names)`)}</span>}
          </label>
          {/* รหัสแก้ไขกิลด์: บอกเฉพาะคนที่ให้แก้แผนได้ (เปลี่ยนทีหลังได้ที่ปุ่ม "รหัสแก้ไข") */}
          <label>
            <span className="text-sm font-medium text-gold">{tx('ตั้งรหัสแก้ไข')}</span>
            <span className="relative mt-1.5 block">
              <input type={showPw ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} maxLength={64}
                autoComplete="new-password" placeholder={tx('อย่างน้อย 6 ตัว')} className="pill w-full px-4 py-2.5 pr-10 outline-none focus:border-gold" />
              <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? tx('ซ่อนรหัส') : tx('แสดงรหัส')}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-white/50 hover:text-white">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>
          <label>
            <span className="text-sm font-medium text-gold">{tx('ยืนยันรหัส')}</span>
            <input type={showPw ? 'text' : 'password'} value={pw2} onChange={(e) => setPw2(e.target.value)} maxLength={64}
              autoComplete="new-password" placeholder={L('พิมพ์รหัสอีกครั้ง', 'Type the code again')} className="pill mt-1.5 w-full px-4 py-2.5 outline-none focus:border-gold" />
          </label>
          <p className="text-xs text-white/45 sm:col-span-2">{tx('ใช้รหัสนี้ตอนจะแก้ไขกิลด์จากเครื่องอื่น บอกเฉพาะคนที่ให้แก้แผนได้ · เปลี่ยนทีหลังได้')}</p>
          <button disabled={busy || !name.trim() || isShortGameName(name) || !pw.trim() || !pw2.trim()} className="btn-gold flex items-center justify-center gap-2 px-6 py-2.5 sm:col-span-2">
            {busy ? tx('กำลังสร้าง...') : tx('สร้างกิลด์')} <ArrowUpRight className="h-4 w-4" />
          </button>
        </form>
        <p className="relative mt-4 text-xs text-white/45">{tx('ใช้ฟรี · ไม่ต้องสมัคร · พร้อมใช้บนมือถือและคอม')}</p>
        <p className="relative mt-1 text-xs text-white/45">{tx('ผู้ดูแลเว็บเข้าดูข้อมูลของทุกกิลด์ได้ · ไม่แชร์ต่อให้ผู้อื่น')}</p>
        {err && <p className="mt-3 text-sm text-red-300">{err}</p>}

        {/* เครื่องมือที่ใช้ได้โดยไม่ต้องมีกิลด์ (เดิมมีทางเข้าแค่ในเมนู ☰ เลยแทบไม่มีคนเจอ) */}
        <nav aria-label={L('เครื่องมือ', 'Tools')} className="relative mx-auto mt-8 max-w-xl text-left">
          <p className="mb-2 text-center text-xs font-medium tracking-wide text-white/45">{L('เครื่องมือ · ใช้ได้เลยไม่ต้องสร้างกิลด์', 'Tools · no guild needed')}</p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {TOOLS.map((t, i) => (
              <Link key={t.to} to={t.to} className={`group flex items-center gap-3 rounded-2xl border border-gold/30 bg-black/20 px-4 py-3 transition hover:border-gold hover:bg-gold/5 ${TOOLS.length % 2 && i === TOOLS.length - 1 ? 'sm:col-span-2' : ''}`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold/15 text-gold"><t.icon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{t.label}</span>
                  <span className="block text-xs text-white/55">{t.sub}</span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-gold transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </nav>
      </section>

      <section className="arena-showcase relative mt-12 sm:mt-16">
        <div className="section-divider mb-9"><span>{tx('ตัวอย่างสนามรบ')}</span></div>
        <ImgPriority value>
        <VsArena
          left={<TeamPanel variant="ally" team={DEMO_ALLY} skills={DEMO_SKILLS} title={<span className="inline-flex items-center gap-2 text-gold"><Shield className="h-4 w-4" />{' '}{tx('ทีมของเรา')}</span>} />}
          right={<TeamPanel variant="enemy" team={DEMO_ENEMY} title={<span className="inline-flex items-center gap-2 text-[#d7c8ed]"><Swords className="h-4 w-4" />{' '}{tx('บ้านศัตรู')}</span>} />}
        />
        </ImgPriority>
        <p className="mt-7 text-center text-xs text-white/40">{tx('ทีมตัวอย่างสำหรับแสดงหน้าจอ · จัดทีมจริงได้ในกิลด์ของคุณ')}</p>
      </section>
    </div>
  )
}
