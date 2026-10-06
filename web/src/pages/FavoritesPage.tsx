import { Pencil, ThumbsUp, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import TeamPanel from '../components/TeamPanel'
import { api, type LikedCounter, type Preset } from '../lib/api'
import { SavePresetButton } from '../components/Presets'
import { loginWithDiscord, useAuth } from '../lib/auth'
import { toggleLike } from '../lib/likes'
import { tagStyle } from '../lib/tags'

/** ทีมที่ฉันชอบ — ทีมแก้ที่กดถูกใจไว้ (ทุกกิลด์) เก็บกับบัญชี Discord */
export default function FavoritesPage() {
  const auth = useAuth()
  const [list, setList] = useState<LikedCounter[] | null>(null)
  const [presets, setPresets] = useState<Preset[] | null>(null)
  const loadPresets = () => api.myPresets().then((r) => setPresets(r.presets)).catch(() => setPresets([]))
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!auth.ready || !auth.user) return
    api.myLikes().then((r) => setList(r.likes)).catch((e) => setError((e as Error).message))
    loadPresets()
  }, [auth.ready, auth.user?.id])

  if (!auth.ready) return <p className="py-24 text-center text-white/50">กำลังโหลด...</p>
  if (!auth.enabled) return <p className="py-24 text-center text-white/60">เว็บนี้ยังไม่ได้เปิดล็อกอิน Discord</p>
  if (!auth.user)
    return (
      <div className="py-24 text-center">
        <p className="text-lg">ทีมที่ฉันชอบ — เข้าสู่ระบบด้วย Discord ก่อน</p>
        <p className="mt-1 text-sm text-white/50">กด 👍 ที่ทีมแก้ที่ตีแล้วชนะ แล้วจะมารวมอยู่ที่นี่ ใช้ได้ทุกเครื่อง</p>
        <button className="btn-gold mt-6 px-5 py-2" onClick={loginWithDiscord}>เข้าสู่ระบบด้วย Discord</button>
      </div>
    )
  if (error) return <p className="py-24 text-center text-red-300">{error}</p>
  if (!list) return <p className="py-24 text-center text-white/50">กำลังโหลด...</p>

  const unlike = async (x: LikedCounter) => {
    await toggleLike(x.guildId, x.counterId).catch(() => {})
    setList((l) => l?.filter((y) => y.counterId !== x.counterId) ?? null)
  }

  const rename = async (p: Preset) => {
    const name = prompt('ชื่อพรีเซ็ตใหม่', p.name)?.trim()
    if (!name || name === p.name) return
    await api.updatePreset(p.id, { name }).catch((e) => alert((e as Error).message))
    loadPresets()
  }
  const remove = async (p: Preset) => {
    if (!confirm(`ลบพรีเซ็ต "${p.name}"?`)) return
    await api.deletePreset(p.id).catch((e) => alert((e as Error).message))
    loadPresets()
  }

  return (
    <div>
      {/* ---------- พรีเซ็ตของฉัน ---------- */}
      <h1 className="text-2xl font-bold sm:text-3xl">พรีเซ็ต<span className="text-gold">ของฉัน</span></h1>
      <p className="mt-1 text-sm text-white/55">ทีมบุกที่บันทึกไว้ (รวมของ/สเตตัส) · ใช้ได้ตอนจัดทีมแก้และแผนบุก ปุ่ม "พรีเซ็ตของฉัน"</p>
      {!presets ? <p className="mt-6 text-white/50">กำลังโหลด...</p> : !presets.length ? (
        <div className="panel mt-6 p-8 text-center text-white/60">ยังไม่มี — กด "บันทึกเป็นพรีเซ็ต" ที่ทีมแก้ หรือที่การ์ดด้านล่าง</div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {presets.map((p) => (
            <div key={p.id} className="panel p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-semibold text-gold">{p.name}</span>
                <button onClick={() => rename(p)} title="เปลี่ยนชื่อ" className="rounded-full p-1.5 text-white/60 hover:bg-white/10"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => remove(p)} title="ลบ" className="rounded-full p-1.5 text-white/50 hover:bg-red-500/15 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
              </div>
              <TeamPanel variant="ally" size="sm" team={p.team} skills={p.skills} heroNotes={p.heroNotes} />
              {p.note && <p className="mt-2 line-clamp-2 text-sm text-white/65">{p.note}</p>}
            </div>
          ))}
        </div>
      )}

      <h1 className="mt-14 text-2xl font-bold sm:text-3xl">ทีมที่<span className="text-gold">ฉันชอบ</span></h1>
      <p className="mt-1 text-sm text-white/55">ทีมแก้ที่กด 👍 ไว้ · {list.length} ทีม · เก็บกับบัญชี Discord ({auth.user.name})</p>
      {!list.length ? (
        <div className="panel mt-8 p-10 text-center text-white/60">ยังไม่มี — กด 👍 ที่ทีมแก้ที่ตีแล้วชนะในหน้าทีมเป้าหมาย</div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {list.map((x) => (
            <div key={x.counterId} className="panel p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-sm text-white/60">{x.guildName}</span>
                {x.targetTags.slice(0, 2).map((t) => <span key={t} className="rounded-full px-2 py-0.5 text-xs font-semibold" style={tagStyle(t)}>{t}</span>)}
                <span className="ml-auto flex items-center gap-1 text-xs text-sky-200"><ThumbsUp className="h-3.5 w-3.5" fill="currentColor" /> {x.likes}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TeamPanel variant="ally" size="sm" team={x.team} skills={x.skills} title="ทีมแก้" />
                <TeamPanel variant="enemy" size="sm" team={x.targetTeam} skills={x.targetTeam.skills ?? []} title="ทีมเป้าหมาย" />
              </div>
              {x.note && <p className="mt-3 line-clamp-2 text-sm text-white/70">{x.note}</p>}
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="flex items-center gap-3">
                  <button onClick={() => unlike(x)} className="text-white/45 hover:text-red-300">เอาออกจากที่ชอบ</button>
                  <span onClickCapture={() => setTimeout(loadPresets, 1500)}><SavePresetButton team={x.team} skills={x.skills} note={x.note} /></span>
                </span>
                <Link to={`/g/${x.guildId}/t/${x.targetId}`} className="text-gold hover:underline">เปิดทีมนี้ ›</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
