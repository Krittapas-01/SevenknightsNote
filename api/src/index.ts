import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { currentSeason } from '../../shared/season'
import { MAX_PACK_ITEMS, PACK_ITEM_KEYS, PACK_TABS } from '../../shared/packs'
import { BOSS_DEFAULT_TEXT, BOSS_REVIVAL, MAX_BOSS_TEXT, bossRevivalDay, fillBoss, DAY_NAMES, DAY_PLACEHOLDER, DAY_PLACEHOLDER_EN, GAME_SCHEDULE, GAME_SEASON, MAX_AUTO_TEXT, defaultAutoText, fillDay } from '../../shared/game'

type Env = { DB: D1Database; ALLOWED_ORIGIN: string; SITE_URL?: string; DISCORD_CLIENT_ID?: string; /** wrangler secret */ DISCORD_CLIENT_SECRET?: string; /** dev เท่านั้น: ยอม webhook URL อะไรก็ได้ (ไว้ทดสอบกับ mock) */ DISCORD_ALLOW_ANY?: string; /** dev เท่านั้น: ชี้ Discord API ไป mock */ DISCORD_API_BASE?: string; /** wrangler secret: webhook ที่ 2 ของ EXTRA_WEBHOOK_GUILD */ EXTRA_WEBHOOK?: string; /** Discord user ID ที่เข้าหน้า /admin ได้ (คั่นด้วย ,) */ ADMIN_DISCORD_IDS?: string }

type Team = {
  front: number // จำนวนช่องแถวหน้า (1-4) ที่เหลือเป็นแถวหลัง รวม 5 ช่อง
  slots: (string | null)[] // 5 ช่อง: [0..front-1] = หน้า, [front..4] = หลัง
  pet: string | null
  extras: (string | null)[] // ช่องเสริม 4 ช่องใต้สัตว์เลี้ยง
  speed: number
  skills?: SkillStep[] // ตั้งลำดับการใช้สกิลของทีมนี้ (ใช้กับบ้านศัตรู/บ้าน)
}
type SkillStep = { slot: number; skill: 1 | 2 | 3 } // 3 = สกิลอเวค (ตัวร่าง awake)

const SLOT_COUNT = 5
/** ตั้งลำดับการใช้สกิลได้สูงสุดกี่ครั้ง — ต้องตรงกับ MAX_SKILL_QUEUE ฝั่งเว็บ (web/src/lib/types.ts) */
const MAX_SKILL_QUEUE = 3
const MAX_HEROES = 3
// จำกัดขนาดกิลด์ให้หน้ากิลด์โหลดได้ในเวลา CPU 10 ms ของแผนฟรี (กิลด์ใหญ่สุดตอนนี้ ~70 ทีม × ≤ 11 ทีมแก้)
// ข้อมูลเดิมที่เกินอยู่แล้วไม่ถูกลบ แค่เพิ่มใหม่ไม่ได้
const MAX_TARGETS = 150
const MAX_COUNTERS = 15
const EXTRA_COUNT = 4
const WAR_SLOTS = 5
const MAX_OPTIONS = 8
const MAX_PLANS = 50
const MAX_ANNOUNCEMENTS = 200
const CONFLICT_MSG = 'มีคนบันทึกทีมนี้ไปก่อนระหว่างที่คุณแก้ — กดกลับไปแก้ แล้วคัดลอกส่วนที่แก้ไว้ ยกเลิก แล้วเปิดแก้ใหม่เพื่อดูของล่าสุด'
/**
 * ประกาศที่ห้ามลบตอนตัดให้เหลือ MAX_ANNOUNCEMENTS: ประกาศล่าสุดที่ผูกแผนของแต่ละชนิด (บุก/กัน) ของแต่ละกิลด์
 * = "แผนที่ใช้อยู่" — ไม่งั้นประกาศอัตโนมัติ 07:00 ดันจนเกิน 200 แล้วแผนที่ใช้อยู่หายเอง
 */
const KEEP_ACTIVE_PLAN_ANNOUNCEMENTS = `SELECT id FROM (SELECT a.id, ROW_NUMBER() OVER (
    PARTITION BY a.guild_id, COALESCE(json_extract(p.data, '$.kind'), json_extract(p.data, '$.slots[0].kind')) ORDER BY a.created_at DESC) AS rn
  FROM announcements a JOIN plans p ON p.id = a.plan_id) WHERE rn = 1`
// ตารางสงคราม / Season / เวลาเฟส / ข้อความประกาศเริ่มต้น — กติกาเกม เหมือนทุกกิลด์ อยู่ที่ shared/game.ts ที่เดียว

const app = new Hono<{ Bindings: Env }>()

/**
 * เวอร์ชันข้อมูลกิลด์ที่ส่งให้เว็บ = เลขในฐานข้อมูล + รุ่นรูปแบบข้อมูล + Season
 * (Season/รูปแบบ JSON เปลี่ยนตอน deploy → เวอร์ชันเปลี่ยนเอง ไม่ค้างของเก่าในเครื่อง)
 * เปลี่ยนรูปแบบ JSON ของ GET /api/guild/:id เมื่อไหร่ ให้ขยับ GUILD_SHAPE ด้วย
 */
const GUILD_SHAPE = 1
const guildRev = (n: unknown) => `${Number(n) || 0}.${GUILD_SHAPE}.${GAME_SEASON.start}.${GAME_SEASON.end}`

app.use('/api/*', async (c, next) =>
  cors({
    origin: (origin) => (allowedOrigin(origin, c.env) ? origin : null),
    allowHeaders: ['Content-Type', 'X-Edit-Key', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    // ให้เบราว์เซอร์จำผล preflight ไว้ 2 ชม. (ไม่งั้น Chrome จำแค่ 5 วิ → ทุก request กลายเป็น 2 ครั้ง กินโควตา Worker)
    maxAge: 7200,
  })(c, next),
)

/**
 * เว็บที่เรียก API ได้: ALLOWED_ORIGIN (เช่น https://7k-note.pages.dev) + ลิงก์ preview ของ Pages (xxxx.7k-note.pages.dev)
 * + เครื่องตัวเองตอน dev · ALLOWED_ORIGIN = '*' = ยอมทุกเว็บ
 */
function allowedOrigin(origin: string, env: Env) {
  const allow = (env.ALLOWED_ORIGIN || '*').trim()
  if (allow === '*') return true
  try {
    const u = new URL(origin)
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return true
    return allow.split(',').some((a) => {
      const site = new URL(a.trim())
      return u.origin === site.origin || (u.protocol === 'https:' && u.hostname.endsWith('.' + site.hostname))
    })
  } catch {
    return false
  }
}

// All write endpoints accept JSON objects. JSON null/arrays are valid JSON,
// but must not reach handlers that dereference body fields.
app.use('/api/*', async (c, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(c.req.method)) {
    const text = await c.req.text()
    if (text.trim()) {
      let body: unknown
      try { body = JSON.parse(text) } catch { return c.json({ error: 'ข้อมูล JSON ไม่ถูกต้อง' }, 400) }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return c.json({ error: 'ข้อมูลต้องเป็น JSON object' }, 400)
    }
  }
  await next()
})

// ข้อมูลกิลด์เปลี่ยน (เขียนสำเร็จ) → ขยับเลขเวอร์ชันของกิลด์ ให้เว็บรู้ว่าต้องโหลดใหม่
// ครอบทุก POST/PUT/DELETE ใต้ /api/guild/:id ที่เดียว จะได้ไม่มี endpoint ไหนลืม (ยกเว้นที่ไม่เปลี่ยนข้อมูลที่หน้าเว็บเห็น)
const NO_REV = /\/(password|discord\/test)$/
const bumpRev = async (c: any, next: () => Promise<void>) => {
  await next()
  if (c.req.method === 'GET' || c.req.method === 'OPTIONS' || c.res.status >= 300 || NO_REV.test(c.req.path)) return
  const gid = c.req.param('id')
  if (gid) await c.env.DB.prepare('UPDATE guilds SET rev = rev + 1 WHERE id = ?').bind(gid).run()
}
app.use('/api/guild/:id/*', bumpRev)

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
  const heroes = slots.filter(Boolean)
  if (new Set(heroes).size !== heroes.length) return null
  const extras = Array.from({ length: EXTRA_COUNT }, (_, i) => (Array.isArray(raw.extras) ? idOrNull(raw.extras[i]) : null))
  const speed = Math.max(0, Math.min(99999, Math.floor(Number(raw.speed) || 0)))
  const team: Team = { front, slots, pet: idOrNull(raw.pet), extras, speed }
  if (Array.isArray(raw.skills)) team.skills = parseSkills(raw.skills, team)
  return team
}
function parseSkills(raw: any, team: Team): SkillStep[] {
  if (!Array.isArray(raw)) return []
  return raw
    .slice(0, 50) // กันข้อมูลก้อนใหญ่ผิดปกติ
    .map((s: any) => ({ slot: Number(s?.slot), skill: Number(s?.skill) === 3 ? 3 : Number(s?.skill) === 2 ? 2 : 1 }) as SkillStep)
    .filter((s) => Number.isInteger(s.slot) && s.slot >= 0 && s.slot < SLOT_COUNT && team.slots[s.slot])
    .slice(0, MAX_SKILL_QUEUE) // คิวเกิน (ข้อมูลเก่า/ส่งผ่าน API) ตัดเหลือ 3 อันแรกตอนบันทึก
}
function parseTags(raw: any): string[] {
  if (!Array.isArray(raw)) return []
  // "กายภาพ"/"กาย" = "โจมตี" (ชื่อประเภทอัศวินในเกม) — รวมเป็นแท็กเดียว (ข้อมูลเก่าแปลงแล้วใน migration 0015)
  const tags = [...new Set(raw.map((t) => str(t, 20)).map((t) => (t === 'กายภาพ' || t === 'กาย' ? 'โจมตี' : t)).filter(Boolean))].slice(0, 5)
  // แท็กหลักขึ้นก่อน (ต้องตรงกับ MAIN_TAGS ฝั่งเว็บ) ที่เหลือคงลำดับที่ใส่
  const MAIN = ['โจมตี', 'เวทย์', 'เวท', 'ถึก']
  const rank = (t: string) => { const i = MAIN.indexOf(t); return i < 0 ? MAIN.length : i }
  return tags.map((t, i) => ({ t, i })).sort((a, b) => rank(a.t) - rank(b.t) || a.i - b.i).map((x) => x.t)
}

function idList(raw: any, max = 20): string[] {
  return Array.isArray(raw) ? [...new Set(raw.map(idOrNull).filter(Boolean) as string[])].slice(0, max) : []
}
type HeroNote = { hero: string; text: string; sets: string[]; rings: string[]; stats?: Record<string, number | string | boolean> }
/** ค่าความสามารถอัศวิน (อ่านจากรูป) — รับเฉพาะคีย์ที่รู้จัก ค่าเป็นตัวเลข */
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
  slots: (AltHouse & { name: string; kind: 'attack' | 'defense'; main: number; options: WarOption[]; alts?: AltHouse[] })[]
}
/** บ้านอื่นที่ทีมแก้ชุดเดียวกันตีได้ */
type AltHouse = { vs: Team | null; vsTag: string; vsId: string; vsTags?: string[]; vsNote?: string }
type WarOption = { team: Team; skills: SkillStep[]; condition: string; notes: string; heroNotes: HeroNote[]; custom?: true; logged?: true }
/** ไม้เข้าได้หลายบ้าน: บ้านหลัก + บ้านอื่นอีกไม่เกินนี้ (ต้องตรงกับ MAX_HOUSES - 1 ฝั่งเว็บ) */
const MAX_ALT_HOUSES = 2
/** บ้านที่จะตี: ทีม + ประเภท + (บ้านที่จัดเอง) แท็ก/โน้ต */
function parseAltHouse(s: any): AltHouse {
  const vsTags = parseTags(s?.vsTags)
  const vsNote = str(s?.vsNote, 500)
  return {
    vs: s?.vs ? parseTeam(s.vs) : null, vsTag: str(s?.vsTag, 20), vsId: str(s?.vsId, 80),
    ...(vsTags.length ? { vsTags } : {}), ...(vsNote ? { vsNote } : {}),
  }
}
function parseHouse(s: any) {
  const options = (Array.isArray(s?.options) ? s.options : []).slice(0, MAX_OPTIONS).flatMap((o: any) => {
    const team = parseTeam(o?.team)
    if (!team) return []
    return [{
      team, skills: parseSkills(o.skills, team), condition: str(o.condition, 60), notes: str(o.notes, 1000), heroNotes: parseHeroNotes(o.heroNotes),
      ...(o.custom === true ? { custom: true as const } : {}), ...(o.logged === true ? { logged: true as const } : {}),
    }]
  })
  return {
    ...parseAltHouse(s), // บ้านที่จะตี (ไม้)
    main: Number.isInteger(s?.main) && s.main >= 0 && s.main < options.length ? s.main : 0,
    options,
  }
}
function parsePlan(raw: any): PlanData | null {
  if (!raw || typeof raw !== 'object') return null
  const slots = Array.from({ length: WAR_SLOTS }, (_, i) => {
    const s = Array.isArray(raw.slots) ? raw.slots[i] ?? {} : {}
    const alts = (Array.isArray(s.alts) ? s.alts : []).slice(0, MAX_ALT_HOUSES).map(parseAltHouse)
    return {
      name: str(s.name, 40),
      kind: s.kind === 'attack' ? ('attack' as const) : ('defense' as const),
      ...parseHouse(s),
      ...(alts.length ? { alts } : {}),
    }
  })
  // แผนบุก / แผนกัน: ทุกไม้เป็นแบบเดียวกัน (แผนเก่าไม่มี kind → ดูจากไม้ส่วนใหญ่)
  const kind: 'attack' | 'defense' = raw.kind === 'defense' || raw.kind === 'attack'
    ? raw.kind
    : slots.filter((s) => s.kind === 'defense').length > slots.filter((s) => s.kind === 'attack').length ? 'defense' : 'attack'
  for (const s of slots) {
    s.kind = kind
    if (kind === 'defense') delete s.alts // หลายบ้านมีเฉพาะไม้
  }
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
const CREATE_PER_HOUR = 5
const LOCK_MS = 15 * 60 * 1000

/**
 * สิทธิ์แก้ไขกิลด์: รหัสแก้ไข (เจ้าของ/คนที่ได้ลิงก์) หรือ ล็อกอิน Discord + มียศที่กิลด์ตั้งให้แก้ได้
 * ownerOnly = ต้องใช้รหัสแก้ไขเท่านั้น (ตั้งรหัสใหม่ · ลบกิลด์ · ตั้งค่า Discord) — คนที่ได้สิทธิ์จากยศทำไม่ได้
 * กันเดารหัส: จองสิทธิ์ลอง (นับ +1) ก่อนเทียบรหัสในคำสั่งเดียว → ยิงพร้อมกันหลายครั้งก็ลองได้ไม่เกิน MAX_FAILS · ถูก = คืนสิทธิ์ลองนั้น
 */
async function checkAuth(c: any, guildId: string, ownerOnly = false): Promise<'key' | 'role' | 'notfound' | 'forbidden' | 'locked'> {
  // client ส่งแบบ encodeURIComponent (header ใส่ภาษาไทยตรง ๆ ไม่ได้) — คีย์สุ่มแบบเดิมไม่เปลี่ยนค่า
  const raw = c.req.header('X-Edit-Key') || ''
  let key = raw
  try { key = decodeURIComponent(raw) } catch { /* คีย์เก่าที่ไม่ได้ encode */ }
  const row = await c.env.DB.prepare(
    'SELECT g.edit_hash, s.discord_guild_id, s.discord_edit_roles FROM guilds g LEFT JOIN guild_settings s ON s.guild_id = g.id WHERE g.id = ?',
  ).bind(guildId).first()
  if (!row) return 'notfound'
  let locked = false
  if (key) {
    const k = `${guildId}:${ipBucket(c.req.header('CF-Connecting-IP') || 'local')}`
    const now = Date.now()
    const tries = await c.env.DB.prepare(
      'INSERT INTO auth_fails (k, count, since) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET count = CASE WHEN ? - since < ? THEN count + 1 ELSE 1 END, since = CASE WHEN ? - since < ? THEN since ELSE ? END RETURNING count',
    ).bind(k, now, now, LOCK_MS, now, LOCK_MS, now).first()
    if ((tries?.count ?? 0) > MAX_FAILS) locked = true
    else if ((await sha256(key)) === row.edit_hash) {
      await c.env.DB.prepare('UPDATE auth_fails SET count = MAX(count - 1, 0) WHERE k = ?').bind(k).run()
      return 'key'
    }
  }
  if (!ownerOnly) {
    // ล็อกอิน Discord อยู่ + มียศที่กิลด์นี้ตั้งให้แก้ได้ → ผ่าน (เรียก Discord ไม่ได้ = ถือว่าไม่มียศ ไม่ใช่ error ทั้งคำขอ)
    const editRoles: string[] = JSON.parse(row.discord_edit_roles || '[]')
    if (row.discord_guild_id && editRoles.length) {
      try {
        const user = await currentUser(c)
        if (user) {
          const m = await memberOf(c.env, user, row.discord_guild_id)
          if (m.roles.some((r) => editRoles.includes(r))) return 'role'
        }
      } catch { /* Discord ล่ม/เน็ตสะดุด */ }
    }
  }
  return locked ? 'locked' : 'forbidden'
}
/** IPv6: นับรวมทั้ง /64 (คนเดียวเปลี่ยนที่อยู่ในบล็อกตัวเองได้เป็นล้าน) */
function ipBucket(ip: string) {
  if (!ip.includes(':')) return ip
  return ip.split(':').slice(0, 4).join(':') + '::/64'
}
/** แก้ข้อมูลทั่วไป (ทีม/แผน/ประกาศ) — รหัสหรือยศ Discord ก็ได้ */
async function checkKey(c: any, guildId: string): Promise<'ok' | 'notfound' | 'forbidden' | 'locked'> {
  const r = await checkAuth(c, guildId)
  return r === 'key' || r === 'role' ? 'ok' : r
}
/** เรื่องของเจ้าของกิลด์ — ต้องใช้รหัสแก้ไขเท่านั้น */
async function checkOwner(c: any, guildId: string): Promise<'ok' | 'notfound' | 'forbidden' | 'locked'> {
  const r = await checkAuth(c, guildId, true)
  return r === 'key' ? 'ok' : r === 'role' ? 'forbidden' : r
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
  editedAt: r.edited_at ?? 0,
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
  // กันสแปมสร้างกิลด์: สูงสุด CREATE_PER_HOUR กิลด์/ชม. ต่อ IP (ใช้ตาราง auth_fails เก็บตัวนับ)
  // (เครื่อง dev/ทดสอบไม่มี CF-Connecting-IP → ไม่จำกัด)
  const ip = c.req.header('CF-Connecting-IP')
  const rk = `create:${ip}`
  const nowMs = Date.now()
  const rl = ip ? await c.env.DB.prepare('SELECT count, since FROM auth_fails WHERE k = ?').bind(rk).first<{ count: number; since: number }>() : null
  if (rl && nowMs - rl.since < 3600_000 && rl.count >= CREATE_PER_HOUR) return c.json({ error: 'สร้างกิลด์บ่อยเกินไป ลองใหม่ในอีก 1 ชั่วโมง' }, 429)
  // รหัสแก้ไขกิลด์: ผู้สร้างตั้งเองตอนสร้าง (6–64 ตัว) · ไม่ส่งมา = สุ่มให้ (แบบเดิม)
  const password = typeof body.password === 'string' ? body.password.trim() : ''
  if (password && (password.length < 6 || password.length > 64)) return c.json({ error: 'รหัสต้องยาว 6–64 ตัวอักษร' }, 400)
  const id = randomId(8)
  const editKey = password || randomId(20)
  await c.env.DB.prepare('INSERT INTO guilds (id, name, edit_hash, created_at) VALUES (?, ?, ?, ?)')
    .bind(id, name, await sha256(editKey), Date.now())
    .run()
  if (ip) await c.env.DB.prepare(
    'INSERT INTO auth_fails (k, count, since) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET count = CASE WHEN ? - since < 3600000 THEN count + 1 ELSE 1 END, since = CASE WHEN ? - since < 3600000 THEN since ELSE ? END',
  ).bind(rk, nowMs, nowMs, nowMs, nowMs).run()
  return c.json({ id, name, editKey }, 201)
})

// ชื่อปัจจุบันของกิลด์ที่เคยเปิด (เมนูข้าง) — กิลด์ที่ถูกลบจะไม่อยู่ในผลลัพธ์
app.get('/api/guilds/names', async (c) => {
  const ids = (c.req.query('ids') ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20)
  if (!ids.length) return c.json({})
  const { results } = await c.env.DB.prepare(`SELECT id, name FROM guilds WHERE id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all<{ id: string; name: string }>()
  return c.json(Object.fromEntries(results.map((r) => [r.id, r.name])))
})

// ลบกิลด์ทั้งหมด (ถาวร) — ต้องมีสิทธิ์แก้ไข และส่งชื่อกิลด์มายืนยันให้ตรง
app.delete('/api/guild/:id', async (c) => {
  const gid = c.req.param('id')
  const auth = await checkOwner(c, gid)
  if (auth !== 'ok') return deny(c, auth)
  const body = await c.req.json().catch(() => ({}))
  const g = await c.env.DB.prepare('SELECT name FROM guilds WHERE id = ?').bind(gid).first<{ name: string }>()
  if (!g) return c.json({ error: 'not found' }, 404)
  if (String(body.confirmName ?? '').trim() !== g.name.trim()) return c.json({ error: 'ชื่อกิลด์ที่พิมพ์ยืนยันไม่ตรง' }, 400)
  await deleteGuildData(c.env, gid)
  return c.json({ ok: true })
})

/** ลบกิลด์และข้อมูลทั้งหมดของกิลด์ (ใช้ทั้งลบปกติและแอดมิน) */
async function deleteGuildData(env: Env, gid: string) {
  await env.DB.batch(['likes', 'counters', 'targets', 'plans', 'announcements', 'guild_settings'].map((t) =>
    env.DB.prepare(`DELETE FROM ${t} WHERE guild_id = ?`).bind(gid)).concat(
    env.DB.prepare('DELETE FROM guilds WHERE id = ?').bind(gid),
    env.DB.prepare("DELETE FROM auth_fails WHERE k LIKE ? || ':%'").bind(gid), // ตัวนับใส่รหัสผิดของกิลด์นี้
  ))
}

// ข้อมูลทั้งกิลด์ (บ้านศัตรู + ทีมแก้) ในครั้งเดียว
app.get('/api/guild/:id', async (c) => {
  const id = c.req.param('id')
  const guild = await c.env.DB.prepare('SELECT id, name, created_at, rev FROM guilds WHERE id = ?').bind(id).first<any>()
  if (!guild) return c.json({ error: 'ไม่พบกิลด์' }, 404)
  c.header('Cache-Control', 'no-store')
  // เว็บส่งเวอร์ชันที่มีอยู่มา → ยังเท่าเดิม = ไม่ต้องอ่านทั้งกิลด์ (อ่านแค่แถวกิลด์ 1 แถว)
  const rev = guildRev(guild.rev)
  if (c.req.query('rev') === rev) return c.json({ unchanged: true, rev })
  const [t, k, p, a, st, ap, lk] = await c.env.DB.batch([
    c.env.DB.prepare('SELECT * FROM targets WHERE guild_id = ? ORDER BY updated_at DESC').bind(id),
    // ไม่ใส่ ORDER BY: D1 นับแถวที่ใช้เรียงเป็น rows read ด้วย (อ่าน x2) → ไปเรียงใน JS ข้างล่างแทน
    c.env.DB.prepare('SELECT * FROM counters WHERE guild_id = ?').bind(id),
    c.env.DB.prepare('SELECT * FROM plans WHERE guild_id = ? ORDER BY updated_at DESC').bind(id),
    c.env.DB.prepare('SELECT * FROM announcements WHERE guild_id = ? ORDER BY created_at DESC LIMIT 30').bind(id),
    c.env.DB.prepare('SELECT schedule, auto_announce, auto_text_attack, auto_text_defense, season_start, season_end, discord_webhook, discord_mention, discord_guild_id, discord_edit_roles, discord_role_names, boss_webhook, boss_text_start, boss_text_end FROM guild_settings WHERE guild_id = ?').bind(id),
    // ประกาศล่าสุดที่เลือกแผน แยกแผนบุก/แผนกัน (= แผนที่ใช้อยู่ของแต่ละชนิด) — ต้องมีเสมอ แม้จะเก่ากว่า 30 อันล่าสุด
    c.env.DB.prepare(
      `SELECT * FROM (SELECT a.*, ROW_NUMBER() OVER (PARTITION BY COALESCE(json_extract(p.data, '$.kind'), json_extract(p.data, '$.slots[0].kind')) ORDER BY a.created_at DESC) AS rn
       FROM announcements a JOIN plans p ON p.id = a.plan_id WHERE a.guild_id = ?) WHERE rn = 1`,
    ).bind(id),
    c.env.DB.prepare('SELECT counter_id, COUNT(*) AS n FROM likes WHERE guild_id = ? GROUP BY counter_id').bind(id), // จำนวนไลค์ (ไม่บอกว่าใครกด)
  ])
  const announcements = (a.results as any[]).map(toAnnouncement)
  for (const planAnn of ap.results as any[]) {
    if (!announcements.some((x) => x.id === planAnn.id)) announcements.push(toAnnouncement(planAnn))
  }
  announcements.sort((x, y) => y.createdAt - x.createdAt)
  const settings = (st.results as any[])[0]
  const schedule = GAME_SCHEDULE
  const autoAnnounce = settings ? !!settings.auto_announce : true
  const autoText = { attack: settings?.auto_text_attack ?? '', defense: settings?.auto_text_defense ?? '' }
  const season = GAME_SEASON
  const discord = { // ไม่ส่ง webhook URL ออกไป
    connected: !!settings?.discord_webhook, mention: settings?.discord_mention ?? '',
    serverId: settings?.discord_guild_id ?? '', editRoles: JSON.parse(settings?.discord_edit_roles || '[]') as string[],
    roleNames: JSON.parse(settings?.discord_role_names || '[]') as { id: string; name: string }[],
    // ห้องที่ 2 (บอสจุติ) — มีเฉพาะกิลด์ที่เปิดไว้
    ...(id === BOSS_GUILD ? { bossConnected: !!settings?.boss_webhook, bossText: { start: settings?.boss_text_start ?? null, end: settings?.boss_text_end ?? null } } : {}),
  }
  const likeCount = new Map((lk.results as any[]).map((r) => [r.counter_id as string, r.n as number]))
  // ลำดับที่หัวกิลด์เรียงไว้ก่อน (sort) · ยังไม่เคยเรียง/เพิ่มใหม่ = ต่อท้ายตามเวลาที่จด
  const counters = (k.results as any[])
    .sort((x, y) => (x.sort == null ? 1 : 0) - (y.sort == null ? 1 : 0) || (x.sort ?? 0) - (y.sort ?? 0) || x.created_at - y.created_at)
    .map((r) => ({ ...toCounter(r), likes: likeCount.get(r.id) ?? 0 }))
  const targets = (t.results as any[]).map((r) => ({
    ...toTarget(r),
    counters: counters.filter((x) => x.targetId === r.id),
  }))
  return c.json({ rev, guild: { id: guild.id, name: guild.name, createdAt: guild.created_at }, targets, plans: (p.results as any[]).map(toPlan), announcements, schedule, autoAnnounce, autoText, season, discord })
})

// ตรวจว่า key ใช้แก้ไขได้ไหม
app.get('/api/guild/:id/check', async (c) => {
  const r = await checkAuth(c, c.req.param('id'))
  // owner = ใช้รหัสแก้ไข (เห็นปุ่มตั้งรหัส/ลบกิลด์/ตั้งค่า Discord) · สิทธิ์จากยศ Discord แก้ได้แต่ไม่ใช่เจ้าของ
  return c.json({ canEdit: r === 'key' || r === 'role', owner: r === 'key', locked: r === 'locked' })
})

// ตั้งรหัสแก้ไขใหม่ (ต้องมีรหัสเดิม) → รหัส/ลิงก์แก้ไขเดิมใช้ไม่ได้อีก
app.put('/api/guild/:id/password', async (c) => {
  const gid = c.req.param('id')
  const auth = await checkOwner(c, gid)
  if (auth !== 'ok') return deny(c, auth)
  const body = await c.req.json().catch(() => ({}))
  const password = typeof body.password === 'string' ? body.password.trim() : ''
  if (password.length < 6 || password.length > 64) return c.json({ error: 'รหัสต้องยาว 6–64 ตัวอักษร' }, 400)
  await c.env.DB.prepare('UPDATE guilds SET edit_hash = ? WHERE id = ?').bind(await sha256(password), gid).run()
  return c.json({ ok: true })
})

// เปลี่ยนชื่อกิลด์ (เจ้าของเท่านั้น) · ห้ามซ้ำกับกิลด์อื่นแบบเดียวกับตอนสร้าง
app.put('/api/guild/:id/name', async (c) => {
  const gid = c.req.param('id')
  const auth = await checkOwner(c, gid)
  if (auth !== 'ok') return deny(c, auth)
  const body = await c.req.json().catch(() => ({}))
  const name = str(body.name, 50).trim()
  if (!name) return c.json({ error: 'กรุณาใส่ชื่อกิลด์' }, 400)
  const taken = await c.env.DB.prepare('SELECT 1 FROM guilds WHERE lower(trim(name)) = lower(?) AND id <> ? LIMIT 1').bind(name, gid).first()
  if (taken) return c.json({ error: `มีกิลด์ชื่อ "${name}" อยู่แล้ว ลองใช้ชื่ออื่น` }, 409)
  const r = await c.env.DB.prepare('UPDATE guilds SET name = ? WHERE id = ?').bind(name, gid).run()
  if (!r.meta.changes) return c.json({ error: 'not found' }, 404)
  return c.json({ ok: true, name })
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
  if ((count ?? 0) >= MAX_TARGETS) return c.json({ error: 'จำนวนบ้านศัตรูเต็มแล้ว' }, 400)
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
  // กันแก้ทับกัน: baseEditedAt = edited_at ตอนเริ่มแก้ → ระหว่างนั้นมีคนบันทึกไปก่อน = 409 (ไม่ส่งมา = ไม่เช็ก แบบเดิม)
  const base = Number.isFinite(body.baseEditedAt) ? Number(body.baseEditedAt) : null
  const res = await c.env.DB.prepare(`UPDATE targets SET team = ?, tags = ?, note = ?, updated_at = ?, edited_at = ? WHERE id = ? AND guild_id = ?${base !== null ? ' AND edited_at = ?' : ''}`)
    .bind(JSON.stringify(team), JSON.stringify(parseTags(body.tags)), str(body.note, 500), now, now, c.req.param('tid'), gid, ...(base !== null ? [base] : []))
    .run()
  if (!res.meta.changes) {
    if (base !== null && (await c.env.DB.prepare('SELECT 1 FROM targets WHERE id = ? AND guild_id = ?').bind(c.req.param('tid'), gid).first()))
      return c.json({ error: CONFLICT_MSG }, 409)
    return c.json({ error: 'ไม่พบทีม' }, 404)
  }
  return c.json({ ok: true, editedAt: now })
})

app.delete('/api/guild/:id/targets/:tid', async (c) => {
  const gid = c.req.param('id')
  const auth = await checkKey(c, gid)
  if (auth !== 'ok') return deny(c, auth)
  const tid = c.req.param('tid')
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM likes WHERE guild_id = ? AND counter_id IN (SELECT id FROM counters WHERE target_id = ?)').bind(gid, tid),
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
  if (!target) return c.json({ error: 'ไม่พบบ้านศัตรู' }, 404)
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

// เรียงลำดับทีมแก้ของบ้านศัตรู 1 บ้าน: ids = id ทีมแก้ทั้งหมดของบ้านนั้นตามลำดับใหม่ (#1 ก่อน)
app.put('/api/guild/:id/targets/:tid/counters/order', async (c) => {
  const gid = c.req.param('id')
  const tid = c.req.param('tid')
  const auth = await checkKey(c, gid)
  if (auth !== 'ok') return deny(c, auth)
  const body = await c.req.json().catch(() => ({}))
  const ids = Array.isArray(body.ids) ? body.ids.filter((x: unknown): x is string => typeof x === 'string') : []
  const { results } = await c.env.DB.prepare('SELECT id FROM counters WHERE target_id = ? AND guild_id = ?').bind(tid, gid).all<{ id: string }>()
  const have = new Set(results.map((r) => r.id))
  // ต้องครบทุกตัวและไม่ซ้ำ (กันข้อมูลเก่าในเครื่องที่ยังไม่เห็นทีมแก้ที่คนอื่นเพิ่ม/ลบ)
  if (ids.length !== have.size || new Set(ids).size !== ids.length || ids.some((x: string) => !have.has(x)))
    return c.json({ error: 'รายการทีมแก้ไม่ตรงกับข้อมูลล่าสุด ลองรีเฟรชหน้าแล้วเรียงใหม่' }, 409)
  if (ids.length) await c.env.DB.batch(ids.map((x: string, i: number) =>
    c.env.DB.prepare('UPDATE counters SET sort = ? WHERE id = ? AND target_id = ? AND guild_id = ?').bind(i, x, tid, gid)))
  return c.json({ ok: true })
})

app.put('/api/guild/:id/counters/:cid', async (c) => {
  const gid = c.req.param('id')
  const auth = await checkKey(c, gid)
  if (auth !== 'ok') return deny(c, auth)
  const body = await c.req.json().catch(() => ({}))
  const team = parseTeam(body.team)
  if (!team) return c.json({ error: 'ข้อมูลทีมไม่ถูกต้อง' }, 400)
  // กันแก้ทับกัน: baseUpdatedAt = updated_at ของทีมแก้ตอนเริ่มแก้ (ไม่ส่งมา = ไม่เช็ก แบบเดิม)
  const base = Number.isFinite(body.baseUpdatedAt) ? Number(body.baseUpdatedAt) : null
  const now = Date.now()
  const guard = base !== null ? ' AND updated_at = ?' : ''
  const tail = [c.req.param('cid'), gid, ...(base !== null ? [base] : [])]
  // heroNotes ไม่ได้ส่งมา = ไม่แตะของเดิม
  const res = Array.isArray(body.heroNotes)
    ? await c.env.DB.prepare(`UPDATE counters SET team = ?, skills = ?, note = ?, hero_notes = ?, updated_at = ? WHERE id = ? AND guild_id = ?${guard}`)
        .bind(JSON.stringify(team), JSON.stringify(parseSkills(body.skills, team)), str(body.note, 500), JSON.stringify(parseHeroNotes(body.heroNotes)), now, ...tail)
        .run()
    : await c.env.DB.prepare(`UPDATE counters SET team = ?, skills = ?, note = ?, updated_at = ? WHERE id = ? AND guild_id = ?${guard}`)
        .bind(JSON.stringify(team), JSON.stringify(parseSkills(body.skills, team)), str(body.note, 500), now, ...tail)
        .run()
  if (!res.meta.changes) {
    if (base !== null && (await c.env.DB.prepare('SELECT 1 FROM counters WHERE id = ? AND guild_id = ?').bind(c.req.param('cid'), gid).first()))
      return c.json({ error: CONFLICT_MSG }, 409)
    return c.json({ error: 'ไม่พบทีม' }, 404)
  }
  await touchTargetOf(c.env, c.req.param('cid'), gid)
  return c.json({ ok: true, updatedAt: now })
})

/** แก้/ลบทีมแก้ = บ้านศัตรูนั้นมีการแก้ → ขึ้นบนสุดในหน้ากิลด์ (เรียงตาม targets.updated_at) */
const touchTargetOf = (env: Env, cid: string, gid: string) =>
  env.DB.prepare('UPDATE targets SET updated_at = ? WHERE id = (SELECT target_id FROM counters WHERE id = ? AND guild_id = ?)').bind(Date.now(), cid, gid).run()

app.delete('/api/guild/:id/counters/:cid', async (c) => {
  const gid = c.req.param('id')
  const auth = await checkKey(c, gid)
  if (auth !== 'ok') return deny(c, auth)
  await touchTargetOf(c.env, c.req.param('cid'), gid) // ก่อนลบ (ยังหา target_id ได้)
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM likes WHERE counter_id = ? AND guild_id = ?').bind(c.req.param('cid'), gid),
    c.env.DB.prepare('DELETE FROM counters WHERE id = ? AND guild_id = ?').bind(c.req.param('cid'), gid),
  ])
  return c.json({ ok: true })
})

// ---- war plans ----
app.post('/api/guild/:id/plans', async (c) => {
  const gid = c.req.param('id')
  const auth = await checkKey(c, gid)
  if (auth !== 'ok') return deny(c, auth)
  const body = await c.req.json().catch(() => ({}))
  const data = parsePlan(body.data)
  const title = str(body.title, 60) || 'แผนสงคราม'
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
  // กันแก้ทับกัน: ส่ง baseUpdatedAt (เวลาแก้ล่าสุดตอนเริ่มแก้) มา → ถ้าระหว่างนั้นมีคนบันทึกไปก่อน ตอบ 409
  const base = Number.isFinite(body.baseUpdatedAt) ? Number(body.baseUpdatedAt) : null
  const now = Date.now()
  const res = await c.env.DB.prepare(`UPDATE plans SET title = ?, data = ?, updated_at = ? WHERE id = ? AND guild_id = ?${base !== null ? ' AND updated_at = ?' : ''}`)
    .bind(...[str(body.title, 60) || 'แผนสงคราม', JSON.stringify(data), now, c.req.param('pid'), gid, ...(base !== null ? [base] : [])])
    .run()
  if (!res.meta.changes) {
    if (base !== null && (await c.env.DB.prepare('SELECT 1 FROM plans WHERE id = ? AND guild_id = ?').bind(c.req.param('pid'), gid).first()))
      return c.json({ error: 'มีคนบันทึกแผนนี้ไปก่อนระหว่างที่คุณแก้ — กดยกเลิก แล้วเปิดแก้ใหม่เพื่อดูของล่าสุด (คัดลอกส่วนที่แก้ไว้ก่อน)' }, 409)
    return c.json({ error: 'ไม่พบแผน' }, 404)
  }
  return c.json({ ok: true, updatedAt: now })
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

// ---- pulse: ข้อมูลเล็ก ๆ สำหรับแถบประกาศ (เว็บเรียกทุก 60 วิ — ให้เบาที่สุด) ----
app.get('/api/guild/:id/pulse', async (c) => {
  const gid = c.req.param('id')
  c.header('Cache-Control', 'no-store')
  // เว็บส่งเลขเวอร์ชันที่มีอยู่มา → ยังเท่าเดิม = ประกาศ/แผนไม่เปลี่ยน (ทุกการเขียนขยับ rev) อ่านแค่แถวกิลด์ 1 แถว
  // (เรียกวันละหลายหมื่นครั้ง เดิมยิง 4 query ทุกครั้ง)
  const known = c.req.query('rev')
  if (known) {
    const g = await c.env.DB.prepare('SELECT rev FROM guilds WHERE id = ?').bind(gid).first<{ rev: number }>()
    if (!g) return c.json({ error: 'ไม่พบกิลด์' }, 404)
    if (guildRev(g.rev) === known) return c.json({ unchanged: true, rev: known, schedule: GAME_SCHEDULE, season: GAME_SEASON })
  }
  const [g, latest, withPlan, perKind] = await c.env.DB.batch([
    c.env.DB.prepare('SELECT name, rev FROM guilds WHERE id = ?').bind(gid),
    c.env.DB.prepare('SELECT * FROM announcements WHERE guild_id = ? ORDER BY created_at DESC LIMIT 1').bind(gid),
    c.env.DB.prepare(
      'SELECT a.plan_id, p.title FROM announcements a JOIN plans p ON p.id = a.plan_id WHERE a.guild_id = ? ORDER BY a.created_at DESC LIMIT 1',
    ).bind(gid),
    // แผนที่ใช้อยู่แยกแผนบุก/แผนกัน (แถบประกาศเลือกโชว์ตามชนิดของวันนั้น)
    c.env.DB.prepare(
      `SELECT plan_id, title, k FROM (SELECT a.plan_id, p.title, COALESCE(json_extract(p.data, '$.kind'), json_extract(p.data, '$.slots[0].kind')) AS k,
         ROW_NUMBER() OVER (PARTITION BY COALESCE(json_extract(p.data, '$.kind'), json_extract(p.data, '$.slots[0].kind')) ORDER BY a.created_at DESC) AS rn
       FROM announcements a JOIN plans p ON p.id = a.plan_id WHERE a.guild_id = ?) WHERE rn = 1`,
    ).bind(gid),
  ])
  const guild = (g.results as any[])[0]
  if (!guild) return c.json({ error: 'ไม่พบกิลด์' }, 404)
  const a = (latest.results as any[])[0]
  const p = (withPlan.results as any[])[0]
  return c.json({
    guildName: guild.name,
    rev: guildRev(guild.rev),
    latest: a ? toAnnouncement(a) : null,
    activePlan: p ? { id: p.plan_id, title: p.title } : null,
    activePlans: Object.fromEntries((perKind.results as any[]).filter((r) => r.k === 'attack' || r.k === 'defense').map((r) => [r.k, { id: r.plan_id, title: r.title }])),
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
      `DELETE FROM announcements WHERE guild_id = ? AND id NOT IN (SELECT id FROM announcements WHERE guild_id = ? ORDER BY created_at DESC LIMIT ?)
         AND id NOT IN (${KEEP_ACTIVE_PLAN_ANNOUNCEMENTS})`,
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
  const auth = await checkOwner(c, gid)
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
  // ห้องที่ 2 บอสจุติ: undefined = ไม่เปลี่ยน, '' = ยกเลิก · รับเฉพาะกิลด์ที่เปิดไว้
  const bossWebhook = gid === BOSS_GUILD && typeof body.bossWebhook === 'string' ? body.bossWebhook.trim() : undefined
  if (bossWebhook && !WEBHOOK_RE.test(bossWebhook) && !c.env.DISCORD_ALLOW_ANY) return c.json({ error: 'ลิงก์ Webhook ห้องบอสจุติไม่ถูกต้อง (ต้องเป็น https://discord.com/api/webhooks/...)' }, 400)
  if (bossWebhook !== undefined) sets.push('boss_webhook = excluded.boss_webhook')
  // ข้อความบอสจุติ: undefined = ไม่เปลี่ยน, null = กลับเป็นค่าเริ่มต้น, '' = ไม่ส่ง
  const bossText = (k: 'start' | 'end') => {
    const v = gid === BOSS_GUILD && body.bossText && typeof body.bossText === 'object' ? body.bossText[k] : undefined
    return v === null ? null : typeof v === 'string' ? v.trim().slice(0, MAX_BOSS_TEXT) : undefined
  }
  const bossStart = bossText('start')
  const bossEnd = bossText('end')
  if (bossStart !== undefined) sets.push('boss_text_start = excluded.boss_text_start')
  if (bossEnd !== undefined) sets.push('boss_text_end = excluded.boss_text_end')
  await c.env.DB.prepare(
    `INSERT INTO guild_settings (guild_id, schedule, discord_webhook, discord_mention, discord_guild_id, discord_edit_roles, discord_role_names, boss_webhook, boss_text_start, boss_text_end) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(guild_id) DO UPDATE SET ${sets.join(', ')}`,
  ).bind(gid, JSON.stringify(GAME_SCHEDULE), webhook ?? '', mention, serverId ?? '', JSON.stringify(editRoles ?? []), JSON.stringify(roleNames ?? []), bossWebhook ?? '', bossStart ?? null, bossEnd ?? null).run()
  const row = await c.env.DB.prepare('SELECT discord_webhook, discord_mention, discord_guild_id, discord_edit_roles, discord_role_names, boss_webhook, boss_text_start, boss_text_end FROM guild_settings WHERE guild_id = ?').bind(gid).first<any>()
  return c.json({
    connected: !!row?.discord_webhook, mention: row?.discord_mention ?? '', serverId: row?.discord_guild_id ?? '',
    editRoles: JSON.parse(row?.discord_edit_roles || '[]'), roleNames: JSON.parse(row?.discord_role_names || '[]'),
    ...(gid === BOSS_GUILD ? { bossConnected: !!row?.boss_webhook, bossText: { start: row?.boss_text_start ?? null, end: row?.boss_text_end ?? null } } : {}),
  })
})

app.post('/api/guild/:id/discord/test', async (c) => {
  const gid = c.req.param('id')
  const auth = await checkKey(c, gid)
  if (auth !== 'ok') return deny(c, auth)
  const body = await c.req.json().catch(() => ({}))
  const r = body?.boss
    ? await postBoss(c.env, gid, 'ทดสอบห้องแจ้งเตือนบอสจุติจาก 7K Note ✅', true)
    : await notifyDiscord(c.env, gid, { body: 'ทดสอบการเชื่อมต่อจาก 7K Note ✅', planId: null, opponent: '' }, true)
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
  return postDiscord(env, gid, row, a, test)
}

// กิลด์ที่มี webhook ที่ 2 (ตั้ง URL ด้วย: npx wrangler secret put EXTRA_WEBHOOK) — ThousandSunny
const EXTRA_WEBHOOK_GUILD = 'iWMpFr9g'
// กิลด์ที่มีห้องแจ้งเตือนบอสจุติ (ตั้งในหน้า "เชื่อม Discord") — ThousandSunny
const BOSS_GUILD = 'iWMpFr9g'

/** ยศที่แท็กตอนประกาศ ('everyone' | 'here' | Role ID | '') → ข้อความแท็ก */
const mentionTag = (m: string) => (m === 'everyone' ? '@everyone' : m === 'here' ? '@here' : m ? `<@&${m}>` : '')
/** กันชื่อ/ชื่อแผนที่มี * _ [ ] ฯลฯ ไปเป็นตัวหนา/ลิงก์ใน Discord */
const mdEscape = (s: string) => s.replace(/[\\*_~`|[\]<>]/g, '\\$&')
/**
 * payload webhook แบบข้อความธรรมดา (ไม่ใช่ embed) — แจ้งเตือนมือถือโชว์แค่ content เลยต้องมี @ยศ + ตัวประกาศในบรรทัดแรก
 * แท็กได้เฉพาะยศที่ตั้งไว้: @everyone/@here ที่พิมพ์มาในข้อความไม่แท็ก · ไม่มีกล่องตัวอย่างลิงก์ (flags 4 = SUPPRESS_EMBEDS)
 */
function discordPayload(env: Env, mention: string, text: string) {
  const site = (env.SITE_URL || '').replace(/\/$/, '')
  const tag = mentionTag(mention)
  const safe = text.replace(/@(everyone|here)/g, '@\u200b$1')
  return JSON.stringify({
    username: '7K Note',
    avatar_url: site ? `${site}/logo-1024.png` : undefined, // โลโก้เว็บแทนรูป Discord เริ่มต้น
    content: (tag ? `${tag} ${safe}` : safe).slice(0, 2000),
    allowed_mentions: mention === 'everyone' || mention === 'here' ? { parse: ['everyone'] } : { parse: [], roles: mention ? [mention] : [] },
    flags: 4,
  })
}

/** ส่งแจ้งเตือนบอสจุติเข้าห้องที่ 2 → 'none' | 'ok' | HTTP status */
async function postBoss(env: Env, gid: string, text: string, test = false) {
  const row = await env.DB.prepare('SELECT boss_webhook AS url, discord_mention AS mention FROM guild_settings WHERE guild_id = ?').bind(gid).first<any>()
  if (gid !== BOSS_GUILD || !row?.url) return 'none'
  const content = [
    `👹 ${text}`,
    !test && `-# บอสจุติ · รอบละ ${BOSS_REVIVAL.days} วัน · แจ้งเตือนอัตโนมัติ 07:00`,
  ].filter(Boolean).join('\n')
  const res = await fetch(row.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: discordPayload(env, test ? '' : row.mention, content) })
  return res.ok ? 'ok' : String(res.status)
}

/** 07:00 ทุกวัน: วันเริ่มรอบ + วันสุดท้ายของรอบ → แจ้งห้องบอสจุติ */
export async function runBossReminder(env: Env, now = Date.now()) {
  const b = bossRevivalDay(gameDayKey(now))
  if (!b || (b.day !== 0 && b.day !== BOSS_REVIVAL.days - 1)) return 'skip'
  const which = b.day === 0 ? 'start' : 'end'
  const row = await env.DB.prepare('SELECT boss_text_start, boss_text_end FROM guild_settings WHERE guild_id = ?').bind(BOSS_GUILD).first<any>()
  const raw: string | null = row?.[`boss_text_${which}`] ?? null
  const text = raw === null ? BOSS_DEFAULT_TEXT[which] : raw
  if (!text) return 'off' // เว้นว่าง = ไม่ส่ง
  return postBoss(env, BOSS_GUILD, fillBoss(text, b))
}

/** ส่งข้อความเข้า webhook (ข้อมูลกิลด์ดึงมาแล้ว — cron ใช้ส่งทีละหลายกิลด์โดยไม่ต้อง query ซ้ำ) */
async function postDiscord(
  env: Env, gid: string, row: { url: string; mention: string; name: string; plan_title?: string | null },
  a: { body: string; planId: string | null; opponent: string; auto?: boolean; author?: { name: string; avatar: string; role?: string } | null }, test = false,
) {
  const site = (env.SITE_URL || '').replace(/\/$/, '')
  const plan = row.plan_title ? (site ? `[${mdEscape(row.plan_title)}](${site}/g/${gid}/p/${a.planId})` : mdEscape(row.plan_title)) : ''
  const meta = [plan && `แผนที่ใช้: ${plan}`, a.opponent && `เจอกิลด์: ${mdEscape(a.opponent)}`].filter(Boolean).join(' · ')
  const by = a.author && mdEscape(a.author.role ? `${a.author.name} · ${a.author.role}` : a.author.name)
  const foot = [by && `ประกาศโดย ${by}`, a.auto && 'ประกาศอัตโนมัติ 07:00', site ? `[${mdEscape(row.name)} · 7K Note](${site}/g/${gid})` : mdEscape(row.name)].filter(Boolean).join(' · ')
  const content = [
    `📢 ${a.body || meta}`, // ไม่มีข้อความ (ประกาศแค่แผน) → แผน/กิลด์ที่เจอขึ้นบรรทัดแรกแทน
    a.body && meta && `📋 ${meta}`,
    `-# ${foot}`,
  ].filter(Boolean).join('\n')
  const body = discordPayload(env, test ? '' : row.mention, content)
  const send = (url: string) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
  // webhook ที่ 2 (เฉพาะกิลด์ที่กำหนด) — ส่งข้อความเดียวกัน ถ้าพังไม่กระทบอันหลัก
  const extra = gid === EXTRA_WEBHOOK_GUILD && env.EXTRA_WEBHOOK && (WEBHOOK_RE.test(env.EXTRA_WEBHOOK) || env.DISCORD_ALLOW_ANY) ? env.EXTRA_WEBHOOK : ''
  const [res] = await Promise.all([
    send(row.url),
    extra && send(extra).then((r) => { if (!r.ok) console.error('discord extra', gid, r.status) }, (e) => console.error('discord extra', gid, e)),
  ])
  return res.ok ? 'ok' : String(res.status)
}

app.delete('/api/guild/:id/announcements/:aid', async (c) => {
  const gid = c.req.param('id')
  const auth = await checkKey(c, gid)
  if (auth !== 'ok') return deny(c, auth)
  await c.env.DB.prepare('DELETE FROM announcements WHERE id = ? AND guild_id = ?').bind(c.req.param('aid'), gid).run()
  return c.json({ ok: true })
})

// ---- ตารางสงคราม ----
app.put('/api/guild/:id/schedule', async (c) => {
  const gid = c.req.param('id')
  const auth = await checkKey(c, gid)
  if (auth !== 'ok') return deny(c, auth)
  const body = await c.req.json().catch(() => ({}))
  // ตาราง/Season เป็นของเกม (เหมือนทุกกิลด์) — แต่ละกิลด์ตั้งได้แค่เปิด/ปิดประกาศอัตโนมัติ + ข้อความวันตี/วันจัดบ้าน
  const autoAnnounce = body.autoAnnounce !== false
  const text = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, MAX_AUTO_TEXT) : '')
  const autoText = { attack: text(body.autoText?.attack), defense: text(body.autoText?.defense) }
  if (body.autoText && typeof body.autoText === 'object') {
    await c.env.DB.prepare(
      `INSERT INTO guild_settings (guild_id, schedule, auto_announce, auto_text_attack, auto_text_defense) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET auto_announce = excluded.auto_announce,
         auto_text_attack = excluded.auto_text_attack, auto_text_defense = excluded.auto_text_defense`,
    ).bind(gid, JSON.stringify(GAME_SCHEDULE), autoAnnounce ? 1 : 0, autoText.attack, autoText.defense).run()
  } else {
    // เว็บรุ่นเก่า (ไม่ส่งข้อความมา) — เปลี่ยนแค่เปิด/ปิด ไม่ลบข้อความที่ตั้งไว้
    await c.env.DB.prepare(
      `INSERT INTO guild_settings (guild_id, schedule, auto_announce) VALUES (?, ?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET auto_announce = excluded.auto_announce`,
    ).bind(gid, JSON.stringify(GAME_SCHEDULE), autoAnnounce ? 1 : 0).run()
  }
  return c.json({ schedule: GAME_SCHEDULE, autoAnnounce, autoText, season: GAME_SEASON })
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
  if (!c.env.DISCORD_CLIENT_ID || !c.env.DISCORD_CLIENT_SECRET) return c.text('ยังไม่ได้ตั้งค่า Discord login / Discord login is not set up', 503)
  const ret = safeReturn(c.env, c.req.query('return'))
  if (!ret) return c.text('return URL ไม่ถูกต้อง / Invalid return URL', 400)
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
  if (!st || Date.now() - st.created_at > 10 * 60 * 1000) return c.text('ลิงก์ล็อกอินหมดอายุ ลองกดเข้าสู่ระบบใหม่ / The login link expired — please log in again', 400)
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

// ---------- ไลค์ทีมแก้ (ทีมที่ชอบ) — ต้องล็อกอิน Discord · เก็บกับ Discord user ข้ามกิลด์/ข้ามเครื่อง ----------
const MAX_LIKES_PER_USER = 500

/** กด/ยกเลิกไลค์ทีมแก้ → { liked, count } */
app.post('/api/guild/:id/counters/:cid/like', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'เข้าสู่ระบบด้วย Discord ก่อนกดถูกใจ' }, 401)
  const gid = c.req.param('id')
  const cid = c.req.param('cid')
  const counter = await c.env.DB.prepare('SELECT id FROM counters WHERE id = ? AND guild_id = ?').bind(cid, gid).first()
  if (!counter) return c.json({ error: 'ไม่พบทีมแก้' }, 404)
  const had = await c.env.DB.prepare('SELECT 1 FROM likes WHERE user_id = ? AND counter_id = ?').bind(user.id, cid).first()
  if (had) {
    await c.env.DB.prepare('DELETE FROM likes WHERE user_id = ? AND counter_id = ?').bind(user.id, cid).run()
  } else {
    const n = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM likes WHERE user_id = ?').bind(user.id).first<any>()
    if ((n?.n ?? 0) >= MAX_LIKES_PER_USER) return c.json({ error: `กดถูกใจได้ไม่เกิน ${MAX_LIKES_PER_USER} ทีม` }, 400)
    await c.env.DB.prepare('INSERT OR IGNORE INTO likes (user_id, counter_id, guild_id, created_at) VALUES (?, ?, ?, ?)').bind(user.id, cid, gid, Date.now()).run()
  }
  const cnt = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM likes WHERE counter_id = ?').bind(cid).first<any>()
  return c.json({ liked: !had, count: cnt?.n ?? 0 })
})

/** ทีมที่ฉันชอบ (ทุกกิลด์) — ใหม่สุดก่อน */
app.get('/api/me/likes', async (c) => {
  c.header('Cache-Control', 'no-store')
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'เข้าสู่ระบบด้วย Discord ก่อน' }, 401)
  const { results } = await c.env.DB.prepare(
    `SELECT l.counter_id, l.guild_id, l.created_at AS liked_at, g.name AS guild_name,
            k.team, k.skills, k.note, k.target_id, t.team AS target_team, t.tags AS target_tags,
            (SELECT COUNT(*) FROM likes x WHERE x.counter_id = l.counter_id) AS likes
     FROM likes l JOIN counters k ON k.id = l.counter_id JOIN targets t ON t.id = k.target_id JOIN guilds g ON g.id = l.guild_id
     WHERE l.user_id = ? ORDER BY l.created_at DESC LIMIT ?`,
  ).bind(user.id, MAX_LIKES_PER_USER).all<any>()
  return c.json({
    likes: results.map((r) => ({
      counterId: r.counter_id, guildId: r.guild_id, guildName: r.guild_name, targetId: r.target_id, likedAt: r.liked_at, likes: r.likes,
      team: JSON.parse(r.team), skills: JSON.parse(r.skills || '[]'), note: r.note,
      targetTeam: JSON.parse(r.target_team), targetTags: JSON.parse(r.target_tags || '[]'),
    })),
  })
})

// ---------- พรีเซตทีมแก้ส่วนตัว (ล็อกอิน Discord) ----------
const MAX_PRESETS = 50
function parsePreset(body: any) {
  const team = parseTeam(body?.team)
  if (!team) return null
  return { team, skills: parseSkills(body.skills, team), note: str(body.note, 500), heroNotes: parseHeroNotes(body.heroNotes) }
}
const toPreset = (r: any) => ({ id: r.id, name: r.name, ...JSON.parse(r.data), createdAt: r.created_at, updatedAt: r.updated_at })

app.get('/api/me/presets', async (c) => {
  c.header('Cache-Control', 'no-store')
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'เข้าสู่ระบบด้วย Discord ก่อน' }, 401)
  const { results } = await c.env.DB.prepare('SELECT * FROM presets WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?').bind(user.id, MAX_PRESETS).all<any>()
  return c.json({ presets: results.map(toPreset) })
})

app.post('/api/me/presets', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'เข้าสู่ระบบด้วย Discord ก่อน' }, 401)
  const body = await c.req.json().catch(() => ({}))
  const data = parsePreset(body)
  if (!data) return c.json({ error: 'ข้อมูลทีมไม่ถูกต้อง' }, 400)
  const name = str(body.name, 40) || 'พรีเซต'
  const n = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM presets WHERE user_id = ?').bind(user.id).first<any>()
  if ((n?.n ?? 0) >= MAX_PRESETS) return c.json({ error: `มีพรีเซตได้ไม่เกิน ${MAX_PRESETS} ชุด ลบอันเก่าก่อน` }, 400)
  const now = Date.now()
  const row = { id: randomId(10), user_id: user.id, name, data: JSON.stringify(data), created_at: now, updated_at: now }
  await c.env.DB.prepare('INSERT INTO presets (id, user_id, name, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(row.id, row.user_id, row.name, row.data, now, now).run()
  return c.json(toPreset(row), 201)
})

/** เปลี่ยนชื่อ (และ/หรือทีม) — เฉพาะของตัวเอง */
app.put('/api/me/presets/:pid', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'เข้าสู่ระบบด้วย Discord ก่อน' }, 401)
  const body = await c.req.json().catch(() => ({}))
  const name = str(body.name, 40)
  const data = body.team ? parsePreset(body) : null
  if (body.team && !data) return c.json({ error: 'ข้อมูลทีมไม่ถูกต้อง' }, 400)
  const res = await c.env.DB.prepare(
    `UPDATE presets SET name = CASE WHEN ? <> '' THEN ? ELSE name END, data = COALESCE(?, data), updated_at = ? WHERE id = ? AND user_id = ?`,
  ).bind(name, name, data ? JSON.stringify(data) : null, Date.now(), c.req.param('pid'), user.id).run()
  if (!res.meta.changes) return c.json({ error: 'ไม่พบพรีเซต' }, 404)
  return c.json({ ok: true })
})

app.delete('/api/me/presets/:pid', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'เข้าสู่ระบบด้วย Discord ก่อน' }, 401)
  await c.env.DB.prepare('DELETE FROM presets WHERE id = ? AND user_id = ?').bind(c.req.param('pid'), user.id).run()
  return c.json({ ok: true })
})

// ---------- หน้าแอดมิน: ภาพรวมการใช้งานทุกกิลด์ (ล็อกอิน Discord + อยู่ใน ADMIN_DISCORD_IDS) ----------
// ส่งแค่ตัวเลข/วันที่ — ไม่ส่ง webhook URL, edit key หรือเนื้อหาในกิลด์
/** แอดมินลบกิลด์ (ไม่ต้องใช้รหัสของกิลด์ แต่ต้องพิมพ์ชื่อกิลด์ยืนยันเหมือนลบปกติ) */
app.delete('/api/admin/guilds/:id', async (c) => {
  const user = await currentUser(c)
  const admins = (c.env.ADMIN_DISCORD_IDS || '').split(',').map((x) => x.trim()).filter(Boolean)
  if (!user || !admins.includes(user.id)) return c.json({ error: 'not found' }, 404)
  const gid = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const g = await c.env.DB.prepare('SELECT name FROM guilds WHERE id = ?').bind(gid).first<{ name: string }>()
  if (!g) return c.json({ error: 'ไม่พบกิลด์' }, 404)
  if (String(body.confirmName ?? '').trim() !== g.name.trim()) return c.json({ error: 'ชื่อกิลด์ที่พิมพ์ยืนยันไม่ตรง' }, 400)
  await deleteGuildData(c.env, gid)
  return c.json({ ok: true })
})

app.get('/api/admin/stats', async (c) => {
  c.header('Cache-Control', 'no-store')
  const user = await currentUser(c)
  const admins = (c.env.ADMIN_DISCORD_IDS || '').split(',').map((x) => x.trim()).filter(Boolean)
  // ไม่ใช่แอดมิน (หรือยังไม่ล็อกอิน) → ตอบเหมือนไม่มี endpoint นี้ ไม่บอกว่ามีหน้าแอดมิน
  if (!user || !admins.includes(user.id)) return c.json({ error: 'not found' }, 404)
  const now = Date.now()
  const [guilds, users] = await c.env.DB.batch([
    c.env.DB.prepare(`
      WITH t AS (SELECT guild_id, COUNT(*) n, MAX(updated_at) last FROM targets GROUP BY guild_id),
           k AS (SELECT guild_id, COUNT(*) n, MAX(updated_at) last FROM counters GROUP BY guild_id),
           p AS (SELECT guild_id, COUNT(*) n, MAX(updated_at) last FROM plans GROUP BY guild_id),
           a AS (SELECT guild_id, SUM(auto = 0) manual, SUM(auto = 1) auto, MAX(CASE WHEN auto = 0 THEN created_at END) last FROM announcements GROUP BY guild_id)
      SELECT g.id, g.name, g.created_at AS createdAt,
        COALESCE(t.n, 0) AS targets, COALESCE(k.n, 0) AS counters, COALESCE(p.n, 0) AS plans,
        COALESCE(a.manual, 0) AS announcements, COALESCE(a.auto, 0) AS autoAnnouncements,
        COALESCE(s.discord_webhook, '') <> '' AS webhook, COALESCE(s.discord_guild_id, '') <> '' AS discordLogin,
        MAX(g.created_at, COALESCE(t.last, 0), COALESCE(k.last, 0), COALESCE(p.last, 0), COALESCE(a.last, 0)) AS lastActive
      FROM guilds g
      LEFT JOIN t ON t.guild_id = g.id LEFT JOIN k ON k.guild_id = g.id LEFT JOIN p ON p.guild_id = g.id
      LEFT JOIN a ON a.guild_id = g.id LEFT JOIN guild_settings s ON s.guild_id = g.id
      ORDER BY lastActive DESC`),
    c.env.DB.prepare('SELECT COUNT(DISTINCT user_id) AS n FROM sessions WHERE expires_at > ?').bind(now),
  ])
  return c.json({ now, guilds: guilds.results, discordUsers: (users.results[0] as any)?.n ?? 0 })
})

// ---------- แพ็คในเกม (หน้าเช็กความคุ้มค่าแพ็ค) — ทุกคนอ่านได้ · แอดมินเพิ่ม/แก้/ลบ ----------
type PackRow = { id: string; name: string; group_name: string; price: number; gems: number; items: string; limit_count: number; limit_period: string; ends_at: number | null; is_base: number; sort: number; updated_at: number }
const PACK_PERIODS = ['once', 'daily', 'weekly', 'monthly']
const packOut = (r: PackRow) => {
  let items: any = {}
  try { items = JSON.parse(r.items) } catch { /* ข้อมูลเสีย = ว่าง */ }
  return { id: r.id, name: r.name, group: r.group_name, price: r.price, gems: r.gems, items, limit: r.limit_count, period: r.limit_period, endsAt: r.ends_at, base: !!r.is_base, sort: r.sort, updatedAt: r.updated_at }
}
const isAdmin = async (c: any) => {
  const user = await currentUser(c)
  const admins = (c.env.ADMIN_DISCORD_IDS || '').split(',').map((x: string) => x.trim()).filter(Boolean)
  return !!user && admins.includes(user.id)
}
const nonNeg = (v: unknown, max = 1e7) => { const n = Math.floor(Number(v) || 0); return Math.min(max, Math.max(0, n)) }
/** ตรวจ/ทำความสะอาดข้อมูลแพ็คจากหน้าแอดมิน · คืน string = ข้อความ error */
function cleanPack(b: any): Omit<PackRow, 'id' | 'updated_at'> | string {
  const name = str(b?.name, 80)
  if (!name) return 'ใส่ชื่อแพ็ค'
  const price = Math.round(Number(b?.price) * 100) / 100
  if (!(price > 0) || price > 100000) return 'ราคาไม่ถูกต้อง'
  const it = b?.items ?? {}
  // ของในแพ็ค = รายการ { k ชนิด (shared/packs.ts), n จำนวน, b = ของแถม, s = ตัวเลือกของช่อง Select (เลือกได้ 1) }
  const list = (Array.isArray(it.list) ? it.list : []).slice(0, MAX_PACK_ITEMS)
    .map((x: any) => ({ k: String(x?.k ?? ''), n: nonNeg(x?.n, 1e9), ...(x?.b ? { b: 1 } : {}), ...(x?.s ? { s: 1 } : {}) }))
    .filter((x: { k: string; n: number }) => (PACK_ITEM_KEYS as readonly string[]).includes(x.k) && x.n > 0)
  const tab = (PACK_TABS as readonly string[]).includes(it.tab) ? it.tab : undefined
  const items = { list, ...(tab ? { tab } : {}), other: str(it.other, 120) }
  const period = PACK_PERIODS.includes(b?.period) ? b.period : 'once'
  const endsAt = b?.endsAt == null || b.endsAt === '' ? null : Number(b.endsAt)
  if (endsAt !== null && !Number.isFinite(endsAt)) return 'วันหมดอายุไม่ถูกต้อง'
  return { name, group_name: str(b?.group, 80), price, gems: nonNeg(b?.gems), items: JSON.stringify(items), limit_count: Math.max(1, nonNeg(b?.limit, 999)), limit_period: period, ends_at: endsAt, is_base: b?.base ? 1 : 0, sort: nonNeg(b?.sort, 9999) }
}

app.get('/api/packs', async (c) => {
  const now = Date.now()
  const r = await c.env.DB.prepare('SELECT * FROM packs WHERE ends_at IS NULL OR ends_at > ? ORDER BY sort, price').bind(now).all<PackRow>()
  c.header('Cache-Control', 'public, max-age=300')
  return c.json({ packs: r.results.map(packOut) })
})
app.get('/api/admin/packs', async (c) => {
  c.header('Cache-Control', 'no-store')
  if (!(await isAdmin(c))) return c.json({ error: 'not found' }, 404)
  const r = await c.env.DB.prepare('SELECT * FROM packs ORDER BY sort, price').all<PackRow>()
  return c.json({ packs: r.results.map(packOut) })
})
app.post('/api/admin/packs', async (c) => {
  if (!(await isAdmin(c))) return c.json({ error: 'not found' }, 404)
  const p = cleanPack(await c.req.json().catch(() => null))
  if (typeof p === 'string') return c.json({ error: p }, 400)
  const now = Date.now(), id = randomId(10)
  const stmts = [c.env.DB.prepare(`INSERT INTO packs (id, name, group_name, price, gems, items, limit_count, limit_period, ends_at, is_base, sort, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, p.name, p.group_name, p.price, p.gems, p.items, p.limit_count, p.limit_period, p.ends_at, p.is_base, p.sort, now, now)]
  if (p.is_base) stmts.unshift(c.env.DB.prepare('UPDATE packs SET is_base = 0')) // เส้นฐานมีได้แพ็คเดียว
  await c.env.DB.batch(stmts)
  return c.json({ id })
})
app.put('/api/admin/packs/:pid', async (c) => {
  if (!(await isAdmin(c))) return c.json({ error: 'not found' }, 404)
  const p = cleanPack(await c.req.json().catch(() => null))
  if (typeof p === 'string') return c.json({ error: p }, 400)
  const pid = c.req.param('pid')
  const stmts = [c.env.DB.prepare(`UPDATE packs SET name = ?, group_name = ?, price = ?, gems = ?, items = ?, limit_count = ?, limit_period = ?, ends_at = ?, is_base = ?, sort = ?, updated_at = ? WHERE id = ?`)
    .bind(p.name, p.group_name, p.price, p.gems, p.items, p.limit_count, p.limit_period, p.ends_at, p.is_base, p.sort, Date.now(), pid)]
  if (p.is_base) stmts.unshift(c.env.DB.prepare('UPDATE packs SET is_base = 0 WHERE id <> ? AND EXISTS (SELECT 1 FROM packs WHERE id = ?)').bind(pid, pid))
  const res = await c.env.DB.batch(stmts)
  if (!res.at(-1)?.meta.changes) return c.json({ error: 'ไม่พบแพ็ค' }, 404)
  return c.json({ ok: true })
})
app.delete('/api/admin/packs/:pid', async (c) => {
  if (!(await isAdmin(c))) return c.json({ error: 'not found' }, 404)
  await c.env.DB.prepare('DELETE FROM packs WHERE id = ?').bind(c.req.param('pid')).run()
  return c.json({ ok: true })
})

// ---------- ประกาศอัตโนมัติ 07:00 เวลาไทย (Cron Trigger "0 0 * * *" = 00:00 UTC) ----------
// เวลาไทย = UTC+7 ตลอด และวันในเกมเริ่ม 07:00 ไทย = 00:00 UTC → "วันในเกม" ตรงกับวันที่ UTC พอดี
const gameDayIndex = (ts: number) => (new Date(ts).getUTCDay() + 6) % 7 // 0 = จันทร์
const gameDayKey = (ts: number) => new Date(ts).toISOString().slice(0, 10)

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
  return fillDay(defaultAutoText(type), day)
}

// แผนฟรี: 1 รอบ cron เรียก D1 ได้ ≤ 50 ครั้ง และ fetch ภายนอก ≤ 50 ครั้ง → ทำทุกกิลด์ด้วย query รวม (ไม่วนทีละกิลด์)
// แล้วส่ง Discord ได้สูงสุด DISCORD_PER_RUN กิลด์ (เหลือที่ไว้ให้ query D1)
const DISCORD_PER_RUN = 40
// กิลด์ที่ต้องได้ข้อความ Discord ก่อนเสมอ (ถ้ากิลด์ที่ต่อ Discord เกิน DISCORD_PER_RUN) — ThousandSunny
const DISCORD_PRIORITY = ['iWMpFr9g']

export async function runDailyAnnouncements(env: Env, now = Date.now()) {
  const today = gameDayIndex(now)
  const todayKey = gameDayKey(now)
  // เก็บกวาดวันละครั้ง: ตัวนับรหัสผิด/สร้างกิลด์, แคชยศ Discord, session/ล็อกอินที่หมดอายุ (ไม่งั้นโตไปเรื่อย ๆ)
  await env.DB.batch([
    env.DB.prepare('DELETE FROM auth_fails WHERE since < ?').bind(now - 86400_000),
    env.DB.prepare('DELETE FROM member_cache WHERE at < ?').bind(now - 86400_000),
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now),
    env.DB.prepare('DELETE FROM oauth_states WHERE created_at < ?').bind(now - 3600_000),
  ])
  const body = dailyAnnouncement(GAME_SCHEDULE[today] ?? 'rest', DAY_NAMES[today], todayKey, GAME_SEASON.start, GAME_SEASON.end)
  if (!body) return 0 // วันพัก / ช่วงพัก Season: ไม่ประกาศ (ข้อความเหมือนกันทุกกิลด์)
  const dayStart = Date.parse(`${todayKey}T00:00:00Z`)
  // วันตี/วันจัดบ้านปกติ (ไม่ใช่วันเริ่ม/จบ Season) → กิลด์ที่ตั้งข้อความเองใช้ข้อความนั้น ({วัน} = ชื่อวัน)
  const type = GAME_SCHEDULE[today] ?? 'rest'
  const col = (type === 'attack' || type === 'defense') && body === fillDay(defaultAutoText(type), DAY_NAMES[today])
    ? (type === 'attack' ? 's.auto_text_attack' : 's.auto_text_defense') : null
  // แทนได้ทั้ง {วัน} และ {day} (หน้าตั้งค่าภาษาอังกฤษบอกให้พิมพ์ {day} และ preview ก็แทนทั้งคู่ — ต้องตรงกับ fillDay)
  const bodySql = col ? `CASE WHEN COALESCE(${col}, '') <> '' THEN replace(replace(${col}, ?, ?), ?, ?) ELSE ? END` : '?'
  const bodyArgs = col ? [DAY_PLACEHOLDER, DAY_NAMES[today], DAY_PLACEHOLDER_EN, DAY_NAMES[today], body] : [body]
  // 1) ใส่ประกาศให้ทุกกิลด์ที่เปิดไว้ + เคยใช้ประกาศ + วันนี้ยังไม่มีประกาศ (รันซ้ำก็ไม่ซ้ำ) — query เดียว
  const ins = await env.DB.prepare(
    `INSERT INTO announcements (id, guild_id, body, plan_id, opponent, created_at, auto)
     SELECT lower(hex(randomblob(5))), g.id, ${bodySql}, NULL, '', ?, 1
     FROM guilds g LEFT JOIN guild_settings s ON s.guild_id = g.id
     WHERE COALESCE(s.auto_announce, 1) = 1
       AND EXISTS (SELECT 1 FROM announcements a WHERE a.guild_id = g.id)
       AND NOT EXISTS (SELECT 1 FROM announcements a WHERE a.guild_id = g.id AND a.created_at >= ?)`,
  ).bind(...bodyArgs, now, dayStart).run()
  const posted = ins.meta.changes ?? 0
  if (!posted) return 0
  await env.DB.prepare('UPDATE guilds SET rev = rev + 1 WHERE id IN (SELECT guild_id FROM announcements WHERE auto = 1 AND created_at = ?)').bind(now).run()
  // 2) เก็บแค่ล่าสุด MAX_ANNOUNCEMENTS อันต่อกิลด์ — query เดียวทุกกิลด์
  await env.DB.prepare(
    `DELETE FROM announcements WHERE id IN (
       SELECT id FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY guild_id ORDER BY created_at DESC) AS rn FROM announcements) WHERE rn > ?)
       AND id NOT IN (${KEEP_ACTIVE_PLAN_ANNOUNCEMENTS})`,
  ).bind(MAX_ANNOUNCEMENTS).run()
  // 3) กิลด์ที่เพิ่งได้ประกาศ + ต่อ Discord ไว้ — query เดียว แล้วส่ง webhook
  const { results } = await env.DB.prepare(
    `SELECT a.guild_id AS gid, a.body, g.name, s.discord_webhook AS url, s.discord_mention AS mention
     FROM announcements a JOIN guilds g ON g.id = a.guild_id JOIN guild_settings s ON s.guild_id = a.guild_id
     WHERE a.auto = 1 AND a.created_at = ? AND s.discord_webhook <> ''
     ORDER BY CASE WHEN a.guild_id IN (${DISCORD_PRIORITY.map(() => '?').join(',')}) THEN 0 ELSE 1 END`,
  ).bind(now, ...DISCORD_PRIORITY).all<any>()
  if (results.length > DISCORD_PER_RUN) console.warn(`discord: ${results.length} webhooks, sending first ${DISCORD_PER_RUN}`)
  await Promise.all(results.slice(0, DISCORD_PER_RUN).map((r) =>
    postDiscord(env, r.gid, r, { body: r.body, planId: null, opponent: '', auto: true }).catch((e) => console.error('discord', r.gid, e))))
  return posted
}

export default {
  fetch: app.fetch,
  scheduled: (_event: ScheduledEvent, env: Env, ctx: ExecutionContext) => {
    ctx.waitUntil(runDailyAnnouncements(env).then((n) => console.log(`daily announcements: ${n}`)))
    ctx.waitUntil(runBossReminder(env).then((r) => console.log(`boss reminder: ${r}`), (e) => console.error('boss reminder', e)))
  },
}
