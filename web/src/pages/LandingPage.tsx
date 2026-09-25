import { ArrowUpRight, ChevronRight, Shield, Swords } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import TeamPanel from '../components/TeamPanel'
import VsArena from '../components/VsArena'
import { api, getRecent, pushRecent, saveEditKey } from '../lib/api'
import type { Team } from '../lib/types'

const DEMO_ALLY: Team = { front: 2, slots: ['ลูดี้ awake', null, 'ยอนฮี', 'เรเชล', null], pet: 'อีรีน', extras: ['เจโอ', null, null, null], speed: 210 }
const DEMO_ENEMY: Team = { front: 2, slots: ['เดลโลนส์ awake', 'ไอลีน', null, 'วาเนสซา', null], pet: 'ยอนจี', extras: ['ยู', 'โยรัง', 'เจโอ', null], speed: 198 }
const DEMO_SKILLS = [{ slot: 2, skill: 1 as const }, { slot: 2, skill: 2 as const }, { slot: 3, skill: 1 as const }]

export default function LandingPage() {
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const recent = getRecent()

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    setErr(null)
    try {
      const g = await api.createGuild(name.trim())
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

        <form onSubmit={submit} className="panel panel-gold mx-auto mt-7 flex max-w-xl flex-col gap-3 p-5 text-left sm:flex-row sm:items-end sm:p-6">
          <label className="flex-1">
            <span className="text-sm font-medium text-gold">ชื่อกิลด์ของคุณ</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              placeholder="เช่น Seven Knights TH"
              className="pill mt-1.5 w-full px-4 py-2.5 outline-none focus:border-gold"
            />
          </label>
          <button disabled={busy || !name.trim()} className="btn-gold flex items-center justify-center gap-2 px-6 py-2.5">
            {busy ? 'กำลังสร้าง...' : 'สร้างกิลด์'} <ArrowUpRight className="h-4 w-4" />
          </button>
        </form>
        <p className="relative mt-4 text-xs text-white/45">ใช้ฟรี · ไม่ต้องสมัคร · พร้อมใช้บนมือถือและคอม</p>
        {err && <p className="mt-3 text-sm text-red-300">{err}</p>}

        {recent.length > 0 && (
          <div className="mx-auto mt-6 max-w-lg text-left">
            <p className="mb-2 text-sm text-white/50">กิลด์ที่เคยเปิด</p>
            <div className="flex flex-wrap gap-2">
              {recent.map((r) => (
                <Link key={r.id} to={`/g/${r.id}`} className="pill flex items-center gap-1 px-3 py-1.5 text-sm hover:border-gold">
                  {r.name} <ChevronRight className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>
        )}
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
