import { useCallback, useEffect, useState } from 'react'
import { api, forgetEditKey, getEditKey, pushRecent, saveEditKey } from './api'
import { DEMO_ID } from './demo'
import { getSession, onAuthChange } from './auth'
import type { GuildData } from './types'
import { useViewer } from './prefs'

// ---------- แคชข้อมูลกิลด์ (stale-while-revalidate) ----------
// เปิดหน้าเดิม/กดย้อนกลับ → ขึ้นข้อมูลล่าสุดที่เคยโหลดทันที แล้วค่อยดึงของใหม่มาแทนเบื้องหลัง
// เก็บในหน่วยความจำ (ระหว่างเปลี่ยนหน้า) + localStorage (เปิดเว็บใหม่) ไม่เกิน 3 กิลด์ล่าสุด
const mem = new Map<string, GuildData>()
const editMem = new Map<string, boolean>()
// เปลี่ยนหน้าภายในกิลด์ (บ้านศัตรู ↔ แผน ↔ หน้ากิลด์) → ถ้าเพิ่งโหลด/เช็กสิทธิ์ไปไม่ถึง 1 นาที ไม่ต้องยิงซ้ำ
// (ถ้ามีคนแก้ แถบประกาศเช็กเลขเวอร์ชันทุกรอบอยู่แล้ว เจอเปลี่ยน = สั่งโหลดใหม่เอง) · ประหยัดโควตา API
const FRESH_MS = 60_000
const loadedAt = new Map<string, number>()
const checkedAt = new Map<string, number>()
// กำลังโหลด/เช็กอยู่ (เช่น เปลี่ยนหน้าระหว่างรอ) → หน้าใหม่รอผลเดียวกัน ไม่ยิงซ้ำ
const loading = new Map<string, Promise<GuildData>>()
const checking = new Map<string, Promise<unknown>>()
const isFresh = (m: Map<string, number>, gid: string) => Date.now() - (m.get(gid) ?? 0) < FRESH_MS
const LS = '7k-note:guild-cache'
const LS_MAX_GUILDS = 3
const LS_MAX_CHARS = 1_500_000 // กิลด์ใหญ่มาก ๆ ไม่เก็บลงเครื่อง (กันเต็มโควตา localStorage)
type Stored = { gid: string; at: number; data: GuildData }[]
/** ล้างข้อมูลกิลด์ที่เก็บไว้ในเครื่อง (หน้าตั้งค่า) */
export function clearGuildCache() {
  mem.clear()
  loadedAt.clear()
  try { localStorage.removeItem(LS) } catch { /* ignore */ }
}

function readStored(): Stored {
  try { return JSON.parse(localStorage.getItem(LS) || '[]') } catch { return [] }
}
function peek(gid: string): GuildData | null {
  return mem.get(gid) ?? readStored().find((x) => x.gid === gid)?.data ?? null
}
function store(gid: string, data: GuildData) {
  if (gid === DEMO_ID) return // กิลด์ทดลองไม่ต้องจำ (ข้อมูลอยู่ใน demo store แล้ว)
  mem.set(gid, data)
  try {
    const json = JSON.stringify(data)
    const rest = readStored().filter((x) => x.gid !== gid)
    const list = json.length > LS_MAX_CHARS ? rest : [{ gid, at: Date.now(), data }, ...rest].slice(0, LS_MAX_GUILDS)
    localStorage.setItem(LS, JSON.stringify(list))
  } catch { /* เต็ม/โหมดส่วนตัว — ใช้แค่ในหน่วยความจำ */ }
}

/** โหลดข้อมูลกิลด์ + เช็คสิทธิ์แก้ไข (รับ ?key= จากลิงก์แชร์แล้วเก็บไว้) */
export function useGuild(gid: string) {
  const [data, setData] = useState<GuildData | null>(() => peek(gid))
  const [error, setError] = useState<string | null>(null)
  const [canEdit, setCanEditState] = useState(() => editMem.get(gid) ?? false)
  const setCanEdit = useCallback((v: boolean) => { editMem.set(gid, v); setCanEditState(v) }, [gid])

  // เปลี่ยนกิลด์ในหน้าเดิม → ขึ้นข้อมูลแคชของกิลด์นั้นก่อน
  useEffect(() => {
    setData(peek(gid))
    setCanEditState(editMem.get(gid) ?? false)
  }, [gid])

  const reload = useCallback(async () => {
    // มีของในเครื่องพร้อมเลขเวอร์ชัน → ถามแค่ว่าเปลี่ยนไหม (เซิร์ฟเวอร์อ่าน 1 แถว) · ไม่เปลี่ยน = ใช้ของเดิม
    const run = (async () => {
      const cached = peek(gid)
      const fresh = await api.getGuild(gid, cached?.rev)
      const d = fresh ?? cached!
      if (fresh) store(gid, fresh)
      loadedAt.set(gid, Date.now())
      return d
    })()
    loading.set(gid, run)
    try {
      const d = await run
      setData(d)
      setError(null)
      pushRecent({ id: d.guild.id, name: d.guild.name })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      if (loading.get(gid) === run) loading.delete(gid)
    }
  }, [gid])

  // เช็คสิทธิ์แก้ไขใหม่ (รหัสในเครื่อง หรือ ยศ Discord)
  const recheck = useCallback(async () => {
    if (gid === DEMO_ID) return setCanEdit(true) // กิลด์ทดลอง: แก้ได้เสมอ
    if (!getEditKey(gid) && !getSession()) return setCanEdit(false)
    const run = api.checkEdit(gid)
    checking.set(gid, run)
    try {
      const r = await run
      checkedAt.set(gid, Date.now())
      setCanEdit(r.canEdit)
      // รหัสในเครื่องใช้ไม่ได้แล้ว (หัวกิลด์เปลี่ยนรหัส) → ลบทิ้ง ไม่งั้นทุกครั้งที่เปิดหน้าจะนับเป็นใส่รหัสผิด
      // และอาจทำให้คนอื่นที่ใช้ IP เดียวกัน (เน็ตมือถือ) โดนล็อกไปด้วย
      if (!r.canEdit && !r.locked && getEditKey(gid)) forgetEditKey(gid)
    } catch {
      setCanEdit(false)
    } finally {
      if (checking.get(gid) === run) checking.delete(gid)
    }
  }, [gid, setCanEdit])

  useEffect(() => onAuthChange(() => void recheck()), [recheck])

  useEffect(() => {
    const url = new URL(window.location.href)
    const key = url.searchParams.get('key')
    if (key) {
      saveEditKey(gid, key)
      url.searchParams.delete('key')
      window.history.replaceState(null, '', url.pathname + url.search + url.hash)
    }
    // เพิ่งโหลดจากหน้าก่อน (ไม่ถึง 1 นาที) และมีข้อมูลในเครื่อง → ใช้ของเดิม ไม่ยิง API ซ้ำ
    const pending = loading.get(gid)
    if (pending) pending.then((d) => { setData(d); setError(null) }, (e) => setError((e as Error).message))
    else if (!(isFresh(loadedAt, gid) && peek(gid))) reload()
    // มีประกาศใหม่/มีคนแก้ (แถบประกาศเจอ) → โหลดข้อมูลหน้านี้ใหม่ด้วย
    const onChanged = (e: Event) => (e as CustomEvent).detail === gid && reload()
    window.addEventListener('7knote:changed', onChanged)
    // รหัสจากลิงก์ใหม่ = ต้องเช็กเสมอ · ไม่งั้นเช็กไปไม่ถึง 1 นาที = ใช้ผลเดิม
    const pendingCheck = checking.get(gid)
    if (pendingCheck && !key) pendingCheck.finally(() => setCanEditState(editMem.get(gid) ?? false)).catch(() => {})
    else if (key || !(isFresh(checkedAt, gid) && editMem.has(gid))) recheck()
    return () => window.removeEventListener('7knote:changed', onChanged)
  }, [gid, reload, recheck])

  // ตั้งค่า → มุมมองคนดู: ซ่อนปุ่มแก้ทุกหน้า (สิทธิ์จริงยังอยู่ = realCanEdit)
  const viewer = useViewer(gid)
  return { data, error, canEdit: canEdit && !viewer, realCanEdit: canEdit, setCanEdit, recheck, reload }
}
