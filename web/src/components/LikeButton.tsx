import { ThumbsUp } from 'lucide-react'
import { useState } from 'react'
import { loginWithDiscord } from '../lib/auth'
import { toggleLike, useMyLikes } from '../lib/likes'

/** 👍 ถูกใจทีมแก้ (ตีแล้วชนะ) — เก็บกับบัญชี Discord · ยังไม่ล็อกอิน = กดแล้วไปล็อกอิน */
export default function LikeButton({ gid, cid, count, onChanged, size = 'md' }: { gid: string; cid: string; count: number; onChanged?: () => void; size?: 'sm' | 'md' }) {
  const { liked, user, enabled } = useMyLikes()
  const [busy, setBusy] = useState(false)
  const [n, setN] = useState<number | null>(null) // จำนวนหลังกด (ก่อนโหลดข้อมูลกิลด์ใหม่)
  if (!enabled) return null
  const on = liked.has(cid)
  const shown = n ?? count
  const click = async () => {
    if (!user) return loginWithDiscord()
    setBusy(true)
    try {
      const r = await toggleLike(gid, cid)
      setN(r.count)
      onChanged?.()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <button
      type="button"
      onClick={click}
      disabled={busy}
      title={!user ? 'เข้าสู่ระบบ Discord เพื่อกดถูกใจ' : on ? 'ยกเลิกถูกใจ' : 'ถูกใจ (ทีมนี้ตีแล้วชนะ) — เก็บไว้ใน "ทีมที่ฉันชอบ"'}
      className={`flex items-center gap-1 rounded-full border transition ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'} ${
        on ? 'border-sky-300/70 bg-sky-400/20 text-sky-100' : 'border-white/15 text-white/70 hover:border-sky-300/60 hover:text-sky-100'
      }`}
    >
      <ThumbsUp className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} fill={on ? 'currentColor' : 'none'} />
      {shown > 0 && <span className="tabular-nums">{shown}</span>}
    </button>
  )
}
