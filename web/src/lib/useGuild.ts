import { useCallback, useEffect, useState } from 'react'
import { api, forgetEditKey, getEditKey, pushRecent, saveEditKey } from './api'
import { getSession, onAuthChange } from './auth'
import type { GuildData } from './types'

/** โหลดข้อมูลกิลด์ + เช็คสิทธิ์แก้ไข (รับ ?key= จากลิงก์แชร์แล้วเก็บไว้) */
export function useGuild(gid: string) {
  const [data, setData] = useState<GuildData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [canEdit, setCanEdit] = useState(false)

  const reload = useCallback(async () => {
    try {
      const d = await api.getGuild(gid)
      setData(d)
      setError(null)
      pushRecent({ id: d.guild.id, name: d.guild.name })
    } catch (e) {
      setError((e as Error).message)
    }
  }, [gid])

  // เช็คสิทธิ์แก้ไขใหม่ (รหัสในเครื่อง หรือ ยศ Discord)
  const recheck = useCallback(async () => {
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
  }, [gid])

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
