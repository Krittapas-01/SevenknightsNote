import assert from 'node:assert/strict'
import http from 'node:http'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
let hits = 0
const srv = http.createServer((req, res) => { hits++; req.resume(); res.end('{}') }).listen(0)
const port = srv.address().port
const root = fileURLToPath(new URL('../', import.meta.url))
const bundle = await build({ stdin: { resolveDir: root, contents: `
  import worker, { runDailyAnnouncements } from './src/index.ts';
  export default { async fetch(request, env, ctx) {
    const u = new URL(request.url)
    if (u.pathname === '/__sql') { const out=[]; for (const sql of await request.json()) out.push((await env.DB.prepare(sql).all()).results); return Response.json(out) }
    if (u.pathname === '/__cron') return Response.json({ posted: await runDailyAnnouncements(env, Number(u.searchParams.get('now'))) })
    return worker.fetch(request, env, ctx)
  }};` }, bundle: true, write: false, format: 'esm', platform: 'browser' })
const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: bundle.outputFiles[0].text, compatibilityDate: '2026-09-24', d1Databases: ['DB'], bindings: { ALLOWED_ORIGIN: '*', SITE_URL: 'http://x', DISCORD_ALLOW_ANY: '1' } }))
const url = await mf.ready
const sql = async (s) => (await (await fetch(new URL('/__sql', url), { method: 'POST', body: JSON.stringify(s) })).json())
const files = ['schema.sql', ...(await readdir(root + 'migrations')).filter(f => f.endsWith('.sql')).sort().map(f => 'migrations/' + f)]
const st = []; for (const f of files) st.push(...(await readFile(root + f, 'utf8')).replace(/--[^\n]*/g, '').split(';').map(s => s.trim()).filter(Boolean))
await sql(st)
const N = 60
const seed = []
for (let i = 0; i < N; i++) {
  seed.push(`INSERT INTO guilds (id,name,edit_hash,created_at) VALUES ('g${i}','G${i}','x',0)`)
  seed.push(`INSERT INTO announcements (id,guild_id,body,created_at) VALUES ('a${i}','g${i}','hi',0)`)
  if (i % 2 === 0) seed.push(`INSERT INTO guild_settings (guild_id,schedule,discord_webhook) VALUES ('g${i}','[]','http://127.0.0.1:${port}/hook')`)
}
seed.push(`INSERT INTO guilds (id,name,edit_hash,created_at) VALUES ('off','Off','x',0)`, `INSERT INTO announcements (id,guild_id,body,created_at) VALUES ('ao','off','hi',0)`, `INSERT INTO guild_settings (guild_id,schedule,auto_announce) VALUES ('off','[]',0)`)
seed.push(`INSERT INTO guilds (id,name,edit_hash,created_at) VALUES ('new','New','x',0)`) // ไม่เคยประกาศ
// กิลด์ g1 มีประกาศเต็ม 200 แล้ว
for (let k = 0; k < 200; k++) seed.push(`INSERT INTO announcements (id,guild_id,body,created_at) VALUES ('f${k}','g1','old',${k + 1})`)
await sql(seed)
const mon = Date.parse('2026-10-05T00:00:30Z') // จันทร์ = วันตี (Season ช่วง 24/09–05/11)
let r = await (await fetch(new URL('/__cron?now=' + mon, url))).json()
await new Promise((ok) => setTimeout(ok, 300))
console.log('posted', r.posted, 'webhooks', hits)
assert.equal(r.posted, N); assert.equal(hits, 30)
const [[c1], [c2], [c3]] = await sql([`SELECT COUNT(*) n FROM announcements WHERE auto=1`, `SELECT COUNT(*) n FROM announcements WHERE guild_id='g1'`, `SELECT COUNT(*) n FROM announcements WHERE guild_id IN ('off','new') AND auto=1`])
console.log('auto rows', c1.n, 'g1 rows', c2.n, 'off/new auto', c3.n)
assert.equal(c1.n, N); assert.equal(c2.n, 200); assert.equal(c3.n, 0)
r = await (await fetch(new URL('/__cron?now=' + (mon + 60000), url))).json()
console.log('rerun posted', r.posted); assert.equal(r.posted, 0)
r = await (await fetch(new URL('/__cron?now=' + Date.parse('2026-10-08T00:00:30Z'), url))).json()
console.log('thursday (rest) posted', r.posted); assert.equal(r.posted, 0)
console.log('CRON OK')
await mf.dispose(); srv.close()
