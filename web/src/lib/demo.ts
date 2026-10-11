/**
 * กิลด์ทดลอง (/g/demo) — ใช้หน้าจริงทุกหน้า แต่ข้อมูลอยู่ในเครื่อง (sessionStorage) ไม่ส่งไป API
 * ใช้ฝึกบ้านศัตรู / แผนสงคราม / เชื่อม Discord · Discord ไม่ส่งจริง แค่เก็บ "ข้อความจำลอง" ไว้โชว์
 */
import { GAME_SCHEDULE, GAME_SEASON } from '../../../shared/game'
import type { Announcement, Counter, GuildData, Plan, Target, Team } from './types'
import { activePlanId } from './war'

export const DEMO_ID = 'demo'
export const isDemo = (gid: string | undefined) => gid === DEMO_ID
export const DEMO_WEBHOOK = 'https://discord.com/api/webhooks/123456789012345678/demo-token'

export type DemoMessage = { at: number; kind: 'test' | 'announce'; text: string }
type Store = { data: GuildData; sent: DemoMessage[]; seeded: string[] }

const KEY = '7k-note:demo'
let store: Store | null = null
const listeners = new Set<() => void>()

const WEBHOOK_RE = /^https:\/\/(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/
const MENTION_RE = /^(?:|everyone|here|\d{5,25})$/
const uid = () => Math.random().toString(36).slice(2, 10)
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

function save() {
  try { sessionStorage.setItem(KEY, JSON.stringify(store)) } catch { /* ไม่เป็นไร */ }
  listeners.forEach((f) => f())
}

async function load(): Promise<Store> {
  if (store) return store
  try {
    const raw = sessionStorage.getItem(KEY)
    if (raw) return (store = JSON.parse(raw) as Store)
  } catch { /* เริ่มใหม่ */ }
  // ทีมตัวอย่างจากที่จดไว้จริง (โหลดเฉพาะตอนเข้ากิลด์ทดลอง)
  const comps = (await import('../data/comps.json')).default as unknown as {
    defenses: { id: string; type: string; team: Team; note: string; counters: { id: string; team: Team; skills: Counter['skills']; note: string; heroNotes: Counter['heroNotes'] }[] }[]
  }
  const now = Date.now()
  const targets: Target[] = comps.defenses.slice(0, 6).map((d, i) => ({
    id: `t${i}`, team: d.team, tags: d.type ? [d.type] : [], note: d.note,
    counters: d.counters.slice(0, 2).map((c, j) => ({ id: `t${i}c${j}`, targetId: `t${i}`, team: c.team, skills: c.skills, note: c.note, heroNotes: c.heroNotes, likes: 0, createdAt: now - 86400e3, updatedAt: now - 86400e3 })),
    createdAt: now - 86400e3 * 2, updatedAt: now - 86400e3 * (i + 2),
  }))
  store = {
    data: {
      guild: { id: DEMO_ID, name: 'กิลด์ทดลอง', createdAt: now },
      targets, plans: [], announcements: [],
      schedule: GAME_SCHEDULE, autoAnnounce: false, autoText: { attack: '', defense: '' }, season: GAME_SEASON,
      discord: { connected: false, mention: '', serverId: '', editRoles: [], roleNames: [] },
    },
    sent: [],
    seeded: targets.map((t) => t.id),
  }
  save()
  return store
}

/** state ปัจจุบัน (null = ยังไม่โหลด) */
export const demoState = () => store
export function subscribeDemo(f: () => void) {
  listeners.add(f)
  return () => { listeners.delete(f) }
}
export function resetDemo() {
  store = null
  try { sessionStorage.removeItem(KEY) } catch { /* ไม่เป็นไร */ }
  return load().then(() => listeners.forEach((f) => f()))
}

const fail = (msg: string): never => { throw Object.assign(new Error(msg), { status: 400 }) }

/** แทน fetch สำหรับ /api/guild/demo/... */
export async function demoRequest(path: string, init: RequestInit = {}): Promise<unknown> {
  const s = await load()
  const d = s.data
  const method = (init.method ?? 'GET').toUpperCase()
  const body = init.body ? JSON.parse(String(init.body)) : {}
  const sub = path.replace(`/api/guild/${DEMO_ID}`, '')
  const now = Date.now()
  const seg = sub.split('/').filter(Boolean)
  const touch = (t: Target) => { t.updatedAt = now }

  if (seg.length === 0) {
    if (method === 'GET') return clone(d)
    return fail('กิลด์ทดลองลบไม่ได้')
  }
  const [a, b, c, rest] = seg
  if (a === 'pulse') {
    const latest = d.announcements[0] ?? null
    const withPlan = d.announcements.find((x) => x.planId)
    const p = withPlan && d.plans.find((x) => x.id === withPlan.planId)
    const activePlans = Object.fromEntries((['attack', 'defense'] as const).flatMap((k) => {
      const id = activePlanId(d, k)
      const pl = id && d.plans.find((x) => x.id === id)
      return pl ? [[k, { id: pl.id, title: pl.title }]] : []
    }))
    return { guildName: d.guild.name, latest, activePlan: p ? { id: p.id, title: p.title } : null, activePlans, schedule: d.schedule, season: d.season }
  }
  if (a === 'check') return { canEdit: true }
  if (a === 'password') return { ok: true }

  let out: unknown = { ok: true }
  if (a === 'targets' && !b && method === 'POST') {
    const t: Target = { id: uid(), team: body.team, tags: body.tags ?? [], note: body.note ?? '', counters: [], createdAt: now, updatedAt: now }
    d.targets.unshift(t)
    out = t
  } else if (a === 'targets' && b && c === 'counters' && rest === 'order' && method === 'PUT') {
    const t = d.targets.find((x) => x.id === b) ?? fail('ไม่พบบ้านศัตรู')
    const ids: string[] = body.ids ?? []
    t.counters = ids.map((id) => t.counters.find((y) => y.id === id)).filter((y): y is Counter => !!y)
  } else if (a === 'targets' && b && c === 'counters' && method === 'POST') {
    const t = d.targets.find((x) => x.id === b) ?? fail('ไม่พบบ้านศัตรู')
    const cn: Counter = { id: uid(), targetId: b, team: body.team, skills: body.skills ?? [], note: body.note ?? '', heroNotes: body.heroNotes ?? [], likes: 0, createdAt: now, updatedAt: now }
    t.counters.push(cn)
    touch(t)
    out = cn
  } else if (a === 'targets' && b) {
    const i = d.targets.findIndex((x) => x.id === b)
    if (i < 0) fail('ไม่พบบ้านศัตรู')
    if (method === 'DELETE') d.targets.splice(i, 1)
    else Object.assign(d.targets[i], { team: body.team, tags: body.tags ?? [], note: body.note ?? '', updatedAt: now })
  } else if (a === 'counters' && b) {
    const t = d.targets.find((x) => x.counters.some((y) => y.id === b)) ?? fail('ไม่พบทีมแก้')
    const cn = t.counters.find((y) => y.id === b)!
    if (c === 'like') {
      const liked = !(cn as Counter & { _liked?: boolean })._liked
      ;(cn as Counter & { _liked?: boolean })._liked = liked
      cn.likes = (cn.likes ?? 0) + (liked ? 1 : -1)
      out = { liked, count: cn.likes }
    } else if (method === 'DELETE') t.counters = t.counters.filter((y) => y.id !== b)
    else Object.assign(cn, { team: body.team, skills: body.skills ?? [], note: body.note ?? '', heroNotes: body.heroNotes ?? [], updatedAt: now })
    touch(t)
  } else if (a === 'plans' && !b && method === 'POST') {
    const p: Plan = { id: uid(), title: body.title, data: body.data, createdAt: now, updatedAt: now }
    d.plans.unshift(p)
    out = p
  } else if (a === 'plans' && b) {
    const i = d.plans.findIndex((x) => x.id === b)
    if (i < 0) fail('ไม่พบแผน')
    if (method === 'DELETE') d.plans.splice(i, 1)
    else Object.assign(d.plans[i], { title: body.title, data: body.data, updatedAt: now })
  } else if (a === 'announcements' && !b && method === 'POST') {
    const an: Announcement = { id: uid(), body: body.body ?? '', planId: body.planId ?? null, opponent: body.opponent ?? '', createdAt: now, author: null }
    d.announcements.unshift(an)
    if (d.discord?.connected) {
      const plan = an.planId ? d.plans.find((p) => p.id === an.planId)?.title : ''
      const tag = d.discord.mention ? (/^\d+$/.test(d.discord.mention) ? `@ยศ(${d.discord.mention}) ` : `@${d.discord.mention} `) : ''
      s.sent.unshift({ at: now, kind: 'announce', text: `${tag}📣 ${an.opponent ? `เจอ ${an.opponent} · ` : ''}${plan ? `ใช้แผน "${plan}"` : ''}${an.body ? `\n${an.body}` : ''}` })
    }
    out = an
  } else if (a === 'announcements' && b) {
    d.announcements = d.announcements.filter((x) => x.id !== b)
  } else if (a === 'discord' && b === 'test') {
    if (!d.discord?.connected) fail('ยังไม่ได้ใส่ลิงก์ Webhook')
    s.sent.unshift({ at: now, kind: 'test', text: 'ทดสอบการเชื่อมต่อจาก 7K Note ✅' })
  } else if (a === 'discord') {
    const mention = String(body.mention ?? '').trim().replace(/^<@&(\d+)>$/, '$1').replace(/^@/, '')
    if (!MENTION_RE.test(mention)) fail('ยศที่แท็กไม่ถูกต้อง (ใส่ Role ID เป็นตัวเลข)')
    const webhook = typeof body.webhook === 'string' ? body.webhook.trim() : undefined
    if (webhook && !WEBHOOK_RE.test(webhook)) fail('ลิงก์ Webhook ไม่ถูกต้อง (ต้องเป็น https://discord.com/api/webhooks/...)')
    const serverId = typeof body.serverId === 'string' ? body.serverId.trim() : undefined
    if (serverId !== undefined && !/^(?:|\d{5,25})$/.test(serverId)) fail('Server ID ไม่ถูกต้อง (ตัวเลข)')
    const raw = typeof body.editRoles === 'string' ? body.editRoles.split(/[\s,]+/) : Array.isArray(body.editRoles) ? body.editRoles : undefined
    const editRoles = raw?.map((r: unknown) => String(r).trim()).filter(Boolean) as string[] | undefined
    if (editRoles?.some((r) => !/^\d{5,25}$/.test(r))) fail('Role ID ไม่ถูกต้อง (ตัวเลข คั่นด้วย , ได้ไม่เกิน 10 ยศ)')
    const cur = d.discord ?? { connected: false, mention: '', serverId: '', editRoles: [], roleNames: [] }
    d.discord = {
      ...cur, mention,
      connected: webhook === undefined ? cur.connected : !!webhook,
      serverId: serverId ?? cur.serverId,
      editRoles: editRoles ?? cur.editRoles,
      roleNames: Array.isArray(body.roleNames) ? body.roleNames : cur.roleNames,
    }
    out = clone(d.discord)
  } else if (a === 'schedule') {
    d.autoAnnounce = !!body.autoAnnounce
    d.autoText = body.autoText ?? d.autoText
    out = { schedule: d.schedule, autoAnnounce: d.autoAnnounce, autoText: d.autoText }
  } else {
    return fail('กิลด์ทดลองยังไม่รองรับคำสั่งนี้')
  }
  save()
  return clone(out)
}
