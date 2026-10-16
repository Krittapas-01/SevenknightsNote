import { CalendarClock, ChevronDown, Info, KeyRound, Minus, Plus, Sparkles, Ticket, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import ruby from '../assets/ui/ruby.webp'
import { api } from '../lib/api'
import {
  CHEST_RUBY, KEYS_PER_CHEST, TICKET_RUBY, boughtCount, packValue, perBaht, periodLabel, recommend, setBought, tierOf, type Pack,
} from '../lib/packs'
import { L } from '../lib/i18n'

const fmt = (n: number) => Math.round(n).toLocaleString('en-US')
const baht = (n: number) => `฿${n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`
const BUDGET_KEY = '7k-note:packs-budget'

/** เหลือเวลาอีกกี่วัน/ชั่วโมง */
function endsIn(ts: number, now: number) {
  const h = Math.max(0, Math.floor((ts - now) / 3_600_000))
  return h >= 48 ? L(`เหลือ ${Math.floor(h / 24)} วัน`, `${Math.floor(h / 24)}d left`) : L(`เหลือ ${h} ชม.`, `${h}h left`)
}

function Item({ icon, n, label, muted }: { icon: ReactNode; n: number; label: string; muted?: boolean }) {
  return (
    <span title={label} className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs tabular-nums ${muted ? 'border-white/10 text-white/40' : 'border-white/15 bg-black/20 text-white/85'}`}>
      {icon}{fmt(n)}<span className="hidden text-white/45 sm:inline">{label}</span>
    </span>
  )
}

/** หน้าเช็กความคุ้มค่าแพ็ค: เรียงแพ็คจากคุ้มสุด (รูบี้เทียบเท่าต่อบาท เทียบแพ็คฐาน) + ติ๊กที่ซื้อแล้ว + แนะนำตามงบ */
export default function PacksPage() {
  const [packs, setPacks] = useState<Pack[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [tick, bump] = useState(0) // ติ๊กซื้อแล้ว → คำนวณใหม่
  const [open, setOpen] = useState<string | null>(null)
  const [budget, setBudget] = useState(() => { try { return localStorage.getItem(BUDGET_KEY) ?? '' } catch { return '' } })
  const now = Date.now()

  useEffect(() => { api.packs().then((r) => setPacks(r.packs)).catch((e) => setErr((e as Error).message)) }, [])
  useEffect(() => { try { localStorage.setItem(BUDGET_KEY, budget) } catch { /* ไม่มี storage */ } }, [budget])

  const base = packs?.find((p) => p.base) ?? null
  const baseRate = base ? perBaht(base) : 0
  const rows = useMemo(() => (packs ?? [])
    .map((p) => ({ p, rate: perBaht(p), pct: baseRate ? (perBaht(p) / baseRate) * 100 : 0, bought: boughtCount(p) }))
    .sort((a, b) => b.rate - a.rate),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [packs, baseRate, tick])
  const maxPct = Math.max(130, ...rows.map((r) => r.pct))
  const budgetN = Math.max(0, Math.floor(Number(budget) || 0))
  const plan = useMemo(() => recommend(rows.map((r) => ({ pack: r.p, left: r.p.limit - r.bought })), budgetN), [rows, budgetN])
  const planPct = plan.spent && baseRate ? ((plan.value / plan.spent) / baseRate) * 100 : 0

  const changeBought = (p: Pack, n: number) => { setBought(p, n); bump((x) => x + 1) }

  return (
    <div className="mx-auto max-w-4xl">
      <p className="eyebrow mb-1.5">PACK VALUE</p>
      <h1 className="gold-title text-3xl font-extrabold">{L('เช็กความคุ้มค่าแพ็ค', 'Pack value checker')}</h1>
      <p className="mt-2 text-sm leading-relaxed text-white/60">
        {L('แปลงของในแพ็คเป็นรูบี้ แล้วดูว่าจ่าย 1 บาทได้รูบี้เท่าไหร่ — เทียบกับ', 'Every pack is converted to rubies per baht and compared with')}{' '}
        <b className="text-gold">{base?.name ?? 'Monthly Key Bundle'}</b>{' '}{L('(= 100%)', '(= 100%)')}
      </p>

      {/* สมมติฐานที่ใช้คิด */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/60">
        <Info className="h-4 w-4 text-white/40" />
        <span className="rounded-full bg-white/5 px-2.5 py-1">{L(`กล่องกุญแจ (${KEYS_PER_CHEST} กุญแจ) = ${CHEST_RUBY} รูบี้`, `Key chest (${KEYS_PER_CHEST} keys) = ${CHEST_RUBY} rubies`)}</span>
        <span className="rounded-full bg-white/5 px-2.5 py-1">{L(`ตั๋วสุ่ม = ${TICKET_RUBY} รูบี้`, `Summon ticket = ${TICKET_RUBY} rubies`)}</span>
        <span className="rounded-full bg-white/5 px-2.5 py-1">{L('ไม่นับ ตั๋วเรด · โทปาซ · ของอื่น', 'Raid tickets · topaz · extras not counted')}</span>
      </div>

      {/* แนะนำตามงบ */}
      <section className="panel panel-gold mt-6 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gold"><Wallet className="h-5 w-5" />{' '}{L('มีงบเท่าไหร่?', 'What is your budget?')}</h2>
          <label className="pill ml-auto flex items-center gap-1 px-3 py-1.5">
            <span className="text-white/50">฿</span>
            <input type="number" inputMode="numeric" min={0} value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="1500"
              aria-label={L('งบ (บาท)', 'Budget (baht)')} className="w-28 bg-transparent text-right font-bold tabular-nums outline-none" />
          </label>
        </div>
        {budgetN > 0 && (
          plan.picks.length ? (
            <div className="mt-4">
              <ul className="space-y-1.5">
                {plan.picks.map(({ pack, n }) => (
                  <li key={pack.id} className="flex items-center gap-2 text-sm">
                    <Sparkles className="h-4 w-4 shrink-0 text-gold" />
                    <span className="min-w-0 flex-1 truncate">{pack.name}{n > 1 && <b className="text-gold"> ×{n}</b>}</span>
                    <span className="tabular-nums text-white/70">{baht(pack.price * n)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-white/10 pt-3 text-sm text-white/70">
                {L('รวม', 'Total')}{' '}<b className="text-white">{baht(plan.spent)}</b>
                {' · '}{L('ได้', 'worth')}{' '}<b className="text-white">{fmt(plan.value)}</b>{' '}{L('รูบี้เทียบเท่า', 'ruby-equivalent')}
                {planPct > 0 && <>{' · '}<b className="text-gold">{Math.round(planPct)}%</b>{' '}{L('เทียบฐาน', 'of baseline')}</>}
                {budgetN - plan.spent >= 1 && <span className="text-white/45">{' · '}{L(`เหลือ ${baht(budgetN - plan.spent)}`, `${baht(budgetN - plan.spent)} left`)}</span>}
              </p>
            </div>
          ) : <p className="mt-3 text-sm text-white/50">{L('งบนี้ยังไม่พอซื้อแพ็คที่เหลือ', 'Not enough for any remaining pack')}</p>
        )}
        {!budgetN && <p className="mt-2 text-sm text-white/50">{L('ใส่งบแล้วจะเลือกชุดแพ็คที่ได้รูบี้รวมมากที่สุดให้ (ไม่นับแพ็คที่ซื้อครบแล้ว)', "Enter a budget to get the set of packs worth the most rubies (packs you've maxed out are skipped)")}</p>}
      </section>

      {/* รายการแพ็ค */}
      {err && <p className="mt-6 text-sm text-red-300">{err}</p>}
      {!packs && !err && <p className="py-16 text-center text-white/50">{L('กำลังโหลด...', 'Loading...')}</p>}
      <div className="mt-6 space-y-3">
        {rows.map(({ p, rate, pct, bought }, i) => {
          const t = tierOf(pct)
          const left = p.limit - bought
          const done = left <= 0
          const it = p.items
          const isOpen = open === p.id
          return (
            <article key={p.id} className={`panel overflow-hidden transition-opacity ${p.base ? 'panel-gold' : ''} ${done ? 'opacity-50' : ''}`}>
              <button type="button" onClick={() => setOpen(isOpen ? null : p.id)} className="flex w-full items-start gap-3 p-4 text-left">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${i < 3 && !done ? 'bg-gold text-ink' : 'bg-white/10 text-white/70'}`}>{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <b className="text-base">{p.name}</b>
                    {p.base && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-semibold text-gold">{L('เส้นฐาน', 'Baseline')}</span>}
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${t.cls}`}>{t.label}</span>
                  </span>
                  <span className="mt-1.5 flex flex-wrap gap-1.5">
                    {!!it.rubies && <Item icon={<img src={ruby} alt="" className="h-3.5 w-3.5" />} n={it.rubies} label={L('รูบี้', 'rubies')} />}
                    {!!it.chests && <Item icon={<KeyRound className="h-3.5 w-3.5 text-amber-300" />} n={it.chests} label={L(`กล่องกุญแจ (${fmt(it.chests * KEYS_PER_CHEST)} กุญแจ)`, `key chests (${fmt(it.chests * KEYS_PER_CHEST)} keys)`)} />}
                    {!!it.summon && <Item icon={<Ticket className="h-3.5 w-3.5 text-fuchsia-400" />} n={it.summon} label={L('ตั๋วสุ่ม', 'summon tickets')} />}
                    {!!it.raid && <Item icon={<Ticket className="h-3.5 w-3.5 text-red-300" />} n={it.raid} label={L('ตั๋วเรด (ไม่นับ)', 'raid tickets (not counted)')} muted />}
                    {it.other && <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-white/40">+ {it.other}</span>}
                  </span>
                  {/* แถบ % เทียบเส้นฐาน (เส้นขาว = 100%) */}
                  <span className="relative mt-2.5 block h-2 overflow-hidden rounded-full bg-white/10">
                    <span className={`pack-bar absolute inset-y-0 left-0 rounded-full ${t.bar}`} style={{ width: `${Math.min(100, (pct / maxPct) * 100)}%`, animationDelay: `${Math.min(i, 8) * 50}ms` }} />
                    <span className="absolute inset-y-0 w-0.5 bg-white/70" style={{ left: `${(100 / maxPct) * 100}%` }} />
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/50">
                    <span>{periodLabel(p.period, p.limit)}</span>
                    {p.endsAt && <span className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />{endsIn(p.endsAt, now)}</span>}
                    <span className="flex items-center gap-1">{isOpen ? L('ซ่อนวิธีคิด', 'Hide math') : L('ดูวิธีคิด', 'Show math')}<ChevronDown className={`h-3.5 w-3.5 transition ${isOpen ? 'rotate-180' : ''}`} /></span>
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className={`block text-2xl font-extrabold tabular-nums ${pct >= 100 ? 'text-gold' : 'text-white/80'}`}>{Math.round(pct)}%</span>
                  <span className="block text-sm font-semibold tabular-nums">{baht(p.price)}</span>
                  {!!p.gems && <span className="block text-[11px] text-white/45">💎 {p.gems}</span>}
                </span>
              </button>
              {isOpen && (
                <div className="edit-arrive border-t border-white/10 bg-black/15 px-4 py-3 text-sm text-white/70">
                  <p className="tabular-nums">
                    {[it.rubies ? `${fmt(it.rubies)} ${L('รูบี้', 'rubies')}` : '', it.chests ? `${fmt(it.chests)} ${L('กล่อง', 'chests')} × ${CHEST_RUBY}` : '', it.summon ? `${fmt(it.summon)} ${L('ตั๋ว', 'tickets')} × ${TICKET_RUBY}` : ''].filter(Boolean).join(' + ')}
                    {' = '}<b className="text-white">{fmt(packValue(p))}</b>{' '}{L('รูบี้เทียบเท่า', 'ruby-equivalent')}
                  </p>
                  <p className="mt-1 tabular-nums">
                    {fmt(packValue(p))} ÷ {baht(p.price)} = <b className="text-white">{rate.toFixed(2)}</b>{' '}{L('ต่อบาท', 'per baht')}
                    {base && !p.base && <>{' · '}{L('ฐาน', 'baseline')} {baseRate.toFixed(2)} → <b className="text-gold">{Math.round(pct)}%</b></>}
                  </p>
                </div>
              )}
              {/* ซื้อแล้วกี่ครั้ง (จำในเครื่อง) */}
              <div className="flex items-center gap-2 border-t border-white/10 px-4 py-2 text-sm">
                <span className="text-white/50">{L('ซื้อแล้ว', 'Bought')}</span>
                <button type="button" disabled={!bought} onClick={() => changeBought(p, bought - 1)} aria-label={L('ลด', 'Less')}
                  className="grid h-7 w-7 place-items-center rounded-full border border-white/15 hover:border-gold disabled:opacity-30"><Minus className="h-3.5 w-3.5" /></button>
                <span className="w-12 text-center font-semibold tabular-nums">{bought}/{p.limit}</span>
                <button type="button" disabled={done} onClick={() => changeBought(p, bought + 1)} aria-label={L('เพิ่ม', 'More')}
                  className="grid h-7 w-7 place-items-center rounded-full border border-white/15 hover:border-gold disabled:opacity-30"><Plus className="h-3.5 w-3.5" /></button>
                {done && <span className="ml-1 text-xs font-semibold text-emerald-300">{L('ครบแล้ว', 'Maxed')}</span>}
                {p.period !== 'once' && <span className="ml-auto text-xs text-white/40">{L('นับใหม่ทุกรอบ (07:00)', 'Resets each cycle (07:00 TH)')}</span>}
              </div>
            </article>
          )
        })}
      </div>
      {packs && !packs.length && <p className="py-16 text-center text-white/50">{L('ยังไม่มีแพ็ค', 'No packs yet')}</p>}
      <p className="mt-6 text-xs leading-relaxed text-white/40">
        {L('ราคา/ของในแพ็คอ้างอิงจากร้านในเกม (ไทย) อาจเปลี่ยนตามอีเวนต์ · ค่าที่ใช้คิดเป็นการประมาณ ไม่ใช่คำแนะนำทางการเงิน · 7K Note ไม่มีส่วนเกี่ยวข้องกับ Netmarble',
          'Prices/contents follow the in-game (Thai) shop and may change with events · values are estimates, not financial advice · 7K Note is not affiliated with Netmarble')}
      </p>
    </div>
  )
}
