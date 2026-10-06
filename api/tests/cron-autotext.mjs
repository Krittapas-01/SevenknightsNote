import assert from 'node:assert/strict'
import http from 'node:http'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
let hits = 0; const paths = []; const bodies = []
const srv = http.createServer((req, res) => { hits++; paths.push(req.url); let d=''; req.on('data', (c) => d += c); req.on('end', () => { bodies.push(d); res.end('{}') }) }).listen(0)
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

// 2026-10-06 = อังคาร = defense (GAME_SCHEDULE[1])
const ids = ['gA', 'gB', 'gC']
const seed = []
for (const id of ids) {
  seed.push(`INSERT INTO guilds (id,name,edit_hash,created_at) VALUES ('${id}','${id}','x',0)`)
  seed.push(`INSERT INTO announcements (id,guild_id,body,created_at) VALUES ('a${id}','${id}','hi',0)`)
}
seed.push(`INSERT INTO guild_settings (guild_id,schedule,discord_webhook,auto_text_defense) VALUES ('gA','[]','http://127.0.0.1:${port}/gA','จัดบ้านด่วน! วัน{วัน} ใส่ทีมกันด้วย')`)
seed.push(`INSERT INTO guild_settings (guild_id,schedule,discord_webhook,auto_text_attack) VALUES ('gB','[]','http://127.0.0.1:${port}/gB','ตีๆ')`)
await sql(seed)
const r = await (await fetch(new URL('/__cron?now=' + Date.parse('2026-10-06T00:00:30Z'), url))).json()
await new Promise((ok) => setTimeout(ok, 300))
const [rows] = await sql(["SELECT guild_id, body FROM announcements WHERE auto = 1 ORDER BY guild_id"])
console.log('posted', r.posted, JSON.stringify(rows))
assert.equal(rows.find((x) => x.guild_id === 'gA').body, 'จัดบ้านด่วน! วันอังคาร ใส่ทีมกันด้วย')
assert.equal(rows.find((x) => x.guild_id === 'gB').body, 'วันนี้ (อังคาร) วันจัดบ้านกัน · ช่วงแก้ทีม 07:00–18:00 (18:00 เริ่มจัดบ้าน)')
assert.equal(rows.find((x) => x.guild_id === 'gC').body, 'วันนี้ (อังคาร) วันจัดบ้านกัน · ช่วงแก้ทีม 07:00–18:00 (18:00 เริ่มจัดบ้าน)')
console.log('discord bodies', JSON.stringify(bodies))
assert.ok(bodies.some((b) => b.includes('จัดบ้านด่วน! วันอังคาร')))
assert.ok(bodies.some((b) => b.includes('วันนี้ (อังคาร) วันจัดบ้านกัน · ช่วงแก้ทีม 07:00–18:00 (18:00 เริ่มจัดบ้าน)')))
// Wednesday = attack → gB custom
const r2 = await (await fetch(new URL('/__cron?now=' + Date.parse('2026-10-07T00:00:30Z'), url))).json()
const [rows2] = await sql(["SELECT guild_id, body FROM announcements WHERE auto = 1 AND created_at = " + Date.parse('2026-10-07T00:00:30Z') + " ORDER BY guild_id"])
console.log('wed', JSON.stringify(rows2))
assert.equal(rows2.find((x) => x.guild_id === 'gB').body, 'ตีๆ')
assert.equal(rows2.find((x) => x.guild_id === 'gA').body, 'วันนี้ (พุธ) วันตี · ช่วงตี 07:00–00:00')
console.log('AUTO TEXT CRON OK')
await mf.dispose(); srv.close()
