// ดึงคำอธิบายสกิลของอัศวิน (ไทย + อังกฤษ) จาก 7K Atlas มาเป็นไฟล์ในเว็บ
// ใช้:  node scripts/import-skill-text.mjs [โฟลเดอร์ที่โหลดไฟล์ Atlas ไว้แล้ว]
//   ไม่ใส่โฟลเดอร์ = โหลดจาก 7katlas.com เอง (อ่านอย่างเดียว ไม่แตะฐานข้อมูล)
// ผลลัพธ์: web/src/data/skillText.th.json + skillText.en.json (เว็บโหลดเฉพาะตอนเปิดดูสกิล)
// จับคู่อัศวินด้วยไฟล์รูปสกิลใน web/src/data/skills.json (ตัวเดียวกับที่ใช้ตั้งลำดับสกิล)
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = join(root, 'web/src/data')
const local = process.argv[2]
const FILES = { R: 'COMBINE/heroes-R.js', L: 'COMBINE/heroes-L.js', Lplus: 'COMBINE/heroes-Lplus.js', Lpp: 'COMBINE/heroes-Lpp.js', th: 'lang/th/heroes.js' }

async function load(key) {
  if (local) return readFileSync(join(local, key === 'th' ? 'th-heroes.js' : `heroes-${key}.js`), 'utf8')
  const res = await fetch(`https://7katlas.com/${FILES[key]}`)
  if (!res.ok) throw new Error(`โหลด ${FILES[key]} ไม่สำเร็จ: HTTP ${res.status}`)
  return res.text()
}
function run(src, expr) {
  const ctx = { window: {} }
  vm.createContext(ctx)
  vm.runInContext(`${src}\n;this.__out = ${expr};`, ctx)
  return ctx.__out
}

const atlas = []
for (const key of ['R', 'L', 'Lplus', 'Lpp']) {
  const src = await load(key)
  atlas.push(...run(src, src.match(/const (\w+)\s*=/)[1]))
}
const TH = run(await load('th'), 'window.I18N_HEROES')

const skillArt = JSON.parse(readFileSync(join(dataDir, 'skills.json'), 'utf8'))
const iconOf = (s) => s.icon?.split('/').pop()
const isAwake = (name) => ['ไอลีน', 'ฮายอน', 'อีจูฉี'].includes(name) || / awake/.test(name)

// Atlas ใช้ {kw|buff|ชื่อ|คำอธิบาย} ในข้อความ → เก็บไว้ให้เว็บทำสีคำ (บัฟ/ดีบัฟ)
const stripKw = (s) => String(s).replace(/\{kw\|\w+\|([^|]*)\|[^}]*\}/g, '$1').trim()
const tr = (map, s) => (!s ? s : map[s] ?? map[stripKw(s)] ?? s)
// ข้อความ effect ใน Atlas ขึ้นต้นด้วย "- " → ตัดออก เว็บใส่จุดเอง
const clean = (s) => String(s ?? '').replace(/^-\s*/, '').trim()

const KEY = { s1: 'bottom', ultimate: 'top', awakened: 'awake', passive: 'passive', basic: 'basic' }
const ORDER = ['awake', 'top', 'bottom', 'passive', 'basic']

// คำอธิบายบัฟ/ดีบัฟซ้ำกันหลายรอบ → เก็บครั้งเดียวต่ออัศวิน (kw) ในข้อความเหลือ {ชนิด|ชื่อ}
function compact(s, kw) {
  return s.replace(/\{kw\|(\w+)\|([^|]*)\|([^}]*)\}/g, (_, type, name, desc) => {
    if (!name) return ''
    if (!kw[name] && desc.trim()) kw[name] = [type, desc.trim()]
    return `{${type}|${name}}`
  })
}

function convert(skill, map, lang, kw) {
  const t = (s) => (s ? compact(lang === 'th' ? tr(map, s) : s, kw) : s)
  const name = lang === 'th' ? skill.name_th || skill.name : skill.name
  const out = { k: KEY[skill.key] }
  if (name) out.n = name
  if (skill.cooldown) out.cd = skill.cooldown
  if (skill.awaken_gauge) out.ag = skill.awaken_gauge
  out.g = (skill.target_groups ?? []).map((g) => ({ t: t(g.target) || '', e: (g.effects ?? []).map((e) => clean(t(e))).filter(Boolean) })).filter((g) => g.e.length)
  const up = (skill.enhancement ?? []).map((e) => clean([t(e.target), t(e.effect)].filter(Boolean).join(' · '))).filter(Boolean)
  if (up.length) out.up = up
  const tx = (skill.tx_bonuses ?? []).map((b) => ({ tier: b.tier, e: clean([t(b.target), t(b.effect)].filter(Boolean).join(' · ')) })).filter((b) => b.e)
  if (tx.length) out.tx = tx
  return out
}

const result = { th: {}, en: {} }
const missing = []
for (const [name, art] of Object.entries(skillArt)) {
  const icons = new Set(art.filter(Boolean).map((a) => a.file))
  const awake = isAwake(name)
  // หาอัศวินจากรูปสกิล (ร่างปกติกับร่าง awake ใช้รูปสกิลบน/ล่างเดียวกัน)
  const hero = atlas.find((h) => [...(h.skills ?? []), ...(h.skills_s6 ?? [])].some((s) => icons.has(iconOf(s))))
  if (!hero) { missing.push(name); continue }
  // ร่าง awake ใช้ skills · ร่างปกติใช้ skills_s6 (ถ้ามี) ไม่งั้น skills ที่ไม่มีสกิลอเวค
  const list = awake ? hero.skills : (hero.skills_s6 ?? hero.skills.filter((s) => s.key !== 'awakened'))
  const map = TH[hero.id] ?? {}
  for (const lang of ['th', 'en']) {
    const kw = {}
    const s = list.filter((x) => KEY[x.key]).map((x) => convert(x, map, lang, kw))
      .sort((a, b) => ORDER.indexOf(a.k) - ORDER.indexOf(b.k))
    result[lang][name] = { s, kw }
  }
}

for (const lang of ['th', 'en']) writeFileSync(join(dataDir, `skillText.${lang}.json`), JSON.stringify(result[lang]))
console.log(`skill text: ${Object.keys(result.th).length} อัศวิน`)
if (missing.length) console.log('ไม่พบใน Atlas:', missing.join(', '))
