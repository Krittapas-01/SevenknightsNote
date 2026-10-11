import { ThumbsUp } from 'lucide-react'
import { useState } from 'react'
import { loginWithDiscord } from '../lib/auth'
import { toggleLike, useMyLikes } from '../lib/likes'
import { tx } from '../lib/i18n'

/** 👍 ถูกใจทีมแก้ (ตีแล้วชนะ) — เก็บกับบัญชี Discord · ยังไม่ล็อกอิน = กดแล้วไปล็อกอิน */
export default function LikeButton({ gid, cid, count, onChanged, size = 'md' }: { gid: string; cid: string; count: number; onChanged?: () => void; size?: 'sm' | 'md' }) {
  const { liked, user, enabled } = useMyLikes()
  const [busy, setBusy] = useState(false)
  const [n, setN] = useState<number | null>(null) // จำนวนหลังกด (ก่อนโหลดข้อมูลกิลด์ใหม่)
  const [burst, setBurst] = useState(0) // กดถูกใจสำเร็จ → เล่นพลุ (เลขเปลี่ยน = เล่นใหม่)
  if (!enabled) return null
  const on = liked.has(cid)
  const shown = n ?? count
  const click = async () => {
    if (!user) return loginWithDiscord()
    setBusy(true)
    try {
      const r = await toggleLike(gid, cid)
      setN(r.count)
      if (r.liked) setBurst((b) => b + 1)
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
      title={!user ? tx('เข้าสู่ระบบ Discord เพื่อกดถูกใจ') : on ? tx('ยกเลิกถูกใจ') : tx('ถูกใจ (ทีมนี้ตีแล้วชนะ) — เก็บไว้ใน "ทีมที่ฉันชอบ"')}
      className={`relative flex items-center gap-1 rounded-full border transition ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'} ${
        on ? 'border-sky-300/70 bg-sky-400/20 text-sky-100' : 'border-white/15 text-white/70 hover:border-sky-300/60 hover:text-sky-100'
      }`}
    >
      <ThumbsUp key={`t${burst}`} className={`${size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} ${burst ? 'like-pop' : ''}`} fill={on ? 'currentColor' : 'none'} />
      {burst > 0 && (
        <span key={burst} className="like-burst" aria-hidden>
          {Array.from({ length: 10 }, (_, i) => <i key={i} style={{ ['--a' as string]: `${i * 36}deg` }} />)}
        </span>
      )}
      {shown > 0 && <span className="tabular-nums">{shown}</span>}
    </button>
  )
}
