// GET /api/guild/:id/card (ตัวอย่างลิงก์ Discord): ชื่อกิลด์ + ทีมบ้านศัตรู / ชื่อแผน · ไม่ส่ง webhook / edit hash · ไม่พบกิลด์ = 404
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'

const root = fileURLToPath(new URL('../', import.meta.url))
const bundle = await build({ stdin: { resolveDir: root, contents: `
  import worker from './src/index.ts';
  export default { async fetch(request, env, ctx) {
    if (new URL(request.url).pathname === '/__sql') { const out=[]; for (const sql of await request.json()) out.push((await env.DB.prepare(sql).all()).results); return Response.json(out) }
    return worker.fetch(request, env, ctx)
  }};` }, bundle: true, write: false, format: 'esm', platform: 'browser' })
const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: bundle.outputFiles[0].text, compatibilityDate: '2026-09-24', d1Databases: ['DB'], bindings: { ALLOWED_ORIGIN: '*' } }))
const url = await mf.ready
const sql = async (s) => (await (await fetch(new URL('/__sql', url), { method: 'POST', body: JSON.stringify(s) })).json())
const files = ['schema.sql', ...(await readdir(root + 'migrations')).filter(f => f.endsWith('.sql')).sort().map(f => 'migrations/' + f)]
const st = []; for (const f of files) st.push(...(await readFile(root + f, 'utf8')).replace(/--[^\n]*/g, '').split(';').map(s => s.trim()).filter(Boolean))
await sql(st)
const team = JSON.stringify({ front: 2, slots: ['ซอรัน awake', null, 'ไคล์', null, 'อากีลา'], pet: 'อีรีน', extras: [null, null, null, null], speed: 0 })
await sql([
  `INSERT INTO guilds (id,name,edit_hash,created_at) VALUES ('g1','Guild One','secret-hash',0), ('g2','Other','x',0)`,
  `INSERT INTO guild_settings (guild_id,schedule,discord_webhook) VALUES ('g1','[]','https://discord.com/api/webhooks/1/secret')`,
  `INSERT INTO targets (id,guild_id,team,tags,created_at,updated_at) VALUES ('t1','g1','${team}','["โจมตี"]',0,0), ('t2','g2','${team}','[]',0,0)`,
  `INSERT INTO counters (id,target_id,guild_id,team,created_at,updated_at) VALUES ('c1','t1','g1','${team}',0,0), ('c2','t1','g1','${team}',0,0)`,
  `INSERT INTO plans (id,guild_id,title,data,created_at,updated_at) VALUES ('p1','g1','Plan A','{}',0,0)`,
])
const get = async (p) => { const r = await fetch(new URL(p, url)); return { status: r.status, cache: r.headers.get('cache-control'), text: await r.text() } }

let r = await get('/api/guild/g1/card?t=t1')
assert.equal(r.status, 200)
assert.deepEqual(JSON.parse(r.text), { name: 'Guild One', target: { heroes: ['ซอรัน awake', 'ไคล์', 'อากีลา'], pet: 'อีรีน', tags: ['โจมตี'], counters: 2 }, plan: null })
assert.match(r.cache, /public/)
assert.ok(!/secret/.test(r.text))
assert.deepEqual(JSON.parse((await get('/api/guild/g1/card?p=p1')).text), { name: 'Guild One', target: null, plan: { title: 'Plan A' } })
assert.deepEqual(JSON.parse((await get('/api/guild/g1/card')).text), { name: 'Guild One', target: null, plan: null })
// บ้านศัตรูของกิลด์อื่น ไม่ให้ดูผ่านกิลด์นี้
assert.equal(JSON.parse((await get('/api/guild/g1/card?t=t2')).text).target, null)
assert.equal((await get('/api/guild/nope/card')).status, 404)
console.log('CARD OK')
await mf.dispose()
