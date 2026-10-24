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
const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: bundle.outputFiles[0].text, compatibilityDate: '2026-09-24', d1Databases: ['DB'], bindings: { ALLOWED_ORIGIN: '*', SITE_URL: 'http://127.0.0.1:4175' }, host: '127.0.0.1', port: process.argv.includes('--serve') ? 8899 : 0 }))
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
  const a = (await request('/api/guild', { method: 'POST', body: { name: 'Audit Alpha' } })).data
  const b = (await request('/api/guild', { method: 'POST', body: { name: 'Audit Beta' } })).data
  assert.ok(a.id && a.editKey && b.id)
  const path = '/api/guild/' + a.id
  const team = { front: 2, slots: ['ทันจิโร่ awake', null, 'ซอรัน awake', null, 'ไอลีน'], pet: 'อีรีน', extras: [null, null, null, null], speed: 200, skills: [{ slot: 0, skill: 3 }] }
  let target, counter, plan
  await check('guild name shorter than 3 characters rejected', async () => { for (const name of ['AB', ' ab ', 'กข']) assert.equal((await request('/api/guild', { method: 'POST', body: { name } })).status, 400) })
  await check('Thai marks above/below do not count toward 3 characters', async () => { for (const name of ['กี้', 'กี้ก']) assert.equal((await request('/api/guild', { method: 'POST', body: { name } })).status, 400) })
  await check('3 real characters accepted (spacing vowels count)', async () => assert.equal((await request('/api/guild', { method: 'POST', body: { name: 'กี้กา' } })).status, 201))
  await check('duplicate guild names rejected', async () => assert.equal((await request('/api/guild', { method: 'POST', body: { name: ' audit alpha ' } })).status, 409))
  await check('public guild read hides edit credentials', async () => { const r = await request(path); assert.equal(r.status, 200); assert.equal(r.data.guild.edit_hash, undefined); assert.equal(r.data.targets.length, 0) })
  await check('unauthorized write rejected', async () => assert.equal((await request(path + '/targets', { method: 'POST', body: { team } })).status, 403))
  await check('wrong guild edit key rejected', async () => assert.equal((await request(path + '/targets', { method: 'POST', body: { team }, key: b.editKey })).status, 403))
  await check('create target and preserve awakening skill', async () => { const r = await request(path + '/targets', { method: 'POST', body: { team, tags: ['กายภาพ'], note: 'audit' }, key: a.editKey }); assert.equal(r.status, 201); target = r.data; assert.equal(target.team.skills[0].skill, 3) })
  await check('reject more than three heroes', async () => assert.equal((await request(path + '/targets', { method: 'POST', body: { team: { ...team, slots: ['a','b','c','d',null] } }, key: a.editKey })).status, 400))
  await check('create counter with equipment notes and awakening', async () => { const r = await request(path + '/targets/' + target.id + '/counters', { method: 'POST', key: a.editKey, body: { team, skills: [{ slot: 0, skill: 3 }], heroNotes: [{ hero: 'ทันจิโร่ awake', text: 'note', sets: ['set'], rings: ['ring'], stats: { atk: 4500 } }] } }); assert.equal(r.status, 201); counter = r.data; assert.equal(counter.skills[0].skill, 3) })
  await check('cross-guild target update blocked', async () => assert.equal((await request('/api/guild/' + b.id + '/targets/' + target.id, { method: 'PUT', key: b.editKey, body: { team } })).status, 404))
  await check('cross-guild counter creation blocked', async () => assert.equal((await request('/api/guild/' + b.id + '/targets/' + target.id + '/counters', { method: 'POST', key: b.editKey, body: { team } })).status, 404))
  await check('counter update retains omitted hero notes', async () => { assert.equal((await request(path + '/counters/' + counter.id, { method: 'PUT', key: a.editKey, body: { team, skills: [{ slot: 0, skill: 3 }] } })).status, 200); const r = await request(path); assert.equal(r.data.targets[0].counters[0].heroNotes[0].stats.atk, 4500) })
  await check('plan save and reload retains awakening queue', async () => { const r = await request(path + '/plans', { method: 'POST', key: a.editKey, body: { title: 'Audit plan', data: { kind: 'attack', slots: [{ options: [{ team, skills: [{ slot: 0, skill: 3 }] }] }] } } }); assert.equal(r.status, 201); plan = r.data; assert.equal(plan.data.slots.length, 5); assert.equal(plan.data.slots[0].options[0].skills[0].skill, 3) })
  await check('announcement rejects opponent guild name shorter than 3 characters', async () => assert.equal((await request(path + '/announcements', { method: 'POST', key: a.editKey, body: { body: 'Local test only', opponent: 'AB' } })).status, 400))
  await check('announcement rejects another guild plan', async () => assert.equal((await request('/api/guild/' + b.id + '/announcements', { method: 'POST', key: b.editKey, body: { planId: plan.id } })).status, 400))
  await check('announcement and pulse select correct plan', async () => { assert.equal((await request(path + '/announcements', { method: 'POST', key: a.editKey, body: { planId: plan.id, body: 'Local test only' } })).status, 201); assert.equal((await request(path + '/pulse')).data.activePlan.id, plan.id) })
  await check('pulse with current rev answers unchanged, new announcement changes it', async () => {
    const full = (await request(path + '/pulse')).data
    const same = await request(path + '/pulse?rev=' + encodeURIComponent(full.rev))
    assert.equal(same.status, 200); assert.equal(same.data.unchanged, true); assert.equal(same.data.rev, full.rev); assert.deepEqual(same.data.schedule, full.schedule); assert.deepEqual(same.data.season, full.season)
    assert.equal((await request(path + '/announcements', { method: 'POST', key: a.editKey, body: { body: 'Local test only 2' } })).status, 201)
    const next = (await request(path + '/pulse?rev=' + encodeURIComponent(full.rev))).data
    assert.equal(next.unchanged, undefined); assert.notEqual(next.rev, full.rev); assert.equal(next.latest.body, 'Local test only 2'); assert.equal(next.activePlan.id, plan.id)
    assert.equal((await request('/api/guild/missing/pulse?rev=' + encodeURIComponent(full.rev))).status, 404)
  })
  await check('counters keep manual order, then unsorted by time', async () => {
    const mk = async () => (await request(path + '/targets/' + target.id + '/counters', { method: 'POST', key: a.editKey, body: { team } })).data.id
    const c2 = await mk(), c3 = await mk()
    assert.equal((await request(path + '/targets/' + target.id + '/counters/order', { method: 'PUT', key: a.editKey, body: { ids: [c3, counter.id, c2] } })).status, 200)
    const c4 = await mk(); await new Promise((r) => setTimeout(r, 5)); const c5 = await mk() // ยังไม่เคยเรียง = ต่อท้ายตามเวลาที่จด
    const ids = (await request(path)).data.targets.find((t) => t.id === target.id).counters.map((x) => x.id)
    assert.deepEqual(ids, [c3, counter.id, c2, c4, c5])
  })
  await check('missing guild returns 404', async () => assert.equal((await request('/api/guild/missing')).status, 404))
  await check('null JSON request returns validation error, not server error', async () => assert.equal((await request('/api/guild', { method: 'POST', body: null })).status, 400))
  await check('duplicate heroes rejected', async () => assert.equal((await request(path + '/targets', { method: 'POST', key: a.editKey, body: { team: { ...team, slots: ['same', 'same', null, null, null] } } })).status, 400))
  await check('array and primitive JSON bodies rejected', async () => { for (const body of [[], 'text', 123, true]) assert.equal((await request(path + '/targets', { method: 'POST', key: a.editKey, body })).status, 400) })
  await check('custom guild password accepted and authenticates', async () => { const r = await request('/api/guild', { method: 'POST', body: { name: 'Audit Password', password: 'audit-only-123' } }); assert.equal(r.status, 201); assert.equal((await request('/api/guild/' + r.data.id + '/check', { key: 'audit-only-123' })).data.canEdit, true) })
  await check('short custom guild password rejected', async () => assert.equal((await request('/api/guild', { method: 'POST', body: { name: 'Audit Invalid Password', password: '123' } })).status, 400))
  await check('password change invalidates old edit key', async () => { assert.equal((await request('/api/guild/' + b.id + '/password', { method: 'PUT', key: b.editKey, body: { password: 'audit-new-only' } })).status, 200); assert.equal((await request('/api/guild/' + b.id + '/check', { key: b.editKey })).data.canEdit, false); assert.equal((await request('/api/guild/' + b.id + '/check', { key: 'audit-new-only' })).data.canEdit, true) })
  await check('deleting a plan clears active plan references', async () => { assert.equal((await request(path + '/plans/' + plan.id, { method: 'DELETE', key: a.editKey })).status, 200); assert.equal((await request(path + '/pulse')).data.activePlan, null) })
  await check('deleting target also deletes its counters', async () => { assert.equal((await request(path + '/targets/' + target.id, { method: 'DELETE', key: a.editKey })).status, 200); assert.equal((await request(path)).data.targets.length, 0); assert.equal((await request(path + '/counters/' + counter.id, { method: 'PUT', key: a.editKey, body: { team } })).status, 404) })
  await check('guild deletion requires matching confirmation name', async () => assert.equal((await request('/api/guild/' + b.id, { method: 'DELETE', key: 'audit-new-only', body: { confirmName: 'wrong' } })).status, 400))
  await check('confirmed local test guild deletion succeeds', async () => { assert.equal((await request('/api/guild/' + b.id, { method: 'DELETE', key: 'audit-new-only', body: { confirmName: 'Audit Beta' } })).status, 200); assert.equal((await request('/api/guild/' + b.id)).status, 404) })
  console.log(JSON.stringify({ passed, failures }))
  if (process.argv.includes('--serve')) {
    console.log('Local audit API:', String(await mf.ready), 'guild:', a.id)
    await new Promise(() => {})
  }
} finally { await mf.dispose() }
process.exitCode = failures ? 1 : 0
