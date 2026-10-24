import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'

// M1/M2: สิทธิ์จากยศ Discord ทำเรื่องของเจ้าของไม่ได้ · กันเดารหัสแบบยิงพร้อมกัน
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
async function request(path, { method = 'GET', body, key, token, ip } = {}) {
  const headers = { 'Content-Type': 'application/json', ...(key ? { 'X-Edit-Key': encodeURIComponent(key) } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(ip ? { 'CF-Connecting-IP': ip } : {}) }
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
  const g = (await request('/api/guild', { method: 'POST', body: { name: 'Owner Test', password: 'owner-pass-123' } })).data
  const path = '/api/guild/' + g.id
  const key = 'owner-pass-123'
  assert.equal((await request(path + '/discord', { method: 'PUT', key, body: { mention: '', serverId: '111111', editRoles: ['222222'] } })).status, 200)
  // ผู้ใช้ Discord ที่มียศแก้ได้ (แคชยศไว้ ไม่เรียก Discord จริง)
  const token = 'role-user-token'
  assert.equal((await request('/__audit_setup', { method: 'POST', body: [
    `INSERT INTO sessions (token_hash, user_id, name, avatar, access_token, expires_at) VALUES ('${await sha(token)}', 'u1', 'Role User', '', 'x', ${Date.now() + 3600e3})`,
    `INSERT INTO member_cache (k, roles, nick, at) VALUES ('u1:111111', '["222222"]', '', ${Date.now() + 3600e3})`,
  ] })).status, 200)
  const team = { front: 2, slots: ['ทันจิโร่ awake', null, 'ซอรัน awake', null, 'ไอลีน'], pet: 'อีรีน', extras: [null, null, null, null], speed: 200, skills: [] }

  await check('role user can edit content', async () => assert.equal((await request(path + '/targets', { method: 'POST', token, body: { team, tags: ['เวท'] } })).status, 201))
  await check('role user /check: canEdit but not owner', async () => { const r = (await request(path + '/check', { token })).data; assert.equal(r.canEdit, true); assert.equal(r.owner, false) })
  await check('key holder /check: owner', async () => { const r = (await request(path + '/check', { key })).data; assert.equal(r.canEdit, true); assert.equal(r.owner, true) })
  await check('role user cannot change password', async () => assert.equal((await request(path + '/password', { method: 'PUT', token, body: { password: 'hijack-123' } })).status, 403))
  await check('role user cannot change Discord settings', async () => assert.equal((await request(path + '/discord', { method: 'PUT', token, body: { mention: '', serverId: '999999', editRoles: ['888888'] } })).status, 403))
  await check('role user cannot rename guild', async () => assert.equal((await request(path + '/name', { method: 'PUT', token, body: { name: 'Hijacked' } })).status, 403))
  await check('rename: name shorter than 3 characters rejected', async () => assert.equal((await request(path + '/name', { method: 'PUT', key, body: { name: ' AB ' } })).status, 400))
  await check('rename: empty name rejected', async () => assert.equal((await request(path + '/name', { method: 'PUT', key, body: { name: '   ' } })).status, 400))
  await check('rename: taken name rejected (case/space-insensitive)', async () => {
    await request('/api/guild', { method: 'POST', body: { name: 'Other Guild', password: 'other-pass-123' } })
    assert.equal((await request(path + '/name', { method: 'PUT', key, body: { name: '  other guild ' } })).status, 409)
  })
  await check('rename: owner renames, name trimmed + 50 chars, rev bumped', async () => {
    const before = (await request(path, { key })).data.rev
    const r = await request(path + '/name', { method: 'PUT', key, body: { name: '  Renamed ' + 'x'.repeat(80) } })
    assert.equal(r.status, 200); assert.equal(r.data.name.length, 50); assert.ok(r.data.name.startsWith('Renamed '))
    const after = (await request(path, { key })).data
    assert.equal(after.guild.name, r.data.name); assert.ok(after.rev > before)
    const names = (await request('/api/guilds/names?ids=' + g.id)).data
    assert.equal(names[g.id], r.data.name)
  })
  await check('rename: same name (own) allowed', async () => {
    const cur = (await request(path, { key })).data.guild.name
    assert.equal((await request(path + '/name', { method: 'PUT', key, body: { name: cur.toUpperCase() } })).status, 200)
  })
  await check('role user cannot delete guild', async () => assert.equal((await request(path, { method: 'DELETE', token, body: { confirmName: 'Owner Test' } })).status, 403))
  await check('owner key still works after all that', async () => assert.equal((await request(path + '/check', { key })).data.owner, true))
  await check('correct key used many times does not lock itself out', async () => { for (let i = 0; i < 15; i++) assert.equal((await request(path + '/check', { key, ip: '10.0.0.5' })).data.canEdit, true) })
  await check('60 parallel wrong guesses: at most 10 are actually checked', async () => {
    const rs = await Promise.all(Array.from({ length: 60 }, (_, i) => request(path + '/check', { key: 'wrong-' + i, ip: '10.0.0.9' })))
    const checked = rs.filter((r) => !r.data.locked).length
    assert.ok(checked <= 10, 'checked ' + checked)
    assert.equal((await request(path + '/check', { key, ip: '10.0.0.9' })).data.locked, true) // ล็อกแล้ว รหัสถูกก็รอ
  })
  await check('IPv6 in the same /64 shares one lock', async () => {
    for (let i = 0; i < 10; i++) await request(path + '/check', { key: 'bad' + i, ip: `2001:db8:1:2::${i + 1}` })
    assert.equal((await request(path + '/check', { key: 'bad-x', ip: '2001:db8:1:2:ffff::1' })).data.locked, true)
    assert.equal((await request(path + '/check', { key, ip: '2001:db8:9:9::1' })).data.canEdit, true) // คนละ /64 ไม่โดน
  })
  // M11: แก้ทับกัน
  const t = (await request(path + '/targets', { method: 'POST', key, body: { team, tags: ['เวท'] } })).data
  const ct = (await request(path + '/targets/' + t.id + '/counters', { method: 'POST', key, body: { team } })).data
  await check('target edit with current base works and returns new version', async () => {
    const g0 = (await request(path)).data.targets.find((x) => x.id === t.id)
    const r = await request(path + '/targets/' + t.id, { method: 'PUT', key, body: { team, tags: ['เวท'], note: 'A', baseEditedAt: g0.editedAt } })
    assert.equal(r.status, 200); assert.ok(r.data.editedAt > 0)
    // อีกคนแก้จากเวอร์ชันเก่า → 409 ไม่ทับ
    const r2 = await request(path + '/targets/' + t.id, { method: 'PUT', key, body: { team, tags: ['เวท'], note: 'B', baseEditedAt: g0.editedAt } })
    assert.equal(r2.status, 409)
    assert.equal((await request(path)).data.targets.find((x) => x.id === t.id).note, 'A')
  })
  await check('editing a counter does not conflict with target edits', async () => {
    const g1 = (await request(path)).data.targets.find((x) => x.id === t.id)
    assert.equal((await request(path + '/counters/' + ct.id, { method: 'PUT', key, body: { team, note: 'c1', baseUpdatedAt: ct.updatedAt } })).status, 200)
    assert.equal((await request(path + '/targets/' + t.id, { method: 'PUT', key, body: { team, tags: ['เวท'], note: 'A2', baseEditedAt: g1.editedAt } })).status, 200)
  })
  await check('counter edit from stale version → 409', async () => {
    const r = await request(path + '/counters/' + ct.id, { method: 'PUT', key, body: { team, note: 'stale', baseUpdatedAt: ct.updatedAt } })
    assert.equal(r.status, 409)
  })
  await check('no base = old behaviour (always saves)', async () => assert.equal((await request(path + '/counters/' + ct.id, { method: 'PUT', key, body: { team, note: 'x' } })).status, 200))
  console.log(JSON.stringify({ passed, failures }))
} finally { await mf.dispose() }
process.exitCode = failures ? 1 : 0
