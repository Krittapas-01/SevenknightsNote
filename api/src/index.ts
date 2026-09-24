import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Env = { DB: D1Database; ALLOWED_ORIGIN: string }

type Team = {
  front: number // จำนวนช่องแถวหน้า (1-4) ที่เหลือเป็นแถวหลัง รวม 5 ช่อง
  slots: (string | null)[] // 5 ช่อง: [0..front-1] = หน้า, [front..4] = หลัง
  pet: string | null
  extras: (string | null)[] // ช่องเสริม 4 ช่องใต้สัตว์เลี้ยง
  speed: number
  skills?: SkillStep[] // จองสกิลของทีมนี้ (ใช้กับทีมศัตรู/บ้าน)
}
type SkillStep = { slot: number; skill: 1 | 2 }

const SLOT_COUNT = 5
const MAX_HEROES = 3
const MAX_TARGETS = 300
const MAX_COUNTERS = 30
const EXTRA_COUNT = 4
const WAR_SLOTS = 5
const MAX_OPTIONS = 8
const MAX_PLANS = 50
const MAX_ANNOUNCEMENTS = 200
// จันทร์..อาทิตย์: ตี จ/พ/ส, จัดบ้านกัน อ/ศ/อา, พักพฤหัส
const DEFAULT_SCHEDULE = ['attack', 'defense', 'attack', 'rest', 'defense', 'attack', 'defense']

const app = new Hono<{ Bindings: Env }>()

app.use('/api/*', async (c, next) =>
  cors({
    origin: c.env.ALLOWED_ORIGIN || '*',
    allowHeaders: ['Content-Type', 'X-Edit-Key'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })(c, next),
)

// ---------- helpers ----------
const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function randomId(len = 8) {
  const bytes = crypto.getRandomValues(new Uint8Array(len))
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}
async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const idOrNull = (v: unknown) => (typeof v === 'string' && v.length > 0 && v.length <= 40 ? v : null)

function parseTeam(raw: any): Team | null {
  if (!raw || typeof raw !== 'object') return null
  const front = Number(raw.front)
  if (!Number.isInteger(front) || front < 1 || front > 4) return null
  if (!Array.isArray(raw.slots) || raw.slots.length !== SLOT_COUNT) return null
  const slots = raw.slots.map(idOrNull)
  if (slots.filter(Boolean).length > MAX_HEROES) return null
  const extras = Array.from({ length: EXTRA_COUNT }, (_, i) => (Array.isArray(raw.extras) ? idOrNull(raw.extras[i]) : null))
  const speed = Math.max(0, Math.min(99999, Math.floor(Number(raw.speed) || 0)))
  const team: Team = { front, slots, pet: idOrNull(raw.pet), extras, speed }
  if (Array.isArray(raw.skills)) team.skills = parseSkills(raw.skills, team)
  return team
}
function parseSkills(raw: any, team: Team): SkillStep[] {
  if (!Array.isArray(raw)) return []
  return raw
    .slice(0, 10)
    .map((s: any) => ({ slot: Number(s?.slot), skill: Number(s?.skill) === 2 ? 2 : 1 }) as SkillStep)
    .filter((s) => Number.isInteger(s.slot) && s.slot >= 0 && s.slot < SLOT_COUNT && team.slots[s.slot])
}
function parseTags(raw: any): string[] {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.map((t) => str(t, 20)).filter(Boolean))].slice(0, 5)
}

function idList(raw: any, max = 20): string[] {
  return Array.isArray(raw) ? [...new Set(raw.map(idOrNull).filter(Boolean) as string[])].slice(0, max) : []
}
type HeroNote = { hero: string; text: string; sets: string[]; rings: string[] }
const strList = (raw: any, max: number, len: number) =>
  Array.isArray(raw) ? (raw.map((x) => str(x, len)).filter(Boolean) as string[]).slice(0, max) : []
function parseHeroNotes(raw: any): HeroNote[] {
  if (!Array.isArray(raw)) return []
  return raw
    .slice(0, 5)
    .map((n: any) => ({ hero: str(n?.hero, 40), text: str(n?.text, 300), sets: strList(n?.sets, 5, 30), rings: strList(n?.rings, 6, 30) }))
    .filter((n) => n.hero)
}
type PlanData = {
  op: string[]
  banned: string[][] // ชุดทีมที่ยกเลิก เช่น [['gale','klemis','mist']]
  note: string
  slots: { name: string; kind: 'attack' | 'defense'; vs: Team | null; vsTag: string; vsId: string; options: { team: Team; skills: SkillStep[]; condition: string; notes: string; heroNotes: HeroNote[] }[] }[]
}
function parsePlan(raw: any): PlanData | null {
  if (!raw || typeof raw !== 'object') return null
  const slots = Array.from({ length: WAR_SLOTS }, (_, i) => {
    const s = Array.isArray(raw.slots) ? raw.slots[i] ?? {} : {}
    const options = (Array.isArray(s.options) ? s.options : []).slice(0, MAX_OPTIONS).flatMap((o: any) => {
      const team = parseTeam(o?.team)
      if (!team) return []
      return [{ team, skills: parseSkills(o.skills, team), condition: str(o.condition, 60), notes: str(o.notes, 1000), heroNotes: parseHeroNotes(o.heroNotes) }]
    })
    return {
      name: str(s.name, 40),
      kind: s.kind === 'attack' ? ('attack' as const) : ('defense' as const),
      vs: s.vs ? parseTeam(s.vs) : null, // บ้านที่จะตี (ไม้บุก)
      vsTag: str(s.vsTag, 20),
      vsId: str(s.vsId, 80),
      options,
    }
  })
  const banned = (Array.isArray(raw.banned) ? raw.banned : [])
    .map((g: any) => idList(typeof g === 'string' ? [g] : g, 5))
    .filter((g: string[]) => g.length)
    .slice(0, 10)
  return { op: idList(raw.op), banned, note: str(raw.note, 1000), slots }
}
const toPlan = (r: any) => ({ id: r.id, title: r.title, data: JSON.parse(r.data), createdAt: r.created_at, updatedAt: r.updated_at })

async function checkKey(c: any, guildId: string) {
  const key = c.req.header('X-Edit-Key') || ''
  const row = await c.env.DB.prepare('SELECT edit_hash FROM guilds WHERE id = ?').bind(guildId).first()
  if (!row) return 'notfound'
  if (!key || (await sha256(key)) !== row.edit_hash) return 'forbidden'
  return 'ok'
}
function deny(c: any, r: string) {
  return r === 'notfound' ? c.json({ error: 'ไม่พบกิลด์' }, 404) : c.json({ error: 'ไม่มีสิทธิ์แก้ไข' }, 403)
}

const toTarget = (r: any) => ({
  id: r.id,
  team: JSON.parse(r.team),
  tags: JSON.parse(r.tags),
  note: r.note,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})
const toCounter = (r: any) => ({
  id: r.id,
  targetId: r.target_id,
  team: JSON.parse(r.team),
  skills: JSON.parse(r.skills),
  note: r.note,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

// ---------- routes ----------
app.get('/api/health', (c) => c.json({ ok: true }))

// สร้างกิลด์ → คืน id + editKey (เก็บไว้ฝั่ง client)
app.post('/api/guild', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const name = str(body.name, 50)
  if (!name) return c.json({ error: 'กรุณาใส่ชื่อกิลด์' }, 400)
  const id = randomId(8)
  const editKey = randomId(20)
  await c.env.DB.prepare('INSERT INTO guilds (id, name, edit_hash, created_at) VALUES (?, ?, ?, ?)')
    .bind(id, name, await sha256(editKey), Date.now())
    .run()
  return c.json({ id, name, editKey }, 201)
})

// ข้อมูลทั้งกิลด์ (ทีมเป้าหมาย + ทีมแก้) ในครั้งเดียว
app.get('/api/guild/:id', async (c) => {
  const id = c.req.param('id')
  const guild = await c.env.DB.prepare('SELECT id, name, created_at FROM guilds WHERE id = ?').bind(id).first<any>()
  if (!guild) return c.json({ error: 'ไม่พบกิลด์' }, 404)
  const [t, k, p, a, st] = await c.env.DB.batch([
    c.env.DB.prepare('SELECT * FROM targets WHERE guild_id = ? ORDER BY updated_at DESC').bind(id),
    c.env.DB.prepare('SELECT * FROM counters WHERE guild_id = ? ORDER BY created_at ASC').bind(id),
    c.env.DB.prepare('SELECT * FROM plans WHERE guild_id = ? ORDER BY updated_at DESC').bind(id),
    c.env.DB.prepare('SELECT * FROM announcements WHERE guild_id = ? ORDER BY created_at DESC LIMIT 30').bind(id),
    c.env.DB.prepare('SELECT schedule FROM guild_settings WHERE guild_id = ?').bind(id),
  ])
  const announcements = (a.results as any[]).map((r) => ({
    id: r.id, body: r.body, planId: r.plan_id, opponent: r.opponent, createdAt: r.created_at,
  }))
  const schedule = (st.results as any[])[0] ? JSON.parse((st.results as any[])[0].schedule) : DEFAULT_SCHEDULE
  const counters = (k.results as any[]).map(toCounter)
  const targets = (t.results as any[]).map((r) => ({
    ...toTarget(r),
    counters: counters.filter((x) => x.targetId === r.id),
  }))
  return c.json({ guild: { id: guild.id, name: guild.name, createdAt: guild.created_at }, targets, plans: (p.results as any[]).map(toPlan), announcements, schedule })
})

// ตรวจว่า key ใช้แก้ไขได้ไหม
app.get('/api/guild/:id/check', async (c) => {
  const r = await checkKey(c, c.req.param('id'))
  return c.json({ canEdit: r === 'ok' })
})

// ---- targets ----
app.post('/api/guild/:id/targets', async (c) => {
  const gid = c.req.param('id')
  const auth = await checkKey(c, gid)
  if (auth !== 'ok') return deny(c, auth)
  const body = await c.req.json().catch(() => ({}))
  const team = parseTeam(body.team)
  if (!team) return c.json({ error: 'ข้อมูลทีมไม่ถูกต้อง' }, 400)
  const count = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM targets WHERE guild_id = ?').bind(gid).first<number>('n')
  if ((count ?? 0) >= MAX_TARGETS) return c.json({ error: 'จำนวนทีมเป้าหมายเต็มแล้ว' }, 400)
  const now = Date.now()
  const row = { id: randomId(10), team: JSON.stringify(team), tags: JSON.stringify(parseTags(body.tags)), note: str(body.note, 500) }
  await c.env.DB.prepare('INSERT INTO targets (id, guild_id, team, tags, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(row.id, gid, row.team, row.tags, row.note, now, now)
    .run()
  return c.json(toTarget({ ...row, created_at: now, updated_at: now }), 201)
})

app.put('/api/guild/:id/targets/:tid', async (c) => {
  const gid = c.req.param('id')
  const auth = await checkKey(c, gid)
  if (auth !== 'ok') return deny(c, auth)
  const body = await c.req.json().catch(() => ({}))
  const team = parseTeam(body.team)
  if (!team) return c.json({ error: 'ข้อมูลทีมไม่ถูกต้อง' }, 400)
  const now = Date.now()
  const res = await c.env.DB.prepare('UPDATE targets SET team = ?, tags = ?, note = ?, updated_at = ? WHERE id = ? AND guild_id = ?')
    .bind(JSON.stringify(team), JSON.stringify(parseTags(body.tags)), str(body.note, 500), now, c.req.param('tid'), gid)
    .run()
  if (!res.meta.changes) return c.json({ error: 'ไม่พบทีม' }, 404)
  return c.json({ ok: true })
})

app.delete('/api/guild/:id/targets/:tid', async (c) => {
  const gid = c.req.param('id')
  const auth = await checkKey(c, gid)
  if (auth !== 'ok') return deny(c, auth)
  const tid = c.req.param('tid')
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM counters WHERE target_id = ? AND guild_id = ?').bind(tid, gid),
    c.env.DB.prepare('DELETE FROM targets WHERE id = ? AND guild_id = ?').bind(tid, gid),
  ])
  return c.json({ ok: true })
})

// ---- counters ----
app.post('/api/guild/:id/targets/:tid/counters', async (c) => {
  const gid = c.req.param('id')
  const tid = c.req.param('tid')
  const auth = await checkKey(c, gid)
  if (auth !== 'ok') return deny(c, auth)
  const target = await c.env.DB.prepare('SELECT id FROM targets WHERE id = ? AND guild_id = ?').bind(tid, gid).first()
  if (!target) return c.json({ error: 'ไม่พบทีมเป้าหมาย' }, 404)
  const count = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM counters WHERE target_id = ?').bind(tid).first<number>('n')
  if ((count ?? 0) >= MAX_COUNTERS) return c.json({ error: 'จำนวนทีมแก้เต็มแล้ว' }, 400)
  const body = await c.req.json().catch(() => ({}))
  const team = parseTeam(body.team)
  if (!team) return c.json({ error: 'ข้อมูลทีมไม่ถูกต้อง' }, 400)
  const now = Date.now()
  const row = { id: randomId(10), target_id: tid, team: JSON.stringify(team), skills: JSON.stringify(parseSkills(body.skills, team)), note: str(body.note, 500) }
  await c.env.DB.prepare('INSERT INTO counters (id, target_id, guild_id, team, skills, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(row.id, tid, gid, row.team, row.skills, row.note, now, now)
    .run()
  await c.env.DB.prepare('UPDATE targets SET updated_at = ? WHERE id = ?').bind(now, tid).run()
  return c.json(toCounter({ ...row, created_at: now, updated_at: now }), 201)
})

app.put('/api/guild/:id/counters/:cid', async (c) => {
  const gid = c.req.param('id')
  const auth = await checkKey(c, gid)
  if (auth !== 'ok') return deny(c, auth)
  const body = await c.req.json().catch(() => ({}))
  const team = parseTeam(body.team)
  if (!team) return c.json({ error: 'ข้อมูลทีมไม่ถูกต้อง' }, 400)
  const res = await c.env.DB.prepare('UPDATE counters SET team = ?, skills = ?, note = ?, updated_at = ? WHERE id = ? AND guild_id = ?')
    .bind(JSON.stringify(team), JSON.stringify(parseSkills(body.skills, team)), str(body.note, 500), Date.now(), c.req.param('cid'), gid)
    .run()
  if (!res.meta.changes) return c.json({ error: 'ไม่พบทีม' }, 404)
  return c.json({ ok: true })
})

app.delete('/api/guild/:id/counters/:cid', async (c) => {
  const gid = c.req.param('id')
  const auth = await checkKey(c, gid)
  if (auth !== 'ok') return deny(c, auth)
  await c.env.DB.prepare('DELETE FROM counters WHERE id = ? AND guild_id = ?').bind(c.req.param('cid'), gid).run()
  return c.json({ ok: true })
})

// ---- war plans ----
app.post('/api/guild/:id/plans', async (c) => {
  const gid = c.req.param('id')
  const auth = await checkKey(c, gid)
  if (auth !== 'ok') return deny(c, auth)
  const body = await c.req.json().catch(() => ({}))
  const data = parsePlan(body.data)
  const title = str(body.title, 60) || 'แผนวอร์'
  if (!data) return c.json({ error: 'ข้อมูลแผนไม่ถูกต้อง' }, 400)
  const count = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM plans WHERE guild_id = ?').bind(gid).first<number>('n')
  if ((count ?? 0) >= MAX_PLANS) return c.json({ error: 'จำนวนแผนเต็มแล้ว ลบแผนเก่าก่อน' }, 400)
  const now = Date.now()
  const row = { id: randomId(10), title, data: JSON.stringify(data), created_at: now, updated_at: now }
  await c.env.DB.prepare('INSERT INTO plans (id, guild_id, title, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(row.id, gid, row.title, row.data, now, now)
    .run()
  return c.json(toPlan(row), 201)
})

app.put('/api/guild/:id/plans/:pid', async (c) => {
  const gid = c.req.param('id')
  const auth = await checkKey(c, gid)
  if (auth !== 'ok') return deny(c, auth)
  const body = await c.req.json().catch(() => ({}))
  const data = parsePlan(body.data)
  if (!data) return c.json({ error: 'ข้อมูลแผนไม่ถูกต้อง' }, 400)
  const res = await c.env.DB.prepare('UPDATE plans SET title = ?, data = ?, updated_at = ? WHERE id = ? AND guild_id = ?')
    .bind(str(body.title, 60) || 'แผนวอร์', JSON.stringify(data), Date.now(), c.req.param('pid'), gid)
    .run()
  if (!res.meta.changes) return c.json({ error: 'ไม่พบแผน' }, 404)
  return c.json({ ok: true })
})

app.delete('/api/guild/:id/plans/:pid', async (c) => {
  const gid = c.req.param('id')
  const auth = await checkKey(c, gid)
  if (auth !== 'ok') return deny(c, auth)
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE announcements SET plan_id = NULL WHERE plan_id = ? AND guild_id = ?').bind(c.req.param('pid'), gid),
    c.env.DB.prepare('DELETE FROM plans WHERE id = ? AND guild_id = ?').bind(c.req.param('pid'), gid),
  ])
  return c.json({ ok: true })
})

// ---- pulse: ข้อมูลเล็ก ๆ สำหรับแถบประกาศ (เว็บเรียกทุก 15 วิ) ----
app.get('/api/guild/:id/pulse', async (c) => {
  const gid = c.req.param('id')
  const [g, latest, withPlan, st] = await c.env.DB.batch([
    c.env.DB.prepare('SELECT name FROM guilds WHERE id = ?').bind(gid),
    c.env.DB.prepare('SELECT * FROM announcements WHERE guild_id = ? ORDER BY created_at DESC LIMIT 1').bind(gid),
    c.env.DB.prepare(
      'SELECT a.plan_id, p.title FROM announcements a JOIN plans p ON p.id = a.plan_id WHERE a.guild_id = ? ORDER BY a.created_at DESC LIMIT 1',
    ).bind(gid),
    c.env.DB.prepare('SELECT schedule FROM guild_settings WHERE guild_id = ?').bind(gid),
  ])
  const guild = (g.results as any[])[0]
  if (!guild) return c.json({ error: 'ไม่พบกิลด์' }, 404)
  const a = (latest.results as any[])[0]
  const p = (withPlan.results as any[])[0]
  const s = (st.results as any[])[0]
  c.header('Cache-Control', 'no-store')
  return c.json({
    guildName: guild.name,
    latest: a ? { id: a.id, body: a.body, planId: a.plan_id, opponent: a.opponent, createdAt: a.created_at } : null,
    activePlan: p ? { id: p.plan_id, title: p.title } : null,
    schedule: s ? JSON.parse(s.schedule) : DEFAULT_SCHEDULE,
  })
})

// ---- announcements ----
app.post('/api/guild/:id/announcements', async (c) => {
  const gid = c.req.param('id')
  const auth = await checkKey(c, gid)
  if (auth !== 'ok') return deny(c, auth)
  const body = await c.req.json().catch(() => ({}))
  const text = str(body.body, 1000)
  const planId = idOrNull(body.planId)
  const opponent = str(body.opponent, 50)
  if (!text && !planId) return c.json({ error: 'พิมพ์ประกาศหรือเลือกแผนอย่างน้อย 1 อย่าง' }, 400)
  if (planId) {
    const ok = await c.env.DB.prepare('SELECT id FROM plans WHERE id = ? AND guild_id = ?').bind(planId, gid).first()
    if (!ok) return c.json({ error: 'ไม่พบแผนที่เลือก' }, 400)
  }
  const now = Date.now()
  const id = randomId(10)
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO announcements (id, guild_id, body, plan_id, opponent, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, gid, text, planId, opponent, now),
    // เก็บแค่ล่าสุด MAX_ANNOUNCEMENTS อัน
    c.env.DB.prepare(
      'DELETE FROM announcements WHERE guild_id = ? AND id NOT IN (SELECT id FROM announcements WHERE guild_id = ? ORDER BY created_at DESC LIMIT ?)',
    ).bind(gid, gid, MAX_ANNOUNCEMENTS),
  ])
  return c.json({ id, body: text, planId, opponent, createdAt: now }, 201)
})

app.delete('/api/guild/:id/announcements/:aid', async (c) => {
  const gid = c.req.param('id')
  const auth = await checkKey(c, gid)
  if (auth !== 'ok') return deny(c, auth)
  await c.env.DB.prepare('DELETE FROM announcements WHERE id = ? AND guild_id = ?').bind(c.req.param('aid'), gid).run()
  return c.json({ ok: true })
})

// ---- ตารางวอร์ ----
app.put('/api/guild/:id/schedule', async (c) => {
  const gid = c.req.param('id')
  const auth = await checkKey(c, gid)
  if (auth !== 'ok') return deny(c, auth)
  const body = await c.req.json().catch(() => ({}))
  const raw = Array.isArray(body.schedule) ? body.schedule : []
  const schedule = Array.from({ length: 7 }, (_, i) => (['attack', 'defense', 'rest'].includes(raw[i]) ? raw[i] : 'rest'))
  await c.env.DB.prepare('INSERT INTO guild_settings (guild_id, schedule) VALUES (?, ?) ON CONFLICT(guild_id) DO UPDATE SET schedule = excluded.schedule')
    .bind(gid, JSON.stringify(schedule))
    .run()
  return c.json({ schedule })
})

app.notFound((c) => c.json({ error: 'not found' }, 404))
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'เซิร์ฟเวอร์มีปัญหา' }, 500)
})

export default app
