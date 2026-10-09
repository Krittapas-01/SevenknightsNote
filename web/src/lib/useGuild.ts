import { useCallback, useEffect, useState } from 'react'
import { api, forgetEditKey, getEditKey, pushRecent, saveEditKey } from './api'
import { DEMO_ID } from './demo'
import { getSession, onAuthChange } from './auth'
import type { GuildData } from './types'

// ---------- แคชข้อมูลกิลด์ (stale-while-revalidate) ----------
// เปิดหน้าเดิม/กดย้อนกลับ → ขึ้นข้อมูลล่าสุดที่เคยโหลดทันที แล้วค่อยดึงของใหม่มาแทนเบื้องหลัง
// เก็บในหน่วยความจำ (ระหว่างเปลี่ยนหน้า) + localStorage (เปิดเว็บใหม่) ไม่เกิน 3 กิลด์ล่าสุด
const mem = new Map<string, GuildData>()
const editMem = new Map<string, boolean>()
const LS = '7k-note:guild-cache'
const LS_MAX_GUILDS = 3
const LS_MAX_CHARS = 1_500_000 // กิลด์ใหญ่มาก ๆ ไม่เก็บลงเครื่อง (กันเต็มโควตา localStorage)
type Stored = { gid: string; at: number; data: GuildData }[]

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
    try {
      const d = await api.getGuild(gid)
      store(gid, d)
      setData(d)
      setError(null)
      pushRecent({ id: d.guild.id, name: d.guild.name })
    } catch (e) {
      setError((e as Error).message)
    }
  }, [gid])

  // เช็คสิทธิ์แก้ไขใหม่ (รหัสในเครื่อง หรือ ยศ Discord)
  const recheck = useCallback(async () => {
    if (gid === DEMO_ID) return setCanEdit(true) // กิลด์ทดลอง: แก้ได้เสมอ
    if (!getEditKey(gid) && !getSession()) return setCanEdit(false)
    try {
      const r = await api.checkEdit(gid)
      setCanEdit(r.canEdit)
      // รหัสในเครื่องใช้ไม่ได้แล้ว (หัวกิลด์เปลี่ยนรหัส) → ลบทิ้ง ไม่งั้นทุกครั้งที่เปิดหน้าจะนับเป็นใส่รหัสผิด
      // และอาจทำให้คนอื่นที่ใช้ IP เดียวกัน (เน็ตมือถือ) โดนล็อกไปด้วย
      if (!r.canEdit && !r.locked && getEditKey(gid)) forgetEditKey(gid)
    } catch {
      setCanEdit(false)
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
    reload()
    // มีประกาศใหม่/มีคนแก้ (แถบประกาศเจอ) → โหลดข้อมูลหน้านี้ใหม่ด้วย
    const onChanged = (e: Event) => (e as CustomEvent).detail === gid && reload()
    window.addEventListener('7knote:changed', onChanged)
    recheck()
    return () => window.removeEventListener('7knote:changed', onChanged)
  }, [gid, reload, recheck])

  return { data, error, canEdit, setCanEdit, recheck, reload }
}
