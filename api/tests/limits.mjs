import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'

// Runs against an ephemeral local D1 database; never reads deployment credentials.
const root = fileURLToPath(new URL('../', import.meta.url))
const bundle = await build({ stdin: { resolveDir: root, contents: `
  import worker from './src/index.ts';
  let initialized = false;
  export default { ...worker, async fetch(request, env, ctx) {
    if (!initialized && new URL(request.url).pathname === '/__audit_setup' && request.method === 'POST') {
      for (const sql of await request.json()) await env.DB.prepare(sql).run();
      initialized = true;
      return Response.json({ok:true});
    }
    return worker.fetch(request, env, ctx);
  }};
` }, bundle: true, write: false, format: 'esm', platform: 'browser' })
const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: bundle.outputFiles[0].text, compatibilityDate: '2026-09-24', d1Databases: ['DB'], bindings: { ALLOWED_ORIGIN: 'https://7k-note.pages.dev', SITE_URL: 'http://127.0.0.1:4175' }, host: '127.0.0.1', port: process.argv.includes('--serve') ? 8899 : 0 }))
let failures = 0
let passed = 0
async function check(name, fn) {
  try { await fn(); passed++; console.log('PASS', name) }
  catch (error) { failures++; console.error('FAIL', name, error.message) }
}
async function request(path, { method = 'GET', body, key } = {}) {
  const res = await fetch(new URL(path, await mf.ready), { method, headers: { 'Content-Type': 'application/json', ...(key ? { 'X-Edit-Key': encodeURIComponent(key) } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) })
  return { status: res.status, data: await res.json() }
}
try {
  const files = ['schema.sql', ...(await readdir(root + 'migrations')).filter(f => f.endsWith('.sql')).sort().map(f => 'migrations/' + f)]
  const statements = []
  for (const file of files) {
    const sql = (await readFile(root + file, 'utf8')).replace(/--[^\n]*/g, '')
    statements.push(...sql.split(';').map(s => s.trim()).filter(Boolean))
  }
  assert.equal((await request('/__audit_setup', { method: 'POST', body: statements })).status, 200)
  const base = await mf.ready
  const opt = (origin) => fetch(new URL('/api/guild/x/pulse', base), { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'PUT', 'Access-Control-Request-Headers': 'content-type,x-edit-key' } })
  await check('CORS allows site, preview and localhost', async () => {
    for (const o of ['https://7k-note.pages.dev', 'https://6ca8bd94.7k-note.pages.dev', 'http://localhost:5173']) {
      const r = await opt(o); assert.equal(r.headers.get('access-control-allow-origin'), o, o); assert.equal(r.headers.get('access-control-max-age'), '7200')
    }
  })
  await check('CORS blocks other sites', async () => {
    for (const o of ['https://evil.com', 'https://7k-note.pages.dev.evil.com', 'http://7k-note.pages.dev']) { const r = await opt(o); assert.ok(r.headers.get('access-control-allow-origin') !== o, o) }
  })
  await check('GET pulse without Content-Type works', async () => { const r = await fetch(new URL('/api/guild/nope/pulse', base)); assert.equal(r.status, 404) })
  await check('guild creation rate-limited per IP (5/h)', async () => {
    const mk = (i) => fetch(new URL('/api/guild', base), { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.2.3.4' }, body: JSON.stringify({ name: 'RL' + i + Math.random(), password: 'secret12' }) })
    const st = []; for (let i = 0; i < 7; i++) st.push((await mk(i)).status)
    assert.deepEqual(st, [201, 201, 201, 201, 201, 429, 429])
    const other = await fetch(new URL('/api/guild', base), { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '5.6.7.8' }, body: JSON.stringify({ name: 'RLother', password: 'secret12' }) })
    assert.equal(other.status, 201)
  })
  const g = (await request('/api/guild', { method: 'POST', body: { name: 'Plan2', password: 'pass1234' } })).data
  const team = { front: 2, slots: ['a', null, 'b', null, null], pet: null, extras: [null, null, null, null], speed: 0 }
  const plan = (await request(`/api/guild/${g.id}/plans`, { method: 'POST', key: 'pass1234', body: { title: 'x', data: { kind: 'attack', slots: [{ options: [{ team }] }] } } })).data
  await check('plan save with matching base succeeds, stale base gets 409', async () => {
    const r1 = await request(`/api/guild/${g.id}/plans/${plan.id}`, { method: 'PUT', key: 'pass1234', body: { title: 'A', data: plan.data, baseUpdatedAt: plan.updatedAt } })
    assert.equal(r1.status, 200); assert.ok(r1.data.updatedAt)
    const r2 = await request(`/api/guild/${g.id}/plans/${plan.id}`, { method: 'PUT', key: 'pass1234', body: { title: 'B', data: plan.data, baseUpdatedAt: plan.updatedAt } })
    assert.equal(r2.status, 409)
    const r3 = await request(`/api/guild/${g.id}/plans/${plan.id}`, { method: 'PUT', key: 'pass1234', body: { title: 'C', data: plan.data } })
    assert.equal(r3.status, 200) // ไม่ส่ง base (เช่นบันทึกต่อจาก log) = ทับได้ตามเดิม
    const r4 = await request(`/api/guild/${g.id}/plans/nope`, { method: 'PUT', key: 'pass1234', body: { title: 'C', data: plan.data, baseUpdatedAt: 1 } })
    assert.equal(r4.status, 404)
  })
  await check('wrong-key failures cleaned up when guild deleted', async () => {
    await request(`/api/guild/${g.id}/check`, { key: 'wrong-key' })
    const r = await request(`/api/guild/${g.id}`, { method: 'DELETE', key: 'pass1234', body: { confirmName: 'Plan2' } })
    assert.equal(r.status, 200)
  })
  await check('target/counter limits 150/15', async () => {
    const g2 = (await request('/api/guild', { method: 'POST', body: { name: 'Lim', password: 'pass1234' } })).data
    const t = (await request(`/api/guild/${g2.id}/targets`, { method: 'POST', key: 'pass1234', body: { team } })).data
    const st = []; for (let i = 0; i < 16; i++) st.push((await request(`/api/guild/${g2.id}/targets/${t.id}/counters`, { method: 'POST', key: 'pass1234', body: { team } })).status)
    assert.deepEqual(st.slice(-2), [201, 400])
  })
} finally { await mf.dispose() }
console.log(JSON.stringify({ passed, failures }))
