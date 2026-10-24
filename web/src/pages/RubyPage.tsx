import { ChevronDown, Clock, Coins, KeyRound, Minus, Plus, RotateCcw, Swords, Users } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import ruby from '../assets/ui/ruby.webp'
import packPowerUp from '../assets/packs/power-up.webp'
import packRuby from '../assets/packs/ruby-support.webp'
import packPass from '../assets/packs/7k-pass.webp'
import packCheckin from '../assets/packs/premium-checkin.webp'
import { DEFAULT_FARM_FORM, FARM_STORE_KEY, BASE_KEYS, GUILD_CHECKIN, PAID_KEYS, POWER_UP, RUBY_SUPPORT, dailyKeys, farmBattles, farmInputOf, loadFarmForm, parseNum, planFarm, type FarmForm, type TierRow } from '../lib/rubyFarm'
import { L } from '../lib/i18n'
import RubyIcon from '../components/RubyIcon'

// คำนวณรูบี้ขายวิญญาณ: เล่นได้วันละกี่ชั่วโมง → ฟาร์มได้กี่รอบ ใช้ฮีโร่ Lv.1 กี่ตัว ได้รูบี้เท่าไหร่ · ข้อมูลเก็บในเครื่องนี้เท่านั้น
const MAX_TIERS = 6
const MAX_TEAM = 5
const QUICK_HOURS = [1, 2, 3, 4, 6]

const num = (v: string, d = 0) => { const n = parseNum(v); return Number.isFinite(n) ? n : d }
const bad = (v: string) => v.trim() !== '' && (!Number.isFinite(parseNum(v)) || parseNum(v) < 0)
/** รับ "3", "2.5" หรือ "3:45" (ชั่วโมง:นาที) · ว่าง/อ่านไม่ได้ = NaN */
const parseHours = (v: string) => {
  const m = /^\s*(\d+)\s*:\s*(\d{1,2})\s*$/.exec(v)
  return m ? Number(m[1]) + Number(m[2]) / 60 : parseNum(v)
}
const badHours = (v: string) => v.trim() !== '' && !(parseHours(v) >= 0)
const fmt = (n: number) => Math.round(n).toLocaleString('en-US')
const fmt1 = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 })
const signed = (n: number) => (Math.round(n) > 0 ? `+${fmt(n)}` : fmt(n))
const big = (n: number) => (n >= 1e6 ? `${(n / 1e6).toLocaleString('en-US', { maximumFractionDigits: 2 })}M` : fmt(n))
const hours = (sec: number) => {
  const m = Math.round(sec / 60)
  const h = Math.floor(m / 60)
  return h ? L(`${h} ชม. ${m % 60} น.`, `${h}h ${m % 60}m`) : L(`${m} น.`, `${m}m`)
}
/** วินาที → "3:57" (ปัดนาทีขึ้น ให้กรอกกลับแล้วได้รอบเท่าเดิม) */
const hm = (sec: number) => { const m = Math.ceil(sec / 60 - 1e-9); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}` }

const INPUT = 'pill min-w-0 px-2 py-1.5 text-center tabular-nums outline-none focus:border-gold'
const numInput = (v: string) => `${INPUT} ${bad(v) ? '!border-red-400' : ''}`
const Ruby = ({ className = 'h-4 w-4' }: { className?: string }) => <img src={ruby} alt="" draggable={false} className={`${className} inline-block shrink-0 object-contain`} />
const CHIP = (on: boolean) => `rounded-full border px-2.5 py-0.5 text-xs tabular-nums ${on ? 'border-gold bg-gold/15 text-gold' : 'border-white/15 text-white/55 hover:border-gold'}`

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

/** แพ็คที่ติ๊กได้ · รูปแพ็คชิดขวา (ด้านซ้ายของรูปโปร่งใส ตัวหนังสือวางทับได้) */
function PackToggle({ on, onClick, img, label, sub, value }: { on: boolean; onClick: () => void; img: string; label: string; sub: string; value: ReactNode }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onClick}
      className={`relative flex min-h-[84px] w-full items-center overflow-hidden rounded-xl border text-left text-sm transition ${on ? 'border-gold/70 bg-gold/10' : 'border-white/10 bg-white/[.03] hover:border-gold/40'}`}>
      <img src={img} alt="" draggable={false} loading="lazy"
        className={`pack-art pointer-events-none absolute inset-y-0 right-0 h-full w-[52%] object-cover object-right transition ${on ? '' : 'opacity-40 grayscale-[.6]'}`} />
      <span className="relative flex min-w-0 items-start gap-2.5 p-2.5 pr-[44%]">
        <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border text-xs font-bold ${on ? 'border-gold bg-gold text-ink' : 'border-white/30'}`}>{on ? '✓' : ''}</span>
        <span className="min-w-0">
          <span className={`block font-semibold leading-snug ${on ? '' : 'text-white/80'}`}>{label}</span>
          <span className="mt-0.5 block text-[11px] leading-snug text-white/55">{sub}</span>
          <b className={`mt-1 flex items-center gap-1 tabular-nums ${on ? 'text-gold' : 'text-white/45'}`}>{value}</b>
        </span>
      </span>
    </button>
  )
}

function Big({ icon, label, value, sub }: { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white/5 px-2 py-3 text-center">
      <div className="flex items-center justify-center gap-1 text-xs text-white/55">{icon}{label}</div>
      <div className="mt-1 text-2xl font-extrabold tabular-nums sm:text-3xl">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-white/45 tabular-nums">{sub}</div>}
    </div>
  )
}

/** ป้ายบอกว่าขั้นราคานี้คุ้มไหม (ได้คืนต่อกล่องเทียบราคา) */
function verdict(r: TierRow) {
  if (r.price === 0) return { label: L('ฟรี', 'Free'), cls: 'bg-emerald-400/15 text-emerald-300' }
  const ratio = r.perBox / r.price
  if (ratio >= 1.1) return { label: L('คุ้ม', 'Profit'), cls: 'bg-emerald-400/15 text-emerald-300' }
  if (ratio >= 0.97) return { label: L('≈ เท่าทุน', '≈ Break-even'), cls: 'bg-amber-400/15 text-amber-300' }
  return { label: L('ขาดทุน', 'Loss'), cls: 'bg-red-400/15 text-red-300' }
}

export default function RubyPage() {
  const [form, setForm] = useState(loadFarmForm)
  const [more, setMore] = useState(false)
  const [keysOpen, setKeysOpen] = useState(false)
  const [baseOpen, setBaseOpen] = useState(false)
  useEffect(() => { try { localStorage.setItem(FARM_STORE_KEY, JSON.stringify(form)) } catch { /* ไม่มี storage ก็ไม่เป็นไร */ } }, [form])
  const set = (k: { [K in keyof FarmForm]: FarmForm[K] extends string ? K : never }[keyof FarmForm], v: string) => setForm((f) => ({ ...f, [k]: v }))
  const setTier = (i: number, patch: Partial<{ boxes: string; price: string }>) =>
    setForm((f) => ({ ...f, tiers: f.tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)) }))
  const toggle = (k: 'powerUp' | 'rubySupport' | 'passPremium' | 'premiumCheckin') => setForm((f) => ({ ...f, [k]: !f[k] }))

  const input = useMemo(() => farmInputOf(form), [form])
  const keys = dailyKeys(form)
  const plan = useMemo(() => planFarm(input, 0), [input])
  const setSize = Math.max(1, Math.floor(num(form.battlesPerSet, 10)))
  const sec = Math.max(1, num(form.secPerBattle, 21))
  // ว่าง = เล่นเท่าที่ไม่ต้องจ่ายรูบี้ (กุญแจฟรี + กล่องฟรี)
  let freeN = 0
  while (freeN < plan.prices.length && plan.prices[freeN] === 0) freeN++
  const freeBattles = plan.days[freeN].battles
  const maxBattles = plan.days[plan.prices.length].battles
  const typed = parseHours(form.hours)
  const auto = !(typed >= 0)
  // ชั่วโมง → รอบ (ปัดลงให้ครบชุด) · เกินที่ร้านขายกล่องได้ = เล่นได้เท่าที่มีกุญแจ
  const wanted = auto ? freeBattles : Math.floor(Math.floor((Math.min(24, typed) * 3600 + 1e-6) / sec) / setSize) * setSize
  const battles = Math.min(wanted, maxBattles)
  const r = useMemo(() => farmBattles(input, battles, plan.prices), [input, battles, plan.prices])
  const perSet = form.team * num(form.rubyPerHero)
  const stepHours = (d: number) => {
    const h = auto ? Math.ceil((r.seconds / 3600) * 2) / 2 : typed
    set('hours', String(Math.max(0, Math.min(24, Math.round((h + d) * 2) / 2))))
  }

  return (
    <div className="mx-auto max-w-3xl">
      <p className="eyebrow mb-1.5">RUBY FARMING</p>
      <h1 className="gold-title flex items-center gap-2 text-3xl font-extrabold"><RubyIcon className="h-7 w-7 shrink-0 text-gold" />{L('คำนวณรูบี้ขายวิญญาณ', 'Ruby Farming Calculator')}</h1>
      <p className="mt-2 text-sm leading-relaxed text-white/60">
        {L('ใส่ว่าเล่นได้วันละกี่ชั่วโมง แล้วดูว่าฟาร์มได้กี่รอบ ใช้ฮีโร่ Lv.1 กี่ตัว และได้รูบี้เท่าไหร่',
          'Enter how many hours you play a day and see how many battles you get, how many Lv.1 heroes you need, and how many rubies you earn')}
      </p>

      {/* ===== กรอก + ผลลัพธ์ ===== */}
      <section className="panel panel-gold mt-5 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:gap-6">
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
              = <Ruby className="h-3.5 w-3.5" /><b className="text-white">{fmt(perSet)}</b>{L(` ทุก ${fmt(setSize)} รอบ`, ` every ${fmt(setSize)} battles`)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gold">{L('เล่นได้วันละ', 'Play time per day')}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <button type="button" onClick={() => stepHours(-0.5)} disabled={battles <= 0} aria-label={L('ลดครึ่งชั่วโมง', 'Half an hour less')}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 hover:border-gold disabled:opacity-30"><Minus className="h-4 w-4" /></button>
              <input value={form.hours} onChange={(e) => set('hours', e.target.value)} inputMode="decimal" placeholder={hm(plan.days[freeN].seconds)}
                aria-label={L('เล่นได้วันละกี่ชั่วโมง', 'Hours played per day')} aria-invalid={badHours(form.hours) || undefined}
                className={`${INPUT} ${badHours(form.hours) ? '!border-red-400' : ''} h-10 w-24 text-lg font-bold text-white`} />
              <button type="button" onClick={() => stepHours(0.5)} disabled={!auto && typed >= 24} aria-label={L('เพิ่มครึ่งชั่วโมง', 'Half an hour more')}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 hover:border-gold disabled:opacity-30"><Plus className="h-4 w-4" /></button>
              <span className="text-sm text-white/55">{L('ชม.', 'h')}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              <button type="button" onClick={() => set('hours', '')} className={CHIP(auto)}>
                {L(`แค่กุญแจฟรี · ${hours(plan.days[freeN].seconds)}`, `Free keys only · ${hours(plan.days[freeN].seconds)}`)}
              </button>
              {QUICK_HOURS.map((q) => (
                <button key={q} type="button" onClick={() => set('hours', String(q))} className={CHIP(!auto && typed === q)}>
                  {L(`${q} ชม.`, `${q}h`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <Big icon={<Swords className="h-3.5 w-3.5" />} label={L('ฟาร์มได้', 'Battles')} value={fmt(r.battles)}
            sub={L(`${hours(r.seconds)}`, `${hours(r.seconds)}`)} />
          <Big icon={<Users className="h-3.5 w-3.5" />} label={L('ฮีโร่ Lv.1', 'Lv.1 heroes')} value={fmt(r.heroes)}
            sub={L(`${form.team} ตัว × ${fmt(r.sets)} ชุด`, `${form.team} × ${fmt(r.sets)} sets`)} />
          <Big icon={<Ruby className="h-3.5 w-3.5" />} label={L('รูบี้สุทธิ', 'Net rubies')} value={<span className={r.net >= 0 ? 'text-gold' : 'text-red-300'}>{signed(r.net)}</span>}
            sub={r.cost ? L(`ได้ ${fmt(r.rubies)} − กล่อง ${fmt(r.cost)}`, `${fmt(r.rubies)} − ${fmt(r.cost)} boxes`) : L('ไม่เสียค่ากล่อง', 'No box cost')} />
        </div>

        {/* กุญแจ / กล่อง / สุทธิ */}
        <div className="mt-3 rounded-xl bg-white/[.04] px-3 py-2.5 text-sm">
          <p className="flex items-start gap-1.5 text-white/70 tabular-nums">
            <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-white/50" />
            <span className="min-w-0">{L(`ใช้กุญแจ ${fmt(r.keysNeeded)} · มีกุญแจฟรีวันละ ${fmt(r.freeKeys)} · ได้ทอง ${big(r.gold)}`, `Uses ${fmt(r.keysNeeded)} keys · ${fmt(r.freeKeys)} free keys a day · ${big(r.gold)} gold`)}</span>
          </p>
          {r.boxes === 0
            ? <p className="mt-1 font-semibold text-emerald-300">{L('ไม่ต้องซื้อกล่องกุญแจ', 'No key boxes needed')}</p>
            : r.cost === 0
            ? <p className="mt-1 font-semibold text-emerald-300">{L(`ใช้กล่องฟรีในร้าน ${fmt(r.boxes)} กล่อง ไม่ต้องจ่ายรูบี้`, `Uses ${fmt(r.boxes)} free shop box${r.boxes > 1 ? 'es' : ''}, no rubies spent`)}</p>
            : (
              <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 tabular-nums">
                <span className="font-semibold">{L(`ซื้อกล่องกุญแจ ${fmt(r.boxes)} กล่อง`, `Buy ${fmt(r.boxes)} key box${r.boxes > 1 ? 'es' : ''}`)}</span>
                <span className="flex items-center gap-1 text-white/60">({r.cost ? <><Ruby className="h-3.5 w-3.5" />{fmt(r.cost)}</> : L('ฟรี', 'free')})</span>
              </p>
            )}
          {wanted > maxBattles && (
            <p className="mt-1 text-xs text-amber-300">{L(`ร้านขายกล่องวันละ ${fmt(plan.prices.length)} กล่อง กุญแจพอเล่นแค่ ${hours(r.seconds)}`, `The shop sells ${fmt(plan.prices.length)} boxes a day, enough keys for ${hours(r.seconds)} only`)}</p>
          )}
          {form.rubySupport && (
            <p className="mt-1.5 flex items-center gap-1 border-t border-white/10 pt-1.5 text-xs text-white/60 tabular-nums">
              {L('แยกจากฟาร์ม: แพ็ค Daily Ruby Support', 'Separate from farming: Daily Ruby Support')}
              <span className="ml-auto flex shrink-0 items-center gap-1 whitespace-nowrap font-semibold text-gold"><Ruby className="h-3.5 w-3.5" />+{fmt(RUBY_SUPPORT.dailyRubies)}{L('/วัน', '/day')}</span>
            </p>
          )}
        </div>
      </section>

      {/* ===== ภาพรวมแต่ละขั้น ===== */}
      <section className="mt-5">
        <h2 className="text-sm font-medium text-gold">{L('ภาพรวมถ้าซื้อกล่องกุญแจถึงขั้นนี้', 'Overview if you buy key boxes up to')}</h2>
        <p className="mt-1 text-xs text-white/45">{L('ใช้กุญแจหมดทุกดอก · แตะเพื่อใช้เวลานั้นด้านบน', 'Every key used · tap to use that play time above')}</p>
        <div className="mt-2 space-y-2">
          {plan.rows.map((row, i) => {
            const v = row.tier < 0 ? null : verdict(row)
            const d = row.day
            const active = battles === d.battles
            return (
              <button key={row.tier} type="button" onClick={() => set('hours', hm(d.seconds))} aria-pressed={active}
                className={`block w-full rounded-2xl border p-3 text-left transition sm:px-4 ${active ? 'border-gold/70 bg-gold/10' : 'border-white/10 bg-white/[.04] hover:border-gold/50'}`}>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <b className="text-sm">{row.tier < 0 ? L('ไม่ซื้อกล่อง', 'No boxes') : L(`ซื้อถึงกล่องที่ ${row.to}`, `Up to box ${row.to}`)}</b>
                  {row.tier >= 0 && <span className="flex items-center gap-1 text-xs text-white/55 tabular-nums">{row.price ? <><Ruby className="h-3 w-3" />{fmt(row.price)}{L('/กล่อง', '/box')}</> : L('ฟรี', 'free')}</span>}
                  {v && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${v.cls}`}>{v.label}</span>}
                </span>
                <span className="mt-2 grid grid-cols-[1.3fr_1fr_1fr] items-end gap-x-2 tabular-nums sm:grid-cols-4">
                  <span className="min-w-0">
                    <span className="block text-[11px] text-white/45">{L('รูบี้สุทธิ', 'Net rubies')}</span>
                    <span className={`flex items-center gap-1 text-xl font-extrabold ${d.net > 0 ? 'text-gold' : 'text-red-300'}`}><Ruby className="h-4 w-4" />{signed(d.net)}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] text-white/45">{L('เวลา', 'Time')}</span>
                    <span className="block font-bold">{hours(d.seconds)}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] text-white/45">{L('ฮีโร่ Lv.1', 'Heroes')}</span>
                    <span className="block font-bold">{fmt(d.heroesUsed)}</span>
                  </span>
                  <span className="hidden min-w-0 sm:block">
                    <span className="block text-[11px] text-white/45">{L('รอบ', 'Battles')}</span>
                    <span className="block font-bold">{fmt(d.battles)}</span>
                  </span>
                </span>
                {i > 0 && (
                  <span className="mt-1.5 block text-[11px] text-white/45 tabular-nums">
                    {L(`จากขั้นก่อน ${signed(row.addNet)} รูบี้ · +${hours(row.addHours * 3600)}`, `vs last tier ${signed(row.addNet)} rubies · +${hours(row.addHours * 3600)}`)}
                    <span className="sm:hidden">{L(` · ${fmt(d.battles)} รอบ`, ` · ${fmt(d.battles)} battles`)}</span>
                  </span>
                )}
                {i === 0 && <span className="mt-1.5 block text-[11px] text-white/45 tabular-nums sm:hidden">{L(`${fmt(d.battles)} รอบ`, `${fmt(d.battles)} battles`)}</span>}
              </button>
            )
          })}
        </div>
      </section>

      {/* ===== แพ็คที่ซื้อ ===== */}
      <section className="panel mt-5 p-4 sm:p-5">
        <h2 className="font-semibold text-gold">{L('แพ็คที่ซื้อ', 'Packs you have')}</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <PackToggle on={form.powerUp} onClick={() => toggle('powerUp')} img={packPowerUp}
            label="Daily Power Up Support"
            sub={L(`฿149 / 28 วัน · กุญแจฟื้นเร็วขึ้น 60 วิ + ${POWER_UP.dailyKeys} ดอก/วัน`, `฿149 / 28 days · keys regen 60 s faster + ${POWER_UP.dailyKeys}/day`)}
            value={<><KeyRound className="h-3.5 w-3.5" />+{fmt(keys.powerUpRegen + POWER_UP.dailyKeys)}{L('/วัน', '/day')}</>} />
          <PackToggle on={form.rubySupport} onClick={() => toggle('rubySupport')} img={packRuby}
            label="Daily Ruby Support"
            sub={L('฿249 / 28 วัน · รูบี้ฟรีทุกวัน (แยกจากฟาร์ม)', '฿249 / 28 days · free rubies daily (not from farming)')}
            value={<><Ruby className="h-3.5 w-3.5" />+{fmt(RUBY_SUPPORT.dailyRubies)}{L('/วัน', '/day')}</>} />
          <PackToggle on={form.passPremium} onClick={() => toggle('passPremium')} img={packPass}
            label={L(PAID_KEYS.passPremium.th, PAID_KEYS.passPremium.en)}
            sub={L(`${fmt(PAID_KEYS.passPremium.keys)} กุญแจต่อ ${PAID_KEYS.passPremium.days} วัน`, `${fmt(PAID_KEYS.passPremium.keys)} keys per ${PAID_KEYS.passPremium.days} days`)}
            value={<><KeyRound className="h-3.5 w-3.5" />+{fmt1(PAID_KEYS.passPremium.keys / PAID_KEYS.passPremium.days)}{L('/วัน', '/day')}</>} />
          <PackToggle on={form.premiumCheckin} onClick={() => toggle('premiumCheckin')} img={packCheckin}
            label={L(PAID_KEYS.premiumCheckin.th, PAID_KEYS.premiumCheckin.en)}
            sub={L(`${fmt(PAID_KEYS.premiumCheckin.keys)} กุญแจต่อ ${PAID_KEYS.premiumCheckin.days} วัน`, `${fmt(PAID_KEYS.premiumCheckin.keys)} keys per ${PAID_KEYS.premiumCheckin.days} days`)}
            value={<><KeyRound className="h-3.5 w-3.5" />+{fmt1(PAID_KEYS.premiumCheckin.keys / PAID_KEYS.premiumCheckin.days)}{L('/วัน', '/day')}</>} />
        </div>
      </section>

      {/* ===== กุญแจฟรีต่อวัน ===== */}
      <section className="panel mt-5">
        <button type="button" onClick={() => setKeysOpen((o) => !o)} aria-expanded={keysOpen} className="flex w-full items-center gap-2 p-4 text-left">
          <KeyRound className="h-5 w-5 shrink-0 text-gold" />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{L('กุญแจฟรีต่อวัน', 'Free keys per day')}</span>
            <span className="block text-xs text-white/50">{L('นับให้แล้ว · เลือกเช็กอินกิลด์ได้', 'Already counted · pick your guild check-in')}</span>
          </span>
          <b className="text-xl tabular-nums">{fmt1(keys.total)}</b>
          <ChevronDown className={`h-5 w-5 shrink-0 text-white/50 transition ${keysOpen ? 'rotate-180' : ''}`} />
        </button>
        {keysOpen && (
          <ul className="edit-arrive flex flex-col gap-2.5 border-t border-white/10 p-4 text-sm">
            <li>
              <button type="button" onClick={() => setBaseOpen((o) => !o)} aria-expanded={baseOpen} className="flex w-full items-center gap-2 text-left">
                <span className="min-w-0 text-white/70">{L('ที่ทุกคนได้เท่ากัน', 'Everyone gets')}{' '}
                  <span className="text-xs text-white/45">{L(`(${BASE_KEYS.length} อย่าง)`, `(${BASE_KEYS.length} sources)`)}</span></span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-white/50 transition ${baseOpen ? 'rotate-180' : ''}`} />
                <b className="ml-auto tabular-nums">{fmt1(keys.base)}</b>
              </button>
              {baseOpen && (
                <ul className="edit-arrive mt-2 flex flex-col gap-1.5 border-l border-white/10 pl-3 text-xs">
                  {BASE_KEYS.map((x) => (
                    <li key={x.id} className="flex items-baseline gap-2">
                      <span className="min-w-0 text-white/65">{L(x.th, x.en)}
                        {x.days > 1 && <span className="text-white/40">{L(` · ${fmt(x.keys)} ทุก ${x.days} วัน`, ` · ${fmt(x.keys)} every ${x.days} days`)}</span>}</span>
                      <span className="ml-auto tabular-nums text-white/75">{fmt1(x.keys / x.days)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
            <li>
              <div className="flex items-center gap-2"><span className="text-white/70">{L('เช็กอินกิลด์', 'Guild check-in')}</span><b className="ml-auto tabular-nums">{fmt(keys.guild)}</b></div>
              <div className="mt-1.5 flex flex-wrap gap-1" role="radiogroup" aria-label={L('เช็กอินกิลด์', 'Guild check-in')}>
                {GUILD_CHECKIN.map((k, i) => (
                  <button key={k} type="button" role="radio" aria-checked={form.guildKeys === k} onClick={() => setForm((f) => ({ ...f, guildKeys: k }))}
                    title={i ? L(`เมื่อวานเช็กอิน ${[1, 10, 15, 20, 25][i - 1]}+ คน`, `${[1, 10, 15, 20, 25][i - 1]}+ checked in yesterday`) : undefined}
                    className={CHIP(form.guildKeys === k)}>
                    {k ? L(`${[1, 10, 15, 20, 25][i - 1]}+ คน · ${k}`, `${[1, 10, 15, 20, 25][i - 1]}+ · ${k}`) : L('ไม่มี', 'None')}
                  </button>
                ))}
              </div>
            </li>
            <li className="flex items-center gap-2">
              <span className="min-w-0 text-white/70">{L('อื่น ๆ', 'Other')} <span className="text-xs text-white/45">{L('(อีเวนต์ ฯลฯ)', '(events, etc.)')}</span></span>
              <input value={form.extraKeys} onChange={(e) => set('extraKeys', e.target.value)} inputMode="numeric" placeholder="0" aria-label={L('กุญแจอื่น ๆ ต่อวัน', 'Other keys per day')}
                aria-invalid={bad(form.extraKeys) || undefined} className={`${numInput(form.extraKeys)} ml-auto w-16 shrink-0 text-white`} />
            </li>
            {keys.powerUp + keys.passPremium + keys.premiumCheckin > 0 && (
              <li className="flex items-center gap-2"><span className="text-white/70">{L('จากแพ็คที่ติ๊ก', 'From your packs')}</span>
                <b className="ml-auto tabular-nums">{fmt1(keys.powerUp + keys.passPremium + keys.premiumCheckin)}</b></li>
            )}
            {freeN > 0 && (
              <li className="text-xs text-white/45">{L(`+ กล่องฟรีในร้านรูบี้ ${fmt(freeN * input.keysPerBox)} ดอก (นับรวมตอนซื้อกล่อง)`, `+ the free Ruby Shop box, ${fmt(freeN * input.keysPerBox)} keys (counted with box purchases)`)}</li>
            )}
          </ul>
        )}
      </section>

      {/* ===== ค่าที่ใช้คิด ===== */}
      <section className="panel mt-5">
        <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="flex w-full items-center justify-between gap-2 p-4 text-left">
          <span>
            <span className="block font-semibold">{L('ค่าที่ใช้คิด (แก้ได้)', 'Game values (editable)')}</span>
            <span className="block text-xs text-white/50">{L('กุญแจ · เวลา · ทอง · เควสต์ทำซ้ำ · ราคากล่อง', 'Keys · time · gold · repeat quest · box prices')}</span>
          </span>
          <ChevronDown className={`h-5 w-5 shrink-0 text-white/50 transition ${more ? 'rotate-180' : ''}`} />
        </button>
        {more && (
          <div className="edit-arrive border-t border-white/10 p-4">
            <p className="text-sm font-medium text-gold">{L('ฮีโร่ Lv.1', 'Lv.1 heroes')}</p>
            <div className="mt-2 flex flex-wrap gap-3">
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

            <button type="button" onClick={() => setForm(DEFAULT_FARM_FORM)}
              className="mt-5 flex items-center gap-1.5 text-xs text-white/55 hover:text-gold"><RotateCcw className="h-3.5 w-3.5" />{L('กลับเป็นค่าเริ่มต้นทั้งหมด', 'Reset everything to defaults')}</button>
          </div>
        )}
      </section>

      <p className="mt-6 text-xs leading-relaxed text-white/40">
        <Clock className="mr-1 inline h-3 w-3" />
        {L('นับรูบี้เฉพาะชุดที่ครบ (ฮีโร่เต็มเลเวลพร้อมกันทุก 10 รอบ) · เควสต์ทำซ้ำคืนกุญแจระหว่างเล่น · กุญแจไม่มีเพดาน ที่เหลือเก็บไว้วันถัดไป · ค่าเริ่มต้นมาจากที่ผู้เล่นจับเวลาเอง · รูปแพ็คจาก 7K Atlas · ข้อมูลเก็บไว้ในเครื่องนี้เท่านั้น',
          'Rubies count only full sets (heroes max out together every 10 battles) · the repeat quest refunds keys while you play · keys have no cap, leftovers carry over · defaults come from a player’s own timing · pack art via 7K Atlas · data stays on this device')}
      </p>
    </div>
  )
}
