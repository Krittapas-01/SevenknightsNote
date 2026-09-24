import { useCallback, useEffect, useState } from 'react'
import { api, getEditKey, pushRecent, saveEditKey } from './api'
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
    if (getEditKey(gid)) api.checkEdit(gid).then((r) => setCanEdit(r.canEdit)).catch(() => setCanEdit(false))
    return () => window.removeEventListener('7knote:changed', onChanged)
  }, [gid, reload])

  return { data, error, canEdit, reload }
}
