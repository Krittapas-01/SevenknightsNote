// แจ้งเตือนก่อนหมดเวลา 1 ชม.: เฉพาะกิลด์ที่เปิด + ต่อ Discord · ถูกวัน/ถูกชั่วโมง · ช่วงพัก Season ไม่ส่ง · ตั้งค่าผ่าน API ขยับ rev
// webhook ชี้ไป mock ในเครื่อง (DISCORD_ALLOW_ANY) — ไม่ส่งไป Discord จริง
import assert from 'node:assert/strict'
import http from 'node:http'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'

let posts = []
const srv = http.createServer((req, res) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { posts.push({ path: req.url, body: JSON.parse(b || '{}') }); res.end('{}') }) }).listen(0)
const hook = (name) => `http://127.0.0.1:${srv.address().port}/${name}`
const root = fileURLToPath(new URL('../', import.meta.url))
const bundle = await build({ stdin: { resolveDir: root, contents: `
  import worker, { runWarReminders } from './src/index.ts';
  export default { async fetch(request, env, ctx) {
    const u = new URL(request.url)
    if (u.pathname === '/__sql') { const out=[]; for (const sql of await request.json()) out.push((await env.DB.prepare(sql).all()).results); return Response.json(out) }
    if (u.pathname === '/__remind') return Response.json({ r: await runWarReminders(env, Number(u.searchParams.get('now'))) })
    return worker.fetch(request, env, ctx)
  }, scheduled: worker.scheduled };` }, bundle: true, write: false, format: 'esm', platform: 'browser' })
const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: bundle.outputFiles[0].text, compatibilityDate: '2026-09-24', d1Databases: ['DB'], bindings: { ALLOWED_ORIGIN: '*', SITE_URL: 'http://x', DISCORD_ALLOW_ANY: '1' } }))
const url = await mf.ready
const sql = async (s) => (await (await fetch(new URL('/__sql', url), { method: 'POST', body: JSON.stringify(s) })).json())
const remind = async (iso) => { posts = []; const r = (await (await fetch(new URL('/__remind?now=' + Date.parse(iso), url))).json()).r; await new Promise((ok) => setTimeout(ok, 200)); return r }
const files = ['schema.sql', ...(await readdir(root + 'migrations')).filter(f => f.endsWith('.sql')).sort().map(f => 'migrations/' + f)]
const st = []; for (const f of files) st.push(...(await readFile(root + f, 'utf8')).replace(/--[^\n]*/g, '').split(';').map(s => s.trim()).filter(Boolean))
await sql(st)
const sha = async (s) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))).map((b) => b.toString(16).padStart(2, '0')).join('')
await sql([
  `INSERT INTO guilds (id,name,edit_hash,created_at) VALUES ('on','Guild_On','x',0), ('off','Guild Off','x',0), ('nohook','No Hook','x',0), ('api','Api Guild','${await sha('owner-key-123')}',0)`,
  `INSERT INTO guild_settings (guild_id,schedule,discord_webhook,discord_mention,war_reminder) VALUES ('on','[]','${hook('on')}','here',1), ('off','[]','${hook('off')}','',0), ('nohook','[]','',' ',1)`,
])

// จันทร์ = วันตี → 23:00 ไทย (16:00 UTC)
let r = await remind('2026-10-05T16:00:20Z')
assert.equal(r, 'attack: 1/1')
assert.deepEqual(posts.map((p) => p.path), ['/on'])
const msg = posts[0].body.content
console.log('attack message:', msg)
assert.match(msg, /^@here ⏰ อีก 1 ชั่วโมงหมดช่วงตี \(00:00\)/)
assert.match(msg, /\[Guild\\_On · 7K Note\]\(http:\/\/x\/g\/on\)/)
assert.deepEqual(posts[0].body.allowed_mentions, { parse: ['everyone'] })

// อังคาร = วันจัดบ้าน → 17:00 ไทย (10:00 UTC)
r = await remind('2026-10-06T10:00:20Z')
assert.equal(r, 'defense: 1/1')
assert.match(posts[0].body.content, /หมดช่วงแก้ทีม \(18:00\)/)

// ผิดชั่วโมง / วันพัก / ช่วงพัก Season → ไม่ส่ง
assert.equal(await remind('2026-10-05T10:00:20Z'), 'skip') // วันตี แต่ 17:00
assert.equal(await remind('2026-10-06T16:00:20Z'), 'skip') // วันจัดบ้าน แต่ 23:00
assert.equal(await remind('2026-10-08T16:00:20Z'), 'skip') // พฤหัส วันพัก
assert.equal(await remind('2026-11-09T16:00:20Z'), 'off-season') // จันทร์ในช่วงพัก Season (06–11 พ.ย.)
assert.equal(posts.length, 0)

// cron "0 10,16 * * *" → แจ้งเตือน (ไม่ประกาศ 07:00)
posts = []
await (await mf.getWorker()).scheduled({ cron: '0 10,16 * * *', scheduledTime: new Date('2026-10-05T16:00:01Z') })
await new Promise((ok) => setTimeout(ok, 300))
assert.deepEqual(posts.map((p) => p.path), ['/on'])
assert.equal((await sql([`SELECT COUNT(*) n FROM announcements`]))[0][0].n, 0, 'reminders do not write announcements')

// ตั้งค่าผ่าน API (เจ้าของ) → เปิด/ปิดได้, GET เห็นค่า, rev ขยับ, ไม่ส่ง warReminder = ไม่เปลี่ยน
const api = async (path, { method = 'GET', body, key } = {}) => {
  const res = await fetch(new URL(path, url), { method, headers: { 'Content-Type': 'application/json', ...(key ? { 'X-Edit-Key': key } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
  return { status: res.status, data: await res.json() }
}
const rev0 = (await api('/api/guild/api')).data.rev
assert.equal((await api('/api/guild/api')).data.discord.warReminder, false)
assert.equal((await api('/api/guild/api/discord', { method: 'PUT', body: { mention: '', warReminder: true } })).status, 403)
let res = await api('/api/guild/api/discord', { method: 'PUT', key: 'owner-key-123', body: { mention: '', warReminder: true } })
assert.equal(res.status, 200); assert.equal(res.data.warReminder, true)
const g = (await api('/api/guild/api')).data
assert.equal(g.discord.warReminder, true)
assert.notEqual(g.rev, rev0, 'saving the setting bumps guild rev')
res = await api('/api/guild/api/discord', { method: 'PUT', key: 'owner-key-123', body: { mention: 'here' } })
assert.equal(res.data.warReminder, true, 'not sending warReminder keeps it')
res = await api('/api/guild/api/discord', { method: 'PUT', key: 'owner-key-123', body: { mention: 'here', warReminder: false } })
assert.equal(res.data.warReminder, false)
console.log('REMINDER OK')
await mf.dispose(); srv.close()
