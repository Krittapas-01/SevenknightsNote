// หน้าแอดมิน: /api/admin/stats บอกว่ากิลด์ไหนล็อกรหัส / เปิดเตือน 1 ชม. และสถานะไฟล์สำรองใน R2
// ต้องไม่ส่งตัวรหัสเข้ากิลด์ webhook URL หรือเนื้อหาไฟล์สำรองออกไป
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'

const root = fileURLToPath(new URL('../', import.meta.url))
const bundle = await build({ stdin: { resolveDir: root, contents: `
  import worker from './src/index.ts';
  export default { async fetch(request, env, ctx) {
    const u = new URL(request.url)
    if (u.pathname === '/__sql') { const out=[]; for (const sql of await request.json()) out.push((await env.DB.prepare(sql).all()).results); return Response.json(out) }
    if (u.pathname === '/__put') { await env.BACKUP.put(u.searchParams.get('key'), 'x'.repeat(Number(u.searchParams.get('size'))), { customMetadata: { rows: u.searchParams.get('rows') || '' } }); return new Response('ok') }
    const e = request.headers.get('x-no-bucket') ? { ...env, BACKUP: undefined } : env
    return worker.fetch(request, e, ctx)
  }};` }, bundle: true, write: false, format: 'esm', platform: 'browser' })
const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: bundle.outputFiles[0].text, compatibilityDate: '2026-09-24', d1Databases: ['DB'], r2Buckets: ['BACKUP'],
  bindings: { ALLOWED_ORIGIN: '*', ADMIN_DISCORD_IDS: 'admin1' } }))
const url = await mf.ready
const sql = async (s) => (await (await fetch(new URL('/__sql', url), { method: 'POST', body: JSON.stringify(s) })).json())
const files = ['schema.sql', ...(await readdir(root + 'migrations')).filter(f => f.endsWith('.sql')).sort().map(f => 'migrations/' + f)]
const st = []; for (const f of files) st.push(...(await readFile(root + f, 'utf8')).replace(/--[^\n]*/g, '').split(';').map(s => s.trim()).filter(Boolean))
await sql(st)
const sha = async (s) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))).map((b) => b.toString(16).padStart(2, '0')).join('')
await sql([
  `INSERT INTO sessions (token_hash,user_id,name,avatar,access_token,expires_at) VALUES ('${await sha('admin-session')}','admin1','A','','x',9999999999999)`,
  `INSERT INTO sessions (token_hash,user_id,name,avatar,access_token,expires_at) VALUES ('${await sha('user-session')}','user2','U','','x',9999999999999)`,
  `INSERT INTO guilds (id,name,edit_hash,created_at,view_code) VALUES ('g1','Locked','h',1,'secret-code-1234')`,
  `INSERT INTO guilds (id,name,edit_hash,created_at) VALUES ('g2','Open','h',2)`,
  `INSERT INTO guilds (id,name,edit_hash,created_at,view_code) VALUES ('g3','Empty code','h',3,'')`,
  `INSERT INTO guild_settings (guild_id,schedule,discord_webhook,war_reminder) VALUES ('g1','[]','https://discord.com/api/webhooks/1/hook-secret',1)`,
  `INSERT INTO guild_settings (guild_id,schedule,war_reminder) VALUES ('g2','[]',0)`,
])

const stats = (token, extra = {}) => fetch(new URL('/api/admin/stats', url), { headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...extra } })
assert.equal((await stats()).status, 404)
assert.equal((await stats('user-session')).status, 404)

// ยังไม่มีไฟล์สำรอง
let r = await stats('admin-session')
let text = await r.text()
let d = JSON.parse(text)
const by = Object.fromEntries(d.guilds.map((g) => [g.id, g]))
assert.equal(by.g1.locked, 1); assert.equal(by.g1.warReminder, 1); assert.equal(by.g1.webhook, 1)
assert.equal(by.g2.locked, 0); assert.equal(by.g2.warReminder, 0)
assert.equal(by.g3.locked, 0, 'empty view_code = not locked')
assert.ok(!text.includes('secret-code-1234'), 'guild code must not leak')
assert.ok(!text.includes('hook-secret'), 'webhook must not leak')
assert.deepEqual(d.backup, { configured: true, keepDays: 90, count: 0, totalBytes: 0, latest: null, recent: [] })

// ไม่มี bucket (dev) → configured:false
d = await (await stats('admin-session', { 'x-no-bucket': '1' })).json()
assert.deepEqual(d.backup, { configured: false })

// มีไฟล์: ใหม่สุดตามวันในชื่อไฟล์ · ไฟล์นอก d1/ หรือชื่อแปลก ไม่นับ
const put = (key, size, rows = '') => fetch(new URL(`/__put?key=${encodeURIComponent(key)}&size=${size}&rows=${rows}`, url))
await put('d1/2026-10-29.json.gz', 300, '1234')
await put('d1/2026-10-27.json.gz', 200, '1200')
await put('d1/2026-10-28.json.gz', 250)
await put('d1/notes.txt', 10)
await put('other/2026-10-30.json.gz', 999)
d = await (await stats('admin-session')).json()
assert.equal(d.backup.count, 3)
assert.equal(d.backup.totalBytes, 750)
assert.equal(d.backup.latest.day, '2026-10-29')
assert.equal(d.backup.latest.bytes, 300)
assert.equal(d.backup.latest.rows, 1234)
assert.ok(Math.abs(d.backup.latest.uploadedAt - Date.now()) < 60_000)
assert.deepEqual(d.backup.recent, ['2026-10-29', '2026-10-28', '2026-10-27'])
console.log('admin backup', JSON.stringify(d.backup.latest))
console.log('ADMIN OK')
await mf.dispose()
