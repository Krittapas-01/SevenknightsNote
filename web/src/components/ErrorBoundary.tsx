import { Component, type ReactNode } from 'react'
import { tx } from '../lib/i18n'

/**
 * deploy ใหม่แล้วแท็บเก่ายังเปิดอยู่: ไฟล์หน้าที่ยังไม่เคยโหลด (lazy) ถูกลบไปแล้ว → import พัง
 * โหลดหน้าใหม่ให้เองครั้งเดียว (กันวนรีเฟรชไม่จบด้วยเวลาใน sessionStorage)
 */
const RELOAD_KEY = '7knote:chunk-reload'
export function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0)
    if (Date.now() - last < 30_000) return false
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch { /* โหมดส่วนตัว: ยังรีโหลดได้ แค่กันวนไม่ได้ */ }
  window.location.reload()
  return true
}
const isChunkError = (e: unknown) =>
  /dynamically imported module|Importing a module script failed|error loading dynamically imported|Unable to preload CSS|ChunkLoadError/i.test(String((e as Error)?.message ?? e))

if (typeof window !== 'undefined') {
  // Vite แจ้งเองตอนโหลดไฟล์ล่วงหน้าไม่สำเร็จ
  window.addEventListener('vite:preloadError', (e) => { if (reloadForNewVersion()) e.preventDefault() })
}

/** หน้าไหนพัง (บั๊ก/ข้อมูลแปลก) → ขึ้นกล่องให้กดโหลดใหม่ แทนจอขาวทั้งเว็บ · เปลี่ยนหน้า (resetKey) = ลองใหม่ */
export default class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { error: unknown; key?: string }> {
  state: { error: unknown; key?: string } = { error: null }
  static getDerivedStateFromError(error: unknown) {
    return { error }
  }
  static getDerivedStateFromProps(props: { resetKey?: string }, state: { error: unknown; key?: string }) {
    if (props.resetKey !== state.key) return { error: null, key: props.resetKey }
    return null
  }
  componentDidCatch(error: unknown) {
    console.error(error)
    if (isChunkError(error)) reloadForNewVersion()
  }
  render() {
    if (!this.state.error) return this.props.children
    const chunk = isChunkError(this.state.error)
    return (
      <div role="alert" className="panel mx-auto mt-10 max-w-md p-6 text-center">
        <p className="text-lg font-semibold text-gold">{chunk ? tx('เว็บมีเวอร์ชันใหม่') : tx('หน้านี้มีปัญหา')}</p>
        <p className="mt-2 text-sm text-white/70">
          {chunk ? tx('กดโหลดใหม่เพื่อใช้เวอร์ชันล่าสุด') : tx('ลองโหลดหน้าใหม่อีกครั้ง ถ้ายังเป็นอยู่ช่วยแจ้งผู้ดูแลด้วย')}
        </p>
        <button type="button" onClick={() => window.location.reload()} className="btn-gold mt-4 px-5 py-2">{tx('โหลดหน้าใหม่')}</button>
      </div>
    )
  }
}
