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
  const g = (await request('/api/guild', { method: 'POST', body: { name: 'AT', password: 'pass1234' } })).data
  await check('autoText saved, trimmed, capped, returned', async () => {
    const r = await request(`/api/guild/${g.id}/schedule`, { method: 'PUT', key: 'pass1234', body: { autoAnnounce: true, autoText: { attack: '  ตี {วัน}  ', defense: 'x'.repeat(400) } } })
    assert.equal(r.status, 200); assert.equal(r.data.autoText.attack, 'ตี {วัน}'); assert.equal(r.data.autoText.defense.length, 300)
    const got = (await request(`/api/guild/${g.id}`)).data
    assert.deepEqual(got.autoText, { attack: 'ตี {วัน}', defense: 'x'.repeat(300) })
  })
  await check('old client (no autoText) keeps saved text', async () => {
    const r = await request(`/api/guild/${g.id}/schedule`, { method: 'PUT', key: 'pass1234', body: { autoAnnounce: false } })
    assert.equal(r.status, 200)
    const got = (await request(`/api/guild/${g.id}`)).data
    assert.equal(got.autoAnnounce, false); assert.equal(got.autoText.attack, 'ตี {วัน}')
  })
  await check('no key = denied', async () => {
    const r = await request(`/api/guild/${g.id}/schedule`, { method: 'PUT', body: { autoText: { attack: 'hack', defense: '' } } })
    assert.ok(r.status === 401 || r.status === 403, String(r.status))
  })
  await check('non-string ignored', async () => {
    const r = await request(`/api/guild/${g.id}/schedule`, { method: 'PUT', key: 'pass1234', body: { autoText: { attack: 123, defense: null } } })
    assert.deepEqual(r.data.autoText, { attack: '', defense: '' })
  })
} finally {
  console.log(JSON.stringify({ passed, failures }))
  await mf.dispose()
}
