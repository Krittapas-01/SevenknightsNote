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
/** เจ้าของ = ใช้รหัสแก้ไข (ตั้งรหัสใหม่/ลบกิลด์/ตั้งค่า Discord ได้) · แก้ได้เพราะยศ Discord = ไม่ใช่เจ้าของ */
const ownerMem = new Map<string, boolean>()
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
/**
 * เลขเวอร์ชันของกิลด์ที่เก็บใน LS (gid → rev) แยกไว้เป็นค่าเล็ก ๆ ให้สคริปต์ใน index.html (vite.config.ts → guildBoot)
 * อ่านได้ทันทีโดยไม่ต้องแปลงข้อมูลกิลด์ทั้งก้อน → ยิงคำขอเดียวกับ fetchGuild ได้ตั้งแต่เปิดเว็บ · ต้องตรงกับ LS เสมอ (เขียนพร้อมกัน)
 */
const REV_LS = '7k-note:guild-rev'
function writeRevs(list: Stored, also?: string) {
  const revs: Record<string, string> = {}
  // '' = ไม่มีข้อมูลในเครื่อง (กิลด์ใหญ่เกิน LS_MAX_CHARS) → ยิงแบบไม่มี ?rev= เหมือน fetchGuild
  if (also) revs[also] = ''
  for (const x of list) revs[x.gid] = x.data.rev ?? ''
  try { localStorage.setItem(REV_LS, JSON.stringify(revs)) } catch { /* ignore */ }
}
/** ผู้ใช้ที่มีแคชจากเว็บเวอร์ชันก่อน (ยังไม่มี REV_LS) → สร้างให้ครั้งเดียว ไม่งั้นคำขอใน index.html ไม่ตรงกับที่โค้ดยิง (ยิงซ้ำทุกครั้ง) */
function ensureRev(gid: string) {
  try {
    const revs: unknown = JSON.parse(localStorage.getItem(REV_LS) || 'null')
    if (revs && typeof revs === 'object' && gid in revs) return
  } catch { /* เสีย → สร้างใหม่ */ }
  writeRevs(readStored(), gid)
}
/** ล้างข้อมูลกิลด์ที่เก็บไว้ในเครื่อง (หน้าตั้งค่า) */
export function clearGuildCache() {
  mem.clear()
  loadedAt.clear()
  try { localStorage.removeItem(LS); localStorage.removeItem(REV_LS) } catch { /* ignore */ }
}

// แคชในเครื่องที่รูปแบบไม่ตรง (เวอร์ชันเก่า/ถูกแก้มือ) → ทิ้ง ไม่ให้หน้าพังเป็นจอขาว
const validGuild = (d: unknown): d is GuildData => {
  const g = d as GuildData | null
  return !!g && typeof g === 'object' && !!g.guild && Array.isArray(g.targets) && Array.isArray(g.plans)
}
function readStored(): Stored {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(LS) || '[]')
    return Array.isArray(v) ? (v as Stored).filter((x) => x && typeof x.gid === 'string' && validGuild(x.data)) : []
  } catch { return [] }
}
function peek(gid: string): GuildData | null {
  const m = mem.get(gid)
  if (m) return m
  // จำไว้ในหน่วยความจำด้วย — เปิดเว็บแล้วหลายจุดถามพร้อมกัน (main.tsx, fetchGuild, useGuild) ไม่ต้องแปลง JSON ก้อนใหญ่ซ้ำ
  const d = readStored().find((x) => x.gid === gid)?.data ?? null
  if (d) mem.set(gid, d)
  return d
}
/** ข้อมูลกิลด์ที่มีอยู่แล้ว (หน่วยความจำ/เครื่อง) — main.tsx ใช้สั่งโหลดรูปจอแรกก่อนข้อมูลใหม่มา */
export const peekGuild = (gid: string) => (gid === DEMO_ID ? null : peek(gid))
function store(gid: string, data: GuildData) {
  if (gid === DEMO_ID) return // กิลด์ทดลองไม่ต้องจำ (ข้อมูลอยู่ใน demo store แล้ว)
  mem.set(gid, data)
  try {
    const json = JSON.stringify(data)
    const rest = readStored().filter((x) => x.gid !== gid)
    const list = json.length > LS_MAX_CHARS ? rest : [{ gid, at: Date.now(), data }, ...rest].slice(0, LS_MAX_GUILDS)
    localStorage.setItem(LS, JSON.stringify(list))
    writeRevs(list)
  } catch { /* เต็ม/โหมดส่วนตัว — ใช้แค่ในหน่วยความจำ */ }
}

// สิทธิ์แก้ไขล่าสุดที่เช็กได้ (เก็บในเครื่อง) — เปิดเว็บใหม่ = ขึ้นหน้าแบบคนแก้ทันทีตามผลครั้งก่อน แล้วค่อยเช็กจริงเบื้องหลัง
// ไม่งั้นทุกครั้งที่เปิด หน้าขึ้นแบบดูอย่างเดียวก่อน แล้วปุ่ม/แถบของคนแก้โผล่ทีหลัง → เนื้อหาทั้งหน้าถูกดันลง (CLS)
// แค่เรื่องหน้าตา: เซิร์ฟเวอร์เช็กสิทธิ์จริงทุกครั้งที่บันทึก · ไม่มีรหัสในเครื่องและไม่ได้ล็อกอิน = ไม่ใช้ค่าที่จำไว้
const EDIT_LS = '7k-note:can-edit'
function readEdits(): Record<string, { owner?: boolean }> {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(EDIT_LS) || '{}')
    return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, { owner?: boolean }> : {}
  } catch { return {} }
}
function lastEdit(gid: string) {
  if (gid === DEMO_ID || (!getEditKey(gid) && !getSession())) return null
  const v = readEdits()[gid]
  return v ? { canEdit: true, owner: !!v.owner } : null
}
function rememberEdit(gid: string, canEdit: boolean, owner: boolean) {
  if (gid === DEMO_ID) return
  const all = readEdits()
  if (canEdit) all[gid] = { owner }; else if (gid in all) delete all[gid]; else return
  try { localStorage.setItem(EDIT_LS, JSON.stringify(all)) } catch { /* เต็ม/โหมดส่วนตัว */ }
}

/** ดึงข้อมูลกิลด์ — มีของในเครื่องพร้อมเลขเวอร์ชัน → ถามแค่ว่าเปลี่ยนไหม (เซิร์ฟเวอร์อ่าน 1 แถว) · ไม่เปลี่ยน = ใช้ของเดิม */
function fetchGuild(gid: string) {
  const run = (async () => {
    const cached = peek(gid)
    const fresh = await api.getGuild(gid, cached?.rev)
    const d = fresh ?? cached!
    if (fresh) store(gid, fresh)
    else if (gid !== DEMO_ID) ensureRev(gid)
    loadedAt.set(gid, Date.now())
    return d
  })()
  loading.set(gid, run)
  const done = () => { if (loading.get(gid) === run) loading.delete(gid) }
  run.then(done, done)
  return run
}

/**
 * เปิดเว็บมาที่หน้าของกิลด์ → เริ่มดึงข้อมูลตั้งแต่เว็บเริ่มทำงาน (main.tsx) พร้อมกับโหลดโค้ดของหน้านั้น
 * ไม่ต้องรอโค้ดหน้าโหลด+วาดเสร็จก่อนค่อยยิง (รูปอัศวินบนจอขึ้นเร็วขึ้น — LCP) · หน้าที่เปิดขึ้นมารอผลเดียวกันนี้ ไม่ยิงซ้ำ
 */
export function prefetchGuild(gid: string): Promise<GuildData> | null {
  if (gid === DEMO_ID || loading.has(gid) || (isFresh(loadedAt, gid) && peek(gid))) return null
  const run = fetchGuild(gid)
  run.catch(() => { /* หน้ากิลด์จัดการเอง (ขึ้นไม่พบ/โหลดใหม่ไม่สำเร็จ) */ })
  return run
}

/** โหลดข้อมูลกิลด์ + เช็คสิทธิ์แก้ไข (รับ ?key= จากลิงก์แชร์แล้วเก็บไว้) */
export function useGuild(gid: string) {
  const [data, setData] = useState<GuildData | null>(() => peek(gid))
  const [error, setError] = useState<string | null>(null)
  const [canEdit, setCanEditState] = useState(() => editMem.get(gid) ?? lastEdit(gid)?.canEdit ?? false)
  const [owner, setOwnerState] = useState(() => ownerMem.get(gid) ?? lastEdit(gid)?.owner ?? false)
  const setCanEdit = useCallback((v: boolean, isOwner = v) => {
    editMem.set(gid, v); setCanEditState(v)
    ownerMem.set(gid, v && isOwner); setOwnerState(v && isOwner)
    rememberEdit(gid, v, v && isOwner)
  }, [gid])

  // เปลี่ยนกิลด์ในหน้าเดิม → ขึ้นข้อมูลแคชของกิลด์นั้นก่อน
  useEffect(() => {
    setData(peek(gid))
    setCanEditState(editMem.get(gid) ?? lastEdit(gid)?.canEdit ?? false)
    setOwnerState(ownerMem.get(gid) ?? lastEdit(gid)?.owner ?? false)
  }, [gid])

  const reload = useCallback(async () => {
    const run = fetchGuild(gid)
    try {
      const d = await run
      setData(d)
      setError(null)
      window.dispatchEvent(new Event('7knote:refresh-ok'))
      pushRecent({ id: d.guild.id, name: d.guild.name })
    } catch (e) {
      failed(gid, e)
    }
  }, [gid])
  /**
   * โหลดไม่สำเร็จ: มีข้อมูลบนจออยู่แล้ว (เน็ตสะดุด/ออฟไลน์) → คงหน้าเดิมไว้ + ขึ้นป้ายเล็ก "โหลดใหม่ไม่สำเร็จ" (ร่างที่แก้อยู่ไม่หาย)
   * หน้า "ไม่พบ" เฉพาะตอนยังไม่มีข้อมูลเลย หรือเซิร์ฟเวอร์ตอบว่าไม่มีกิลด์นี้ (404)
   */
  const failed = useCallback((id: string, e: unknown) => {
    const status = (e as { status?: number }).status
    if (status !== 404 && peek(id)) {
      window.dispatchEvent(new CustomEvent('7knote:refresh-failed', { detail: id }))
      return
    }
    setError((e as Error).message)
  }, [])

  // เช็คสิทธิ์แก้ไขใหม่ (รหัสในเครื่อง หรือ ยศ Discord)
  const recheck = useCallback(async () => {
    if (gid === DEMO_ID) return setCanEdit(true) // กิลด์ทดลอง: แก้ได้เสมอ
    if (!getEditKey(gid) && !getSession()) return setCanEdit(false)
    const run = api.checkEdit(gid)
    checking.set(gid, run)
    try {
      const r = await run
      checkedAt.set(gid, Date.now())
      setCanEdit(r.canEdit, r.owner ?? r.canEdit) // API เก่าที่ยังไม่ส่ง owner = ถือว่าเจ้าของ (เหมือนเดิม)
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
    // (รวมที่ main.tsx เริ่มดึงไว้ตอนเปิดเว็บ — prefetchGuild)
    const pending = loading.get(gid)
    if (pending) pending.then((d) => { setData(d); setError(null); pushRecent({ id: d.guild.id, name: d.guild.name }) }, (e) => failed(gid, e))
    else if (!(isFresh(loadedAt, gid) && peek(gid))) reload()
    // มีประกาศใหม่/มีคนแก้ (แถบประกาศเจอ) → โหลดข้อมูลหน้านี้ใหม่ด้วย
    const onChanged = (e: Event) => (e as CustomEvent).detail === gid && reload()
    window.addEventListener('7knote:changed', onChanged)
    // รหัสจากลิงก์ใหม่ = ต้องเช็กเสมอ · ไม่งั้นเช็กไปไม่ถึง 1 นาที = ใช้ผลเดิม
    const pendingCheck = checking.get(gid)
    if (pendingCheck && !key) pendingCheck.finally(() => { setCanEditState(editMem.get(gid) ?? false); setOwnerState(ownerMem.get(gid) ?? false) }).catch(() => {})
    else if (key || !(isFresh(checkedAt, gid) && editMem.has(gid))) recheck()
    return () => window.removeEventListener('7knote:changed', onChanged)
  }, [gid, reload, recheck, failed])

  /** แก้ข้อมูลบนจอทันที (ก่อนเซิร์ฟเวอร์ตอบ) — กดบันทึกแล้วหน้าเปลี่ยนทันที ไม่กระโดดตอนผลกลับมาทีหลัง · ตามด้วย reload() เสมอ */
  /** คืนฟังก์ชันย้อนกลับ (บันทึกไม่ผ่าน → กลับเป็นข้อมูลก่อนแก้) */
  const patch = useCallback((fn: (d: GuildData) => GuildData) => {
    const cur = peek(gid)
    if (!cur) return () => {}
    const next = fn(cur)
    mem.set(gid, next) // หน้าอื่นที่เปิดต่อ (เช่น ย้อนกลับไปหน้ากิลด์) เห็นของใหม่ด้วย — ไม่เขียนลงเครื่องจนกว่าเซิร์ฟเวอร์ยืนยัน
    setData(next)
    return () => { if (mem.get(gid) === next) { mem.set(gid, cur); setData(cur) } }
  }, [gid])

  // ตั้งค่า → มุมมองคนดู: ซ่อนปุ่มแก้ทุกหน้า (สิทธิ์จริงยังอยู่ = realCanEdit)
  const viewer = useViewer(gid)
  return { data, error, canEdit: canEdit && !viewer, realCanEdit: canEdit, isOwner: owner && !viewer, setCanEdit, recheck, reload, patch }
}
