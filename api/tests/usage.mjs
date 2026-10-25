// สถิติปุ่ม: POST /api/usage รับเฉพาะชื่อที่รู้จัก + จำกัดจำนวน · /api/admin/usage เฉพาะแอดมิน · ไม่มี token = configured:false
// Analytics Engine = ตัวปลอมในเทสต์ · Cloudflare API = mock ในเครื่อง (CF_API_BASE) — ไม่แตะของจริง
import assert from 'node:assert/strict'
import http from 'node:http'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'

const sqlSeen = []
const today = new Date().toISOString().slice(0, 10)
const old = new Date(Date.now() - 20 * 86400_000).toISOString().slice(0, 10)
const cf = http.createServer((req, res) => {
  let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
    res.setHeader('Content-Type', 'application/json')
    if (req.url.startsWith('/accounts?')) return res.end(JSON.stringify({ result: [{ id: 'acc123' }] }))
    if (req.url === '/accounts/acc123/analytics_engine/sql') {
      sqlSeen.push({ auth: req.headers.authorization, sql: b })
      return res.end(JSON.stringify({ data: [
        { event: 'ocr', day: `${today} 00:00:00`, n: 3 }, { event: 'ocr', day: `${old} 00:00:00`, n: 10 },
        { event: 'announce', day: `${today} 00:00:00`, n: '2' }, { event: 'evil', day: `${today} 00:00:00`, n: 99 },
      ] }))
    }
    res.statusCode = 404; res.end('{}')
  })
}).listen(0)
const root = fileURLToPath(new URL('../', import.meta.url))
const bundle = await build({ stdin: { resolveDir: root, contents: `
  import worker from './src/index.ts';
  const points = []
  export default { async fetch(request, env, ctx) {
    const u = new URL(request.url)
    if (u.pathname === '/__sql') { const out=[]; for (const sql of await request.json()) out.push((await env.DB.prepare(sql).all()).results); return Response.json(out) }
    if (u.pathname === '/__points') return Response.json(points)
    const e = { ...env, USAGE: { writeDataPoint: (p) => points.push(p) } }
    if (request.headers.get('x-no-token')) delete e.CF_API_TOKEN
    return worker.fetch(request, e, ctx)
  }};` }, bundle: true, write: false, format: 'esm', platform: 'browser' })
const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: bundle.outputFiles[0].text, compatibilityDate: '2026-09-24', d1Databases: ['DB'],
  bindings: { ALLOWED_ORIGIN: '*', ADMIN_DISCORD_IDS: 'admin1', CF_API_TOKEN: 'test-token', CF_API_BASE: `http://127.0.0.1:${cf.address().port}` } }))
const url = await mf.ready
const sql = async (s) => (await (await fetch(new URL('/__sql', url), { method: 'POST', body: JSON.stringify(s) })).json())
const files = ['schema.sql', ...(await readdir(root + 'migrations')).filter(f => f.endsWith('.sql')).sort().map(f => 'migrations/' + f)]
const st = []; for (const f of files) st.push(...(await readFile(root + f, 'utf8')).replace(/--[^\n]*/g, '').split(';').map(s => s.trim()).filter(Boolean))
await sql(st)
const sha = async (s) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))).map((b) => b.toString(16).padStart(2, '0')).join('')
await sql([
  `INSERT INTO sessions (token_hash,user_id,name,avatar,access_token,expires_at) VALUES ('${await sha('admin-session')}','admin1','A','','x',9999999999999)`,
  `INSERT INTO sessions (token_hash,user_id,name,avatar,access_token,expires_at) VALUES ('${await sha('user-session')}','user2','U','','x',9999999999999)`,
])

// sendBeacon ส่ง string = text/plain
let r = await fetch(new URL('/api/usage', url), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ events: { ocr: 3, announce: 1000, atk: -1, bogus: 5, packs: 'x' } }) })
assert.equal(r.status, 204)
r = await fetch(new URL('/api/usage', url), { method: 'POST', body: 'not json' })
assert.equal(r.status, 400)
r = await fetch(new URL('/api/usage', url), { method: 'POST', body: JSON.stringify({ url: 'https://x/g/abc?key=secret' }) })
assert.equal(r.status, 204)
const points = await (await fetch(new URL('/__points', url))).json()
assert.deepEqual(points, [
  { blobs: ['ocr'], doubles: [3], indexes: ['ocr'] },
  { blobs: ['announce'], doubles: [50], indexes: ['announce'] },
])

const admin = (token, extra = {}) => fetch(new URL('/api/admin/usage', url), { headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...extra } })
assert.equal((await admin()).status, 404)
assert.equal((await admin('user-session')).status, 404)
assert.deepEqual(await (await admin('admin-session', { 'x-no-token': '1' })).json(), { configured: false })
const d = await (await admin('admin-session')).json()
console.log('admin usage', JSON.stringify(d.rows.slice(0, 2)))
assert.equal(d.configured, true)
assert.deepEqual(d.rows.find((x) => x.event === 'ocr'), { event: 'ocr', today: 3, d7: 3, d30: 13 })
assert.deepEqual(d.rows.find((x) => x.event === 'announce'), { event: 'announce', today: 2, d7: 2, d30: 2 })
assert.ok(!d.rows.some((x) => x.event === 'evil'))
assert.equal(sqlSeen[0].auth, 'Bearer test-token')
assert.match(sqlSeen[0].sql, /FROM usage_7knote/)
console.log('USAGE OK')
await mf.dispose(); cf.close()
