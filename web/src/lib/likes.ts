import { useEffect, useState } from 'react'
import { api } from './api'
import { onAuthChange, useAuth } from './auth'

/** ทีมแก้ที่ฉันกดถูกใจ (counter id) — โหลดครั้งเดียวต่อการล็อกอิน แชร์ทุกหน้า */
let liked: Set<string> | null = null
let loading: Promise<void> | null = null
const EVENT = '7knote:likes'
const emit = () => window.dispatchEvent(new Event(EVENT))

function load() {
  loading ??= api.myLikes()
    .then((r) => { liked = new Set(r.likes.map((x) => x.counterId)); emit() })
    .catch(() => { liked = new Set(); emit() })
  return loading
}
onAuthChange(() => { liked = null; loading = null; emit() })

export function useMyLikes() {
  const auth = useAuth()
  const [, tick] = useState(0)
  useEffect(() => {
    const on = () => tick((n) => n + 1)
    window.addEventListener(EVENT, on)
    return () => window.removeEventListener(EVENT, on)
  }, [])
  useEffect(() => { if (auth.user && !liked) load() }, [auth.user])
  return { liked: auth.user ? liked ?? new Set<string>() : new Set<string>(), user: auth.user, enabled: auth.enabled }
}

/** กด/ยกเลิกถูกใจ → อัปเดตชุดในเครื่องทันที */
export async function toggleLike(gid: string, cid: string) {
  const r = await api.likeCounter(gid, cid)
  liked ??= new Set()
  if (r.liked) liked.add(cid)
  else liked.delete(cid)
  emit()
  return r
}
