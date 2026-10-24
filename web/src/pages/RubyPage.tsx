import { ChevronDown, Clock, Coins, KeyRound, Minus, Package, Plus, RotateCcw, Swords, Users } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import ruby from '../assets/ui/ruby.webp'
import packPowerUp from '../assets/packs/power-up.webp'
import packRuby from '../assets/packs/ruby-support.webp'
import packPass from '../assets/packs/7k-pass.webp'
import packCheckin from '../assets/packs/premium-checkin.webp'
import keyBox from '../assets/packs/items/chests.webp'
import { DEFAULT_FARM_FORM, FARM_DEFAULTS, FARM_STORE_KEY, BASE_KEYS, GUILD_CHECKIN, PAID_KEYS, POWER_UP, RUBY_SUPPORT, bestBattles, dailyKeys, farmBattles, farmInputOf, loadFarmForm, parseNum, planFarm, type FarmForm, type TierRow } from '../lib/rubyFarm'
import { L } from '../lib/i18n'
import RubyIcon from '../components/RubyIcon'
import { motionOK } from '../lib/overlayMotion'

// คำนวณรูบี้ขายวิญญาณ: เปิดมาเห็นตัวเลขเดียว (รูบี้สุทธิต่อวันของตัวเลือกคุ้มสุด) · อยากเล่นน้อยลงเลือกจากกราฟแท่งราคากล่อง · รายละเอียดซ่อนไว้ · ข้อมูลเก็บในเครื่องนี้เท่านั้น
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

/** ตัวเลขวิ่งจากค่าเก่าไปค่าใหม่ (ease-out ~0.55 วิ) · re-render แค่ตัวเลขนี้ · ลดแอนิเมชัน = เปลี่ยนทันที */
function Tween({ value, format, ms = 550 }: { value: number; format: (n: number) => string; ms?: number }) {
  const [v, setV] = useState(value)
  const cur = useRef(value)
  useEffect(() => {
    const from = cur.current
    if (from === value || !motionOK()) { cur.current = value; setV(value); return }
    const start = performance.now()
    let id = 0
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / ms)
      cur.current = from + (value - from) * (1 - (1 - k) ** 3)
      setV(cur.current)
      if (k < 1) id = requestAnimationFrame(step)
    }
    id = requestAnimationFrame(step)
    return () => { cancelAnimationFrame(id); cur.current = value }
  }, [value, ms])
  return <>{format(v)}</>
}
const POP = 'cubic-bezier(.22, 1.4, .36, 1)'

/** แพ็คที่ติ๊กได้ · การ์ดเล็กมีรูปแพ็ค ชื่อสั้น และค่าที่ได้ต่อวัน */
function PackTile({ on, onClick, img, label, value, title }: { on: boolean; onClick: () => void; img: string; label: string; value: ReactNode; title: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onClick} title={title} aria-label={title}
      className={`relative min-w-0 overflow-hidden rounded-xl border text-left transition duration-300 active:scale-95 ${on ? 'border-gold bg-gold/10' : 'border-white/10 bg-white/[.03] hover:border-gold/40'}`}>
      <img src={img} alt="" draggable={false} loading="lazy"
        className={`block h-16 w-full object-cover object-right transition duration-300 sm:h-20 lg:h-24 ${on ? '' : 'opacity-35 grayscale'}`} />
      {on && <span className="tag-pop absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-gold text-xs font-bold text-ink shadow lg:h-6 lg:w-6 lg:text-sm">✓</span>}
      <span className="flex flex-col gap-0.5 px-2.5 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2 lg:px-3 lg:py-2.5">
        <span className={`min-w-0 truncate text-sm font-semibold leading-tight lg:text-base ${on ? '' : 'text-white/60'}`}>{label}</span>
        <span className={`flex shrink-0 items-center gap-1 text-xs font-semibold tabular-nums lg:text-[15px] ${on ? 'text-gold' : 'text-white/40'}`}>{value}</span>
      </span>
    </button>
  )
}

/** ตัวเลขรอง 3 ช่องใต้ตัวเลขใหญ่ */
function Stat({ icon, value, unit, sub }: { icon: ReactNode; value: ReactNode; unit: string; sub?: ReactNode }) {
  return (
    <div className="min-w-0 px-1 text-center">
      <div className="flex items-center justify-center gap-1 text-white/45 lg:[&>svg]:h-5 lg:[&>svg]:w-5">{icon}</div>
      <div className="mt-0.5 text-lg font-bold leading-tight tabular-nums lg:text-3xl">{value}<span className="ml-1 text-xs font-normal text-white/50 lg:text-[15px]">{unit}</span></div>
      {sub && <div className="mt-0.5 truncate text-[10px] text-white/40 tabular-nums lg:text-sm">{sub}</div>}
    </div>
  )
}

export default function RubyPage() {
  const [form, setForm] = useState(loadFarmForm)
  const [more, setMore] = useState(false)
  const [keysOpen, setKeysOpen] = useState(false)
  const [baseOpen, setBaseOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  useEffect(() => { try { localStorage.setItem(FARM_STORE_KEY, JSON.stringify(form)) } catch { /* ไม่มี storage ก็ไม่เป็นไร */ } }, [form])
  const set = (k: { [K in keyof FarmForm]: FarmForm[K] extends string ? K : never }[keyof FarmForm], v: string) => setForm((f) => ({ ...f, [k]: v }))
  const setTier = (i: number, patch: Partial<{ boxes: string; price: string }>) =>
    setForm((f) => ({ ...f, tiers: f.tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)) }))
  const toggle = (k: 'powerUp' | 'rubySupport' | 'passPremium' | 'premiumCheckin') => setForm((f) => ({ ...f, [k]: !f[k] }))

  const input = useMemo(() => farmInputOf(form), [form])
  const keys = dailyKeys(form)
  const plan = useMemo(() => planFarm(input, 0), [input])
  const setSize = Math.max(1, Math.floor(input.battlesPerSet))
  const maxBattles = plan.days[plan.prices.length].battles
  // คุ้มที่สุด = ฟาร์มนานสุดที่ยังได้รูบี้สุทธิมากสุด (ซื้อกล่องทีละขั้นจนขั้นถัดไปไม่ได้เพิ่ม)
  const bestB = useMemo(() => bestBattles(input, plan.prices, plan.days[plan.prices.length].battles), [input, plan])
  // เปิดมาที่คุ้มสุด · แตะแถวในตารางเพื่อเลือกขั้นกล่องอื่น (จำเป็นขั้น ไม่บันทึก เปิดใหม่กลับไปคุ้มสุด)
  const [pick, setPick] = useState<number | null>(null)
  const picked = pick === null ? undefined : plan.rows.find((x) => x.tier === pick)
  const best = useMemo(() => farmBattles(input, bestB, plan.prices), [input, bestB, plan.prices])
  // ขั้นที่มีคุ้มสุดอยู่ = คุ้มสุด (ซื้อต่อจนท้ายขั้นก็ไม่ได้เพิ่ม)
  const battles = Math.min(picked && !(best.boxes >= picked.from && best.boxes <= picked.to) ? picked.day.battles : bestB, maxBattles)
  const r = useMemo(() => farmBattles(input, battles, plan.prices), [input, battles, plan.prices])
  const isBest = battles === bestB
  // ตัวเลือกให้เทียบ = ขั้นราคากล่อง (ฟรี / 50 / 80 / 100) · ขั้นที่ "คุ้มสุด" อยู่ใช้ตัวเลขของคุ้มสุด (ซื้อเกินจากนั้นในขั้นเดียวกันไม่ได้เพิ่ม)
  const bars = useMemo(() => plan.rows.filter((row) => row.tier >= 0).map((row) => {
    const hasBest = best.boxes >= row.from && best.boxes <= row.to
    return { row, hasBest, res: hasBest ? best : farmBattles(input, row.day.battles, plan.prices) }
  }), [plan, input, best])
  const barMax = Math.max(1, ...bars.map((x) => x.res.net))
  const selIdx = bars.findIndex((x) => x.res.battles === battles)
  // ตัวเลขใหญ่เปลี่ยน → เด้งนิด ๆ + รูบี้หมุน (ขึ้น = หมุนขวา ลง = หมุนซ้าย)
  const bigRef = useRef<HTMLParagraphElement>(null)
  const gemRef = useRef<HTMLSpanElement>(null)
  const prevNet = useRef(r.net)
  useEffect(() => {
    const before = prevNet.current
    prevNet.current = r.net
    if (before === r.net || !motionOK()) return
    bigRef.current?.animate([{ transform: 'scale(1.06)' }, { transform: 'none' }], { duration: 420, easing: POP })
    gemRef.current?.animate([{ transform: `rotate(${r.net > before ? 18 : -18}deg) scale(1.25)` }, { transform: 'none' }], { duration: 520, easing: POP })
  }, [r.net])
  const perSet = form.team * num(form.rubyPerHero)
  // ดรอปเป็นดวง → บอกเป็นช่วง (±10% ปัดหลักสิบ) ไม่ใช่เลขเป๊ะ
  const dropLo = Math.floor((r.dropped * 0.9) / 10) * 10
  const dropHi = Math.ceil((r.dropped * 1.1) / 10) * 10
  const tierName = (row: TierRow) => (row.price ? fmt(row.price) : L('ฟรี', 'Free'))

  return (
    <div className="mx-auto max-w-xl lg:max-w-none">
      <p className="eyebrow mb-1.5">RUBY FARMING</p>
      <h1 className="gold-title flex items-center gap-2 pt-1.5 text-2xl font-extrabold leading-normal sm:text-3xl lg:text-3xl lg:leading-normal"><RubyIcon className="h-7 w-7 shrink-0 text-gold lg:h-9 lg:w-9" />{L('คำนวณรูบี้ขายวิญญาณ', 'Ruby Farming Calculator')}</h1>

      {/* มือถือ: เรียงลงมาตาม order · คอม (lg): ซ้าย = ตั้งค่า/รายละเอียด, ขวา = ผลลัพธ์/กราฟ */}
      <div className="flex flex-col lg:mt-5 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-x-5">
        <div className="contents lg:block">
          {/* ===== ตั้งค่า: ทีม · แพ็ค · กุญแจฟรี ===== */}
          <section className="panel order-1 mt-4 p-3.5 sm:p-4 lg:mt-0 lg:p-5">
            <div className="flex items-center gap-3">
              <span className="shrink-0 text-sm text-white/65 lg:text-base">{L('อัศวิน Lv.1', 'Lv.1 heroes')}</span>
              <input type="range" min={1} max={MAX_TEAM} step={1} value={form.team} onChange={(e) => setForm((f) => ({ ...f, team: Number(e.target.value) }))}
                aria-label={L('อัศวิน Lv.1 ในทีม', 'Lv.1 heroes in the team')} className="h-2 min-w-0 flex-1 cursor-pointer accent-gold" />
              <b className="w-12 shrink-0 text-right tabular-nums lg:w-16 lg:text-xl">{L(`${form.team} ตัว`, `${form.team}`)}</b>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 lg:mt-4 lg:gap-3">
              <PackTile on={form.powerUp} onClick={() => toggle('powerUp')} img={packPowerUp} label="Power Up"
                title={L(`Daily Power Up Support (฿149 / 28 วัน): กุญแจฟื้นเร็วขึ้น + ${POWER_UP.dailyKeys} ดอก/วัน`, `Daily Power Up Support (฿149 / 28 days): faster key regen + ${POWER_UP.dailyKeys}/day`)}
                value={<><KeyRound className="h-3.5 w-3.5" />+{fmt(keys.powerUpRegen + POWER_UP.dailyKeys)}</>} />
              <PackTile on={form.rubySupport} onClick={() => toggle('rubySupport')} img={packRuby} label="Daily Ruby"
                title={L(`Daily Ruby Support (฿249 / 28 วัน): อัศวินตันใน ${RUBY_SUPPORT.battlesPerSet} รอบ (ปกติ ${RUBY_SUPPORT.battlesPerSetWithout}) + ${RUBY_SUPPORT.dailyRubies} รูบี้/วัน`, `Daily Ruby Support (฿249 / 28 days): heroes max in ${RUBY_SUPPORT.battlesPerSet} battles (not ${RUBY_SUPPORT.battlesPerSetWithout}) + ${RUBY_SUPPORT.dailyRubies} rubies/day`)}
                value={<><Ruby className="h-3.5 w-3.5" />+{fmt(RUBY_SUPPORT.dailyRubies)}</>} />
              <PackTile on={form.passPremium} onClick={() => toggle('passPremium')} img={packPass} label="7K Pass"
                title={L(`${PAID_KEYS.passPremium.th}: ${fmt(PAID_KEYS.passPremium.keys)} กุญแจต่อ ${PAID_KEYS.passPremium.days} วัน`, `${PAID_KEYS.passPremium.en}: ${fmt(PAID_KEYS.passPremium.keys)} keys per ${PAID_KEYS.passPremium.days} days`)}
                value={<><KeyRound className="h-3.5 w-3.5" />+{fmt(PAID_KEYS.passPremium.keys / PAID_KEYS.passPremium.days)}</>} />
              <PackTile on={form.premiumCheckin} onClick={() => toggle('premiumCheckin')} img={packCheckin} label="Check-in Prem"
                title={L(`${PAID_KEYS.premiumCheckin.th}: ${fmt(PAID_KEYS.premiumCheckin.keys)} กุญแจต่อ ${PAID_KEYS.premiumCheckin.days} วัน`, `${PAID_KEYS.premiumCheckin.en}: ${fmt(PAID_KEYS.premiumCheckin.keys)} keys per ${PAID_KEYS.premiumCheckin.days} days`)}
                value={<><KeyRound className="h-3.5 w-3.5" />+{fmt(PAID_KEYS.premiumCheckin.keys / PAID_KEYS.premiumCheckin.days)}</>} />
            </div>

            <div className="mt-3 border-t border-white/10 pt-1">
              <button type="button" onClick={() => setKeysOpen((o) => !o)} aria-expanded={keysOpen} className="flex w-full items-center gap-2 py-1.5 text-left text-sm lg:py-2 lg:text-base">
                <KeyRound className="h-4 w-4 shrink-0 text-gold" />
                <span className="min-w-0 flex-1 text-white/65">{L('กุญแจฟรีต่อวัน', 'Free keys per day')}</span>
                <b className="tabular-nums">{fmt(keys.total)}</b>
                <ChevronDown className={`h-4 w-4 shrink-0 text-white/45 transition ${keysOpen ? 'rotate-180' : ''}`} />
              </button>
              {keysOpen && (
                <ul className="edit-arrive mt-1 flex flex-col gap-2.5 rounded-xl bg-white/[.03] p-3 text-sm">
                  <li>
                    <button type="button" onClick={() => setBaseOpen((o) => !o)} aria-expanded={baseOpen} className="flex w-full items-center gap-2 text-left">
                      <span className="min-w-0 text-white/70">{L('พื้นฐาน', 'Base')}</span>
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
                    <span className="min-w-0 text-white/70">{L('อื่น ๆ', 'Other')}</span>
                    <input value={form.extraKeys} onChange={(e) => set('extraKeys', e.target.value)} inputMode="numeric" placeholder="0" aria-label={L('กุญแจอื่น ๆ ต่อวัน', 'Other keys per day')}
                      aria-invalid={bad(form.extraKeys) || undefined} className={`${numInput(form.extraKeys)} ml-auto w-16 shrink-0 text-white`} />
                  </li>
                  {keys.powerUp + keys.passPremium + keys.premiumCheckin > 0 && (
                    <li className="flex items-center gap-2"><span className="text-white/70">{L('จากแพ็คที่เลือก', 'From your packs')}</span>
                      <b className="ml-auto tabular-nums">{fmt1(keys.powerUp + keys.passPremium + keys.premiumCheckin)}</b></li>
                  )}
                </ul>
              )}
            </div>
          </section>

          {/* ===== รายละเอียด (มือถือพับไว้ · คอมกางตลอด ให้ฝั่งซ้ายไม่โล่ง) ===== */}
          <section className="panel order-4 mt-6 lg:mt-5">
            <button type="button" onClick={() => setInfoOpen((o) => !o)} aria-expanded={infoOpen} className="flex w-full items-center justify-between gap-2 p-4 text-left lg:pointer-events-none">
              <span className="font-semibold lg:text-base">{L('รายละเอียด', 'Details')}</span>
              <ChevronDown className={`h-5 w-5 shrink-0 text-white/50 transition lg:hidden ${infoOpen ? 'rotate-180' : ''}`} />
            </button>
            {(
              <ul className={`${infoOpen ? 'edit-arrive flex' : 'hidden lg:flex'} flex-col gap-2 border-t border-white/10 p-4 text-sm tabular-nums lg:gap-2.5 lg:px-5 lg:text-[15px]`}>
                <li className="flex items-center gap-2"><Ruby className="h-4 w-4" /><span className="text-white/65">{L('รูบี้จากฟาร์ม', 'Rubies from farming')}</span><b className="ml-auto">{fmt(r.rubies)}</b></li>
                <li className="flex items-center gap-2"><Package className="h-4 w-4 text-white/45" /><span className="text-white/65">{L(`ค่ากล่อง ${fmt(r.boxes)} กล่อง`, `${fmt(r.boxes)} key boxes`)}</span><b className="ml-auto">−{fmt(r.cost)}</b></li>
                <li className="flex items-center gap-2"><Swords className="h-4 w-4 text-white/45" /><span className="text-white/65">{L(`ทุก ${fmt(setSize)} รอบได้`, `Every ${fmt(setSize)} battles`)}</span><b className="ml-auto flex items-center gap-1"><Ruby className="h-3.5 w-3.5" />{fmt(perSet)}</b></li>
                <li className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-white/45" /><span className="text-white/65">{L('ใช้กุญแจ', 'Keys used')}</span><b className="ml-auto">{fmt(r.keysNeeded)}</b></li>
                <li className="flex items-center gap-2"><Coins className="h-4 w-4 text-white/45" /><span className="text-white/65">{L('ได้ทอง', 'Gold')}</span><b className="ml-auto">{big(r.gold)}</b></li>
                {r.dropped > 0 && r.heroes > 0 && (
                  <li className="flex items-center gap-2"><Users className="h-4 w-4 text-white/45" /><span className="min-w-0 text-white/65">{L('อัศวินที่ต้องเตรียมเอง', 'Heroes to prepare')}</span>
                    <b className="ml-auto shrink-0">{fmt(Math.max(0, r.heroes - dropHi))}–{fmt(Math.max(0, r.heroes - dropLo))}</b></li>
                )}
              </ul>
            )}
          </section>

          {/* ===== ค่าที่ใช้คิด ===== */}
          <section className="panel order-5 mt-3">
            <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="flex w-full items-center justify-between gap-2 p-4 text-left">
              <span className="font-semibold lg:text-base">{L('ค่าในเกม (แก้ได้)', 'Game values (editable)')}</span>
              <ChevronDown className={`h-5 w-5 shrink-0 text-white/50 transition ${more ? 'rotate-180' : ''}`} />
            </button>
            {more && (
              <div className="edit-arrive border-t border-white/10 p-4">
                <p className="text-sm font-medium text-gold">{L('อัศวิน Lv.1', 'Lv.1 heroes')}</p>
                <div className="mt-2 flex flex-wrap gap-3">
                  <Field label={L('รูบี้ต่อตัวที่เต็ม', 'Rubies per maxed hero')} value={form.rubyPerHero} onChange={(v) => set('rubyPerHero', v)} unit={<Ruby />} />
                  <Field label={L('รอบจนเต็ม (ไม่มีแพ็ค)', 'Battles to max (no pack)')} value={form.battlesPerSetBase} onChange={(v) => set('battlesPerSetBase', v)} unit={L('รอบ', 'battles')} />
                  <Field label={L('รอบจนเต็ม (Daily Ruby)', 'Battles to max (Daily Ruby)')} value={form.battlesPerSet} onChange={(v) => set('battlesPerSet', v)} unit={L('รอบ', 'battles')} />
                  <Field label={L('ดรอป 2–3★ ต่อ 100 รอบ', '2–3★ drops per 100 battles')} value={form.heroDrop} onChange={(v) => set('heroDrop', v)} unit={L('ตัว', 'heroes')} />
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

                <p className="mt-5 text-sm font-medium text-gold">{L('กล่องกุญแจ', 'Key boxes')}</p>
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
                  className="mt-5 flex items-center gap-1.5 text-xs text-white/55 hover:text-gold"><RotateCcw className="h-3.5 w-3.5" />{L('ค่าเริ่มต้น', 'Reset')}</button>
              </div>
            )}
          </section>
        </div>
        <div className="contents lg:block">
          {/* ===== ผลลัพธ์: ตัวเลขเดียวเด่น ===== */}
          <section className="panel panel-gold order-2 mt-5 px-4 pb-4 pt-5 text-center lg:mt-0 lg:px-6 lg:pb-8 lg:pt-9" aria-live="polite">
            <div className="flex min-h-6 items-center justify-center gap-2">
              {isBest
                ? <span key="best" className="tag-pop rounded-full bg-gold px-2.5 py-0.5 text-xs font-bold text-ink lg:px-4 lg:py-1 lg:text-[15px]">{L('★ คุ้มสุด', '★ Best value')}</span>
                : (
                  <span key="pick" className="tag-pop flex items-center gap-2">
                    <span className="text-xs text-white/55">{L(`ซื้อกล่องถึงราคา ${picked ? tierName(picked) : ''}`, `Boxes up to ${picked ? tierName(picked) : ''}`)}</span>
                    <button type="button" onClick={() => setPick(null)} className="rounded-full border border-gold/60 px-2.5 py-0.5 text-xs font-semibold text-gold hover:bg-gold/15">{L('★ กลับไปคุ้มสุด', '★ Back to best')}</button>
                  </span>
                )}
            </div>
            <p ref={bigRef} className={`mt-2 flex items-center justify-center gap-2 text-5xl font-extrabold tabular-nums sm:text-6xl lg:text-7xl ${r.net >= 0 ? 'text-gold' : 'text-red-300'}`}>
              <span ref={gemRef} className="inline-flex"><Ruby className="h-9 w-9 sm:h-11 sm:w-11 lg:h-16 lg:w-16" /></span><Tween value={r.net} format={signed} ms={650} />
            </p>
            <p className="mt-1 text-sm text-white/55 lg:text-base">
              {L('รูบี้สุทธิต่อวัน', 'net rubies a day')}
              {form.rubySupport && <span className="ml-1.5 whitespace-nowrap text-gold">{L(`+${fmt(RUBY_SUPPORT.dailyRubies)} จากแพ็ค`, `+${fmt(RUBY_SUPPORT.dailyRubies)} from pack`)}</span>}
            </p>

            <div className="mt-4 grid grid-cols-3 divide-x divide-white/10 rounded-2xl bg-white/[.04] py-2.5 lg:mt-5 lg:py-4">
              <Stat icon={<Clock className="h-4 w-4" />} value={<Tween value={r.seconds} format={hm} />} unit={L('ชม.', 'h')} sub={L(`${fmt(r.battles)} รอบ`, `${fmt(r.battles)} battles`)} />
              <Stat icon={<Users className="h-4 w-4" />} value={<Tween value={r.heroes} format={fmt} />} unit={L('ตัว', 'heroes')}
                sub={r.dropped > 0 && r.heroes > 0 ? L(`ดรอปคืน ~${fmt(dropLo)}–${fmt(dropHi)}`, `~${fmt(dropLo)}–${fmt(dropHi)} back`) : undefined} />
              <Stat icon={<Package className="h-4 w-4" />} value={<Tween value={r.boxes} format={fmt} />} unit={L('กล่อง', 'boxes')}
                sub={r.cost ? <span className="inline-flex items-center gap-0.5"><Ruby className="h-2.5 w-2.5" />−{fmt(r.cost)}</span> : L('ไม่เสียรูบี้', 'no rubies')} />
            </div>
          </section>

          {/* ===== เลือกเล่นน้อยลง: กราฟแท่งตามราคากล่อง ===== */}
          <section className="order-3 mt-6 lg:mt-5 lg:rounded-2xl lg:border lg:border-white/10 lg:bg-white/[.02] lg:p-4">
            <h2 className="text-sm font-semibold text-white/80 lg:text-base">{L('อยากเล่นน้อยลง?', 'Want to play less?')}</h2>
            <div className="relative mt-2 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }} role="radiogroup" aria-label={L('ซื้อกล่องถึงราคา', 'Boxes up to')}>
              {/* กรอบทองเลื่อนไปแท่งที่เลือก */}
              {selIdx >= 0 && (
                <span aria-hidden="true" className="ruby-pick pointer-events-none absolute inset-y-0 left-0 rounded-xl bg-gold/15 ring-1 ring-gold"
                  style={{ width: `calc((100% - ${bars.length - 1} * 0.375rem) / ${bars.length})`, transform: `translateX(calc(${selIdx} * (100% + 0.375rem)))` }} />
              )}
              {bars.map(({ row, hasBest, res }, i) => {
                const sel = res.battles === battles
                const h = res.net > 0 ? Math.max(8, (res.net / barMax) * 100) : 6
                return (
                  <button key={row.tier} type="button" role="radio" aria-checked={sel} onClick={() => setPick(hasBest ? null : row.tier)}
                    aria-label={L(`กล่อง ${tierName(row)}: ${signed(res.net)} รูบี้ · ${hours(res.seconds)}`, `${tierName(row)} boxes: ${signed(res.net)} rubies · ${hours(res.seconds)}`)}
                    className={`relative flex min-w-0 flex-col items-center rounded-xl px-1 pb-2 pt-2 transition active:scale-95 ${sel ? '' : 'hover:bg-white/[.05]'}`}>
                    <span className={`text-[11px] font-bold tabular-nums lg:text-base ${res.net > 0 ? (sel ? 'text-gold' : 'text-white/75') : 'text-red-300'}`}>{signed(res.net)}</span>
                    <span className="mt-1 flex h-20 w-full items-end justify-center lg:h-48">
                      <span className={`ruby-bar w-7 rounded-t-md lg:w-14 lg:rounded-t-lg ${res.net <= 0 ? 'bg-red-400/50' : sel ? 'bg-gold' : 'bg-white/20'}`} style={{ height: `${h}%`, animationDelay: `${i * 70}ms` }} />
                    </span>
                    <img src={keyBox} alt="" draggable={false} className={`mt-1.5 h-7 w-7 transition lg:h-9 lg:w-9 ${sel ? '' : 'opacity-60 grayscale-[.4]'}`} />
                    <span className={`mt-0.5 flex items-center gap-0.5 text-xs font-semibold lg:text-base ${sel ? 'text-gold' : 'text-white/70'}`}>
                      {row.price > 0 && <Ruby className="h-3 w-3" />}{tierName(row)}
                    </span>
                    <span className="text-[10px] tabular-nums text-white/45 lg:text-sm">{hm(res.seconds)}</span>
                    {hasBest && <span className="mt-0.5 text-[10px] font-bold text-gold lg:text-sm">★</span>}
                  </button>
                )
              })}
            </div>
            <p className="mt-1.5 flex items-center justify-center gap-1 text-[11px] text-white/45 lg:mt-4 lg:text-sm"><img src={keyBox} alt="" className="h-4 w-4 lg:h-5 lg:w-5" />{L('ราคากล่องกุญแจที่ซื้อถึง', 'Key box price you buy up to')}</p>
          </section>
        </div>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-white/40 lg:text-sm">
        {L('รูปแพ็คจาก 7K Atlas', 'Pack art via 7K Atlas')}
      </p>
    </div>
  )
}
