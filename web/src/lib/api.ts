import type { Pack } from './packs'
import { getSession } from './auth'
import type { Announcement, Counter, DayType, GuildData, HeroNote, Plan, PlanData, SkillStep, Target, Team } from './types'
import { sortTags } from './tags'
import { DEMO_ID, demoRequest } from './demo'
import { EN, tx } from './i18n'

export type Pulse = {
  guildName: string
  /** เวอร์ชันข้อมูลกิลด์ (API เก่าไม่มี) — เปลี่ยน = มีคนแก้อะไรสักอย่าง */
  rev?: string
  latest: Announcement | null
  activePlan: { id: string; title: string } | null
  /** แผนที่ใช้อยู่แยกชนิด (API เก่าไม่มี) */
  activePlans?: Partial<Record<'attack' | 'defense', { id: string; title: string }>>
  schedule: DayType[]
  season?: { start: string; end: string }
}

/** ตอน production ตั้ง VITE_API_URL=https://7k-note-api.<you>.workers.dev */
const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

// ---------- edit key & recent guilds (เก็บในเครื่องผู้ใช้) ----------
const KEYS = '7knote:keys'
const RECENT = '7knote:recent'

// ข้อมูลในเครื่องที่รูปแบบไม่ตรง (เวอร์ชันเก่า/ถูกแก้มือ) → ใช้ค่าเริ่มต้น ไม่ให้ทั้งเว็บพังเป็นจอขาว
function readJson<T>(k: string, fallback: T): T {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(k) ?? '')
    const ok = Array.isArray(fallback) ? Array.isArray(v) : !!v && typeof v === 'object' && !Array.isArray(v)
    return ok ? (v as T) : fallback
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
/** กิลด์ที่เครื่องนี้จำรหัสแก้ไขไว้ (หน้าตั้งค่า) */
export const editKeyGuilds = () => Object.keys(readJson<Record<string, string>>(KEYS, {}))
/** ออกจากโหมดแก้ไข (ลืมรหัสของกิลด์นี้ในเครื่องนี้) */
export function forgetEditKey(gid: string) {
  const all = readJson<Record<string, string>>(KEYS, {})
  delete all[gid]
  writeJson(KEYS, all)
}

// ---------- รหัสเข้ากิลด์ (กิลด์ที่หัวกิลด์ล็อกไว้ — กันคนที่ออกกิลด์ไปแล้วแต่ยังมีลิงก์) ----------
const VIEW_KEYS = '7knote:view-keys'
export const getViewKey = (gid: string) => readJson<Record<string, string>>(VIEW_KEYS, {})[gid] ?? null
export function saveViewKey(gid: string, code: string) {
  staleViewKey.delete(gid)
  writeJson(VIEW_KEYS, { ...readJson<Record<string, string>>(VIEW_KEYS, {}), [gid]: code })
}
/** กิลด์ที่รหัสในเครื่องเพิ่งใช้ไม่ได้ (หัวกิลด์เปลี่ยนรหัส) — หน้าใส่รหัสบอกว่า "เปลี่ยนรหัสแล้ว" */
export const staleViewKey = new Set<string>()
export function forgetViewKey(gid: string, stale = false) {
  if (stale) staleViewKey.add(gid)
  const all = readJson<Record<string, string>>(VIEW_KEYS, {})
  if (!(gid in all)) return
  delete all[gid]
  writeJson(VIEW_KEYS, all)
}
/** ลิงก์เชิญ = ลิงก์กิลด์ + #code=รหัส (ส่วนหลัง # ไม่ถูกส่งไปเซิร์ฟเวอร์/ไม่ติด log) */
export const inviteLink = (gid: string, code: string | null) =>
  `${location.origin}/g/${gid}${code ? `#code=${encodeURIComponent(code)}` : ''}`
/** เปิดจากลิงก์เชิญ → จำรหัสไว้ในเครื่อง แล้วลบออกจากแถบที่อยู่ (ไม่ค้างในประวัติ/ตอนแคปจอ) */
export function captureInvite(gid: string) {
  const h = new URLSearchParams(location.hash.slice(1))
  const code = h.get('code')?.trim()
  if (!code) return
  saveViewKey(gid, code)
  history.replaceState(history.state, '', location.pathname + location.search)
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
  if (r.id === DEMO_ID) return // กิลด์ทดลองไม่ขึ้นในรายการกิลด์ที่เคยเปิด
  writeJson(RECENT, [r, ...getRecent().filter((x) => x.id !== r.id)].slice(0, 8))
}

// ---------- ข้อความ error จาก API (API ตอบเป็นภาษาไทยเสมอ → หน้าเว็บภาษาอังกฤษแปลตรงนี้) ----------
const API_ERROR_EN: Record<string, string> = {
  'ข้อมูล JSON ไม่ถูกต้อง': 'Invalid JSON data',
  'ข้อมูลต้องเป็น JSON object': 'Data must be a JSON object',
  'ไม่พบกิลด์': 'Guild not found',
  'ไม่มีสิทธิ์แก้ไข': "You don't have edit access",
  'กรุณาใส่ชื่อกิลด์': 'Please enter a guild name',
  'สร้างกิลด์บ่อยเกินไป ลองใหม่ในอีก 1 ชั่วโมง': 'Too many guilds created — try again in 1 hour',
  'รหัสต้องยาว 6–64 ตัวอักษร': 'The password must be 6–64 characters',
  'ชื่อกิลด์ที่พิมพ์ยืนยันไม่ตรง': "The guild name you typed doesn't match",
  'ข้อมูลทีมไม่ถูกต้อง': 'Invalid team data',
  'จำนวนบ้านศัตรูเต็มแล้ว': 'The enemy defense list is full',
  'ไม่พบทีม': 'Team not found',
  'ไม่พบบ้านศัตรู': 'Enemy defense not found',
  'จำนวนทีมแก้เต็มแล้ว': 'This defense has the maximum number of counters',
  'รายการทีมแก้ไม่ตรงกับข้อมูลล่าสุด ลองรีเฟรชหน้าแล้วเรียงใหม่': "The counter list doesn't match the latest data — refresh the page and reorder again",
  'ข้อมูลแผนไม่ถูกต้อง': 'Invalid plan data',
  'จำนวนแผนเต็มแล้ว ลบแผนเก่าก่อน': 'The plan list is full — delete an old plan first',
  'มีคนบันทึกแผนนี้ไปก่อนระหว่างที่คุณแก้ — กดยกเลิก แล้วเปิดแก้ใหม่เพื่อดูของล่าสุด (คัดลอกส่วนที่แก้ไว้ก่อน)':
    'Someone saved this plan while you were editing — tap Cancel, then edit again to see the latest version (copy your changes first)',
  'มีคนบันทึกทีมนี้ไปก่อนระหว่างที่คุณแก้ — กดกลับไปแก้ แล้วคัดลอกส่วนที่แก้ไว้ ยกเลิก แล้วเปิดแก้ใหม่เพื่อดูของล่าสุด':
    'Someone saved this team while you were editing — go back, copy your changes, cancel, then edit again to see the latest version',
  'ไม่พบแผน': 'Plan not found',
  'พิมพ์ประกาศหรือเลือกแผนอย่างน้อย 1 อย่าง': 'Type an announcement or pick a plan',
  'ไม่พบแผนที่เลือก': 'The selected plan was not found',
  'ยศที่แท็กไม่ถูกต้อง (ใส่ Role ID เป็นตัวเลข)': 'Invalid role to mention (enter a numeric Role ID)',
  'ลิงก์ Webhook ไม่ถูกต้อง (ต้องเป็น https://discord.com/api/webhooks/...)': 'Invalid webhook link (must be https://discord.com/api/webhooks/...)',
  'Server ID ไม่ถูกต้อง (ตัวเลข)': 'Invalid Server ID (numbers only)',
  'Role ID ไม่ถูกต้อง (ตัวเลข คั่นด้วย , ได้ไม่เกิน 10 ยศ)': 'Invalid Role ID (numbers separated by commas, up to 10 roles)',
  'ชื่อยศ: Role ID ไม่ถูกต้อง': 'Role names: invalid Role ID',
  'ลิงก์ Webhook ห้องบอสจุติไม่ถูกต้อง (ต้องเป็น https://discord.com/api/webhooks/...)': 'Invalid Revival Boss webhook link (must be https://discord.com/api/webhooks/...)',
  'ยังไม่ได้ใส่ลิงก์ Webhook': 'No webhook link set yet',
  'เซิร์ฟเวอร์มีปัญหา': 'Server error',
  'เข้าสู่ระบบด้วย Discord ก่อนกดถูกใจ': 'Log in with Discord to like teams',
  'ไม่พบทีมแก้': 'Counter not found',
  'เข้าสู่ระบบด้วย Discord ก่อน': 'Log in with Discord first',
  'ไม่พบพรีเซต': 'Preset not found',
  'ไม่พบแพ็ค': 'Pack not found',
  // กิลด์ทดลอง (lib/demo.ts)
  'กิลด์ทดลองลบไม่ได้': "The demo guild can't be deleted",
  'กิลด์ทดลองยังไม่รองรับคำสั่งนี้': "The demo guild doesn't support this yet",
}
const API_ERROR_RE: [RegExp, (m: RegExpExecArray) => string][] = [
  [/^มีกิลด์ชื่อ "(.*)" อยู่แล้ว ลองใช้ชื่ออื่น$/, (m) => `A guild named "${m[1]}" already exists — try another name`],
  [/^ชื่อกิลด์ต้องยาวอย่างน้อย (\d+) ตัวอักษร \(ในเกมตั้งชื่อสั้นกว่านี้ไม่ได้\)$/, (m) => `Guild name must be at least ${m[1]} characters (the game doesn't allow shorter names)`],
  [/^ชื่อกิลด์ที่เจอต้องยาวอย่างน้อย (\d+) ตัวอักษร \(ในเกมตั้งชื่อสั้นกว่านี้ไม่ได้\)$/, (m) => `Opponent guild name must be at least ${m[1]} characters (the game doesn't allow shorter names)`],
  [/^กดถูกใจได้ไม่เกิน (\d+) ทีม$/, (m) => `You can like up to ${m[1]} teams`],
  [/^มีพรีเซตได้ไม่เกิน (\d+) ชุด ลบอันเก่าก่อน$/, (m) => `You can have up to ${m[1]} presets — delete an old one first`],
  [/^Discord ตอบกลับ (\d+) — ลิงก์อาจถูกลบหรือผิด$/, (m) => `Discord replied ${m[1]} — the link may be deleted or wrong`],
]
/** ข้อความ error จาก API → ภาษาที่เลือก (ไม่รู้จัก = ใช้ข้อความเดิม) */
export function apiError(msg: string) {
  if (!EN) return msg
  if (API_ERROR_EN[msg]) return API_ERROR_EN[msg]
  for (const [re, f] of API_ERROR_RE) { const m = re.exec(msg); if (m) return f(m) }
  return tx(msg)
}

// ---------- fetch ----------
/**
 * ข้อมูลกิลด์ที่ index.html เริ่มดึงไว้ตั้งแต่อ่าน HTML (vite.config.ts → guildBoot) — ใช้ได้ครั้งเดียว
 * ใช้แทนการยิงใหม่เฉพาะคำขอที่ตรงกันทุกอย่าง (URL รวม ?rev= และ Authorization) · ไม่ตรง = ยิงเองตามปกติ
 */
type Boot = { url: string; auth: string | null; res: Promise<Response> }
function takeBoot(url: string, auth: string | null): Promise<Response> | null {
  const w = window as Window & { __7kGuild?: Boot }
  const b = w.__7kGuild
  if (!b || b.url.split('?')[0] !== url.split('?')[0]) return null
  // คำขอข้อมูลกิลด์นี้ครั้งแรกของโค้ด = ใช้หรือทิ้งเลย (ไม่ตรง เช่น เพิ่งล็อกอิน → ผลเก่าค้างไว้ไม่ได้ ไม่งั้นโหลดใหม่ทีหลังได้ข้อมูลเก่า)
  delete w.__7kGuild
  return b.url === url && b.auth === auth ? b.res : null
}
async function req<T>(path: string, init: RequestInit & { gid?: string; key?: string; viewGid?: string } = {}): Promise<T> {
  // กิลด์ทดลอง: ข้อมูลอยู่ในเครื่อง ไม่ยิง API
  if (path === `/api/guild/${DEMO_ID}` || path.startsWith(`/api/guild/${DEMO_ID}/`)) {
    return (demoRequest(path, init) as Promise<T>).catch((e: Error) => { e.message = apiError(e.message); throw e })
  }
  // ส่ง Content-Type เฉพาะตอนมีข้อมูล — GET ธรรมดาจะได้ไม่ต้องมี preflight (OPTIONS) ทุกครั้ง (API อยู่คนละโดเมน)
  const headers: Record<string, string> = init.body ? { 'Content-Type': 'application/json' } : {}
  if (init.gid) {
    const key = init.key ?? getEditKey(init.gid)
    // encode: header ใส่ภาษาไทยตรง ๆ ไม่ได้ (API decode กลับ)
    if (key) headers['X-Edit-Key'] = encodeURIComponent(key)
  }
  // กิลด์ที่ล็อกไว้: ส่งรหัสเข้ากิลด์ที่เครื่องจำไว้ (ไม่มี = ไม่ส่ง header → GET ธรรมดาไม่ต้อง preflight)
  const view = init.viewGid ? getViewKey(init.viewGid) : null
  if (view) headers['X-View-Key'] = encodeURIComponent(view)
  const session = getSession() // ล็อกอิน Discord (ใช้เช็คยศ + ขึ้นชื่อคนประกาศ)
  if (session) headers.Authorization = `Bearer ${session}`
  // มีรหัสเข้ากิลด์ (กิลด์ล็อก) = ไม่ใช้ผลที่ index.html ดึงไว้ (ตอนนั้นยังไม่ได้ส่งรหัสไปด้วย)
  const boot = !init.body && !init.method && !headers['X-Edit-Key'] && !headers['X-View-Key'] ? takeBoot(BASE + path, headers.Authorization ?? null) : null
  const res = await (boot ?? fetch(BASE + path, { ...init, headers }))
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(apiError((data as any).error ?? `HTTP ${res.status}`)), { status: res.status, data })
  return data as T
}

export const api = {
  createGuild: (name: string, password: string) =>
    req<{ id: string; name: string; editKey: string }>('/api/guild', { method: 'POST', body: JSON.stringify({ name, password }) }),
  // แท็กหลัก (กายภาพ/เวท/แทงก์) ขึ้นก่อนเสมอ — ข้อมูลเก่าที่ลำดับต่างกันก็เรียงให้ตอนโหลด
  /** rev = เวอร์ชันที่มีในเครื่อง → ถ้าบนเซิร์ฟเวอร์ยังเท่าเดิมได้ null (ใช้ของเดิมต่อ ไม่ต้องโหลดทั้งกิลด์) */
  getGuild: (gid: string, rev?: string) => req<GuildData | { unchanged: true; rev: string }>(`/api/guild/${gid}${rev && gid !== DEMO_ID ? `?rev=${encodeURIComponent(rev)}` : ''}`, { viewGid: gid }).then((d) => 'unchanged' in d ? null : ({ ...d, targets: d.targets.map((t) => ({ ...t, tags: sortTags(t.tags) })) })),
  /** prev = แถบประกาศที่มีอยู่ → ส่งเลขเวอร์ชันไป ถ้าบนเซิร์ฟเวอร์ยังเท่าเดิมได้ prev ตัวเดิมกลับมา (API อ่านแค่ 1 แถว) */
  pulse: (gid: string, prev?: Pulse | null) =>
    req<Pulse | { unchanged: true; rev: string; schedule: DayType[]; season?: Pulse['season'] }>(`/api/guild/${gid}/pulse${prev?.rev && gid !== DEMO_ID ? `?rev=${encodeURIComponent(prev.rev)}` : ''}`, { viewGid: gid })
      .then((p): Pulse => {
        if (!('unchanged' in p) || !prev) return p as Pulse
        // ตาราง/Season มาจากโค้ด API (ไม่อ่านฐานข้อมูล) — ส่งมาทุกครั้ง เผื่อ deploy ใหม่เปลี่ยน
        const same = JSON.stringify([p.schedule, p.season]) === JSON.stringify([prev.schedule, prev.season])
        return same ? prev : { ...prev, schedule: p.schedule, season: p.season }
      }),
  /** viewCode = รหัสเข้ากิลด์ (เฉพาะคนที่แก้ได้ · null = ไม่ได้ล็อก · ไม่มี = ไม่มีสิทธิ์เห็น/API เก่า) */
  checkEdit: (gid: string, key?: string) => req<{ canEdit: boolean; owner?: boolean; locked?: boolean; viewCode?: string | null }>(`/api/guild/${gid}/check`, { gid, key }),
  /** ตั้ง/เปลี่ยน/ปิดรหัสเข้ากิลด์ (เจ้าของ) · code ว่าง = ปิดล็อก */
  setViewCode: (gid: string, code: string) =>
    req<{ viewCode: string | null }>(`/api/guild/${gid}/view`, { method: 'PUT', body: JSON.stringify({ code }), gid }),
  setPassword: (gid: string, password: string) =>
    req<{ ok: true }>(`/api/guild/${gid}/password`, { method: 'PUT', body: JSON.stringify({ password }), gid }),

  createTarget: (gid: string, body: { team: Team; tags: string[]; note: string }) =>
    req<Target>(`/api/guild/${gid}/targets`, { method: 'POST', body: JSON.stringify(body), gid }),
  /** baseEditedAt = editedAt ตอนเริ่มแก้ → มีคนบันทึกไปก่อน = 409 */
  updateTarget: (gid: string, tid: string, body: { team: Team; tags: string[]; note: string; baseEditedAt?: number }) =>
    req<{ ok: true; editedAt?: number }>(`/api/guild/${gid}/targets/${tid}`, { method: 'PUT', body: JSON.stringify(body), gid }),
  /** ลบทั้งกิลด์ถาวร (ต้องพิมพ์ชื่อกิลด์ยืนยัน) */
  renameGuild: (gid: string, name: string) =>
    req<{ ok: true; name: string }>(`/api/guild/${gid}/name`, { method: 'PUT', body: JSON.stringify({ name }), gid }),
  deleteGuild: (gid: string, confirmName: string) => req(`/api/guild/${gid}`, { method: 'DELETE', body: JSON.stringify({ confirmName }), gid }),
  deleteTarget: (gid: string, tid: string) => req(`/api/guild/${gid}/targets/${tid}`, { method: 'DELETE', gid }),

  createCounter: (gid: string, tid: string, body: { team: Team; skills: SkillStep[]; note: string; heroNotes?: HeroNote[] }) =>
    req<Counter>(`/api/guild/${gid}/targets/${tid}/counters`, { method: 'POST', body: JSON.stringify(body), gid }),
  /** baseUpdatedAt = updatedAt ของทีมแก้ตอนเริ่มแก้ → มีคนบันทึกไปก่อน = 409 */
  updateCounter: (gid: string, cid: string, body: { team: Team; skills: SkillStep[]; note: string; heroNotes?: HeroNote[]; baseUpdatedAt?: number }) =>
    req<{ ok: true; updatedAt?: number }>(`/api/guild/${gid}/counters/${cid}`, { method: 'PUT', body: JSON.stringify(body), gid }),
  deleteCounter: (gid: string, cid: string) => req(`/api/guild/${gid}/counters/${cid}`, { method: 'DELETE', gid }),
  /** เรียงลำดับทีมแก้ของบ้านศัตรู (ids ครบทุกตัว #1 ก่อน) */
  orderCounters: (gid: string, tid: string, ids: string[]) =>
    req<{ ok: true }>(`/api/guild/${gid}/targets/${tid}/counters/order`, { method: 'PUT', body: JSON.stringify({ ids }), gid }),

  createPlan: (gid: string, body: { title: string; data: PlanData }) =>
    req<Plan>(`/api/guild/${gid}/plans`, { method: 'POST', body: JSON.stringify(body), gid }),
  updatePlan: (gid: string, pid: string, body: { title: string; data: PlanData; baseUpdatedAt?: number }) =>
    req<{ ok: true; updatedAt: number }>(`/api/guild/${gid}/plans/${pid}`, { method: 'PUT', body: JSON.stringify(body), gid }),
  deletePlan: (gid: string, pid: string) => req(`/api/guild/${gid}/plans/${pid}`, { method: 'DELETE', gid }),

  announce: (gid: string, body: { body: string; planId: string | null; opponent: string }) =>
    req<Announcement>(`/api/guild/${gid}/announcements`, { method: 'POST', body: JSON.stringify(body), gid }),
  deleteAnnouncement: (gid: string, aid: string) => req(`/api/guild/${gid}/announcements/${aid}`, { method: 'DELETE', gid }),
  saveDiscord: (gid: string, body: { webhook?: string; mention: string; serverId?: string; editRoles?: string[]; roleNames?: { id: string; name: string }[]; bossWebhook?: string; bossText?: { start: string | null; end: string | null }; warReminder?: boolean }) =>
    req<NonNullable<GuildData['discord']>>(`/api/guild/${gid}/discord`, { method: 'PUT', body: JSON.stringify(body), gid }),
  testDiscord: (gid: string, boss = false) => req<{ ok: true }>(`/api/guild/${gid}/discord/test`, { method: 'POST', gid, ...(boss ? { body: JSON.stringify({ boss: true }) } : {}) }),
  /** ตารางสงคราม/Season เป็นของเกม (เหมือนทุกกิลด์) — กิลด์ตั้งได้แค่เปิด/ปิดประกาศอัตโนมัติ + ข้อความวันตี/วันจัดบ้าน */
  saveSchedule: (gid: string, autoAnnounce: boolean, autoText: { attack: string; defense: string }) =>
    req<{ schedule: DayType[]; autoAnnounce: boolean; autoText: { attack: string; defense: string } }>(`/api/guild/${gid}/schedule`, {
      method: 'PUT', body: JSON.stringify({ autoAnnounce, autoText }), gid,
    }),
  /** กด/ยกเลิกถูกใจทีมแก้ (ต้องล็อกอิน Discord) */
  likeCounter: (gid: string, cid: string) => req<{ liked: boolean; count: number }>(`/api/guild/${gid}/counters/${cid}/like`, { method: 'POST' }),
  /** ทีมที่ฉันชอบ (ทุกกิลด์) */
  myLikes: () => req<{ likes: LikedCounter[] }>('/api/me/likes'),
  /** พรีเซตทีมแก้ส่วนตัว (ต้องล็อกอิน Discord) */
  myPresets: () => req<{ presets: Preset[] }>('/api/me/presets'),
  createPreset: (p: PresetInput) => req<Preset>('/api/me/presets', { method: 'POST', body: JSON.stringify(p) }),
  updatePreset: (id: string, p: Partial<PresetInput>) => req<{ ok: true }>(`/api/me/presets/${id}`, { method: 'PUT', body: JSON.stringify(p) }),
  deletePreset: (id: string) => req<{ ok: true }>(`/api/me/presets/${id}`, { method: 'DELETE' }),
  /** หน้าแอดมิน (ต้องล็อกอิน Discord ด้วยไอดีที่อยู่ใน ADMIN_DISCORD_IDS) */
  adminStats: () => req<AdminStats>('/api/admin/stats'),
  /** สถิติปุ่ม/ฟีเจอร์ (Analytics Engine) — configured:false = ยังไม่ได้ตั้ง CF_API_TOKEN */
  adminUsage: () => req<AdminUsage>('/api/admin/usage'),
  /** คนที่ล็อกอิน Discord อยู่ + เข้าใช้ครั้งล่าสุด (1.7) */
  adminUsers: () => req<AdminUsers>('/api/admin/users'),
  /** แอดมินลบกิลด์ (ต้องพิมพ์ชื่อกิลด์ยืนยัน) */
  adminDeleteGuild: (gid: string, confirmName: string) =>
    req<{ ok: true }>(`/api/admin/guilds/${gid}`, { method: 'DELETE', body: JSON.stringify({ confirmName }) }),
  /** แพ็คในเกม (หน้าเช็กความคุ้มค่า) — ที่ยังไม่หมดอายุ */
  packs: () => req<{ packs: Pack[] }>('/api/packs'),
  /** แอดมิน: แพ็คทั้งหมด (รวมที่หมดอายุ) / เพิ่ม / แก้ / ลบ */
  adminPacks: () => req<{ packs: Pack[] }>('/api/admin/packs'),
  adminCreatePack: (p: PackInput) => req<{ id: string }>('/api/admin/packs', { method: 'POST', body: JSON.stringify(p) }),
  adminUpdatePack: (id: string, p: PackInput) => req<{ ok: true }>(`/api/admin/packs/${id}`, { method: 'PUT', body: JSON.stringify(p) }),
  adminDeletePack: (id: string) => req<{ ok: true }>(`/api/admin/packs/${id}`, { method: 'DELETE' }),
}
export type PackInput = Omit<Pack, 'id' | 'updatedAt'>

export type AdminGuild = {
  id: string; name: string; createdAt: number; lastActive: number
  targets: number; counters: number; plans: number; announcements: number; autoAnnouncements: number
  webhook: number; discordLogin: number
  /** เปิดแจ้งเตือน Discord ก่อนหมดเวลา 1 ชม. */
  warReminder: number
  /** ตั้งรหัสเข้ากิลด์ไว้ (ไม่ส่งตัวรหัสมา) */
  locked: number
}
/** ไฟล์สำรองฐานข้อมูลใน R2 (configured:false = ไม่มี bucket เช่นตอน dev) */
export type AdminBackup =
  | { configured: false }
  | { configured: true; error: string }
  | { configured: true; error?: undefined; keepDays: number; count: number; totalBytes: number; latest: { day: string; bytes: number; rows: number | null; uploadedAt: number } | null; recent: string[] }
export type PresetInput = { name: string; team: Team; skills: SkillStep[]; note: string; heroNotes: HeroNote[] }
export type Preset = PresetInput & { id: string; createdAt: number; updatedAt: number }
export type LikedCounter = {
  counterId: string; guildId: string; guildName: string; targetId: string; likedAt: number; likes: number
  team: Team; skills: SkillStep[]; note: string; targetTeam: Team; targetTags: string[]
}
export type AdminStats = { now: number; guilds: AdminGuild[]; discordUsers: number; backup?: AdminBackup }
/** lastSeen ละเอียดระดับวัน (จดวันละครั้ง) · loginAt/lastSeen = null สำหรับ session ก่อน 1.7 · renews = ต่ออายุเองได้ */
export type AdminUsers = { now: number; users: { id: string; name: string; avatar: string; lastSeen: number | null; loginAt: number | null; devices: number; renews: boolean }[] }
export type AdminUsage = { configured: boolean; error?: string; rows?: { event: string; today: number; d7: number; d30: number }[] }
