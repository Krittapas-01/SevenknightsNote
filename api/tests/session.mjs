import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'

// 1.7: ล็อกอิน Discord ต่ออายุเอง (เหลือ < 3 วัน → 7 วัน, เพดาน 30 วัน) + last_seen + คนแก้ผ่านรหัสเข้ากิลด์ได้ + /api/admin/users
// Runs against an ephemeral local D1 database and a local fake Discord; never reads deployment credentials.
const root = fileURLToPath(new URL('../', import.meta.url))
const DAY = 86_400_000

// Discord ปลอม: แลก code / ต่อ token / โปรไฟล์ — นับว่าโดนขอ refresh กี่ครั้ง
const discord = { refreshCalls: [], seq: 0 }
const fake = createServer(async (req, res) => {
  let body = ''
  for await (const chunk of req) body += chunk
  const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)) }
  const url = new URL(req.url, 'http://x')
  if (url.pathname === '/oauth2/token') {
    const f = new URLSearchParams(body)
    if (f.get('grant_type') === 'authorization_code') return send(200, { access_token: 'acc-login', refresh_token: 'ref-login', expires_in: 604800 })
    if (f.get('grant_type') === 'refresh_token') {
      discord.refreshCalls.push(f.get('refresh_token'))
      await new Promise((r) => setTimeout(r, 50)) // ช้าหน่อย ให้คำขอพร้อมกันมีโอกาสซ้อน
      if (f.get('refresh_token').startsWith('revoked')) return send(400, { error: 'invalid_grant' })
      if (f.get('refresh_token').startsWith('down')) return send(503, { error: 'down' })
      const n = ++discord.seq
      return send(200, { access_token: 'acc-new-' + n, refresh_token: 'ref-new-' + n, expires_in: 604800 })
    }
  }
  if (url.pathname === '/users/@me') return send(200, { id: '900', username: 'krit', global_name: 'Krit', avatar: null })
  send(404, {})
})
await new Promise((r) => fake.listen(0, '127.0.0.1', r))
const fakeBase = `http://127.0.0.1:${fake.address().port}`

const bundle = await build({ stdin: { resolveDir: root, contents: `
  import worker from './src/index.ts';
  export default { ...worker, async fetch(request, env, ctx) {
    const p = new URL(request.url).pathname;
    if (p === '/__audit_setup' && request.method === 'POST') {
      for (const sql of await request.json()) await env.DB.prepare(sql).run();
      return Response.json({ok:true});
    }
    if (p === '/__audit_query' && request.method === 'POST') {
      const { sql, args } = await request.json();
      return Response.json((await env.DB.prepare(sql).bind(...(args || [])).all()).results);
    }
    return worker.fetch(request, env, ctx);
  }};
` }, bundle: true, write: false, format: 'esm', platform: 'browser' })
const mf = new Miniflare(convertV4MiniflareOptions({
  modules: true, script: bundle.outputFiles[0].text, compatibilityDate: '2026-09-24', d1Databases: ['DB'],
  bindings: { ALLOWED_ORIGIN: '*', SITE_URL: 'http://127.0.0.1:4175', DISCORD_CLIENT_ID: 'cid', DISCORD_CLIENT_SECRET: 'csecret', DISCORD_API_BASE: fakeBase, ADMIN_DISCORD_IDS: 'admin1' },
  host: '127.0.0.1', port: 0,
}))
let failures = 0
let passed = 0
async function check(name, fn) {
  try { await fn(); passed++; console.log('PASS', name) }
  catch (error) { failures++; console.error('FAIL', name, error.message) }
}
async function request(path, { method = 'GET', body, key, view, token, ip, redirect } = {}) {
  const headers = { 'Content-Type': 'application/json', ...(key ? { 'X-Edit-Key': encodeURIComponent(key) } : {}), ...(view ? { 'X-View-Key': encodeURIComponent(view) } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(ip ? { 'CF-Connecting-IP': ip } : {}) }
  const res = await fetch(new URL(path, await mf.ready), { method, headers, redirect: redirect ?? 'follow', ...(body !== undefined ? { body: JSON.stringify(body) } : {}) })
  const text = await res.text()
  let data = null
  try { data = JSON.parse(text) } catch { data = text }
  return { status: res.status, data, location: res.headers.get('Location') }
}
const setup = async (statements) => assert.equal((await request('/__audit_setup', { method: 'POST', body: statements })).status, 200)
const query = async (sql, args = []) => (await request('/__audit_query', { method: 'POST', body: { sql, args } })).data
const sha = async (s) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))).map((b) => b.toString(16).padStart(2, '0')).join('')
const session = async (token) => (await query('SELECT * FROM sessions WHERE token_hash = ?', [await sha(token)]))[0]
/** สร้าง session ตรง ๆ: left = เหลืออีกกี่ ms · age = ล็อกอินมานานเท่าไหร่ · refresh = null แบบ session ก่อน 1.7 */
async function addSession(token, { user = 'u-' + token, left, age, refresh = 'ref-' + token, lastSeen = null } = {}) {
  const now = Date.now()
  const q = (v) => (v == null ? 'NULL' : typeof v === 'number' ? v : `'${v}'`)
  await setup([`INSERT INTO sessions (token_hash, user_id, name, avatar, access_token, expires_at, refresh_token, created_at, last_seen) VALUES ('${await sha(token)}', '${user}', 'N ${token}', '', 'acc-${token}', ${now + left}, ${q(refresh)}, ${age == null ? 'NULL' : now - age}, ${q(lastSeen)})`])
}
/** waitUntil วิ่งหลังตอบ → รอจนเงื่อนไขเป็นจริง */
async function until(fn, ms = 3000) {
  const end = Date.now() + ms
  for (;;) {
    const v = await fn()
    if (v) return v
    if (Date.now() > end) throw new Error('timed out waiting')
    await new Promise((r) => setTimeout(r, 25))
  }
}
const settle = () => new Promise((r) => setTimeout(r, 300))

try {
  const files = ['schema.sql', ...(await readdir(root + 'migrations')).filter(f => f.endsWith('.sql')).sort().map(f => 'migrations/' + f)]
  const statements = []
  for (const file of files) {
    const sql = (await readFile(root + file, 'utf8')).replace(/--[^\n]*/g, '')
    statements.push(...sql.split(';').map(s => s.trim()).filter(Boolean))
  }
  await setup(statements)

  await check('login keeps refresh_token + created_at + last_seen', async () => {
    const start = await request('/api/auth/discord/login?return=' + encodeURIComponent('http://127.0.0.1:4175/g/x'), { redirect: 'manual' })
    assert.equal(start.status, 302)
    const state = new URL(start.location).searchParams.get('state')
    const cb = await request(`/api/auth/discord/callback?code=abc&state=${state}`, { redirect: 'manual' })
    assert.equal(cb.status, 302)
    const token = cb.location.split('#discord=')[1]
    assert.ok(token)
    const s = await session(token)
    assert.equal(s.refresh_token, 'ref-login'); assert.equal(s.access_token, 'acc-login')
    assert.ok(Math.abs(s.created_at - Date.now()) < 5000); assert.equal(s.last_seen, s.created_at)
    assert.ok(Math.abs(s.expires_at - (s.created_at + 7 * DAY)) < 5000)
    assert.equal((await request('/api/auth/me', { token })).data.user.name, 'Krit')
  })

  await check('plenty of time left: no renew, no write (last_seen recent)', async () => {
    await addSession('fresh', { left: 6 * DAY, age: DAY, lastSeen: Date.now() - 3600e3 })
    const before = await session('fresh')
    assert.ok((await request('/api/auth/me', { token: 'fresh' })).data.user)
    await settle()
    assert.deepEqual(await session('fresh'), before)
    assert.equal(discord.refreshCalls.includes('ref-fresh'), false)
  })

  await check('last_seen written at most once a day', async () => {
    await addSession('seen', { left: 6 * DAY, age: DAY, lastSeen: Date.now() - 2 * DAY })
    await request('/api/auth/me', { token: 'seen' })
    const s = await until(async () => { const r = await session('seen'); return Date.now() - r.last_seen < 10_000 && r })
    assert.equal(s.expires_at, (await session('seen')).expires_at)
    assert.equal(discord.refreshCalls.includes('ref-seen'), false)
  })

  await check('under 3 days left: renews to 7 days with new Discord tokens', async () => {
    await addSession('soon', { left: 2 * DAY, age: 5 * DAY })
    assert.ok((await request('/api/auth/me', { token: 'soon' })).data.user) // คำขอนี้ยังใช้ token เดิมได้
    const s = await until(async () => { const r = await session('soon'); return r.refresh_token !== 'ref-soon' && r })
    assert.match(s.access_token, /^acc-new-/); assert.match(s.refresh_token, /^ref-new-/)
    assert.ok(Math.abs(s.expires_at - (Date.now() + 7 * DAY)) < 10_000)
    assert.deepEqual(discord.refreshCalls.filter((x) => x === 'ref-soon'), ['ref-soon'])
  })

  await check('many requests at once: Discord refresh asked only once', async () => {
    await addSession('burst', { left: DAY, age: 6 * DAY })
    const rs = await Promise.all(Array.from({ length: 8 }, () => request('/api/auth/me', { token: 'burst' })))
    assert.ok(rs.every((r) => r.data.user))
    await until(async () => (await session('burst')).refresh_token !== 'ref-burst')
    await settle()
    assert.equal(discord.refreshCalls.filter((x) => x === 'ref-burst').length, 1)
  })

  await check('30-day cap: renews only up to 30 days after first login', async () => {
    await addSession('old', { left: DAY, age: 28.5 * DAY })
    await request('/api/auth/me', { token: 'old' })
    const s = await until(async () => { const r = await session('old'); return r.refresh_token !== 'ref-old' && r })
    assert.ok(Math.abs(s.expires_at - (s.created_at + 30 * DAY)) < 1000)
  })

  await check('at the cap: no renew, still logged in until it ends', async () => {
    await addSession('capped', { left: DAY, age: 29 * DAY })
    assert.ok((await request('/api/auth/me', { token: 'capped' })).data.user)
    await settle()
    assert.equal(discord.refreshCalls.includes('ref-capped'), false)
  })

  await check('pre-1.7 session (no refresh_token): no renew, still works', async () => {
    await addSession('legacy', { left: DAY, age: null, refresh: null })
    assert.ok((await request('/api/auth/me', { token: 'legacy' })).data.user)
    await settle()
    const s = await session('legacy')
    assert.equal(s.refresh_token, null); assert.ok(s.last_seen > 0) // last_seen ยังจด
  })

  await check('Discord says the grant is revoked: stop trying, stay logged in', async () => {
    await addSession('rv', { left: DAY, age: 5 * DAY, refresh: 'revoked-1' })
    assert.ok((await request('/api/auth/me', { token: 'rv' })).data.user)
    await until(async () => (await session('rv')).refresh_token === null)
    assert.ok((await request('/api/auth/me', { token: 'rv' })).data.user)
  })

  await check('Discord down: keeps refresh_token to retry later', async () => {
    await addSession('dn', { left: DAY, age: 5 * DAY, refresh: 'down-1' })
    await request('/api/auth/me', { token: 'dn' })
    await until(async () => discord.refreshCalls.includes('down-1'))
    await settle()
    const s = await session('dn')
    assert.equal(s.refresh_token, 'down-1'); assert.ok(s.expires_at < Date.now() + 2 * DAY)
  })

  await check('expired session: logged out', async () => {
    await addSession('gone', { left: -1000, age: 8 * DAY })
    assert.equal((await request('/api/auth/me', { token: 'gone' })).data.user, null)
  })

  // ---- คนแก้ (เจ้าของ/ยศ Discord) ผ่านรหัสเข้ากิลด์ได้ ----
  const g = (await request('/api/guild', { method: 'POST', body: { name: 'Session Lock', password: 'owner-pass-123' } })).data
  const path = '/api/guild/' + g.id
  const key = 'owner-pass-123'
  assert.equal((await request(path + '/discord', { method: 'PUT', key, body: { mention: '', serverId: '111111', editRoles: ['222222'] } })).status, 200)
  assert.equal((await request(path + '/view', { method: 'PUT', key, body: { code: 'guildcode' } })).status, 200)
  await addSession('editor', { user: 'e1', left: 6 * DAY, age: DAY, lastSeen: Date.now() })
  await addSession('member', { user: 'm1', left: 6 * DAY, age: DAY, lastSeen: Date.now() })
  await setup([
    `INSERT INTO member_cache (k, roles, nick, at) VALUES ('e1:111111', '["222222"]', '', ${Date.now() + 3600e3})`,
    `INSERT INTO member_cache (k, roles, nick, at) VALUES ('m1:111111', '["333333"]', '', ${Date.now() + 3600e3})`,
  ])

  await check('locked guild: anonymous still gets the code box', async () => assert.equal((await request(path)).status, 401))
  await check('locked guild: Discord editor opens guild + pulse without the code', async () => {
    const r = await request(path, { token: 'editor' })
    assert.equal(r.status, 200); assert.ok(Array.isArray(r.data.targets))
    assert.equal((await request(path + '/pulse', { token: 'editor' })).status, 200)
  })
  await check('locked guild: logged-in member without the edit role still needs the code', async () => {
    assert.equal((await request(path, { token: 'member' })).status, 401)
    assert.equal((await request(path, { token: 'member', view: 'guildcode' })).status, 200)
  })
  await check('locked guild: edit key opens it too', async () => assert.equal((await request(path, { key })).status, 200))
  await check('editor with an old (wrong) code is let in and not counted as guessing', async () => {
    for (let i = 0; i < 12; i++) assert.equal((await request(path + '/pulse', { token: 'editor', view: 'old-code', ip: '10.9.0.1' })).status, 200)
    assert.equal((await request(path, { view: 'guildcode', ip: '10.9.0.1' })).status, 200) // IP นี้ไม่โดนล็อก
  })
  await check('wrong edit key is not a way in', async () => assert.equal((await request(path, { key: 'nope-nope', ip: '10.9.0.2' })).status, 401))

  await check('admin users: lists logged-in people with last seen (admins only)', async () => {
    await addSession('adm', { user: 'admin1', left: 6 * DAY, age: DAY, lastSeen: Date.now() })
    assert.equal((await request('/api/admin/users', { token: 'member' })).status, 404)
    assert.equal((await request('/api/admin/users')).status, 404)
    const r = await request('/api/admin/users', { token: 'adm' })
    assert.equal(r.status, 200)
    const ids = r.data.users.map((u) => u.id)
    assert.ok(ids.includes('e1') && ids.includes('900') && !ids.includes('u-gone'))
    const legacy = r.data.users.find((u) => u.id === 'u-legacy')
    assert.equal(legacy.renews, false); assert.equal(legacy.loginAt, null)
    assert.equal(r.data.users.find((u) => u.id === 'e1').renews, true)
    for (let i = 1; i < r.data.users.length; i++) assert.ok((r.data.users[i - 1].lastSeen ?? 0) >= (r.data.users[i].lastSeen ?? 0))
  })
  console.log(JSON.stringify({ passed, failures }))
} finally { await mf.dispose(); fake.close() }
process.exitCode = failures ? 1 : 0
