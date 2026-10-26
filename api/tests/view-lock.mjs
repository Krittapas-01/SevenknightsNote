import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'

// รหัสเข้ากิลด์ (view_code): กันคนที่ออกกิลด์ไปแล้วแต่ยังมีลิงก์
// Runs against an ephemeral local D1 database; never reads deployment credentials.
const root = fileURLToPath(new URL('../', import.meta.url))
const bundle = await build({ stdin: { resolveDir: root, contents: `
  import worker from './src/index.ts';
  let initialized = false;
  export default { ...worker, async fetch(request, env, ctx) {
    if (new URL(request.url).pathname === '/__audit_setup' && request.method === 'POST') {
      for (const sql of await request.json()) await env.DB.prepare(sql).run();
      initialized = true;
      return Response.json({ok:true});
    }
    return worker.fetch(request, env, ctx);
  }};
` }, bundle: true, write: false, format: 'esm', platform: 'browser' })
const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: bundle.outputFiles[0].text, compatibilityDate: '2026-09-24', d1Databases: ['DB'], bindings: { ALLOWED_ORIGIN: '*', SITE_URL: 'http://127.0.0.1:4175' }, host: '127.0.0.1', port: process.argv.includes('--serve') ? 8899 : 0 }))
let failures = 0
let passed = 0
async function check(name, fn) {
  try { await fn(); passed++; console.log('PASS', name) }
  catch (error) { failures++; console.error('FAIL', name, error.message) }
}
async function request(path, { method = 'GET', body, key, view, token, ip } = {}) {
  const headers = { 'Content-Type': 'application/json', ...(key ? { 'X-Edit-Key': encodeURIComponent(key) } : {}), ...(view ? { 'X-View-Key': encodeURIComponent(view) } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(ip ? { 'CF-Connecting-IP': ip } : {}) }
  const res = await fetch(new URL(path, await mf.ready), { method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) })
  return { status: res.status, data: await res.json() }
}
const sha = async (s) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))).map((b) => b.toString(16).padStart(2, '0')).join('')
try {
  const files = ['schema.sql', ...(await readdir(root + 'migrations')).filter(f => f.endsWith('.sql')).sort().map(f => 'migrations/' + f)]
  const statements = []
  for (const file of files) {
    const sql = (await readFile(root + file, 'utf8')).replace(/--[^\n]*/g, '')
    statements.push(...sql.split(';').map(s => s.trim()).filter(Boolean))
  }
  assert.equal((await request('/__audit_setup', { method: 'POST', body: statements })).status, 200)
  const g = (await request('/api/guild', { method: 'POST', body: { name: 'View Lock Test', password: 'owner-pass-123' } })).data
  const path = '/api/guild/' + g.id
  const key = 'owner-pass-123'
  const team = { front: 2, slots: ['ทันจิโร่ awake', null, 'ซอรัน awake', null, 'ไอลีน'], pet: 'อีรีน', extras: [null, null, null, null], speed: 200, skills: [] }
  assert.equal((await request(path + '/targets', { method: 'POST', key, body: { team, tags: ['เวท'] } })).status, 201)

  await check('unlocked guild: anyone with the link can view (as before)', async () => {
    const r = await request(path)
    assert.equal(r.status, 200); assert.equal(r.data.targets.length, 1); assert.equal(r.data.guild.viewLock, undefined)
    assert.equal((await request(path + '/pulse')).status, 200)
  })
  await check('unlocked guild: /check shows viewCode null to the owner', async () => assert.equal((await request(path + '/check', { key })).data.viewCode, null))
  await check('non-owner cannot set the guild code', async () => assert.equal((await request(path + '/view', { method: 'PUT', body: { code: 'hijack' } })).status, 403))
  await check('code shorter than 4 is rejected', async () => assert.equal((await request(path + '/view', { method: 'PUT', key, body: { code: 'abc' } })).status, 400))
  await check('code longer than 32 is rejected', async () => assert.equal((await request(path + '/view', { method: 'PUT', key, body: { code: 'x'.repeat(33) } })).status, 400))
  await check('owner sets the guild code', async () => {
    const r = await request(path + '/view', { method: 'PUT', key, body: { code: ' รหัสกิลด์1 ' } })
    assert.equal(r.status, 200); assert.equal(r.data.viewCode, 'รหัสกิลด์1')
  })
  const code = 'รหัสกิลด์1'
  await check('locked: no code = 401 with guild name only', async () => {
    const r = await request(path)
    assert.equal(r.status, 401); assert.equal(r.data.viewLocked, true); assert.equal(r.data.guildName, 'View Lock Test')
    assert.equal(r.data.targets, undefined); assert.equal(r.data.wrong, false)
  })
  await check('locked: ?rev short-circuit is gated too', async () => assert.equal((await request(path + '?rev=1.1.x.y')).status, 401))
  await check('locked: pulse without code = 401 (no announcements leak)', async () => {
    const r = await request(path + '/pulse'); assert.equal(r.status, 401); assert.equal(r.data.latest, undefined)
    assert.equal((await request(path + '/pulse?rev=whatever')).status, 401)
  })
  await check('locked: right code opens guild + pulse', async () => {
    const r = await request(path, { view: code })
    assert.equal(r.status, 200); assert.equal(r.data.guild.viewLock, true); assert.equal(r.data.targets.length, 1)
    const p = await request(path + '/pulse', { view: code }); assert.equal(p.status, 200)
    const u = await request(path + '/pulse?rev=' + encodeURIComponent(p.data.rev), { view: code }); assert.equal(u.data.unchanged, true)
  })
  await check('right code used many times never locks itself out', async () => {
    for (let i = 0; i < 25; i++) assert.equal((await request(path + '/pulse', { view: code, ip: '10.1.0.1' })).status, 200)
  })
  await check('owner /check returns the code (for invite link)', async () => assert.equal((await request(path + '/check', { key })).data.viewCode, code))
  await check('no edit rights: /check does not return the code', async () => assert.equal((await request(path + '/check', { view: code })).data.viewCode, undefined))
  await check('edit key still saves without the view code', async () => assert.equal((await request(path + '/targets', { method: 'POST', key, body: { team, tags: ['เวท'] } })).status, 201))
  await check('wrong code = 401 wrong', async () => {
    const r = await request(path, { view: 'nope', ip: '10.2.0.1' }); assert.equal(r.status, 401); assert.equal(r.data.wrong, true)
  })
  await check('10 wrong codes lock that IP for 15 min (right code too), other IPs fine', async () => {
    for (let i = 0; i < 10; i++) await request(path + '/pulse', { view: 'guess' + i, ip: '10.3.0.1' })
    assert.equal((await request(path, { view: code, ip: '10.3.0.1' })).status, 429)
    assert.equal((await request(path, { view: code, ip: '10.3.0.2' })).status, 200)
  })
  await check('no code sent does not count as a wrong guess', async () => {
    for (let i = 0; i < 15; i++) await request(path + '/pulse', { ip: '10.4.0.1' })
    assert.equal((await request(path, { view: code, ip: '10.4.0.1' })).status, 200)
  })
  await check('changing the code shuts out the old code (ex-member)', async () => {
    assert.equal((await request(path + '/view', { method: 'PUT', key, body: { code: 'newcode99' } })).status, 200)
    assert.equal((await request(path, { view: code })).status, 401)
    assert.equal((await request(path + '/pulse', { view: code })).status, 401)
    assert.equal((await request(path, { view: 'newcode99' })).status, 200)
  })
  await check('setting the code bumps rev (open tabs reload and see the lock)', async () => {
    const before = (await request(path, { view: 'newcode99' })).data.rev
    await request(path + '/view', { method: 'PUT', key, body: { code: 'newcode98' } })
    const after = (await request(path, { view: 'newcode98' })).data.rev
    assert.notEqual(before, after)
  })
  await check('owner turns the lock off: open to the link again', async () => {
    const r = await request(path + '/view', { method: 'PUT', key, body: { code: '' } })
    assert.equal(r.status, 200); assert.equal(r.data.viewCode, null)
    const g2 = await request(path); assert.equal(g2.status, 200); assert.equal(g2.data.guild.viewLock, undefined)
  })
  console.log(JSON.stringify({ passed, failures }))
} finally { await mf.dispose() }
process.exitCode = failures ? 1 : 0
