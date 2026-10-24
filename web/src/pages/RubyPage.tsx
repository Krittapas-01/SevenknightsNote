import { ChevronDown, Clock, Coins, Flame, KeyRound, Minus, Plus, RotateCcw, Swords, Users } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import ruby from '../assets/ui/ruby.webp'
import { DEFAULT_FARM_FORM, FARM_STORE_KEY, GUILD_CHECKIN, KEY_SHOPS, POWER_UP, dailyKeys, farmInputOf, loadFarmForm, parseNum, planFarm, type FarmForm, type TierRow } from '../lib/rubyFarm'
import { L } from '../lib/i18n'

// คำนวณรูบี้ขายวิญญาณ: ต่อสู้ซ้ำด่านฟาร์มรูบี้ ซื้อกล่องกุญแจถึงขั้นไหนถึงคุ้ม · ข้อมูลเก็บในเครื่องนี้เท่านั้น
const MAX_TIERS = 6
const MAX_TEAM = 5

const num = (v: string, d = 0) => { const n = parseNum(v); return Number.isFinite(n) ? n : d }
const bad = (v: string) => v.trim() !== '' && (!Number.isFinite(parseNum(v)) || parseNum(v) < 0)
const fmt = (n: number) => Math.round(n).toLocaleString('en-US')
const fmt1 = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 })
const signed = (n: number) => (Math.round(n) > 0 ? `+${fmt(n)}` : fmt(n))
const big = (n: number) => (n >= 1e6 ? `${(n / 1e6).toLocaleString('en-US', { maximumFractionDigits: 2 })}M` : fmt(n))
const hours = (sec: number) => {
  const m = Math.round(sec / 60)
  const h = Math.floor(m / 60)
  return h ? L(`${h} ชม. ${m % 60} น.`, `${h}h ${m % 60}m`) : L(`${m} น.`, `${m}m`)
}

const INPUT = 'pill min-w-0 px-2 py-1.5 text-center tabular-nums outline-none focus:border-gold'
const numInput = (v: string) => `${INPUT} ${bad(v) ? '!border-red-400' : ''}`
const Ruby = ({ className = 'h-4 w-4' }: { className?: string }) => <img src={ruby} alt="" draggable={false} className={`${className} inline-block shrink-0 object-contain`} />

/** ช่องกรอกตัวเลข + ป้ายชื่อ + หน่วย */
function Field({ label, value, onChange, unit, placeholder, wide }: { label: string; value: string; onChange: (v: string) => void; unit?: ReactNode; placeholder?: string; wide?: boolean }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs text-white/55">
      {label}
      <span className="flex items-center gap-1.5">
        <input value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal" placeholder={placeholder} aria-label={label}
          aria-invalid={bad(value) || undefined} className={`${numInput(value)} ${wide ? 'w-28' : 'w-20'} text-sm text-white`} />
        {unit && <span className="text-white/50">{unit}</span>}
      </span>
    </label>
  )
}

/** แพ็ค/แหล่งกุญแจที่เปิดปิดได้ */
function KeyToggle({ on, onClick, label, sub, keys }: { on: boolean; onClick: () => void; label: string; sub: string; keys?: number }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onClick} className="flex w-full items-start gap-2 text-left">
      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border text-xs font-bold ${on ? 'border-gold bg-gold text-ink' : 'border-white/25'}`}>{on ? '✓' : ''}</span>
      <span className="min-w-0 flex-1">
        <span className={`block ${on ? '' : 'text-white/70'}`}>{label}</span>
        <span className="block text-xs text-white/45">{sub}</span>
      </span>
      {keys !== undefined && <b className={`tabular-nums ${on ? '' : 'text-white/35'}`}>{on ? fmt1(keys) : '–'}</b>}
    </button>
  )
}

function Stat({ icon, label, value, sub }: { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-xl bg-white/5 px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs text-white/55">{icon}{label}</div>
      <div className="mt-0.5 text-lg font-bold tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-white/45 tabular-nums">{sub}</div>}
    </div>
  )
}

/** ป้ายบอกว่าขั้นราคานี้คุ้มไหม (ได้คืนต่อกล่องเทียบราคา) */
function verdict(r: TierRow) {
  if (r.price === 0) return { label: L('ฟรี', 'Free'), cls: 'bg-emerald-400/15 text-emerald-300' }
  const ratio = r.perBox / r.price
  if (r.addNet < 0 && r.day.timeCapped) return { label: L('เกินเวลาเล่น', 'Over your time'), cls: 'bg-red-400/15 text-red-300' }
  if (ratio >= 1.1) return { label: L('คุ้ม', 'Profit'), cls: 'bg-emerald-400/15 text-emerald-300' }
  if (ratio >= 0.97) return { label: L('≈ เท่าทุน', '≈ Break-even'), cls: 'bg-amber-400/15 text-amber-300' }
  return { label: L('ขาดทุน', 'Loss'), cls: 'bg-red-400/15 text-red-300' }
}

export default function RubyPage() {
  const [form, setForm] = useState(loadFarmForm)
  const [boxes, setBoxes] = useState<number | null>(null) // null = ใช้ค่าแนะนำ
  const [more, setMore] = useState(false)
  const [shopsOpen, setShopsOpen] = useState(false)
  const shopsOn = KEY_SHOPS.filter((x) => !form.shopsOff.includes(x.id)).length
  useEffect(() => { try { localStorage.setItem(FARM_STORE_KEY, JSON.stringify(form)) } catch { /* ไม่มี storage ก็ไม่เป็นไร */ } }, [form])
  const set = (k: { [K in keyof FarmForm]: FarmForm[K] extends string ? K : never }[keyof FarmForm], v: string) => setForm((f) => ({ ...f, [k]: v }))
  const setTier = (i: number, patch: Partial<{ boxes: string; price: string }>) =>
    setForm((f) => ({ ...f, tiers: f.tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)) }))

  const input = useMemo(() => farmInputOf(form), [form])
  const keys = dailyKeys(form)
  const toggle = (k: 'powerUp' | 'rubySupport') => setForm((f) => ({ ...f, [k]: !f[k] }))
  const soul = num(form.soul)
  const plan = useMemo(() => planFarm(input, soul), [input, soul])
  // กล่องฟรีในร้านรูบี้ (ขั้นราคาแรกที่ราคา 0) อยู่ในขั้นราคากล่อง ไม่นับซ้ำในกุญแจฟรี
  const freeBoxKeys = plan.prices.filter((p) => p === 0).length * input.keysPerBox
  const total = plan.prices.length
  const n = boxes === null ? plan.best : Math.min(boxes, total)
  const day = plan.days[n]
  const isBest = n === plan.best
  const perSet = form.team * num(form.rubyPerHero)
  const owned = num(form.owned, NaN)
  const heroNeed = Math.max(0, day.heroesUsed - day.heroesDropped)
  const bestRow = plan.rows.find((r) => r.tier === plan.bestTier)

  return (
    <div className="mx-auto max-w-4xl">
      <p className="eyebrow mb-1.5">RUBY FARMING</p>
      <h1 className="gold-title flex items-center gap-2 text-3xl font-extrabold">{L('คำนวณรูบี้ขายวิญญาณ', 'Ruby Farming Calculator')}</h1>
      <p className="mt-2 text-sm leading-relaxed text-white/60">
        {L('ต่อสู้ซ้ำด่านฟาร์มรูบี้ทั้งวัน: ซื้อกล่องกุญแจถึงขั้นไหนถึงคุ้ม ใช้เวลากี่ชั่วโมง และต้องเตรียมฮีโร่ Lv.1 กี่ตัว',
          'Repeat-battle the Ruby Farming stage all day: how many key boxes are worth buying, how long it takes, and how many Lv.1 heroes you need')}
      </p>

      {/* ===== ตั้งค่าหลัก ===== */}
      <section className="panel panel-gold mt-5 p-4 sm:p-5">
        <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
          <div>
            <p className="text-sm font-medium text-gold">{L('ฮีโร่ Lv.1 ในทีม', 'Lv.1 heroes in the team')}</p>
            <div className="mt-2 flex gap-1.5" role="radiogroup" aria-label={L('ฮีโร่ Lv.1 ในทีม', 'Lv.1 heroes in the team')}>
              {Array.from({ length: MAX_TEAM }, (_, i) => i + 1).map((k) => (
                <button key={k} type="button" role="radio" aria-checked={form.team === k} onClick={() => setForm((f) => ({ ...f, team: k }))}
                  className={`pill grid h-10 w-10 place-items-center text-base font-bold tabular-nums ${form.team === k ? 'border-gold bg-gold/15 text-gold' : 'text-white/70 hover:border-gold'}`}>
                  {k}
                </button>
              ))}
            </div>
            <p className="mt-1.5 flex items-center gap-1 text-xs text-white/55 tabular-nums">
              = <Ruby className="h-3.5 w-3.5" /><b className="text-white">{fmt(perSet)}</b>{L(` ต่อ ${fmt(num(form.battlesPerSet, 10))} รอบ`, ` per ${fmt(num(form.battlesPerSet, 10))} battles`)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[auto_auto_1fr]">
            <div className="col-span-2 sm:col-span-1">
              <Field label={L('ราคาวิญญาณ', 'Your soul’s price')} value={form.soul} onChange={(v) => set('soul', v)} unit={L('รูบี้/ชม.', 'rubies/h')} />
              <div className="mt-1.5 flex flex-wrap gap-1">
                {[0, 100, 300].map((v) => (
                  <button key={v} type="button" onClick={() => set('soul', String(v))}
                    className={`rounded-full border px-2 py-0.5 text-[11px] ${num(form.soul) === v && form.soul.trim() !== '' ? 'border-gold text-gold' : 'border-white/15 text-white/55 hover:border-gold'}`}>
                    {v === 0 ? L('0 · ขายหมดตัว 😈', '0 · sell it all 😈') : fmt(v)}
                  </button>
                ))}
              </div>
            </div>
            <Field label={L('เล่นได้วันละ', 'Play time per day')} value={form.maxHours} onChange={(v) => set('maxHours', v)} unit={L('ชม.', 'h')} />
            <p className="col-span-2 self-end text-xs leading-relaxed text-white/45 sm:col-span-1">
              {L('ราคาวิญญาณ = เล่นเพิ่ม 1 ชั่วโมงต้องได้รูบี้สุทธิอย่างน้อยเท่านี้ ถึงจะซื้อขั้นถัดไป · 0 = ซื้อจนกำไรสูงสุด ไม่สนเวลา',
                'Soul price = the fewest net rubies one more hour of grinding must earn before buying the next tier · 0 = max profit, time be damned')}
            </p>
          </div>
        </div>
      </section>

      {/* ===== กุญแจฟรีต่อวัน ===== */}
      <section className="panel mt-5 p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-2 font-semibold text-gold"><KeyRound className="h-5 w-5" />{L('กุญแจฟรีต่อวัน', 'Free keys per day')}</h2>
          <span className="text-2xl font-extrabold tabular-nums">{fmt1(keys.total)}</span>
        </div>
        {freeBoxKeys > 0 && (
          <p className="mt-0.5 text-right text-xs text-white/50 tabular-nums">
            {L(`+ กล่องฟรีร้านรูบี้ ${fmt(freeBoxKeys)} ดอก = ${fmt1(keys.total + freeBoxKeys)}`, `+ free Ruby Shop box ${fmt(freeBoxKeys)} = ${fmt1(keys.total + freeBoxKeys)}`)}
          </p>
        )}
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          <li className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-white/70">{L('ฟื้นเอง 1 ดอกทุก', 'Regen 1 key every')}</span>
            <input value={form.regenSec} onChange={(e) => set('regenSec', e.target.value)} inputMode="numeric" aria-label={L('กุญแจฟื้นทุกกี่วินาที', 'Key regen seconds')}
              aria-invalid={bad(form.regenSec) || undefined} className={`${numInput(form.regenSec)} w-16 text-white`} />
            <span className="text-white/70">{L('วิ', 's')}</span>
            <b className="ml-auto tabular-nums">{fmt(keys.regen)}</b>
          </li>
          <KeyToggle on={form.powerUp} onClick={() => toggle('powerUp')} keys={keys.powerUp}
            label={L('แพ็ค Daily Power Up Support (฿149 / 28 วัน)', 'Daily Power Up Support (฿149 / 28 days)')}
            sub={L(`กุญแจฟื้นเร็วขึ้น ${POWER_UP.regenCut} วิ (+${fmt(keys.powerUpRegen)} ดอก) + ${POWER_UP.dailyKeys} ดอกทุกวัน`, `Keys regen ${POWER_UP.regenCut} s faster (+${fmt(keys.powerUpRegen)}) + ${POWER_UP.dailyKeys} keys daily`)} />
          <li className="flex items-center gap-2">
            <span className="text-white/70">{L('กล่องฟรีร้านรายวัน', 'Daily Shop free box')}</span>
            <input value={form.shopKeys} onChange={(e) => set('shopKeys', e.target.value)} inputMode="numeric" aria-label={L('กล่องฟรีร้านรายวัน', 'Daily Shop free box')}
              aria-invalid={bad(form.shopKeys) || undefined} className={`${numInput(form.shopKeys)} ml-auto w-16 text-white`} />
          </li>
          <li className="flex items-center gap-2">
            <span className="min-w-0 text-white/70">{L('ภารกิจรายวัน', 'Daily missions')} <span className="text-xs text-white/45">{L('(40 แต้ม 20 + 80 แต้ม 40)', '(40 pts 20 + 80 pts 40)')}</span></span>
            <input value={form.missionKeys} onChange={(e) => set('missionKeys', e.target.value)} inputMode="numeric" aria-label={L('กุญแจจากภารกิจรายวัน', 'Daily mission keys')}
              aria-invalid={bad(form.missionKeys) || undefined} className={`${numInput(form.missionKeys)} ml-auto w-16 shrink-0 text-white`} />
          </li>
          <li>
            <div className="flex items-center gap-2"><span className="text-white/70">{L('เช็กอินกิลด์', 'Guild check-in')}</span><b className="ml-auto tabular-nums">{fmt(keys.guild)}</b></div>
            <div className="mt-1.5 flex flex-wrap gap-1" role="radiogroup" aria-label={L('เช็กอินกิลด์', 'Guild check-in')}>
              {GUILD_CHECKIN.map((k, i) => (
                <button key={k} type="button" role="radio" aria-checked={form.guildKeys === k} onClick={() => setForm((f) => ({ ...f, guildKeys: k }))}
                  title={i ? L(`เมื่อวานเช็กอิน ${[1, 10, 15, 20, 25][i - 1]}+ คน`, `${[1, 10, 15, 20, 25][i - 1]}+ checked in yesterday`) : undefined}
                  className={`rounded-full border px-2.5 py-0.5 text-xs tabular-nums ${form.guildKeys === k ? 'border-gold bg-gold/15 text-gold' : 'border-white/15 text-white/55 hover:border-gold'}`}>
                  {k ? L(`${[1, 10, 15, 20, 25][i - 1]}+ คน · ${k}`, `${[1, 10, 15, 20, 25][i - 1]}+ · ${k}`) : L('ไม่มี', 'None')}
                </button>
              ))}
            </div>
          </li>
          <li className="flex items-center gap-2">
            <span className="min-w-0 text-white/70">7K Pass <span className="text-xs text-white/45">{L('(กุญแจต่อ 28 วัน · ฟรี 690)', '(keys per 28 days · free 690)')}</span></span>
            <input value={form.passKeys} onChange={(e) => set('passKeys', e.target.value)} inputMode="numeric" aria-label={L('กุญแจจาก 7K Pass ต่อ 28 วัน', '7K Pass keys per 28 days')}
              aria-invalid={bad(form.passKeys) || undefined} className={`${numInput(form.passKeys)} ml-auto w-16 shrink-0 text-white`} />
            <b className="w-12 shrink-0 text-right tabular-nums">{fmt1(keys.pass)}</b>
          </li>
          <li>
            <button type="button" onClick={() => setShopsOpen((o) => !o)} aria-expanded={shopsOpen} className="flex w-full items-center gap-2 text-left">
              <span className="min-w-0 text-white/70">{L('เช็กชื่อ · ภารกิจกิลด์ · ร้านค้า', 'Login · guild missions · shops')}{' '}
                <span className="text-xs text-white/45">{L(`(เปิด ${shopsOn}/${KEY_SHOPS.length})`, `(${shopsOn}/${KEY_SHOPS.length} on)`)}</span></span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-white/50 transition ${shopsOpen ? 'rotate-180' : ''}`} />
              <b className="ml-auto tabular-nums">{fmt1(keys.shops)}</b>
            </button>
            {shopsOpen && (
              <ul className="edit-arrive mt-2 flex flex-col gap-2 border-l border-white/10 pl-3">
              {KEY_SHOPS.map((x) => {
                const on = !form.shopsOff.includes(x.id)
                return (
                  <li key={x.id}>
                    <KeyToggle on={on} keys={x.keys / x.days} label={L(x.th, x.en)}
                      sub={L(`${fmt(x.keys)} กุญแจทุก ${x.days} วัน`, `${fmt(x.keys)} keys every ${x.days} days`)}
                      onClick={() => setForm((f) => ({ ...f, shopsOff: on ? [...f.shopsOff, x.id] : f.shopsOff.filter((id) => id !== x.id) }))} />
                  </li>
                )
              })}
              </ul>
            )}
          </li>
          <li className="flex items-center gap-2">
            <span className="text-white/70">{L('อื่น ๆ (อีเวนต์ ฯลฯ)', 'Other (events, etc.)')}</span>
            <input value={form.extraKeys} onChange={(e) => set('extraKeys', e.target.value)} inputMode="numeric" placeholder="0" aria-label={L('กุญแจอื่น ๆ', 'Other keys')}
              aria-invalid={bad(form.extraKeys) || undefined} className={`${numInput(form.extraKeys)} ml-auto w-16 text-white`} />
          </li>
        </ul>
        <div className="mt-4 border-t border-white/10 pt-3 text-sm">
          <KeyToggle on={form.rubySupport} onClick={() => toggle('rubySupport')}
            label={L('แพ็ค Daily Ruby Support (฿249 / 28 วัน)', 'Daily Ruby Support (฿249 / 28 days)')}
            sub={L('รูบี้จากด่านฟาร์มรูบี้เพิ่มขึ้น · ไม่นับ 200 รูบี้รายวันของแพ็ค', 'More rubies from Ruby Farming · the pack’s 200 daily rubies aren’t counted')} />
          {form.rubySupport && (
            <label className="mt-2 flex items-center gap-2 pl-7 text-white/70">
              {L('รูบี้จากฟาร์มเพิ่ม', 'Farming rubies +')}
              <input value={form.rubyBoost} onChange={(e) => set('rubyBoost', e.target.value)} inputMode="decimal" placeholder="?" aria-label={L('รูบี้จากฟาร์มเพิ่มกี่ %', 'Farming ruby boost %')}
                aria-invalid={bad(form.rubyBoost) || undefined} className={`${numInput(form.rubyBoost)} w-16 text-white`} />%
            </label>
          )}
        </div>
      </section>

      {/* ===== ผลลัพธ์ ===== */}
      <section className="panel panel-gold mt-5 p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gold"><Flame className="h-5 w-5" />{isBest ? L('แนะนำ', 'Recommended') : L('ลองซื้อเอง', 'Your pick')}</h2>
          {!isBest && (
            <button type="button" onClick={() => setBoxes(null)} className="flex items-center gap-1 text-xs text-white/60 hover:text-gold">
              <RotateCcw className="h-3.5 w-3.5" />{L(`กลับไปค่าแนะนำ (${plan.best} กล่อง)`, `Back to recommended (${plan.best} boxes)`)}
            </button>
          )}
        </div>
        <p className="mt-1 text-xl font-bold">
          {n === 0 ? L('ไม่ต้องซื้อกล่องกุญแจ ใช้แค่กุญแจฟรี', 'Skip the key boxes, use free keys only')
            : L(`ซื้อกล่องกุญแจ ${n} กล่อง`, `Buy ${n} key box${n > 1 ? 'es' : ''}`)}
          {isBest && bestRow && n > 0 && <span className="block text-sm font-normal text-white/55 sm:ml-2 sm:inline">{bestRow.price ? L(`(ถึงขั้น ${fmt(bestRow.price)} รูบี้)`, `(through the ${fmt(bestRow.price)}-ruby tier)`) : ''}</span>}
        </p>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className={`flex items-center gap-1.5 text-4xl font-extrabold tabular-nums ${day.net > 0 ? 'text-gold' : 'text-red-300'}`}><Ruby className="h-8 w-8" />{signed(day.net)}</span>
          <span className="text-sm text-white/55 tabular-nums">{L('รูบี้สุทธิ/วัน', 'net rubies/day')} · {L('ได้', 'earn')} {fmt(day.rubies)} − {L('ค่ากล่อง', 'boxes')} {fmt(day.cost)}</span>
        </div>

        {/* เลื่อนเลือกจำนวนกล่องเอง */}
        <div className="mt-4">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setBoxes(Math.max(0, n - 1))} disabled={n <= 0} aria-label={L('ลดกล่อง', 'One box less')}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/15 hover:border-gold disabled:opacity-30"><Minus className="h-4 w-4" /></button>
            <input type="range" min={0} max={total} value={n} onChange={(e) => setBoxes(Number(e.target.value))}
              aria-label={L('จำนวนกล่องกุญแจที่ซื้อ', 'Key boxes bought')} className="h-2 min-w-0 flex-1 accent-gold" />
            <button type="button" onClick={() => setBoxes(Math.min(total, n + 1))} disabled={n >= total} aria-label={L('เพิ่มกล่อง', 'One box more')}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/15 hover:border-gold disabled:opacity-30"><Plus className="h-4 w-4" /></button>
            <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums">{n}/{total}</span>
          </div>
          {n > 0 && <p className="mt-1 text-right text-[11px] text-white/45 tabular-nums">{L(`กล่องใบที่ ${n} ราคา ${fmt(plan.prices[n - 1])} รูบี้`, `Box #${n} costs ${fmt(plan.prices[n - 1])} rubies`)}</p>}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat icon={<Swords className="h-3.5 w-3.5" />} label={L('จำนวนรอบ', 'Battles')} value={fmt(day.battles)}
            sub={L(`ใช้ ${fmt(day.keys - day.leftKeys)} กุญแจ`, `${fmt(day.keys - day.leftKeys)} keys used`)} />
          <Stat icon={<Clock className="h-3.5 w-3.5" />} label={L('เวลา', 'Time')} value={hours(day.seconds)}
            sub={day.timeCapped ? <span className="text-amber-300">{L('ชนเวลาเล่นต่อวันแล้ว', 'Hit your daily play time')}</span> : L(`${fmt(num(form.secPerBattle, 21))} วิ/รอบ`, `${fmt(num(form.secPerBattle, 21))} s/battle`)} />
          <Stat icon={<Users className="h-3.5 w-3.5" />} label={L('ฮีโร่ Lv.1 ที่ใช้', 'Lv.1 heroes used')} value={fmt(day.heroesUsed)}
            sub={day.heroesDropped > 0 ? L(`ดรอป ~${fmt(day.heroesDropped)} · ต้องหาเพิ่ม ${fmt(heroNeed)}`, `~${fmt(day.heroesDropped)} drop · ${fmt(heroNeed)} more needed`) : L(`${form.team} ตัว ทุก ${fmt(num(form.battlesPerSet, 10))} รอบ`, `${form.team} every ${fmt(num(form.battlesPerSet, 10))} battles`)} />
          <Stat icon={<Coins className="h-3.5 w-3.5" />} label={L('ทอง', 'Gold')} value={big(day.gold)}
            sub={day.quests ? L(`เควสต์ทำซ้ำ ${day.quests} ครั้ง`, `${day.quests} repeat quests`) : undefined} />
        </div>
        {Number.isFinite(owned) && heroNeed > 0 && (
          <p className={`mt-2 rounded-xl px-3 py-2 text-sm ${owned >= heroNeed ? 'bg-emerald-400/10 text-emerald-300' : 'bg-red-400/10 text-red-300'}`}>
            {owned >= heroNeed
              ? L(`ฮีโร่ Lv.1 ที่มี ${fmt(owned)} ตัว พอเล่นแบบนี้ได้ ${fmt(Math.floor(owned / heroNeed))} วัน`, `Your ${fmt(owned)} Lv.1 heroes last ${fmt(Math.floor(owned / heroNeed))} day(s) at this pace`)
              : L(`ฮีโร่ Lv.1 ที่มี ${fmt(owned)} ตัว ยังขาดอีก ${fmt(heroNeed - owned)} ตัวสำหรับวันนี้`, `Your ${fmt(owned)} Lv.1 heroes are ${fmt(heroNeed - owned)} short for today`)}
          </p>
        )}
        {day.leftKeys >= 1 && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-white/45"><KeyRound className="h-3.5 w-3.5" />
            {L(`เหลือ ${fmt(Math.floor(day.leftKeys))} กุญแจ (ไม่ครบชุด ${fmt(num(form.battlesPerSet, 10))} รอบ) เก็บไว้เล่นวันถัดไป`, `${fmt(Math.floor(day.leftKeys))} keys left over (not a full ${fmt(num(form.battlesPerSet, 10))}-battle set), keep them for tomorrow`)}
          </p>
        )}
      </section>

      {/* ===== เทียบทีละขั้นราคา ===== */}
      <section className="mt-5">
        <h2 className="text-sm font-medium text-gold">{L('เทียบทีละขั้นราคากล่อง', 'Tier by tier')}</h2>
        <p className="mt-1 text-xs text-white/45">{L('แตะขั้นไหนเพื่อดูผลถ้าซื้อถึงท้ายขั้นนั้น', 'Tap a tier to see the result of buying through it')}</p>
        <div className="mt-2 space-y-2">
          {plan.rows.map((r) => {
            const v = r.tier < 0 ? null : verdict(r)
            const active = n === r.to
            const picked = plan.bestTier === r.tier || (r.tier < 0 && plan.best === 0)
            return (
              <button key={r.tier} type="button" onClick={() => setBoxes(r.to)} aria-pressed={active}
                className={`block w-full rounded-2xl border p-3 text-left transition sm:p-4 ${active ? 'border-gold/70 bg-gold/10' : 'border-white/10 bg-white/[.04] hover:border-gold/50'}`}>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <b>{r.tier < 0 ? L('ไม่ซื้อ ใช้กุญแจฟรี', 'No boxes, free keys only')
                    : r.from === r.to ? L(`กล่องที่ ${r.from}`, `Box ${r.from}`) : L(`กล่องที่ ${r.from}–${r.to}`, `Boxes ${r.from}–${r.to}`)}</b>
                  {r.tier >= 0 && <span className="flex items-center gap-1 text-sm text-white/60 tabular-nums">{r.price ? <><Ruby className="h-3.5 w-3.5" />{fmt(r.price)}{L('/กล่อง', '/box')}</> : L('ฟรี', 'free')}</span>}
                  {v && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${v.cls}`}>{v.label}</span>}
                  {picked && <span className="rounded-full bg-gold px-2 py-0.5 text-[11px] font-semibold text-ink">{L('✓ แนะนำถึงขั้นนี้', '✓ Recommended')}</span>}
                </span>
                <span className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-white/60 tabular-nums sm:grid-cols-4">
                  {r.tier < 0
                    ? <span>{L(`ได้ ${fmt(r.day.rubies)} รูบี้`, `${fmt(r.day.rubies)} rubies`)}</span>
                    : <span className={r.addNet > 0 ? 'text-emerald-300' : r.addNet < 0 ? 'text-red-300' : ''}>{L(`${signed(r.addNet)} รูบี้ จากขั้นก่อน`, `${signed(r.addNet)} rubies vs last tier`)}</span>}
                  <span>{r.tier < 0 ? hours(r.day.seconds) : L(`+${hours(r.addHours * 3600)}`, `+${hours(r.addHours * 3600)}`)}{Number.isFinite(r.perHour) && r.addHours > 0 ? L(` · ${fmt(r.perHour)}/ชม.`, ` · ${fmt(r.perHour)}/h`) : ''}</span>
                  {r.tier >= 0 && r.price > 0 && <span>{L(`ได้คืน ~${fmt(r.perBox)} ต่อกล่อง`, `~${fmt(r.perBox)} back per box`)}</span>}
                  <span>{L(`รวม ${signed(r.day.net)} · ${fmt(r.day.battles)} รอบ`, `Total ${signed(r.day.net)} · ${fmt(r.day.battles)} battles`)}</span>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* ===== ค่าที่ใช้คิด ===== */}
      <section className="panel mt-5">
        <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="flex w-full items-center justify-between gap-2 p-4 text-left">
          <span>
            <span className="block font-semibold">{L('ค่าที่ใช้คิด (แก้ได้)', 'Game values (editable)')}</span>
            <span className="block text-xs text-white/50">{L('กุญแจ · เวลา · ทอง · เควสต์ทำซ้ำ · ราคากล่อง · ดรอปฮีโร่', 'Keys · time · gold · repeat quest · box prices · hero drops')}</span>
          </span>
          <ChevronDown className={`h-5 w-5 shrink-0 text-white/50 transition ${more ? 'rotate-180' : ''}`} />
        </button>
        {more && (
          <div className="edit-arrive border-t border-white/10 p-4">
            <p className="text-sm font-medium text-gold">{L('ฮีโร่ Lv.1', 'Lv.1 heroes')}</p>
            <div className="mt-2 flex flex-wrap gap-3">
              <Field label={L('ดรอปเฉลี่ยต่อรอบ', 'Avg drops per battle')} value={form.heroDrop} onChange={(v) => set('heroDrop', v)} placeholder={L('ยังไม่รู้', 'unknown')} unit={L('ตัว', 'heroes')} />
              <Field label={L('มีอยู่ตอนนี้', 'You have now')} value={form.owned} onChange={(v) => set('owned', v)} placeholder="–" unit={L('ตัว', 'heroes')} />
              <Field label={L('รูบี้ต่อฮีโร่ที่เต็มเลเวล', 'Rubies per maxed hero')} value={form.rubyPerHero} onChange={(v) => set('rubyPerHero', v)} unit={<Ruby />} />
              <Field label={L('รอบต่อชุด (ฮีโร่เต็มเลเวล)', 'Battles per set (heroes max out)')} value={form.battlesPerSet} onChange={(v) => set('battlesPerSet', v)} unit={L('รอบ', 'battles')} />
            </div>

            <p className="mt-5 text-sm font-medium text-gold">{L('กุญแจและการต่อสู้', 'Keys and battles')}</p>
            <div className="mt-2 flex flex-wrap gap-3">
              <Field label={L('กุญแจต่อรอบ', 'Keys per battle')} value={form.keysPerBattle} onChange={(v) => set('keysPerBattle', v)} unit={<KeyRound className="h-4 w-4" />} />
              <Field label={L('เวลาต่อรอบ', 'Time per battle')} value={form.secPerBattle} onChange={(v) => set('secPerBattle', v)} unit={L('วิ', 's')} />
              <Field label={L('ทองต่อรอบ', 'Gold per battle')} value={form.goldPerBattle} onChange={(v) => set('goldPerBattle', v)} unit={<Coins className="h-4 w-4" />} wide />
            </div>

            <p className="mt-5 text-sm font-medium text-gold">{L('เควสต์ทำซ้ำ', 'Repeat quest')}</p>
            <div className="mt-2 flex flex-wrap gap-3">
              <Field label={L('ทุก', 'Every')} value={form.questEvery} onChange={(v) => set('questEvery', v)} unit={L('รอบ', 'battles')} />
              <Field label={L('ได้กุญแจ', 'Keys')} value={form.questKeys} onChange={(v) => set('questKeys', v)} unit={<KeyRound className="h-4 w-4" />} />
              <Field label={L('ได้ทอง', 'Gold')} value={form.questGold} onChange={(v) => set('questGold', v)} unit={<Coins className="h-4 w-4" />} wide />
            </div>

            <p className="mt-5 text-sm font-medium text-gold">{L('กล่องกุญแจ (ราคารีเซ็ตทุกวัน 07:00)', 'Key boxes (prices reset daily at 07:00 TH)')}</p>
            <div className="mt-2"><Field label={L('กุญแจต่อกล่อง', 'Keys per box')} value={form.keysPerBox} onChange={(v) => set('keysPerBox', v)} unit={<KeyRound className="h-4 w-4" />} /></div>
            <div className="mt-3 flex flex-col gap-2">
              {form.tiers.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-white/60">
                  <span className="w-11 shrink-0 text-xs">{L(`ขั้น ${i + 1}`, `Tier ${i + 1}`)}</span>
                  <input value={t.boxes} onChange={(e) => setTier(i, { boxes: e.target.value })} inputMode="numeric" aria-label={L(`จำนวนกล่องขั้น ${i + 1}`, `Tier ${i + 1} boxes`)}
                    aria-invalid={bad(t.boxes) || undefined} className={`${numInput(t.boxes)} w-16 text-white`} />
                  <span className="whitespace-nowrap">{L('กล่อง ×', 'boxes ×')}</span>
                  <input value={t.price} onChange={(e) => setTier(i, { price: e.target.value })} inputMode="numeric" aria-label={L(`ราคาขั้น ${i + 1}`, `Tier ${i + 1} price`)}
                    aria-invalid={bad(t.price) || undefined} className={`${numInput(t.price)} w-16 text-white`} />
                  <Ruby />
                  <button type="button" onClick={() => setForm((f) => ({ ...f, tiers: f.tiers.filter((_, j) => j !== i) }))} disabled={form.tiers.length <= 1}
                    aria-label={L('ลบขั้นนี้', 'Remove tier')} className="ml-1 grid h-7 w-7 place-items-center rounded-full text-white/40 hover:text-red-300 disabled:opacity-30"><Minus className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
            {form.tiers.length < MAX_TIERS && (
              <button type="button" onClick={() => setForm((f) => ({ ...f, tiers: [...f.tiers, { boxes: '10', price: '' }] }))}
                className="pill mt-2 flex items-center gap-1 px-3 py-1.5 text-sm hover:border-gold"><Plus className="h-4 w-4" />{L('เพิ่มขั้นราคา', 'Add price tier')}</button>
            )}

            <button type="button" onClick={() => { setForm(DEFAULT_FARM_FORM); setBoxes(null) }}
              className="mt-5 flex items-center gap-1.5 text-xs text-white/55 hover:text-gold"><RotateCcw className="h-3.5 w-3.5" />{L('กลับเป็นค่าเริ่มต้นทั้งหมด', 'Reset everything to defaults')}</button>
          </div>
        )}
      </section>

      <p className="mt-6 text-xs leading-relaxed text-white/40">
        {L('นับรูบี้เฉพาะชุดที่ครบ (ฮีโร่เต็มเลเวลพร้อมกันทุก 10 รอบ) · เควสต์ทำซ้ำคืนกุญแจระหว่างเล่น เลยได้รอบเพิ่มนิดหน่อย · กุญแจไม่มีเพดาน ที่เหลือเก็บไว้วันถัดไป · ค่าเริ่มต้นมาจากที่ผู้เล่นจับเวลาเอง ปรับให้ตรงกับเครื่องตัวเองได้ · ข้อมูลเก็บไว้ในเครื่องนี้เท่านั้น',
          'Rubies count only full sets (heroes max out together every 10 battles) · the repeat quest refunds keys while you play, so you get a few extra battles · keys have no cap, leftovers carry over · defaults come from a player’s own timing, adjust them to your device · data stays on this device')}
      </p>
    </div>
  )
}
