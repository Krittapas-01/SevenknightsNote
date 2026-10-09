import assert from 'node:assert/strict'
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, relative, isAbsolute } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from '../web/node_modules/esbuild/lib/main.js'

const root = fileURLToPath(new URL('../', import.meta.url))
const temp = await mkdtemp(join(tmpdir(), '7k-audit-web-'))
let passed = 0
const check = (name, fn) => { fn(); passed++; console.log('PASS', name) }
try {
  const result = await build({ stdin: { contents: `export * from './web/src/lib/types.ts'; export * from './web/src/lib/war.ts'; export * from './web/src/lib/season.ts'; export * from './web/src/lib/allocation.ts'; export * from './web/src/data/heroes.ts'; export * from './web/src/lib/pasteNotes.ts';`, resolveDir: root }, bundle: true, write: false, format: 'esm', platform: 'node', plugins: [{ name: 'asset-globs', setup(b) { b.onLoad({ filter: /heroes\.ts$/ }, async args => { let contents = await readFile(args.path, 'utf8'); contents = contents.replace(/import\.meta\.glob\([^\n]+?\}\)/g, '({})'); return { contents, loader: 'ts' } }) } }] })
  const file = join(temp, 'logic.mjs')
  await writeFile(file, result.outputFiles[0].text)
  const m = await import(pathToFileURL(file))
  check('game day changes at 07:00 Bangkok', () => { assert.equal(m.dateKey(Date.parse('2026-10-03T06:59:59+07:00')), '2026-10-02'); assert.equal(m.dateKey(Date.parse('2026-10-03T07:00:00+07:00')), '2026-10-03'); assert.equal(m.dayIndex(Date.parse('2026-10-03T07:00:00+07:00')), 5) })
  check('season boundary and next season', () => { assert.equal(m.currentSeason('2026-08-06','2026-09-17','2026-09-17').phase,'in'); assert.equal(m.currentSeason('2026-08-06','2026-09-17','2026-09-18').phase,'off'); assert.equal(m.currentSeason('2026-08-06','2026-09-17','2026-09-24').start,'2026-09-24') })
  check('all 416 formation transitions preserve heroes and skill ownership', () => {
    let cases = 0
    for(let mask=0;mask<32;mask++) {
      const slots = Array.from({length:5},(_,i)=> mask & (1<<i) ? 'hero-'+i : null)
      if(slots.filter(Boolean).length>3) continue
      const skills = slots.flatMap((h,i)=>h?[{slot:i,skill:3}]:[])
      for(let from=1;from<=4;from++)for(let to=1;to<=4;to++) {
        const team={...m.emptyTeam(),front:from,slots}
        const r=m.changeFormation(team,skills,to)
        assert.deepEqual(r.team.slots.filter(Boolean).sort(),slots.filter(Boolean).sort())
        r.skills.forEach((s,i)=>assert.equal(r.team.slots[s.slot],slots[skills[i].slot]))
        assert.deepEqual(team.slots,slots)
        cases++
      }
    }
    assert.equal(cases,416)
  })
  check('swap moves awakening queue with hero',()=>{const t={...m.emptyTeam(),slots:['a','b',null,null,null]};const r=m.moveSlot(t,[{slot:0,skill:3}],{kind:'hero',index:0},{kind:'hero',index:1});assert.equal(r.skills[0].slot,1);assert.equal(r.team.slots[1],'a')})
  check('replacing hero clears old skills; fourth hero rejected',()=>{const t={...m.emptyTeam(),slots:['a','b','c',null,null]};assert.equal(m.placeUnit(t,[],{kind:'hero',index:3},'d'),null);assert.deepEqual(m.placeUnit(t,[{slot:0,skill:3}],{kind:'hero',index:0},'d').skills,[])})
  check('auto assignment avoids duplicates and banned teams',()=>{const option=id=>({...m.emptyOption(),team:{...m.emptyTeam(),slots:[id,null,null,null,null]}});const slots=[{kind:'attack',options:[option('ลูดี้'),option('เอซ')]},{kind:'attack',options:[option('ลูดี้')]}];const r=m.autoAssign(slots,[]);assert.equal(r.mains.get(0),1);assert.equal(r.mains.get(1),0);const banned=m.autoAssign(slots,[['เอซ']]);assert.equal(banned.unresolved.length,1)})
  check('English and Thai hero search',()=>{const h=m.getUnit('ทันจิโร่ awake');assert.ok(m.matchUnit(h,'Tanjiro'));assert.ok(m.matchUnit(h,'ทันจิโร่'));assert.ok(!m.matchUnit(h,'Zenitsu'))})
  check('legacy hero IDs resolve to canonical heroes',()=>{assert.equal(m.getUnit('tanjiro-awake').id,'ทันจิโร่ awake');assert.equal(m.getUnit('เทโอ').id,'แทโอ')})
  check('pasted notes recognize Thai team and hero',()=>{const p=m.parseNotes('ทีม 1\nทันจิโร่: โจมตี 4500');assert.equal(p.teams[0].heroes[0].id,'ทันจิโร่ awake')})
  assert.equal(await readFile(root+'web/src/lib/season.ts','utf8'),await readFile(root+'api/src/season.ts','utf8'))
  passed++; console.log('PASS frontend and API season implementations are identical')
  const skills=JSON.parse(await readFile(root+'web/src/data/skills.json','utf8'))
  const files=[...new Set(Object.values(skills).flat().filter(Boolean).map(s=>s.file))]
  for(const f of files){const b=await readFile(root+'web/src/assets/skills/'+f);assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP')}
  console.log(`PASS all ${files.length} referenced skill assets are valid WebP`)
  console.log(`${passed+1} checks passed (including 416 formation cases)`)
} finally {
  const withinTemp = relative(resolve(tmpdir()), resolve(temp))
  assert.ok(withinTemp && !withinTemp.startsWith('..') && !isAbsolute(withinTemp))
  await rm(temp, {recursive:true,force:true})
}
