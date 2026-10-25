// สำรองฐานข้อมูลเข้า R2: ครบทุกตาราง (ข้ามตารางชั่วคราว), ข้อมูลเกิน 1 หน้า (500 แถว) ไม่หาย, ลบไฟล์เก่ากว่า 90 วัน
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'

const root = fileURLToPath(new URL('../', import.meta.url))
const bundle = await build({ stdin: { resolveDir: root, contents: `
  import worker, { runBackup } from './src/index.ts';
  export default { async fetch(request, env, ctx) {
    const u = new URL(request.url)
    if (u.pathname === '/__sql') { const out=[]; for (const sql of await request.json()) out.push((await env.DB.prepare(sql).all()).results); return Response.json(out) }
    if (u.pathname === '/__backup') return Response.json(await runBackup(env, Number(u.searchParams.get('now'))))
    if (u.pathname === '/__put') { await env.BACKUP.put(u.searchParams.get('key'), 'x'); return new Response('ok') }
    if (u.pathname === '/__list') return Response.json((await env.BACKUP.list()).objects.map((o) => o.key))
    if (u.pathname === '/__get') { const o = await env.BACKUP.get(u.searchParams.get('key')); return new Response(o.body, { headers: { 'x-enc': o.httpMetadata?.contentEncoding || '' } }) }
    return worker.fetch(request, env, ctx)
  }, scheduled: worker.scheduled };` }, bundle: true, write: false, format: 'esm', platform: 'browser' })
const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: bundle.outputFiles[0].text, compatibilityDate: '2026-09-24', d1Databases: ['DB'], r2Buckets: ['BACKUP'], bindings: { ALLOWED_ORIGIN: '*' } }))
const url = await mf.ready
const call = (p) => fetch(new URL(p, url))
const sql = async (s) => (await (await fetch(new URL('/__sql', url), { method: 'POST', body: JSON.stringify(s) })).json())
const files = ['schema.sql', ...(await readdir(root + 'migrations')).filter(f => f.endsWith('.sql')).sort().map(f => 'migrations/' + f)]
const st = []; for (const f of files) st.push(...(await readFile(root + f, 'utf8')).replace(/--[^\n]*/g, '').split(';').map(s => s.trim()).filter(Boolean))
await sql(st)

const seed = [`INSERT INTO guilds (id,name,edit_hash,created_at) VALUES ('g1','Guild "One"','hash-secret',0)`]
for (let i = 0; i < 1234; i++) seed.push(`INSERT INTO announcements (id,guild_id,body,created_at) VALUES ('a${i}','g1','msg ${i} ไทย',${i})`)
seed.push(`INSERT INTO guild_settings (guild_id,schedule,discord_webhook) VALUES ('g1','[]','https://discord.com/api/webhooks/1/secret')`)
seed.push(`INSERT INTO sessions (token_hash,user_id,name,avatar,access_token,expires_at) VALUES ('t','u','n','a','discord-token',9999999999999)`)
seed.push(`INSERT INTO auth_fails (k,count,since) VALUES ('g1:1.2.3.4',1,0)`)
await sql(seed)

// ไฟล์เก่า: 100 วันก่อน (ต้องถูกลบ) · 30 วันก่อน (ต้องอยู่) · ไฟล์อื่นนอก d1/ (ห้ามแตะ)
const now = Date.parse('2026-10-25T20:00:05Z')
await call('/__put?key=d1/2026-07-17.json.gz')
await call('/__put?key=d1/2026-09-25.json.gz')
await call('/__put?key=other/keep.txt')

const r = await (await call('/__backup?now=' + now)).json()
console.log('backup', r.key, r.bytes, 'bytes', 'deleted', r.deleted)
assert.equal(r.key, 'd1/2026-10-25.json.gz')
assert.equal(r.deleted, 1)
assert.equal(r.tables.announcements, 1234)
assert.equal(r.tables.guilds, 1)
assert.ok(!('sessions' in r.tables) && !('auth_fails' in r.tables), 'temporary tables are skipped')

const keys = await (await call('/__list')).json()
assert.deepEqual(keys.sort(), ['d1/2026-09-25.json.gz', 'd1/2026-10-25.json.gz', 'other/keep.txt'])

const obj = await call('/__get?key=' + r.key)
assert.equal(obj.headers.get('x-enc'), 'gzip')
const dump = JSON.parse(gunzipSync(Buffer.from(await obj.arrayBuffer())).toString('utf8'))
assert.equal(dump.version, 1)
assert.equal(dump.createdAt, now)
assert.equal(dump.tables.announcements.rows.length, 1234)
assert.deepEqual(new Set(dump.tables.announcements.rows.map((x) => x.id)).size, 1234, 'no duplicate rows across pages')
assert.equal(dump.tables.announcements.rows[1233].body, 'msg 1233 ไทย')
assert.equal(dump.tables.guilds.rows[0].name, 'Guild "One"')
assert.ok(!('__rowid' in dump.tables.guilds.rows[0]))
assert.match(dump.tables.guilds.sql, /CREATE TABLE/)
assert.ok(dump.indexes.some((s) => /idx_ann_guild/.test(s)))
assert.ok(dump.tables.d1_migrations === undefined || Array.isArray(dump.tables.d1_migrations.rows))
assert.ok(!JSON.stringify(dump).includes('discord-token'), 'session tokens are not backed up')

// รันซ้ำวันเดียวกัน = เขียนทับไฟล์เดิม (ไม่เพิ่มไฟล์)
await call('/__backup?now=' + (now + 60_000))
assert.equal((await (await call('/__list')).json()).length, 3)

// cron "0 20 * * *" → สำรอง (ไม่ประกาศ) · ทางอื่น ("0 0 * * *") ยังประกาศเหมือนเดิม
const before = (await sql([`SELECT COUNT(*) n FROM announcements WHERE auto=1`]))[0][0].n
await call('/__put?key=d1/2000-01-01.json.gz')
await (await mf.getWorker()).scheduled({ cron: '0 20 * * *' })
await new Promise((ok) => setTimeout(ok, 500))
const after = (await sql([`SELECT COUNT(*) n FROM announcements WHERE auto=1`]))[0][0].n
assert.equal(after, before, 'backup cron does not post announcements')
assert.ok(!(await (await call('/__list')).json()).includes('d1/2000-01-01.json.gz'), 'backup cron ran (old file cleaned up)')
console.log('BACKUP OK')
await mf.dispose()
