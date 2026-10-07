import { getSession } from './auth'
import type { Announcement, Counter, DayType, GuildData, HeroNote, Plan, PlanData, SkillStep, Target, Team } from './types'
import { sortTags } from './tags'

export type Pulse = {
  guildName: string
  latest: Announcement | null
  activePlan: { id: string; title: string } | null
  schedule: DayType[]
  season?: { start: string; end: string }
}

/** ตอน production ตั้ง VITE_API_URL=https://7k-note-api.<you>.workers.dev */
const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

// ---------- edit key & recent guilds (เก็บในเครื่องผู้ใช้) ----------
const KEYS = '7knote:keys'
const RECENT = '7knote:recent'

function readJson<T>(k: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(k) ?? '') as T
  } catch {
    return fallback
  }
}
function writeJson(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {
    /* private mode */
  }
}

export const getEditKey = (gid: string) => readJson<Record<string, string>>(KEYS, {})[gid] ?? null
export function saveEditKey(gid: string, key: string) {
  writeJson(KEYS, { ...readJson<Record<string, string>>(KEYS, {}), [gid]: key })
}
/** ออกจากโหมดแก้ไข (ลืมรหัสของกิลด์นี้ในเครื่องนี้) */
export function forgetEditKey(gid: string) {
  const all = readJson<Record<string, string>>(KEYS, {})
  delete all[gid]
  writeJson(KEYS, all)
}

export type Recent = { id: string; name: string }
/** อัปเดตรายการที่เคยเปิดให้ตรงกับเซิร์ฟเวอร์: ชื่อใหม่ + เอากิลด์ที่ถูกลบออก (ลำดับเดิม) */
export async function refreshRecent(): Promise<Recent[]> {
  const list = getRecent()
  if (!list.length) return list
  const names = await req<Record<string, string>>(`/api/guilds/names?ids=${list.map((r) => encodeURIComponent(r.id)).join(',')}`)
  const next = list.filter((r) => names[r.id]).map((r) => ({ id: r.id, name: names[r.id] }))
  writeJson(RECENT, next)
  return next
}
/** เอากิลด์ออกจากรายการที่เคยเปิด (เช่น หลังลบกิลด์) */
export function forgetRecent(gid: string) {
  writeJson(RECENT, getRecent().filter((x) => x.id !== gid))
}
export const getRecent = () => readJson<Recent[]>(RECENT, [])
export function pushRecent(r: Recent) {
  writeJson(RECENT, [r, ...getRecent().filter((x) => x.id !== r.id)].slice(0, 8))
}

// ---------- fetch ----------
async function req<T>(path: string, init: RequestInit & { gid?: string; key?: string } = {}): Promise<T> {
  // ส่ง Content-Type เฉพาะตอนมีข้อมูล — GET ธรรมดาจะได้ไม่ต้องมี preflight (OPTIONS) ทุกครั้ง (API อยู่คนละโดเมน)
  const headers: Record<string, string> = init.body ? { 'Content-Type': 'application/json' } : {}
  if (init.gid) {
    const key = init.key ?? getEditKey(init.gid)
    // encode: header ใส่ภาษาไทยตรง ๆ ไม่ได้ (API decode กลับ)
    if (key) headers['X-Edit-Key'] = encodeURIComponent(key)
  }
  const session = getSession() // ล็อกอิน Discord (ใช้เช็คยศ + ขึ้นชื่อคนประกาศ)
  if (session) headers.Authorization = `Bearer ${session}`
  const res = await fetch(BASE + path, { ...init, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error((data as any).error ?? `HTTP ${res.status}`), { status: res.status })
  return data as T
}

export const api = {
  createGuild: (name: string, password: string) =>
    req<{ id: string; name: string; editKey: string }>('/api/guild', { method: 'POST', body: JSON.stringify({ name, password }) }),
  // แท็กหลัก (โจมตี/เวทย์/ถึก) ขึ้นก่อนเสมอ — ข้อมูลเก่าที่ลำดับต่างกันก็เรียงให้ตอนโหลด
  getGuild: (gid: string) => req<GuildData>(`/api/guild/${gid}`).then((d) => ({ ...d, targets: d.targets.map((t) => ({ ...t, tags: sortTags(t.tags) })) })),
  pulse: (gid: string) => req<Pulse>(`/api/guild/${gid}/pulse`),
  checkEdit: (gid: string, key?: string) => req<{ canEdit: boolean; locked?: boolean }>(`/api/guild/${gid}/check`, { gid, key }),
  setPassword: (gid: string, password: string) =>
    req<{ ok: true }>(`/api/guild/${gid}/password`, { method: 'PUT', body: JSON.stringify({ password }), gid }),

  createTarget: (gid: string, body: { team: Team; tags: string[]; note: string }) =>
    req<Target>(`/api/guild/${gid}/targets`, { method: 'POST', body: JSON.stringify(body), gid }),
  updateTarget: (gid: string, tid: string, body: { team: Team; tags: string[]; note: string }) =>
    req(`/api/guild/${gid}/targets/${tid}`, { method: 'PUT', body: JSON.stringify(body), gid }),
  /** ลบทั้งกิลด์ถาวร (ต้องพิมพ์ชื่อกิลด์ยืนยัน) */
  deleteGuild: (gid: string, confirmName: string) => req(`/api/guild/${gid}`, { method: 'DELETE', body: JSON.stringify({ confirmName }), gid }),
  deleteTarget: (gid: string, tid: string) => req(`/api/guild/${gid}/targets/${tid}`, { method: 'DELETE', gid }),

  createCounter: (gid: string, tid: string, body: { team: Team; skills: SkillStep[]; note: string; heroNotes?: HeroNote[] }) =>
    req<Counter>(`/api/guild/${gid}/targets/${tid}/counters`, { method: 'POST', body: JSON.stringify(body), gid }),
  updateCounter: (gid: string, cid: string, body: { team: Team; skills: SkillStep[]; note: string; heroNotes?: HeroNote[] }) =>
    req(`/api/guild/${gid}/counters/${cid}`, { method: 'PUT', body: JSON.stringify(body), gid }),
  deleteCounter: (gid: string, cid: string) => req(`/api/guild/${gid}/counters/${cid}`, { method: 'DELETE', gid }),

  createPlan: (gid: string, body: { title: string; data: PlanData }) =>
    req<Plan>(`/api/guild/${gid}/plans`, { method: 'POST', body: JSON.stringify(body), gid }),
  updatePlan: (gid: string, pid: string, body: { title: string; data: PlanData; baseUpdatedAt?: number }) =>
    req(`/api/guild/${gid}/plans/${pid}`, { method: 'PUT', body: JSON.stringify(body), gid }),
  deletePlan: (gid: string, pid: string) => req(`/api/guild/${gid}/plans/${pid}`, { method: 'DELETE', gid }),

  announce: (gid: string, body: { body: string; planId: string | null; opponent: string }) =>
    req<Announcement>(`/api/guild/${gid}/announcements`, { method: 'POST', body: JSON.stringify(body), gid }),
  deleteAnnouncement: (gid: string, aid: string) => req(`/api/guild/${gid}/announcements/${aid}`, { method: 'DELETE', gid }),
  saveDiscord: (gid: string, body: { webhook?: string; mention: string; serverId?: string; editRoles?: string[]; roleNames?: { id: string; name: string }[]; bossWebhook?: string; bossText?: { start: string | null; end: string | null } }) =>
    req<NonNullable<GuildData['discord']>>(`/api/guild/${gid}/discord`, { method: 'PUT', body: JSON.stringify(body), gid }),
  testDiscord: (gid: string, boss = false) => req<{ ok: true }>(`/api/guild/${gid}/discord/test`, { method: 'POST', gid, ...(boss ? { body: JSON.stringify({ boss: true }) } : {}) }),
  /** ตารางวอร์/Season เป็นของเกม (เหมือนทุกกิลด์) — กิลด์ตั้งได้แค่เปิด/ปิดประกาศอัตโนมัติ + ข้อความวันตี/วันจัดบ้าน */
  saveSchedule: (gid: string, autoAnnounce: boolean, autoText: { attack: string; defense: string }) =>
    req<{ schedule: DayType[]; autoAnnounce: boolean; autoText: { attack: string; defense: string } }>(`/api/guild/${gid}/schedule`, {
      method: 'PUT', body: JSON.stringify({ autoAnnounce, autoText }), gid,
    }),
  /** กด/ยกเลิกถูกใจทีมแก้ (ต้องล็อกอิน Discord) */
  likeCounter: (gid: string, cid: string) => req<{ liked: boolean; count: number }>(`/api/guild/${gid}/counters/${cid}/like`, { method: 'POST' }),
  /** ทีมที่ฉันชอบ (ทุกกิลด์) */
  myLikes: () => req<{ likes: LikedCounter[] }>('/api/me/likes'),
  /** พรีเซ็ตทีมบุกส่วนตัว (ต้องล็อกอิน Discord) */
  myPresets: () => req<{ presets: Preset[] }>('/api/me/presets'),
  createPreset: (p: PresetInput) => req<Preset>('/api/me/presets', { method: 'POST', body: JSON.stringify(p) }),
  updatePreset: (id: string, p: Partial<PresetInput>) => req<{ ok: true }>(`/api/me/presets/${id}`, { method: 'PUT', body: JSON.stringify(p) }),
  deletePreset: (id: string) => req<{ ok: true }>(`/api/me/presets/${id}`, { method: 'DELETE' }),
  /** หน้าแอดมิน (ต้องล็อกอิน Discord ด้วยไอดีที่อยู่ใน ADMIN_DISCORD_IDS) */
  adminStats: () => req<AdminStats>('/api/admin/stats'),
}

export type AdminGuild = {
  id: string; name: string; createdAt: number; lastActive: number
  targets: number; counters: number; plans: number; announcements: number; autoAnnouncements: number
  webhook: number; discordLogin: number
}
export type PresetInput = { name: string; team: Team; skills: SkillStep[]; note: string; heroNotes: HeroNote[] }
export type Preset = PresetInput & { id: string; createdAt: number; updatedAt: number }
export type LikedCounter = {
  counterId: string; guildId: string; guildName: string; targetId: string; likedAt: number; likes: number
  team: Team; skills: SkillStep[]; note: string; targetTeam: Team; targetTags: string[]
}
export type AdminStats = { now: number; guilds: AdminGuild[]; discordUsers: number }
