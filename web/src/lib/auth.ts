import { useEffect, useState } from 'react'
import { tx } from './i18n'

/** ล็อกอินด้วย Discord: เก็บ session token ในเครื่อง ส่งไปกับทุก request (header Authorization) */
const KEY = '7knote:session'
const EVENT = '7knote:auth'
const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

export type DiscordUser = { id: string; name: string; avatar: string }
type AuthState = { ready: boolean; enabled: boolean; user: DiscordUser | null; error: string | null }

export function getSession(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}
function setSession(token: string | null) {
  try {
    if (token) localStorage.setItem(KEY, token)
    else localStorage.removeItem(KEY)
  } catch {
    /* private mode */
  }
}

// กลับมาจาก Discord: API ส่ง token มาใน #discord=... (fragment ไม่ถูกส่งไปเซิร์ฟเวอร์ไหน)
let loginError: string | null = null
{
  const h = new URLSearchParams(location.hash.slice(1))
  const token = h.get('discord')
  const err = h.get('discord_error')
  if (token || err) {
    if (token) setSession(token)
    if (err) loginError = err === 'access_denied' || err === 'cancelled' ? tx('ยกเลิกการเข้าสู่ระบบ') : tx('เข้าสู่ระบบด้วย Discord ไม่สำเร็จ ลองใหม่อีกครั้ง')
    history.replaceState(null, '', location.pathname + location.search)
  }
}

let state: AuthState = { ready: false, enabled: false, user: null, error: loginError }
const set = (s: Partial<AuthState>) => {
  state = { ...state, ...s }
  window.dispatchEvent(new Event(EVENT))
}

// ผลเช็กล็อกอินครั้งก่อน (เก็บในเครื่อง) — หัวเว็บใช้ระหว่างรอ /api/auth/me ตอนเปิดเว็บ
// ไม่งั้นปุ่มขวาบน (ล็อกอิน/รูปโปรไฟล์) โผล่ทีหลัง → กลุ่มปุ่มชิดขวากว้างขึ้น ขอบซ้ายขยับ = หัวเว็บกระโดด (CLS)
// ยังไม่เคยเช็ก = เดาว่า "เปิดล็อกอินอยู่ ยังไม่ได้ล็อกอิน" (เว็บจริงเปิด Discord ไว้)
const LAST = '7knote:auth-last'
type Shown = Pick<AuthState, 'enabled' | 'user'>
let last: Shown = { enabled: true, user: null }
try {
  const v = JSON.parse(localStorage.getItem(LAST) || 'null') as Shown | null
  if (v && typeof v.enabled === 'boolean') last = { enabled: v.enabled, user: getSession() && v.user?.id ? v.user : null }
} catch { /* ไม่มี storage */ }
/** สิ่งที่หัวเว็บควรโชว์: เช็กเสร็จแล้ว = ของจริง · ยังไม่เสร็จ = ผลครั้งก่อน */
export const shownAuth = (s: AuthState): Shown => (s.ready ? s : last)

let loading: Promise<void> | null = null
function load() {
  loading ??= fetch(`${BASE}/api/auth/me`, { headers: getSession() ? { Authorization: `Bearer ${getSession()}` } : {} })
    .then((r) => r.json())
    .then((d: { discordLogin: boolean; user: DiscordUser | null }) => {
      if (!d.user && getSession()) setSession(null) // หมดอายุ
      set({ ready: true, enabled: d.discordLogin, user: d.user })
      try { localStorage.setItem(LAST, JSON.stringify({ enabled: d.discordLogin, user: d.user })) } catch { /* เต็ม/โหมดส่วนตัว */ }
    })
    .catch(() => set({ ready: true }))
  return loading
}

export function useAuth() {
  const [s, setS] = useState(state)
  useEffect(() => {
    const on = () => setS(state)
    window.addEventListener(EVENT, on)
    load()
    on()
    return () => window.removeEventListener(EVENT, on)
  }, [])
  return s
}
/** เรียกเมื่อสถานะล็อกอินเปลี่ยน (ใช้เช็คสิทธิ์แก้ไขใหม่) */
export const onAuthChange = (fn: () => void) => {
  window.addEventListener(EVENT, fn)
  return () => window.removeEventListener(EVENT, fn)
}

export function loginWithDiscord() {
  location.href = `${BASE}/api/auth/discord/login?return=${encodeURIComponent(location.href.split('#')[0])}`
}
export async function logout() {
  const token = getSession()
  setSession(null)
  set({ user: null })
  if (token) await fetch(`${BASE}/api/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
}
export const clearAuthError = () => set({ error: null })
