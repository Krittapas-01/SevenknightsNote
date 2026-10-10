import { useEffect, useState } from 'react'

/**
 * การตั้งค่าส่วนตัว (เก็บในเครื่องนี้) — หน้า "ตั้งค่า"
 * viewAs = กิลด์ที่เปิดมุมมองคนดู (ซ่อนปุ่มแก้ทั้งหมด แม้มีสิทธิ์แก้) ใช้เช็กว่าคนในกิลด์เห็นอะไร — สลับที่หน้ากิลด์
 */
export type ZoomPref = 'auto' | '0.8' | '0.9' | '1'
export type ThemePref = 'dark' | 'light' | 'system'
export type LangPref = 'th' | 'en'
export type Prefs = { viewAs: string[]; zoom: ZoomPref; reduceMotion: boolean; smoothScroll: boolean; theme: ThemePref; lang: LangPref }

const KEY = '7k-note:prefs'
const EVENT = '7k-note:prefs'
const DEFAULTS: Prefs = { viewAs: [], zoom: 'auto', reduceMotion: false, smoothScroll: true, theme: 'dark', lang: 'th' }

export function getPrefs(): Prefs {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return DEFAULTS }
}
export function setPrefs(patch: Partial<Prefs>) {
  const next = { ...getPrefs(), ...patch }
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* โหมดส่วนตัว */ }
  window.dispatchEvent(new Event(EVENT))
  applyMotion()
}
export const onPrefsChange = (fn: () => void) => {
  window.addEventListener(EVENT, fn)
  return () => window.removeEventListener(EVENT, fn)
}
export function usePrefs(): Prefs {
  const [p, setP] = useState(getPrefs)
  useEffect(() => onPrefsChange(() => setP(getPrefs())), [])
  return p
}
/** มุมมองคนดูของกิลด์นี้ เปิด/ปิด */
export function setViewer(gid: string, on: boolean) {
  const rest = getPrefs().viewAs.filter((x) => x !== gid)
  setPrefs({ viewAs: on ? [...rest, gid] : rest })
}
export const useViewer = (gid: string | undefined) => {
  const p = usePrefs()
  return !!gid && p.viewAs.includes(gid)
}

/** ลดแอนิเมชัน: ใส่คลาสที่ <html> (index.css ปิด animation/transition) */
export function applyMotion() {
  document.documentElement.classList.toggle('reduce-motion', getPrefs().reduceMotion)
  applyTheme()
}

/** ธีม: ใส่ data-theme ที่ <html> (index.css สลับสีทั้งเว็บ) · system = ตามเครื่อง */
const darkMq = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-color-scheme: dark)') : undefined
export function applyTheme() {
  const t = getPrefs().theme
  const light = t === 'light' || (t === 'system' && darkMq ? !darkMq.matches : false)
  const root = document.documentElement
  root.dataset.theme = light ? 'light' : 'dark'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#d1cfcc' : '#161c2e')
}
darkMq?.addEventListener?.('change', () => { if (getPrefs().theme === 'system') applyTheme() })
