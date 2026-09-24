import { ChevronRight } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import TeamPanel from '../components/TeamPanel'
import VsArena from '../components/VsArena'
import { api, getRecent, pushRecent, saveEditKey } from '../lib/api'
import type { Team } from '../lib/types'

const DEMO_ALLY: Team = { front: 2, slots: ['คาร์ล เฮรอน', null, 'ซอรัน awake', 'บาลิสต้า', null], pet: 'อีรีน', extras: ['เจโอ', null, null, null], speed: 0 }
const DEMO_ENEMY: Team = { front: 2, slots: ['สกัลด์ awake', 'โดยอง awake', null, 'ยุนกอน awake', null], pet: 'ยอนจี', extras: ['ยู', 'โยรัง', 'เจโอ', null], speed: 0 }
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
      <section className="mx-auto max-w-2xl pt-4 text-center sm:pt-10">
        <span className="pill inline-flex items-center gap-2 px-3 py-1 text-sm text-white/80">
          <span className="rounded-full bg-gold px-2 text-xs font-semibold text-ink">ฟรี</span>
          ไม่ต้องสมัคร · ใช้ได้ทั้งมือถือและคอม
        </span>
        <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-6xl">
          จดทีม <span className="vs-text pr-2 not-italic">Guild War</span>
          <br />ให้ทั้งกิลด์ดูได้ในลิงก์เดียว
        </h1>
        <p className="mt-4 text-white/65 sm:text-lg">จดทีมป้องกันของศัตรู พร้อมทีมที่ใช้แก้และลำดับกดสกิล แล้วแชร์ลิงก์ให้คนในกิลด์เปิดดู</p>

        <form onSubmit={submit} className="panel panel-gold mx-auto mt-8 flex max-w-lg flex-col gap-3 p-5 text-left sm:flex-row sm:items-end">
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
          <button disabled={busy || !name.trim()} className="btn-gold px-6 py-2.5">
            {busy ? 'กำลังสร้าง...' : 'สร้างเลย!'}
          </button>
        </form>
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

      <section className="mt-16">
        <p className="mb-6 text-center text-sm text-white/50">ตัวอย่างหน้าจอ</p>
        <VsArena
          left={<TeamPanel variant="ally" team={DEMO_ALLY} skills={DEMO_SKILLS} title="ทีมแก้ #1" />}
          right={<TeamPanel variant="enemy" team={DEMO_ENEMY} title="ทีมเป้าหมาย" />}
        />
      </section>
    </div>
  )
}
