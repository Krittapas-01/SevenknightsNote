import { ArrowUpRight, Eye, EyeOff, Shield, Swords } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import TeamPanel from '../components/TeamPanel'
import VsArena from '../components/VsArena'
import { api, pushRecent, saveEditKey } from '../lib/api'
import type { Team } from '../lib/types'

const DEMO_ALLY: Team = { front: 2, slots: ['ลูดี้ awake', null, 'ยอนฮี', 'เรเชล', null], pet: 'อีรีน', extras: ['เจโอ', null, null, null], speed: 210 }
const DEMO_ENEMY: Team = { front: 2, slots: ['เดลโลนส์ awake', 'ไอลีน', null, 'วาเนสซา', null], pet: 'ยอนจี', extras: ['ยู', 'โยรัง', 'เจโอ', null], speed: 198 }
const DEMO_SKILLS = [{ slot: 2, skill: 1 as const }, { slot: 2, skill: 2 as const }, { slot: 3, skill: 1 as const }]

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
    if (pw.trim().length < 6) return setErr('รหัสแก้ไขต้องยาวอย่างน้อย 6 ตัวอักษร')
    if (pw.trim() !== pw2.trim()) return setErr('รหัสสองช่องไม่ตรงกัน')
    setBusy(true)
    setErr(null)
    try {
      const g = await api.createGuild(name.trim(), pw.trim())
      saveEditKey(g.id, g.editKey)
      pushRecent({ id: g.id, name: g.name })
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
        <p className="eyebrow relative">SEVEN KNIGHTS RE:BIRTH</p>
        <div className="hero-crest mx-auto mt-6" aria-hidden="true"><Swords className="h-7 w-7" strokeWidth={1.3} /></div>
        <h1 className="relative mt-5 text-[2.65rem] font-extrabold leading-[1.15] sm:text-7xl">
          ทุกแผนพร้อมรบ
          <span className="gold-title mt-2 block">ทั้งกิลด์พร้อมลุย</span>
        </h1>
        <p className="relative mx-auto mt-5 max-w-lg text-sm leading-relaxed text-white/60 sm:text-base">จดทีม Guild War จัดทีมแก้และลำดับสกิล<br className="sm:hidden" /> แชร์ให้ทั้งกิลด์ดูได้ในลิงก์เดียว</p>

        <form onSubmit={submit} className="panel panel-gold mx-auto mt-7 grid max-w-xl gap-3 p-5 text-left sm:grid-cols-2 sm:p-6">
          <label className="sm:col-span-2">
            <span className="text-sm font-medium text-gold">ชื่อกิลด์ของคุณ</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              placeholder="เช่น Seven Knights TH"
              className="pill mt-1.5 w-full px-4 py-2.5 outline-none focus:border-gold"
            />
          </label>
          {/* รหัสแก้ไขกิลด์: บอกเฉพาะคนที่ให้แก้แผนได้ (เปลี่ยนทีหลังได้ที่ปุ่ม "รหัสแก้ไข") */}
          <label>
            <span className="text-sm font-medium text-gold">ตั้งรหัสแก้ไข</span>
            <span className="relative mt-1.5 block">
              <input type={showPw ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} maxLength={64}
                autoComplete="new-password" placeholder="อย่างน้อย 6 ตัว" className="pill w-full px-4 py-2.5 pr-10 outline-none focus:border-gold" />
              <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'ซ่อนรหัส' : 'แสดงรหัส'}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-white/50 hover:text-white">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>
          <label>
            <span className="text-sm font-medium text-gold">ยืนยันรหัส</span>
            <input type={showPw ? 'text' : 'password'} value={pw2} onChange={(e) => setPw2(e.target.value)} maxLength={64}
              autoComplete="new-password" className="pill mt-1.5 w-full px-4 py-2.5 outline-none focus:border-gold" />
          </label>
          <p className="text-xs text-white/45 sm:col-span-2">ใช้รหัสนี้ตอนจะแก้ไขกิลด์จากเครื่องอื่น บอกเฉพาะคนที่ให้แก้แผนได้ · เปลี่ยนทีหลังได้</p>
          <button disabled={busy || !name.trim() || !pw.trim() || !pw2.trim()} className="btn-gold flex items-center justify-center gap-2 px-6 py-2.5 sm:col-span-2">
            {busy ? 'กำลังสร้าง...' : 'สร้างกิลด์'} <ArrowUpRight className="h-4 w-4" />
          </button>
        </form>
        <p className="relative mt-4 text-xs text-white/45">ใช้ฟรี · ไม่ต้องสมัคร · พร้อมใช้บนมือถือและคอม</p>
        {err && <p className="mt-3 text-sm text-red-300">{err}</p>}

      </section>

      <section className="arena-showcase relative mt-12 sm:mt-16">
        <div className="section-divider mb-9"><span>ตัวอย่างสนามรบ</span></div>
        <VsArena
          left={<TeamPanel variant="ally" team={DEMO_ALLY} skills={DEMO_SKILLS} title={<span className="inline-flex items-center gap-2 text-gold"><Shield className="h-4 w-4" /> ทีมของเรา</span>} />}
          right={<TeamPanel variant="enemy" team={DEMO_ENEMY} title={<span className="inline-flex items-center gap-2 text-[#d7c8ed]"><Swords className="h-4 w-4" /> ทีมเป้าหมาย</span>} />}
        />
        <p className="mt-7 text-center text-xs text-white/40">ทีมตัวอย่างสำหรับแสดงหน้าจอ · จัดทีมจริงได้ในกิลด์ของคุณ</p>
      </section>
    </div>
  )
}
