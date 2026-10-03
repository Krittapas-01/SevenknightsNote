import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { currentSeason, isDateKey } from './season'

type Env = { DB: D1Database; ALLOWED_ORIGIN: string; SITE_URL?: string; DISCORD_CLIENT_ID?: string; /** wrangler secret */ DISCORD_CLIENT_SECRET?: string; /** dev เท่านั้น: ยอม webhook URL อะไรก็ได้ (ไว้ทดสอบกับ mock) */ DISCORD_ALLOW_ANY?: string; /** dev เท่านั้น: ชี้ Discord API ไป mock */ DISCORD_API_BASE?: string }

type Team = {
  front: number // จำนวนช่องแถวหน้า (1-4) ที่เหลือเป็นแถวหลัง รวม 5 ช่อง
  slots: (string | null)[] // 5 ช่อง: [0..front-1] = หน้า, [front..4] = หลัง
  pet: string | null
  extras: (string | null)[] // ช่องเสริม 4 ช่องใต้สัตว์เลี้ยง
  speed: number
  skills?: SkillStep[] // จองสกิลของทีมนี้ (ใช้กับทีมศัตรู/บ้าน)
}
type SkillStep = { slot: number; skill: 1 | 2 | 3 } // 3 = สกิลอเวค (ตัวร่าง awake)

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
// ตารางวอร์และ Season ของเกม — เหมือนกันทุกกิลด์ (เกมกำหนด ไม่ต้องให้แต่ละกิลด์ตั้งเอง)
// จันทร์..อาทิตย์: ตี / จัดบ้านกัน / พัก
const GAME_SCHEDULE = ['attack', 'defense', 'attack', 'rest', 'defense', 'attack', 'defense']
// Season ที่รู้วันแน่นอน (06/08/2026 – 17/09/2026) · Season ถัดไปนับต่อเอง: เริ่มหลังจบ 1 สัปดาห์ ยาวเท่าเดิม (season.ts)
// ถ้าเกมเปลี่ยนรอบ Season แก้ 2 บรรทัดนี้แล้ว deploy
const GAME_SEASON = { start: '2026-08-06', end: '2026-09-17' }

const app = new Hono<{ Bindings: Env }>()

app.use('/api/*', async (c, next) =>
  cors({
    origin: c.env.ALLOWED_ORIGIN || '*',
    allowHeaders: ['Content-Type', 'X-Edit-Key', 'Authorization'],
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
    .map((s: any) => ({ slot: Number(s?.slot), skill: Number(s?.skill) === 3 ? 3 : Number(s?.skill) === 2 ? 2 : 1 }) as SkillStep)
    .filter((s) => Number.isInteger(s.slot) && s.slot >= 0 && s.slot < SLOT_COUNT && team.slots[s.slot])
}
function parseTags(raw: any): string[] {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.map((t) => str(t, 20)).filter(Boolean))].slice(0, 5)
}

function idList(raw: any, max = 20): string[] {
  return Array.isArray(raw) ? [...new Set(raw.map(idOrNull).filter(Boolean) as string[])].slice(0, max) : []
}
type HeroNote = { hero: string; text: string; sets: string[]; rings: string[]; stats?: Record<string, number | string | boolean> }
/** สเตตัสฮีโร่ (อ่านจากรูป) — รับเฉพาะคีย์ที่รู้จัก ค่าเป็นตัวเลข */
const STAT_KEYS = ['atk', 'def', 'hp', 'spd', 'critRate', 'critDmg', 'weak', 'block', 'hit', 'resist', 'dtr', 'amp', 'crush', 'resil', 'rejuv']
function parseStats(raw: any): HeroNote['stats'] | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const out: Record<string, number | string | boolean> = {}
  for (const k of STAT_KEYS) {
    const v = Number(raw[k])
    if (raw[k] !== undefined && raw[k] !== null && Number.isFinite(v) && v >= 0 && v < 1e7) out[k] = Math.round(v * 100) / 100
  }
  if (!Object.keys(out).length) return undefined
  if (raw.magic === true) out.magic = true
  if (typeof raw.level === 'string') out.level = raw.level.slice(0, 10)
  return out
}
const strList = (raw: any, max: number, len: number) =>
  Array.isArray(raw) ? (raw.map((x) => str(x, len)).filter(Boolean) as string[]).slice(0, max) : []
function parseHeroNotes(raw: any): HeroNote[] {
  if (!Array.isArray(raw)) return []
  return raw
    .slice(0, 5)
    .map((n: any) => {
      const note: HeroNote = { hero: str(n?.hero, 40), text: str(n?.text, 300), sets: strList(n?.sets, 5, 30), rings: strList(n?.rings, 6, 30) }
      const stats = parseStats(n?.stats)
      if (stats) note.stats = stats
      return note
    })
    .filter((n) => n.hero)
}
type PlanData = {
  kind: 'attack' | 'defense'
  op: string[]
  banned: string[][] // ชุดทีมที่ยกเลิก เช่น [['gale','klemis','mist']]
  note: string
  slots: { name: string; kind: 'attack' | 'defense'; vs: Team | null; vsTag: string; vsId: string; main: number; options: { team: Team; skills: SkillStep[]; condition: string; notes: string; heroNotes: HeroNote[]; custom?: true; logged?: true }[] }[]
}
function parsePlan(raw: any): PlanData | null {
  if (!raw || typeof raw !== 'object') return null
  const slots = Array.from({ length: WAR_SLOTS }, (_, i) => {
    const s = Array.isArray(raw.slots) ? raw.slots[i] ?? {} : {}
    const options = (Array.isArray(s.options) ? s.options : []).slice(0, MAX_OPTIONS).flatMap((o: any) => {
      const team = parseTeam(o?.team)
      if (!team) return []
      return [{
        team, skills: parseSkills(o.skills, team), condition: str(o.condition, 60), notes: str(o.notes, 1000), heroNotes: parseHeroNotes(o.heroNotes),
        ...(o.custom === true ? { custom: true as const } : {}), ...(o.logged === true ? { logged: true as const } : {}),
      }]
    })
    return {
      name: str(s.name, 40),
      kind: s.kind === 'attack' ? ('attack' as const) : ('defense' as const),
      vs: s.vs ? parseTeam(s.vs) : null, // บ้านที่จะตี (ไม้บุก)
      vsTag: str(s.vsTag, 20),
      vsId: str(s.vsId, 80),
      main: Number.isInteger(s.main) && s.main >= 0 && s.main < options.length ? s.main : 0,
      options,
    }
  })
  // แผนบุก / แผนกัน: ทุกไม้เป็นแบบเดียวกัน (แผนเก่าไม่มี kind → ดูจากไม้ส่วนใหญ่)
  const kind: 'attack' | 'defense' = raw.kind === 'defense' || raw.kind === 'attack'
    ? raw.kind
    : slots.filter((s) => s.kind === 'defense').length > slots.filter((s) => s.kind === 'attack').length ? 'defense' : 'attack'
  for (const s of slots) s.kind = kind
  const banned = (Array.isArray(raw.banned) ? raw.banned : [])
    .map((g: any) => idList(typeof g === 'string' ? [g] : g, 5))
    .filter((g: string[]) => g.length)
    .slice(0, 10)
  return { kind, op: idList(raw.op), banned, note: str(raw.note, 1000), slots }
}
const toAnnouncement = (r: any) => ({
  id: r.id, body: r.body, planId: r.plan_id, opponent: r.opponent, createdAt: r.created_at, auto: !!r.auto,
  author: r.author_name ? { name: r.author_name, avatar: r.author_avatar, role: r.author_role || '' } : null,
})
const toPlan = (r: any) => ({ id: r.id, title: r.title, data: JSON.parse(r.data), createdAt: r.created_at, updatedAt: r.updated_at })

// ใส่รหัสผิดเกิน MAX_FAILS ครั้งใน LOCK_MS → ล็อก (เฉพาะ IP นั้น ของกิลด์นั้น) กันการสุ่มเดารหัส
const MAX_FAILS = 10
const LOCK_MS = 15 * 60 * 1000

async function checkKey(c: any, guildId: string): Promise<'ok' | 'notfound' | 'forbidden' | 'locked'> {
  // client ส่งแบบ encodeURIComponent (header ใส่ภาษาไทยตรง ๆ ไม่ได้) — คีย์สุ่มแบบเดิมไม่เปลี่ยนค่า
  const raw = c.req.header('X-Edit-Key') || ''
  let key = raw
  try { key = decodeURIComponent(raw) } catch { /* คีย์เก่าที่ไม่ได้ encode */ }
  const row = await c.env.DB.prepare(
    'SELECT g.edit_hash, s.discord_guild_id, s.discord_edit_roles FROM guilds g LEFT JOIN guild_settings s ON s.guild_id = g.id WHERE g.id = ?',
  ).bind(guildId).first()
  if (!row) return 'notfound'
  // ล็อกอิน Discord อยู่ + มียศที่กิลด์นี้ตั้งให้แก้ได้ → ผ่าน (ใช้คู่กับรหัสแก้ไข)
  const editRoles: string[] = JSON.parse(row.discord_edit_roles || '[]')
  if (row.discord_guild_id && editRoles.length) {
    const user = await currentUser(c)
    if (user) {
      const m = await memberOf(c.env, user, row.discord_guild_id)
      if (m.roles.some((r) => editRoles.includes(r))) return 'ok'
    }
  }
  if (!key) return 'forbidden'
  const k = `${guildId}:${c.req.header('CF-Connecting-IP') || 'local'}`
  const now = Date.now()
  const fail = await c.env.DB.prepare('SELECT count, since FROM auth_fails WHERE k = ?').bind(k).first()
  const fresh = fail && now - fail.since < LOCK_MS
  if (fresh && fail.count >= MAX_FAILS) return 'locked'
  if ((await sha256(key)) === row.edit_hash) return 'ok'
  await c.env.DB.prepare(
    'INSERT INTO auth_fails (k, count, since) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET count = CASE WHEN ? - since < ? THEN count + 1 ELSE 1 END, since = CASE WHEN ? - since < ? THEN since ELSE ? END',
  ).bind(k, now, now, LOCK_MS, now, LOCK_MS, now).run()
  return 'forbidden'
}
function deny(c: any, r: string) {
  if (r === 'notfound') return c.json({ error: 'ไม่พบกิลด์' }, 404)
  if (r === 'locked') return c.json({ error: 'ใส่รหัสผิดหลายครั้ง ลองใหม่ในอีก 15 นาที' }, 429)
  return c.json({ error: 'ไม่มีสิทธิ์แก้ไข' }, 403)
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
  heroNotes: JSON.parse(r.hero_notes ?? '[]'),
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
  // ชื่อกิลด์ห้ามซ้ำ (ไม่สนตัวพิมพ์เล็ก/ใหญ่ และช่องว่างหัวท้าย)
  const taken = await c.env.DB.prepare('SELECT 1 FROM guilds WHERE lower(trim(name)) = lower(?) LIMIT 1').bind(name.trim()).first()
  if (taken) return c.json({ error: `มีกิลด์ชื่อ "${name.trim()}" อยู่แล้ว ลองใช้ชื่ออื่น` }, 409)
  const id = randomId(8)
  const editKey = randomId(20)
  await c.env.DB.prepare('INSERT INTO guilds (id, name, edit_hash, created_at) VALUES (?, ?, ?, ?)')
    .bind(id, name, await sha256(editKey), Date.now())
    .run()
  return c.json({ id, name, editKey }, 201)
})

// ลบกิลด์ทั้งหมด (ถาวร) — ต้องมีสิทธิ์แก้ไข และส่งชื่อกิลด์มายืนยันให้ตรง
app.delete('/api/guild/:id', async (c) => {
  const gid = c.req.param('id')
  const auth = await checkKey(c, gid)
  if (auth !== 'ok') return deny(c, auth)
  const body = await c.req.json().catch(() => ({}))
  const g = await c.env.DB.prepare('SELECT name FROM guilds WHERE id = ?').bind(gid).first<{ name: string }>()
  if (!g) return c.json({ error: 'not found' }, 404)
  if (String(body.confirmName ?? '').trim() !== g.name.trim()) return c.json({ error: 'ชื่อกิลด์ที่พิมพ์ยืนยันไม่ตรง' }, 400)
  await c.env.DB.batch(['counters', 'targets', 'plans', 'announcements', 'guild_settings'].map((t) =>
    c.env.DB.prepare(`DELETE FROM ${t} WHERE guild_id = ?`).bind(gid)).concat(c.env.DB.prepare('DELETE FROM guilds WHERE id = ?').bind(gid)))
  return c.json({ ok: true })
})

// ข้อมูลทั้งกิลด์ (ทีมเป้าหมาย + ทีมแก้) ในครั้งเดียว
app.get('/api/guild/:id', async (c) => {
  const id = c.req.param('id')
  const guild = await c.env.DB.prepare('SELECT id, name, created_at FROM guilds WHERE id = ?').bind(id).first<any>()
  if (!guild) return c.json({ error: 'ไม่พบกิลด์' }, 404)
  const [t, k, p, a, st, ap] = await c.env.DB.batch([
    c.env.DB.prepare('SELECT * FROM targets WHERE guild_id = ? ORDER BY updated_at DESC').bind(id),
    c.env.DB.prepare('SELECT * FROM counters WHERE guild_id = ? ORDER BY created_at ASC').bind(id),
    c.env.DB.prepare('SELECT * FROM plans WHERE guild_id = ? ORDER BY updated_at DESC').bind(id),
    c.env.DB.prepare('SELECT * FROM announcements WHERE guild_id = ? ORDER BY created_at DESC LIMIT 30').bind(id),
    c.env.DB.prepare('SELECT schedule, auto_announce, season_start, season_end, discord_webhook, discord_mention, discord_guild_id, discord_edit_roles, discord_role_names FROM guild_settings WHERE guild_id = ?').bind(id),
    // ประกาศล่าสุดที่เลือกแผน (= แผนที่ใช้อยู่) — ต้องมีเสมอ แม้จะเก่ากว่า 30 อันล่าสุด (ประกาศอัตโนมัติรายวันดันตกไป)
    c.env.DB.prepare('SELECT * FROM announcements WHERE guild_id = ? AND plan_id IS NOT NULL ORDER BY created_at DESC LIMIT 1').bind(id),
  ])
  const announcements = (a.results as any[]).map(toAnnouncement)
  const planAnn = (ap.results as any[])[0]
  if (planAnn && !announcements.some((x) => x.id === planAnn.id)) announcements.push(toAnnouncement(planAnn))
  const settings = (st.results as any[])[0]
  const schedule = GAME_SCHEDULE
  const autoAnnounce = settings ? !!settings.auto_announce : true
  const season = GAME_SEASON
  const discord = { // ไม่ส่ง webhook URL ออกไป
    connected: !!settings?.discord_webhook, mention: settings?.discord_mention ?? '',
    serverId: settings?.discord_guild_id ?? '', editRoles: JSON.parse(settings?.discord_edit_roles || '[]') as string[],
    roleNames: JSON.parse(settings?.discord_role_names || '[]') as { id: string; name: string }[],
  }
  const counters = (k.results as any[]).map(toCounter)
  const targets = (t.results as any[]).map((r) => ({
    ...toTarget(r),
    counters: counters.filter((x) => x.targetId === r.id),
  }))
  return c.json({ guild: { id: guild.id, name: guild.name, createdAt: guild.created_at }, targets, plans: (p.results as any[]).map(toPlan), announcements, schedule, autoAnnounce, season, discord })
})

// ตรวจว่า key ใช้แก้ไขได้ไหม
app.get('/api/guild/:id/check', async (c) => {
  const r = await checkKey(c, c.req.param('id'))
  return c.json({ canEdit: r === 'ok', locked: r === 'locked' })
})

// ตั้งรหัสแก้ไขใหม่ (ต้องมีรหัสเดิม) → รหัส/ลิงก์แก้ไขเดิมใช้ไม่ได้อีก
app.put('/api/guild/:id/password', async (c) => {
  const gid = c.req.param('id')
  const auth = await checkKey(c, gid)
  if (auth !== 'ok') return deny(c, auth)
  const body = await c.req.json().catch(() => ({}))
  const password = typeof body.password === 'string' ? body.password.trim() : ''
  if (password.length < 6 || password.length > 64) return c.json({ error: 'รหัสต้องยาว 6–64 ตัวอักษร' }, 400)
  await c.env.DB.prepare('UPDATE guilds SET edit_hash = ? WHERE id = ?').bind(await sha256(password), gid).run()
  return c.json({ ok: true })
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
  const row = { id: randomId(10), target_id: tid, team: JSON.stringify(team), skills: JSON.stringify(parseSkills(body.skills, team)), note: str(body.note, 500), hero_notes: JSON.stringify(parseHeroNotes(body.heroNotes)) }
  await c.env.DB.prepare('INSERT INTO counters (id, target_id, guild_id, team, skills, note, hero_notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(row.id, tid, gid, row.team, row.skills, row.note, row.hero_notes, now, now)
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
  // heroNotes ไม่ได้ส่งมา = ไม่แตะของเดิม
  const res = Array.isArray(body.heroNotes)
    ? await c.env.DB.prepare('UPDATE counters SET team = ?, skills = ?, note = ?, hero_notes = ?, updated_at = ? WHERE id = ? AND guild_id = ?')
        .bind(JSON.stringify(team), JSON.stringify(parseSkills(body.skills, team)), str(body.note, 500), JSON.stringify(parseHeroNotes(body.heroNotes)), Date.now(), c.req.param('cid'), gid)
        .run()
    : await c.env.DB.prepare('UPDATE counters SET team = ?, skills = ?, note = ?, updated_at = ? WHERE id = ? AND guild_id = ?')
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
    c.env.DB.prepare('SELECT schedule, season_start, season_end FROM guild_settings WHERE guild_id = ?').bind(gid),
  ])
  const guild = (g.results as any[])[0]
  if (!guild) return c.json({ error: 'ไม่พบกิลด์' }, 404)
  const a = (latest.results as any[])[0]
  const p = (withPlan.results as any[])[0]
  const s = (st.results as any[])[0]
  c.header('Cache-Control', 'no-store')
  return c.json({
    guildName: guild.name,
    latest: a ? toAnnouncement(a) : null,
    activePlan: p ? { id: p.plan_id, title: p.title } : null,
    schedule: GAME_SCHEDULE,
    season: GAME_SEASON,
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
  const author = await announcer(c, gid) // ล็อกอิน Discord อยู่ → ขึ้นชื่อ (+ยศ) คนประกาศ
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO announcements (id, guild_id, body, plan_id, opponent, created_at, author_name, author_avatar, author_role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, gid, text, planId, opponent, now, author?.name ?? '', author?.avatar ?? '', author?.role ?? ''),
    // เก็บแค่ล่าสุด MAX_ANNOUNCEMENTS อัน
    c.env.DB.prepare(
      'DELETE FROM announcements WHERE guild_id = ? AND id NOT IN (SELECT id FROM announcements WHERE guild_id = ? ORDER BY created_at DESC LIMIT ?)',
    ).bind(gid, gid, MAX_ANNOUNCEMENTS),
  ])
  c.executionCtx.waitUntil(notifyDiscord(c.env, gid, { body: text, planId, opponent, author }).catch((e) => console.error('discord', e)))
  return c.json({ id, body: text, planId, opponent, createdAt: now, auto: false, author }, 201)
})

/** คนประกาศ: ชื่อเล่นในเซิร์ฟเวอร์ (ถ้ามี) + ยศแรกตามลำดับที่หัวกิลด์ตั้งชื่อไว้ */
async function announcer(c: any, gid: string) {
  const user = await currentUser(c)
  if (!user) return null
  const s = await c.env.DB.prepare('SELECT discord_guild_id, discord_role_names FROM guild_settings WHERE guild_id = ?').bind(gid).first()
  let name = user.name
  let role = ''
  if (s?.discord_guild_id) {
    const m = await memberOf(c.env, user, s.discord_guild_id)
    if (m.nick) name = m.nick
    const names: { id: string; name: string }[] = JSON.parse(s.discord_role_names || '[]')
    role = names.find((r) => m.roles.includes(r.id))?.name ?? ''
  }
  return { name, avatar: user.avatar, role }
}

// ---- Discord webhook ----
const WEBHOOK_RE = /^https:\/\/(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/
const MENTION_RE = /^(?:|everyone|here|\d{5,25})$/

app.put('/api/guild/:id/discord', async (c) => {
  const gid = c.req.param('id')
  const auth = await checkKey(c, gid)
  if (auth !== 'ok') return deny(c, auth)
  const body = await c.req.json().catch(() => ({}))
  const mention = typeof body.mention === 'string' ? body.mention.trim().replace(/^<@&(\d+)>$/, '$1').replace(/^@/, '') : ''
  if (!MENTION_RE.test(mention)) return c.json({ error: 'ยศที่แท็กไม่ถูกต้อง (ใส่ Role ID เป็นตัวเลข)' }, 400)
  // webhook: undefined = ไม่เปลี่ยน, '' = ยกเลิกการเชื่อม
  const webhook = typeof body.webhook === 'string' ? body.webhook.trim() : undefined
  if (webhook && !WEBHOOK_RE.test(webhook) && !c.env.DISCORD_ALLOW_ANY) return c.json({ error: 'ลิงก์ Webhook ไม่ถูกต้อง (ต้องเป็น https://discord.com/api/webhooks/...)' }, 400)
  // เซิร์ฟเวอร์ + ยศที่แก้แผนได้ (undefined = ไม่เปลี่ยน)
  const serverId = typeof body.serverId === 'string' ? body.serverId.trim() : undefined
  if (serverId !== undefined && !/^(?:|\d{5,25})$/.test(serverId)) return c.json({ error: 'Server ID ไม่ถูกต้อง (ตัวเลข)' }, 400)
  const rawRoles = typeof body.editRoles === 'string' ? body.editRoles.split(/[\s,]+/) : Array.isArray(body.editRoles) ? body.editRoles : undefined
  const editRoles = rawRoles?.map((r: unknown) => String(r).trim().replace(/^<@&(\d+)>$/, '$1')).filter(Boolean)
  if (editRoles && (editRoles.length > 10 || editRoles.some((r: string) => !/^\d{5,25}$/.test(r)))) return c.json({ error: 'Role ID ไม่ถูกต้อง (ตัวเลข คั่นด้วย , ได้ไม่เกิน 10 ยศ)' }, 400)
  // ชื่อยศ: [{id, name}] เรียงตามความสำคัญ (ยศบนสุดขึ้นก่อน)
  const roleNames = Array.isArray(body.roleNames)
    ? body.roleNames.map((r: any) => ({ id: String(r?.id ?? '').trim(), name: str(r?.name, 32) })).filter((r: any) => r.id && r.name)
    : undefined
  if (roleNames && (roleNames.length > 20 || roleNames.some((r: any) => !/^\d{5,25}$/.test(r.id)))) return c.json({ error: 'ชื่อยศ: Role ID ไม่ถูกต้อง' }, 400)
  const sets = ['discord_mention = excluded.discord_mention']
  if (roleNames !== undefined) sets.push('discord_role_names = excluded.discord_role_names')
  if (webhook !== undefined) sets.push('discord_webhook = excluded.discord_webhook')
  if (serverId !== undefined) sets.push('discord_guild_id = excluded.discord_guild_id')
  if (editRoles !== undefined) sets.push('discord_edit_roles = excluded.discord_edit_roles')
  await c.env.DB.prepare(
    `INSERT INTO guild_settings (guild_id, schedule, discord_webhook, discord_mention, discord_guild_id, discord_edit_roles, discord_role_names) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(guild_id) DO UPDATE SET ${sets.join(', ')}`,
  ).bind(gid, JSON.stringify(GAME_SCHEDULE), webhook ?? '', mention, serverId ?? '', JSON.stringify(editRoles ?? []), JSON.stringify(roleNames ?? [])).run()
  const row = await c.env.DB.prepare('SELECT discord_webhook, discord_mention, discord_guild_id, discord_edit_roles, discord_role_names FROM guild_settings WHERE guild_id = ?').bind(gid).first<any>()
  return c.json({
    connected: !!row?.discord_webhook, mention: row?.discord_mention ?? '', serverId: row?.discord_guild_id ?? '',
    editRoles: JSON.parse(row?.discord_edit_roles || '[]'), roleNames: JSON.parse(row?.discord_role_names || '[]'),
  })
})

app.post('/api/guild/:id/discord/test', async (c) => {
  const gid = c.req.param('id')
  const auth = await checkKey(c, gid)
  if (auth !== 'ok') return deny(c, auth)
  const r = await notifyDiscord(c.env, gid, { body: 'ทดสอบการเชื่อมต่อจาก 7K Note ✅', planId: null, opponent: '' }, true)
  if (r === 'none') return c.json({ error: 'ยังไม่ได้ใส่ลิงก์ Webhook' }, 400)
  if (r !== 'ok') return c.json({ error: `Discord ตอบกลับ ${r} — ลิงก์อาจถูกลบหรือผิด` }, 502)
  return c.json({ ok: true })
})

/** ส่งประกาศเข้า Discord (ถ้ากิลด์เชื่อมไว้) → 'none' | 'ok' | HTTP status */
async function notifyDiscord(env: Env, gid: string, a: { body: string; planId: string | null; opponent: string; auto?: boolean; author?: { name: string; avatar: string; role?: string } | null }, test = false) {
  const row = await env.DB.prepare(
    `SELECT s.discord_webhook AS url, s.discord_mention AS mention, g.name, p.title AS plan_title
     FROM guilds g JOIN guild_settings s ON s.guild_id = g.id LEFT JOIN plans p ON p.id = ? AND p.guild_id = g.id WHERE g.id = ?`,
  ).bind(a.planId, gid).first<any>()
  if (!row?.url) return 'none'
  const site = (env.SITE_URL || '').replace(/\/$/, '')
  const mention = row.mention === 'everyone' ? '@everyone' : row.mention === 'here' ? '@here' : row.mention ? `<@&${row.mention}>` : ''
  const fields = [
    row.plan_title && { name: 'แผนที่ใช้', value: site ? `[${row.plan_title}](${site}/g/${gid}/p/${a.planId})` : row.plan_title, inline: true },
    a.opponent && { name: 'เจอกิลด์', value: a.opponent, inline: true },
  ].filter(Boolean)
  const res = await fetch(row.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: '7K Note',
      avatar_url: site ? `${site}/logo-1024.png` : undefined, // โลโก้เว็บแทนรูป Discord เริ่มต้น
      content: test ? undefined : mention || undefined,
      allowed_mentions: row.mention === 'everyone' || row.mention === 'here' ? { parse: ['everyone'] } : { parse: [], roles: row.mention ? [row.mention] : [] },
      embeds: [{
        author: a.author ? { name: a.author.role ? `${a.author.name} · ${a.author.role}` : a.author.name, icon_url: a.author.avatar || undefined } : undefined,
        title: `📢 ประกาศ ${row.name}`,
        description: a.body || undefined,
        url: site ? `${site}/g/${gid}` : undefined,
        color: 0xe2bf72,
        fields,
        footer: a.auto ? { text: 'ประกาศอัตโนมัติ 07:00' } : undefined,
      }],
    }),
  })
  return res.ok ? 'ok' : String(res.status)
}

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
  // ตาราง/Season เป็นของเกม (เหมือนทุกกิลด์) — แต่ละกิลด์ตั้งได้แค่เปิด/ปิดประกาศอัตโนมัติ
  const autoAnnounce = body.autoAnnounce !== false
  await c.env.DB.prepare(
    `INSERT INTO guild_settings (guild_id, schedule, auto_announce) VALUES (?, ?, ?)
     ON CONFLICT(guild_id) DO UPDATE SET auto_announce = excluded.auto_announce`,
  )
    .bind(gid, JSON.stringify(GAME_SCHEDULE), autoAnnounce ? 1 : 0)
    .run()
  return c.json({ schedule: GAME_SCHEDULE, autoAnnounce, season: GAME_SEASON })
})

app.notFound((c) => c.json({ error: 'not found' }, 404))
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'เซิร์ฟเวอร์มีปัญหา' }, 500)
})

// ---------- ล็อกอินด้วย Discord (OAuth2) ----------
// เว็บ (pages.dev) กับ API (workers.dev) คนละโดเมน → ใช้ session token ใน header Authorization แทน cookie
const discordApi = (env: Env) => env.DISCORD_API_BASE || 'https://discord.com/api/v10'
const SESSION_MS = 7 * 24 * 3600 * 1000
const MEMBER_CACHE_MS = 5 * 60 * 1000
type User = { id: string; name: string; avatar: string; accessToken: string }

async function currentUser(c: any): Promise<User | null> {
  if (c.get?.('user') !== undefined) return c.get('user')
  const token = (c.req.header('Authorization') || '').replace(/^Bearer\s+/i, '')
  let user: User | null = null
  if (token) {
    const r = await c.env.DB.prepare('SELECT user_id, name, avatar, access_token, expires_at FROM sessions WHERE token_hash = ?').bind(await sha256(token)).first()
    if (r && r.expires_at > Date.now()) user = { id: r.user_id, name: r.name, avatar: r.avatar, accessToken: r.access_token }
  }
  c.set?.('user', user)
  return user
}

/** ยศของผู้ใช้ในเซิร์ฟเวอร์ Discord (แคช 5 นาที) */
async function memberOf(env: Env, user: User, serverId: string): Promise<{ roles: string[]; nick: string }> {
  const k = `${user.id}:${serverId}`
  const cached = await env.DB.prepare('SELECT roles, nick, at FROM member_cache WHERE k = ?').bind(k).first<any>()
  if (cached && Date.now() - cached.at < MEMBER_CACHE_MS) return { roles: JSON.parse(cached.roles), nick: cached.nick }
  const res = await fetch(`${discordApi(env)}/users/@me/guilds/${serverId}/member`, { headers: { Authorization: `Bearer ${user.accessToken}` } })
  let m: { roles: string[]; nick: string }
  if (res.ok) {
    const d: any = await res.json()
    m = { roles: Array.isArray(d.roles) ? d.roles : [], nick: d.nick || '' }
  } else if (res.status === 404) m = { roles: [], nick: '' } // ไม่ได้อยู่ในเซิร์ฟเวอร์
  else return cached ? { roles: JSON.parse(cached.roles), nick: cached.nick } : { roles: [], nick: '' } // rate limit ฯลฯ: ใช้ของเก่า ไม่แคช
  await env.DB.prepare('INSERT INTO member_cache (k, roles, nick, at) VALUES (?, ?, ?, ?) ON CONFLICT(k) DO UPDATE SET roles = excluded.roles, nick = excluded.nick, at = excluded.at')
    .bind(k, JSON.stringify(m.roles), m.nick, Date.now()).run()
  return m
}

/** กลับไปได้เฉพาะเว็บเรา (กัน open redirect) */
function safeReturn(env: Env, raw: string | undefined) {
  try {
    const u = new URL(raw || '')
    const site = env.SITE_URL ? new URL(env.SITE_URL).origin : ''
    if (u.origin === site || u.hostname === 'localhost' || u.hostname === '127.0.0.1') return u.origin + u.pathname + u.search
  } catch { /* ไม่ใช่ URL */ }
  return null
}
const callbackUrl = (c: any) => `${new URL(c.req.url).origin}/api/auth/discord/callback`

app.get('/api/auth/me', async (c) => {
  const user = await currentUser(c)
  c.header('Cache-Control', 'no-store')
  return c.json({ discordLogin: !!(c.env.DISCORD_CLIENT_ID && c.env.DISCORD_CLIENT_SECRET), user: user && { id: user.id, name: user.name, avatar: user.avatar } })
})

app.get('/api/auth/discord/login', async (c) => {
  if (!c.env.DISCORD_CLIENT_ID || !c.env.DISCORD_CLIENT_SECRET) return c.text('ยังไม่ได้ตั้งค่า Discord login', 503)
  const ret = safeReturn(c.env, c.req.query('return'))
  if (!ret) return c.text('return URL ไม่ถูกต้อง', 400)
  const state = randomId(24)
  const now = Date.now()
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM oauth_states WHERE created_at < ?').bind(now - 10 * 60 * 1000),
    c.env.DB.prepare('INSERT INTO oauth_states (state, return_to, created_at) VALUES (?, ?, ?)').bind(state, ret, now),
  ])
  const q = new URLSearchParams({ client_id: c.env.DISCORD_CLIENT_ID, response_type: 'code', redirect_uri: callbackUrl(c), scope: 'identify guilds.members.read', state, prompt: 'none' })
  return c.redirect(`https://discord.com/oauth2/authorize?${q}`)
})

app.get('/api/auth/discord/callback', async (c) => {
  const st = await c.env.DB.prepare('SELECT return_to, created_at FROM oauth_states WHERE state = ?').bind(c.req.query('state') || '').first<any>()
  if (!st || Date.now() - st.created_at > 10 * 60 * 1000) return c.text('ลิงก์ล็อกอินหมดอายุ ลองกดเข้าสู่ระบบใหม่', 400)
  await c.env.DB.prepare('DELETE FROM oauth_states WHERE state = ?').bind(c.req.query('state')).run()
  const fail = (why: string) => c.redirect(`${st.return_to}#discord_error=${encodeURIComponent(why)}`)
  const code = c.req.query('code')
  if (!code) return fail(c.req.query('error') || 'cancelled')
  const tok = await fetch(`${discordApi(c.env)}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: callbackUrl(c), client_id: c.env.DISCORD_CLIENT_ID!, client_secret: c.env.DISCORD_CLIENT_SECRET! }),
  })
  if (!tok.ok) return fail('token')
  const t: any = await tok.json()
  const me = await fetch(`${discordApi(c.env)}/users/@me`, { headers: { Authorization: `Bearer ${t.access_token}` } })
  if (!me.ok) return fail('profile')
  const u: any = await me.json()
  const avatar = u.avatar
    ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=64`
    : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(u.id) >> 22n) % 6}.png`
  const token = randomId(40)
  const now = Date.now()
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now),
    c.env.DB.prepare('INSERT INTO sessions (token_hash, user_id, name, avatar, access_token, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(await sha256(token), u.id, str(u.global_name || u.username, 64), avatar, t.access_token, now + Math.min(SESSION_MS, (t.expires_in || 604800) * 1000)),
  ])
  return c.redirect(`${st.return_to}#discord=${token}`)
})

app.post('/api/auth/logout', async (c) => {
  const token = (c.req.header('Authorization') || '').replace(/^Bearer\s+/i, '')
  if (token) await c.env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run()
  return c.json({ ok: true })
})

// ---------- ประกาศอัตโนมัติ 07:00 เวลาไทย (Cron Trigger "0 0 * * *" = 00:00 UTC) ----------
// เวลาไทย = UTC+7 ตลอด และวันในเกมเริ่ม 07:00 ไทย = 00:00 UTC → "วันในเกม" ตรงกับวันที่ UTC พอดี
const DAY_NAMES = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์', 'อาทิตย์']
const gameDayIndex = (ts: number) => (new Date(ts).getUTCDay() + 6) % 7 // 0 = จันทร์
const gameDayKey = (ts: number) => new Date(ts).toISOString().slice(0, 10)
const DAY_LABEL: Record<string, string> = { attack: 'วันตี', defense: 'วันจัดบ้านกัน', rest: 'วันพัก' }

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const thDate = (key: string) => `${+key.slice(8, 10)} ${TH_MONTHS[+key.slice(5, 7) - 1]}`

/**
 * ข้อความประกาศวันนี้ (null = ไม่ประกาศ) — ไม่แตะแผน (เปลี่ยนแผนให้หัวกิลด์ประกาศเองตอนไหนก็ได้)
 * วันพักไม่ประกาศ · มี Season: ประกาศวันเริ่ม/วันสุดท้าย และเงียบช่วงพักระหว่าง Season
 */
export function dailyAnnouncement(type: string, day: string, todayKey: string, seasonStart = '', seasonEnd = ''): string | null {
  const s = currentSeason(seasonStart, seasonEnd, todayKey)
  if (s) {
    if (todayKey === s.start) return `วันนี้ (${day}) เริ่ม Season ใหม่ (ถึง ${thDate(s.end)})`
    if (todayKey === s.end) return `วันนี้ (${day}) วันสุดท้ายของ Season · Season ถัดไปเริ่ม ${thDate(s.nextStart)}`
    if (s.phase !== 'in') return null
  }
  if (type !== 'attack' && type !== 'defense') return null
  return `วันนี้ (${day}) ${DAY_LABEL[type]}`
}

export async function runDailyAnnouncements(env: Env, now = Date.now()) {
  const today = gameDayIndex(now)
  const todayKey = gameDayKey(now)
  // เฉพาะกิลด์ที่เปิดไว้ และเคยใช้ประกาศแล้ว (กิลด์ที่สร้างทิ้งไว้จะไม่โดนประกาศรัว ๆ)
  const { results } = await env.DB.prepare(
    `SELECT g.id, s.schedule, s.season_start, s.season_end, (SELECT MAX(created_at) FROM announcements a WHERE a.guild_id = g.id) AS last_at
     FROM guilds g LEFT JOIN guild_settings s ON s.guild_id = g.id
     WHERE COALESCE(s.auto_announce, 1) = 1 AND EXISTS (SELECT 1 FROM announcements a WHERE a.guild_id = g.id)`,
  ).all<any>()
  let posted = 0
  for (const g of results) {
    if (g.last_at && gameDayKey(g.last_at) === todayKey) continue // วันนี้มีประกาศแล้ว (หรือรันซ้ำ)
    const body = dailyAnnouncement(GAME_SCHEDULE[today] ?? 'rest', DAY_NAMES[today], todayKey, GAME_SEASON.start, GAME_SEASON.end)
    if (!body) continue
    await env.DB.batch([
      env.DB.prepare('INSERT INTO announcements (id, guild_id, body, plan_id, opponent, created_at, auto) VALUES (?, ?, ?, NULL, ?, ?, 1)')
        .bind(randomId(10), g.id, body, '', now),
      env.DB.prepare(
        'DELETE FROM announcements WHERE guild_id = ? AND id NOT IN (SELECT id FROM announcements WHERE guild_id = ? ORDER BY created_at DESC LIMIT ?)',
      ).bind(g.id, g.id, MAX_ANNOUNCEMENTS),
    ])
    await notifyDiscord(env, g.id, { body, planId: null, opponent: '', auto: true }).catch((e) => console.error('discord', e))
    posted++
  }
  return posted
}

export default {
  fetch: app.fetch,
  scheduled: (_event: ScheduledEvent, env: Env, ctx: ExecutionContext) => {
    ctx.waitUntil(runDailyAnnouncements(env).then((n) => console.log(`daily announcements: ${n}`)))
  },
}
