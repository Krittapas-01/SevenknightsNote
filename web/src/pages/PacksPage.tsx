import { CalendarClock, ChevronDown, ChevronRight, Info, Minus, Plus, RotateCcw, Sparkles, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Modal from '../components/Modal'
import PackTile, { Prism, itemIcon } from '../components/PackTile'
import { api } from '../lib/api'
import {
  ATLAS_CATS, CAT_NAME, GROUP_META, ITEMS, groupArt, groupName, shownItems, PACK_BASE_KEYS, PACK_ITEM_KEYS, PACK_TABS, boughtCount, defaultWorth, itemName, itemsOf, loadWorthPrefs, packTab, packValue, periodLabel,
  WANTS, amountOf, priceOf, rateOf, recommend, saveWorthPrefs, setBought, shopValue, tierOf, worthTable,
  type Metric, type Pack, type Want, type PackItemKey, type PackTab, type Profile, type Worth, type WorthPrefs,
} from '../lib/packs'
import { L } from '../lib/i18n'

const fmt = (n: number) => Math.round(n).toLocaleString('en-US')
const num = (n: number) => (Number.isInteger(n) ? n.toLocaleString('en-US') : n.toLocaleString('en-US', { maximumFractionDigits: 2 }))
const baht = (n: number) => `฿${n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`
const BUDGET_KEY = '7k-note:packs-budget'
const WANT_KEY = '7k-note:packs-want'
/** หมวดที่ซ่อนไว้ (ข้อมูลยังอยู่ในฐาน): ข้อเสนอตามเงื่อนไข ซับซ้อนเกิน (Krit) */
const HIDDEN_TABS: PackTab[] = ['offer']

const TAB_LABEL: Record<PackTab | 'values', [string, string]> = {
  monthly: ['รายเดือน', 'Monthly'], special: ['พิเศษ', 'Special'], limited: ['จำกัดเวลา', 'Limited Time'], daily: ['รายวัน', 'Daily'],
  ruby: ['ร้านรูบี้', 'Ruby top-up'], offer: ['ข้อเสนอตามเงื่อนไข', 'Conditional offers'], relay: ['รีเลย์', 'Relay'], pass: ['พาส', 'Passes'], event: ['กิจกรรม', 'Events'],
  values: ['ค่าของแต่ละชิ้น', 'Item values'],
}

/** เหลือเวลาอีกกี่วัน/ชั่วโมง */
function endsIn(ts: number, now: number) {
  const h = Math.max(0, Math.floor((ts - now) / 3_600_000))
  return h >= 48 ? L(`${Math.floor(h / 24)} วัน`, `${Math.floor(h / 24)}d`) : L(`${h} ชม.`, `${h}h`)
}

type Row = { p: Pack; value: number; rate: number; pct: number; bought: number }
type Group = { name: string; tab: PackTab; rows: Row[]; best: number; endsAt: number | null }

/** หน้าเช็กความคุ้มค่าแพ็ค: หน้าตาแบบร้านในเกม (แท็บ → แถบแพ็ค → กดดูทุกขั้น) · คิดจากค่าที่ผู้เล่นให้จริง ไม่ใช่ราคาร้านรูบี้ */
export default function PacksPage() {
  const [packs, setPacks] = useState<Pack[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [tick, bump] = useState(0) // ติ๊กซื้อแล้ว → คำนวณใหม่
  const [prefs, setPrefs] = useState<WorthPrefs>(loadWorthPrefs)
  const [tab, setTab] = useState<PackTab | 'values' | null>(null)
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [budget, setBudget] = useState(() => { try { return localStorage.getItem(BUDGET_KEY) ?? '' } catch { return '' } })
  const [wantId, setWantId] = useState<string | null>(() => { try { return localStorage.getItem(WANT_KEY) } catch { return null } })
  const want = WANTS.find((w) => w.id === wantId) ?? null
  const now = Date.now()

  useEffect(() => { api.packs().then((r) => setPacks(r.packs)).catch((e) => setErr((e as Error).message)) }, [])
  useEffect(() => { try { localStorage.setItem(BUDGET_KEY, budget) } catch { /* ไม่มี storage */ } }, [budget])
  useEffect(() => { try { if (wantId) localStorage.setItem(WANT_KEY, wantId); else localStorage.removeItem(WANT_KEY) } catch { /* ไม่มี storage */ } }, [wantId])
  const update = (p: Partial<WorthPrefs>) => setPrefs((old) => { const next = { ...old, ...p }; saveWorthPrefs(next); return next })

  const worth = useMemo(() => worthTable(prefs), [prefs])
  const metric = prefs.metric
  const base = packs?.find((p) => p.base) ?? null
  const baseRate = base ? rateOf(base, metric, worth) : 0

  const groups = useMemo(() => {
    const map = new Map<string, Group>()
    for (const p of packs ?? []) {
      if (HIDDEN_TABS.includes(packTab(p))) continue
      const value = packValue(p, worth), rate = rateOf(p, metric, worth)
      const row: Row = { p, value, rate, pct: baseRate && rate ? (rate / baseRate) * 100 : 0, bought: boughtCount(p) }
      const name = p.group || p.name
      const g = map.get(name) ?? { name, tab: packTab(p), rows: [], best: 0, endsAt: null }
      g.rows.push(row)
      g.best = Math.max(g.best, row.pct)
      if (p.endsAt) g.endsAt = g.endsAt ? Math.min(g.endsAt, p.endsAt) : p.endsAt
      map.set(name, g)
    }
    for (const g of map.values()) g.rows.sort((a, b) => a.p.price - b.p.price)
    return [...map.values()] // เรียงตามร้านในเกม (API ส่งมาตาม sort)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packs, worth, metric, baseRate, tick])

  const tabs = PACK_TABS.filter((t) => groups.some((g) => g.tab === t))
  const active = tab ?? (tabs.includes('special') ? 'special' : tabs[0] ?? 'values')
  const shown = groups.filter((g) => g.tab === active)
  const group = groups.find((g) => g.name === openGroup) ?? null

  const allRows = groups.flatMap((g) => g.rows)
  const budgetN = Math.max(0, Math.floor(Number(budget) || 0))
  const plan = useMemo(() => recommend(allRows.map((r) => ({ pack: r.p, left: r.p.limit - r.bought })), budgetN, worth),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, budgetN, worth])
  const planBaseRate = base ? rateOf(base, 'baht', worth) : 0
  const planPct = plan.spent && planBaseRate ? ((plan.value / plan.spent) / planBaseRate) * 100 : 0

  const changeBought = (p: Pack, n: number) => { setBought(p, n); bump((x) => x + 1) }

  return (
    <div className="mx-auto max-w-5xl">
      <p className="eyebrow mb-1.5">PACK VALUE</p>
      <h1 className="gold-title text-3xl font-extrabold">{L('เช็กความคุ้มค่าแพ็ค', 'Pack value checker')}</h1>
      <p className="mt-2 text-sm leading-relaxed text-white/60">
        {L('หลักง่าย ๆ: กล่องกุญแจเยอะ รูบี้เยอะ ราคาถูก = คุ้ม (1 กล่อง = 100 รูบี้) · ของอื่นคิดเป็นรูบี้ตามค่าที่เจ้าของเว็บให้ (ดูได้ในแท็บค่าของแต่ละชิ้น) · เทียบกับ',
          'Rule of thumb: lots of key chests, lots of rubies, low price = good value (1 chest = 100 rubies) · other items count at the site owner’s ruby values (see Item values) · compared with')}{' '}
        <b className="text-gold">{base?.name ?? 'Monthly Key Bundle'}</b>{' '}{L('(= 100%)', '(= 100%)')}
      </p>

      {/* คำเตือน: เป็นความเห็นส่วนตัว ไม่ได้ชวนซื้อ (Krit) */}
      <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-[13px] leading-relaxed text-amber-100/90">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        <span>{L('ค่าความคุ้มในหน้านี้เป็นความคิดเห็นส่วนตัวของเจ้าของเว็บ ไม่ได้บังคับหรือชวนให้ซื้อ ก่อนจะซื้อแพ็คไหน ตัดสินใจให้ดีนะครับ',
          'The values on this page are the site owner’s personal opinion. Nobody is telling you to buy anything, so think it over before you buy a pack.')}</span>
      </p>

      {/* ตั้งค่า: เทียบต่อบาทหรือต่อปริซึม */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <Seg value={metric} onChange={(v) => update({ metric: v })}
          options={[['baht', L('ต่อบาท', 'Per baht')], ['gem', <>{L('ต่อ', 'Per')} <Prism /></>]]} label={L('เทียบราคาแบบไหน', 'Compare by')} />
      </div>

      {/* อยากได้อะไร: เลือกของ → จัดอันดับแพ็คที่ได้ของนั้นมากสุดต่อบาท (ทุกหมวด) */}
      <div className="mt-4">
        <p className="mb-1.5 text-sm font-semibold text-white/80">{L('อยากได้อะไร?', 'What do you want?')}</p>
        <div role="radiogroup" aria-label={L('อยากได้อะไร', 'What do you want')} className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap">
          <button type="button" role="radio" aria-checked={!want} onClick={() => setWantId(null)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition ${!want ? 'border-gold/70 bg-gold/15 text-gold' : 'border-white/10 bg-black/20 text-white/70 hover:border-gold/40'}`}>
            {L('คุ้มรวมทุกอย่าง', 'Best overall')}
          </button>
          {WANTS.map((w) => (
            <button key={w.id} type="button" role="radio" aria-checked={want?.id === w.id} onClick={() => setWantId(w.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border py-0.5 pl-1.5 pr-3 text-[13px] font-semibold transition ${want?.id === w.id ? 'border-gold/70 bg-gold/15 text-gold' : 'border-white/10 bg-black/20 text-white/70 hover:border-gold/40'}`}>
              <WantIcon k={w.icon} />{L(...w.name)}
            </button>
          ))}
        </div>
      </div>

      {want ? <WantList want={want} groups={groups} metric={metric} onOpen={setOpenGroup} /> : (
      /* แท็บแบบร้านในเกม: มือถือเป็นแถบบน · จอกว้างเป็นคอลัมน์ซ้าย */
      <div className="mt-5 md:grid md:grid-cols-[180px_1fr] md:gap-4">
        <div role="tablist" aria-label={L('หมวดแพ็ค', 'Pack tabs')} className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2 md:mx-0 md:flex-col md:overflow-visible md:px-0">
          {[...tabs, 'values' as const].map((t) => (
            <button key={t} type="button" role="tab" aria-selected={active === t} onClick={() => setTab(t)}
              className={`shrink-0 whitespace-nowrap rounded-xl border px-3.5 py-2 text-sm font-semibold transition md:text-left ${active === t ? 'border-gold/70 bg-gold/15 text-gold' : 'border-white/10 bg-black/20 text-white/70 hover:border-gold/40'}`}>
              {L(...TAB_LABEL[t])}
              {t !== 'values' && <span className="ml-1.5 text-xs font-normal text-white/40">{groups.filter((g) => g.tab === t).length}</span>}
            </button>
          ))}
        </div>

        <div className="min-w-0">
          {err && <p className="text-sm text-red-300">{err}</p>}
          {!packs && !err && <p className="py-16 text-center text-white/50">{L('กำลังโหลด...', 'Loading...')}</p>}
          {active === 'values'
            ? <ValuesTab prefs={prefs} worth={worth} onChange={(k, v) => { const w = { ...prefs.worth }; if (v === undefined) delete w[k]; else w[k] = v; update({ worth: w }) }}
                onReset={() => update({ worth: {} })} />
            : (
              <div className="grid gap-3">
                {shown.map((g) => active === 'monthly'
                  ? <MonthlyCard key={g.name} g={g} onOpen={() => setOpenGroup(g.name)} />
                  : <GroupRow key={g.name} g={g} now={now} onOpen={() => setOpenGroup(g.name)} />)}
                {packs && !shown.length && <p className="py-12 text-center text-white/50">{L('ยังไม่มีแพ็คในหมวดนี้', 'No packs in this tab')}</p>}
              </div>
            )}
        </div>
      </div>
      )}

      {/* แนะนำตามงบ */}
      <section className="panel panel-gold mt-8 p-5">
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
              <ul className="space-y-0.5">
                {plan.picks.map(({ pack, n }) => (
                  <li key={pack.id}>
                    {/* กดแล้วเปิดแพ็คนั้นดูของ/ทุกขั้น */}
                    <button type="button" onClick={() => setOpenGroup(pack.group || pack.name)}
                      className="group flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left text-sm transition hover:bg-white/5">
                      <Sparkles className="h-4 w-4 shrink-0 text-gold" />
                      <span className="min-w-0 flex-1 truncate underline decoration-white/25 underline-offset-4 group-hover:text-gold group-hover:decoration-gold">{groupName(pack.group || pack.name)} · {baht(pack.price)}{n > 1 && <b className="text-gold"> ×{n}</b>}</span>
                      <span className="tabular-nums text-white/70">{baht(pack.price * n)}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-white/40 group-hover:text-gold" />
                    </button>
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
        {!budgetN && <p className="mt-2 text-sm text-white/50">{L('ใส่งบแล้วจะเลือกชุดแพ็คที่ได้รูบี้เทียบเท่ารวมมากที่สุดให้ (ไม่นับแพ็คที่ซื้อครบแล้ว)', "Enter a budget to get the set of packs worth the most rubies (packs you've maxed out are skipped)")}</p>}
      </section>

      <p className="mt-6 text-xs leading-relaxed text-white/40">
        {L('ราคา/ของในแพ็คอ้างอิงจากร้านในเกม (ไทย) อาจเปลี่ยนตามอีเวนต์ · ค่าที่ใช้คิดเป็นความเห็นของผู้เล่น แก้เองได้ ไม่ใช่คำแนะนำทางการเงิน · รูปแพ็คจากเกม © Netmarble · 7K Note ไม่มีส่วนเกี่ยวข้องกับ Netmarble',
          'Prices/contents follow the in-game (Thai) shop and may change with events · item values are players’ opinions you can edit, not financial advice · pack art from the game © Netmarble · 7K Note is not affiliated with Netmarble')}
      </p>

      <Modal wide open={!!group} title={group ? <GroupTitle g={group} now={now} /> : ''} onClose={() => setOpenGroup(null)}>
        {group && (
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            {group.rows.map((r) => <TierCard key={r.p.id} r={r} worth={worth} metric={metric} base={base} baseRate={baseRate} onBought={changeBought} />)}
          </div>
        )}
      </Modal>
    </div>
  )
}

/** ไอคอนของในปุ่ม "อยากได้อะไร" */
function WantIcon({ k }: { k: PackItemKey }) {
  const src = itemIcon(k)
  return src ? <img src={src} alt="" draggable={false} className="h-7 w-7 shrink-0 object-contain" /> : null
}

/** จัดอันดับขั้นแพ็คทุกหมวดที่ได้ของที่อยากได้ มากสุดต่อบาท (หรือต่อปริซึม) */
function WantList({ want, groups, metric, onOpen }: { want: Want; groups: Group[]; metric: Metric; onOpen: (g: string) => void }) {
  const rows = groups.flatMap((g) => g.rows.map((r) => {
    const n = amountOf(r.p, want), price = priceOf(r.p, metric)
    return { g, r, n, per: price > 0 ? n / price : 0 }
  })).filter((x) => x.n > 0 && x.per > 0).sort((a, b) => b.per - a.per)
  const top = rows[0]?.per ?? 0
  const scale = top < 1 ? 100 : 1 // ของชิ้นใหญ่ (ตั๋ว/กล่อง) ได้ไม่ถึง 1 ชิ้นต่อบาท → คิดต่อ 100 บาท
  const unit = metric === 'gem' ? <>{scale > 1 && '100'}<Prism /></> : scale > 1 ? '฿100' : L('บาท', 'baht')
  const per = (v: number) => (v >= 10 ? v.toFixed(1) : v >= 1 ? v.toFixed(2) : v.toFixed(3))
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs text-white/50">
        {L(`เรียงตาม${L(...want.name)}ที่ได้ต่อ`, `Ranked by ${L(...want.name)} per `)}{unit}{L(' (รวมทุกหมวด · ช่อง Select นับตัวเลือกที่ให้ของนี้ · % = ความคุ้มรวมทั้งแพ็ค)', ' (all tabs · Select slots count the option with this item · % = whole-pack value)')}
      </p>
      {!rows.length && <p className="py-12 text-center text-white/50">{L('ไม่มีแพ็คที่ให้ของนี้', 'No pack gives this item')}</p>}
      <ol className="grid gap-2 xl:grid-cols-2">
        {rows.map(({ g, r, n, per: v }, i) => {
          const art = groupArt(g.name)
          const done = r.bought >= r.p.limit
          const t = tierOf(r.pct)
          return (
            <li key={r.p.id}>
              <button type="button" onClick={() => onOpen(g.name)}
                className={`panel group relative flex min-h-[84px] w-full items-center gap-2 overflow-hidden py-2.5 pl-1.5 pr-3 sm:gap-3 sm:pl-2 text-left transition hover:border-gold/60 sm:min-h-[96px] sm:pr-4 ${done ? 'opacity-55' : ''}`}>
                <b className={`w-5 shrink-0 text-center text-base tabular-nums sm:w-7 sm:text-lg ${i < 3 ? 'text-gold' : 'text-white/45'}`}>{i + 1}</b>
                <span className="relative h-12 w-12 shrink-0 sm:h-20 sm:w-20">
                  {art && <img src={art.src} alt="" loading="lazy" draggable={false}
                    className={`h-full w-full rounded-lg ${art.square ? 'object-contain' : 'object-cover object-right'}`} />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <b className="text-[15px] leading-snug sm:text-base">{groupName(g.name)}</b>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-[13px]">
                    <span className="font-semibold text-white tabular-nums">{baht(r.p.price)}</span>
                    <span className="text-white/60 tabular-nums">{L('ได้', 'gets')} {num(Math.round(n * 100) / 100)} {L(...want.unit)}</span>
                    {r.pct > 0 && <span className={`rounded-full px-2 py-0.5 font-semibold ${t.cls}`}>{Math.round(r.pct)}%</span>}
                    {done && <span className="font-semibold text-emerald-300">{L('ซื้อครบแล้ว', 'Maxed')}</span>}
                  </span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-gold/80" style={{ width: `${Math.max(3, (v / top) * 100)}%` }} /></span>
                </span>
                <span className="shrink-0 text-right">
                  <b className="block text-lg tabular-nums text-gold sm:text-xl">{per(v * scale)}</b>
                  <span className="text-[11px] text-white/50">{L(...want.unit)} / {unit}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function Seg<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: [T, ReactNode][]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-full border border-white/15 bg-black/20 p-0.5">
      {options.map(([v, text]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
          className={`rounded-full px-3 py-1 text-[13px] font-semibold transition ${value === v ? 'bg-gold text-ink' : 'text-white/65 hover:text-white'}`}>{text}</button>
      ))}
    </div>
  )
}

function GroupTitle({ g, now }: { g: Group; now: number }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span>{groupName(g.name)}</span>
      {g.endsAt && <span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs font-normal text-white/70"><CalendarClock className="h-3.5 w-3.5" />{endsIn(g.endsAt, now)}</span>}
    </span>
  )
}

/** แถบแพ็ค 1 กลุ่มแบบในร้าน: รูปซ้าย ชื่อ/คำอธิบายขวา + % ขั้นที่คุ้มสุด */
function GroupRow({ g, now, onOpen }: { g: Group; now: number; onOpen: () => void }) {
  const meta = GROUP_META[g.name]
  const art = groupArt(g.name)
  const t = tierOf(g.best)
  const prices = g.rows.map((r) => r.p.price)
  return (
    <button type="button" onClick={onOpen}
      className="panel group relative flex min-h-[96px] w-full items-stretch overflow-hidden text-left transition hover:border-gold/60 sm:min-h-[128px]">
      {/* แบบร้านในเกม: ตัวหนังสือซ้าย รูปขวา (จางเข้าหาตัวหนังสือ) */}
      {art
        ? <img src={art.src} alt="" loading="lazy" draggable={false} className={`pack-art-r pointer-events-none absolute inset-y-0 right-0 h-full ${art.square ? 'w-[45%] max-w-[200px] object-contain py-2 pl-10 pr-3' : 'w-auto max-w-[55%] object-cover object-right'}`} />
        : <span className="pointer-events-none absolute inset-y-0 right-0 w-[45%] max-w-[340px] bg-gradient-to-l from-gold/15 to-transparent" />}
      <span className="relative flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-3 pl-4 pr-[34%] sm:pl-6 sm:pr-[220px]">
        <span className="flex items-start gap-2">
          <b className="min-w-0 flex-1 text-base leading-snug sm:text-xl">{groupName(g.name)}</b>
          {g.endsAt && <span className="flex shrink-0 items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 text-[11px] text-white/70"><CalendarClock className="h-3 w-3" />{endsIn(g.endsAt, now)}</span>}
        </span>
        {meta?.sub && <span className="text-xs leading-snug text-white/60 sm:text-sm">{L(...meta.sub)}</span>}
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm">
          {g.best > 0 && <span className={`rounded-full px-2 py-0.5 font-semibold ${t.cls}`}>{L('คุ้มสุด', 'Best')} {Math.round(g.best)}%</span>}
          <span className="text-white/50 tabular-nums">{g.rows.length} {L('ขั้น', g.rows.length === 1 ? 'tier' : 'tiers')} · {baht(Math.min(...prices))}{prices.length > 1 ? `–${baht(Math.max(...prices))}` : ''}</span>
        </span>
      </span>
    </button>
  )
}

/** การ์ดสิทธิพิเศษรายเดือนแบบในเกม: ใหญ่เต็มแถว · บัฟ · ได้รวม/รายวัน · Bonus · ราคา */
function MonthlyCard({ g, onOpen }: { g: Group; onOpen: () => void }) {
  const r = g.rows[0]
  const it = r.p.items
  const art = groupArt(g.name)
  const t = tierOf(r.pct)
  const bonus = itemsOf(r.p).filter((x) => x.b)
  const icon = (k: PackItemKey) => { const src = itemIcon(k); return src ? <img src={src} alt="" className="h-5 w-5 object-contain" /> : null }
  return (
    <button type="button" onClick={onOpen}
      className="panel group relative flex w-full flex-col overflow-hidden text-left transition hover:border-gold/60">
      {art && <img src={art.src} alt="" loading="lazy" draggable={false}
        className="pack-art-r pointer-events-none absolute right-0 top-0 h-[112px] w-[50%] object-cover object-right sm:h-[calc(100%-44px)] sm:w-[55%]" />}
      <span className="absolute right-3 top-3 rounded-full border border-white/25 bg-black/50 px-2.5 py-1 text-xs font-semibold text-white/90 backdrop-blur-sm">
        {it.days ? L(`${it.days} วัน`, `${it.days} days`) : L('ไม่จำกัด', 'Unlimited')}
      </span>
      <span className="relative flex flex-1 flex-col gap-2 px-4 pb-3 pt-4 sm:min-h-[150px] sm:px-5 sm:pt-5">
        <b className="max-w-[55%] text-lg leading-snug sm:max-w-none sm:pr-24 sm:text-xl">{groupName(g.name)}</b>
        {!!it.perks?.length && (
          <ul className="mt-6 flex max-w-[640px] flex-col gap-1 sm:mt-0">
            {it.perks.map((x, i) => (
              <li key={i} className="flex items-start gap-2 rounded-md bg-black/35 px-2.5 py-1 text-[13px] leading-snug text-white/85 sm:w-fit sm:text-sm">
                <span className="text-gold">✦</span>{L(x[0], x[1])}
              </li>
            ))}
          </ul>
        )}
        {bonus.length > 0 && (
          <span className="flex w-fit items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-xs text-white/80 sm:self-end">
            Bonus{bonus.map((x, i) => <span key={i} className="flex items-center gap-0.5 font-semibold tabular-nums">{icon(x.k)}×{num(x.n)}</span>)}
          </span>
        )}
      </span>
      <span className="relative flex min-h-[44px] flex-wrap items-center gap-2 bg-black/45 px-4 py-2 sm:px-5">
        {it.daily && <>
          <span className="flex items-center gap-1 rounded-full border border-gold/40 px-2.5 py-0.5 text-[13px]">{L('รวม', 'Total')} {icon(it.daily.k)}<b className="tabular-nums">×{num(it.daily.total)}</b></span>
          <span className="flex items-center gap-1 rounded-full border border-gold/40 px-2.5 py-0.5 text-[13px]">{L('รายวัน', 'Daily')} {icon(it.daily.k)}<b className="tabular-nums">×{num(it.daily.n)}</b></span>
        </>}
        <span className="ml-auto flex items-center gap-2">
          {r.pct > 0 && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.cls}`}>{L('คุ้ม', 'Value')} {Math.round(r.pct)}%</span>}
          <b className="text-lg tabular-nums text-white sm:text-xl">{baht(r.p.price)}</b>
          {!!r.p.gems && <span className="text-sm text-white/70 tabular-nums">(<Prism />{r.p.gems})</span>}
        </span>
      </span>
    </button>
  )
}

/** คำอธิบายของอื่น ๆ ที่ใช้บ่อย (ข้อความจากแอดมินเป็นไทย) → อังกฤษในโหมดอังกฤษ · ส่วนที่ไม่รู้จักแสดงตามเดิม */
const OTHER_EN: Record<string, string> = {
  'มีหลายแบบ ของคล้ายกัน': 'several versions with similar items',
  'เลือกของแถม 1 อย่าง': 'pick 1 bonus item',
  'อัศวินตำนาน (L+)': 'Legendary hero (L+)',
  'อัศวินตำนาน (L)': 'Legendary hero (L)',
  'หรือ อัศวินตำนาน (L+)': 'or a Legendary hero (L+)',
  'หรือ อัศวินตำนาน (L)': 'or a Legendary hero (L)',
  'Leah (วัตถุดิบ)': 'Leah (material)',
  'สัตว์เลี้ยงหายาก 6★': 'Rare pet 6★',
  'บัฟถาวร: วิ่งซ้ำ +300 รอบ': 'Permanent buff: +300 repeat runs',
  'กุญแจสูงสุด +55 (ไม่นับเป็นรูบี้)': 'max keys +55 (not counted as rubies)',
}
const otherEn = (x: string) => {
  const relay = /^ขั้น (\d+) \+ ขั้นฟรี (\d+)–(\d+) รวมกัน$/.exec(x)
  return relay ? `step ${relay[1]} + free steps ${relay[2]}–${relay[3]} combined` : OTHER_EN[x.trim()] ?? x
}
const otherText = (s: string) => s.split(' · ').map((x) => L(x, otherEn(x))).join(' · ')

/** การ์ด 1 ขั้นราคาแบบในเกม: หัว "ซื้อได้" · ช่องของ (BONUS) · ราคา ฿ (ปริซึม) + % ความคุ้ม */
function TierCard({ r, worth, metric, base, baseRate, onBought }: { r: Row; worth: Worth; metric: Metric; base: Pack | null; baseRate: number; onBought: (p: Pack, n: number) => void }) {
  const [open, setOpen] = useState(false)
  const { p, value, rate, pct, bought } = r
  const left = p.limit - bought
  const done = left <= 0
  const t = tierOf(pct)
  const all = itemsOf(p)
  const items = shownItems(p, (k) => worth[k])
  const opts = all.filter((x) => x.s)
  const shop = shopValue(p)
  const counted = items.filter((x) => worth[x.k] > 0)
  const skipped = items.filter((x) => !(worth[x.k] > 0))
  const unit = metric === 'gem' ? <Prism /> : L('บาท', 'baht')
  return (
    <article className={`overflow-hidden rounded-2xl border transition ${p.base ? 'border-gold/70' : 'border-white/10'} bg-black/20 ${done ? 'opacity-55' : ''}`}>
      <div className="pack-head flex items-center justify-center gap-2 px-3 py-1 text-xs font-semibold sm:py-1.5 sm:text-sm">
        {L(`ซื้อได้ ${left}/${p.limit}`, `Purchase limit ${left}/${p.limit}`)}
        {p.period !== 'once' && <span className="font-normal opacity-80">· {periodLabel(p.period, p.limit)}</span>}
        {p.base && <span className="rounded-full bg-black/25 px-1.5 text-[10px]">{L('เส้นฐาน', 'Baseline')}</span>}
      </div>
      <div className="flex items-center gap-3 p-3 sm:p-4">
        <div className="w-[84px] shrink-0 text-center sm:w-[120px]">
          <b className={`block text-2xl font-extrabold tabular-nums sm:text-4xl ${pct >= 100 ? 'text-gold' : 'text-white/85'}`}>{rate ? `${Math.round(pct)}%` : '—'}</b>
          {rate > 0 && <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold sm:text-xs ${t.cls}`}>{t.label}</span>}
          <span className="mt-1 block text-[11px] leading-tight text-white/50 tabular-nums sm:text-[13px]">{rate ? <>{rate.toFixed(1)} / {unit}</> : L('ไม่มีราคาปริซึม', 'No prism price')}</span>
        </div>
        {/* ช่องของ 2 แถวแบบในเกม (สูงสุด 3 คอลัมน์ ไม่งั้นล้นการ์ดตอนของเยอะ เช่นพาส) */}
        <div className="ml-auto grid min-w-0 gap-1.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(3, Math.max(1, Math.ceil(items.length / 2)))}, auto)` }}>
          {items.map((x, i) => <PackTile key={i} k={x.k} n={x.n} bonus={!!x.b} pick={!!x.s} muted={!(worth[x.k] > 0)} />)}
        </div>
      </div>
      {p.items.other && <p className="-mt-1 px-3 pb-2 text-right text-[11px] text-white/45">{p.items.other.startsWith('ขั้น ') ? '' : '+ '}{otherText(p.items.other)}</p>}
      <div className="pack-price flex items-center justify-center gap-1.5 py-1.5 text-lg font-bold tabular-nums sm:py-2 sm:text-xl">
        {baht(p.price)}{!!p.gems && <span className="text-sm font-semibold opacity-80">(<Prism />{p.gems})</span>}
      </div>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        className="flex w-full items-center justify-center gap-1 border-t border-white/10 py-1.5 text-xs text-white/55 hover:text-gold">
        {open ? L('ซ่อนวิธีคิด', 'Hide math') : L('ดูวิธีคิด', 'Show math')}<ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="edit-arrive space-y-1 border-t border-white/10 bg-black/15 px-3 py-2.5 text-xs leading-relaxed text-white/70">
          {counted.map((x, i) => (
            <p key={i} className="flex justify-between gap-2 tabular-nums">
              <span className="min-w-0 truncate">{x.s && L('เลือก: ', 'Pick: ')}{itemName(x.k)} {num(x.n)} × {num(worth[x.k])}</span><span>{fmt(x.n * worth[x.k])}</span>
            </p>
          ))}
          {opts.length > 1 && <p className="text-white/45">{L('ช่อง Select เลือกได้ 1 อย่าง (นับอันที่คุ้มสุด)', 'Select slot: pick 1 (the best one is counted)')}: {opts.map((x) => `${itemName(x.k)} ${num(x.n)}`).join(' / ')}</p>}
          <p className="flex justify-between gap-2 border-t border-white/10 pt-1 font-semibold text-white tabular-nums">
            <span>{L('รวม', 'Total')}</span><span>{fmt(value)} {L('รูบี้', 'rubies')}</span>
          </p>
          {skipped.length > 0 && <p className="text-white/45">{L('ไม่นับ', 'Not counted')}: {skipped.map((x) => `${itemName(x.k)} ${num(x.n)}`).join(' · ')}</p>}
          {rate > 0 && <p className="tabular-nums">{fmt(value)} ÷ {metric === 'gem' ? <><Prism />{p.gems}</> : baht(p.price)} = <b className="text-white">{rate.toFixed(2)}</b>
            {base && !p.base && baseRate > 0 && <>{' · '}{L('ฐาน', 'baseline')} {baseRate.toFixed(2)} → <b className="text-gold">{Math.round(pct)}%</b></>}</p>}
          <p className="text-white/45 tabular-nums">{L('ถ้าคิดตามราคาร้านรูบี้ (แบบเว็บอื่น)', 'At Ruby Shop prices (like other sites)')}: {fmt(shop)} {L('รูบี้', 'rubies')}</p>
        </div>
      )}
      {/* ซื้อแล้วกี่ครั้ง (จำในเครื่อง) */}
      <div className="flex items-center gap-2 border-t border-white/10 px-3 py-1.5 text-sm">
        <span className="text-white/50">{L('ซื้อแล้ว', 'Bought')}</span>
        <button type="button" disabled={!bought} onClick={() => onBought(p, bought - 1)} aria-label={L('ลด', 'Less')}
          className="grid h-7 w-7 place-items-center rounded-full border border-white/15 hover:border-gold disabled:opacity-30"><Minus className="h-3.5 w-3.5" /></button>
        <span className="w-10 text-center font-semibold tabular-nums">{bought}/{p.limit}</span>
        <button type="button" disabled={done} onClick={() => onBought(p, bought + 1)} aria-label={L('เพิ่ม', 'More')}
          className="grid h-7 w-7 place-items-center rounded-full border border-white/15 hover:border-gold disabled:opacity-30"><Plus className="h-3.5 w-3.5" /></button>
        {done && <span className="ml-1 text-xs font-semibold text-emerald-300">{L('ครบแล้ว', 'Maxed')}</span>}
      </div>
    </article>
  )
}

/** แท็บค่าของแต่ละชิ้น: ราคาร้านรูบี้ vs ค่าที่ให้ (แก้ได้ จำในเครื่อง) */
function ValuesTab({ prefs, worth, onChange, onReset }: { prefs: WorthPrefs; worth: Worth; onChange: (k: PackItemKey, v: number | undefined) => void; onReset: () => void }) {
  const edited = Object.keys(prefs.worth).length
  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3">
        <Info className="h-4 w-4 shrink-0 text-white/40" />
        <p className="min-w-0 flex-1 text-xs leading-relaxed text-white/60">
          {L('ของในร้านรูบี้แพงกว่าค่าจริง (ถ้าคุ้มจริงคงซื้อหมดแล้ว) จึงใช้ "ค่าที่ให้" แทน · ค่าตั้งต้นเป็นความเห็นของเจ้าของเว็บ แก้เองได้ จำไว้ในเครื่องนี้',
            'Ruby Shop prices are above real worth (if they were worth it, you’d buy them all), so packs use “your value” instead · defaults are the site owner’s opinion, edit them freely, saved on this device')}
        </p>
        <button type="button" disabled={!edited} onClick={onReset}
          className="flex items-center gap-1 rounded-full border border-white/15 px-3 py-1 text-xs hover:border-gold disabled:opacity-30">
          <RotateCcw className="h-3.5 w-3.5" />{L('คืนค่าตั้งต้น', 'Reset')}
        </button>
      </div>
      <ul className="divide-y divide-white/5">
        {PACK_BASE_KEYS.map((k) => <ValueRow key={k} k={k} prefs={prefs} worth={worth} onChange={onChange} />)}
      </ul>
      {/* ไอเท็มอื่นทั้งหมดจาก 7K Atlas แยกตามหมวด (พับไว้ เปิดเองเมื่อมีค่าที่ตั้งเอง) */}
      <p className="border-t border-white/10 px-4 pb-1 pt-3 text-xs font-semibold text-gold/80">{L('ไอเท็มอื่น ๆ (ใส่ค่าเองได้)', 'Other items (set your own values)')}</p>
      {ATLAS_CATS.map((c) => {
        const keys = PACK_ITEM_KEYS.filter((k) => ITEMS[k].cat === c)
        const mine = keys.filter((k) => prefs.worth[k] !== undefined).length
        return (
          <details key={c} open={mine > 0} className="group border-t border-white/5">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-sm hover:text-gold">
              <ChevronDown className="h-4 w-4 -rotate-90 text-white/40 transition group-open:rotate-0" />
              <span className="flex-1">{L(...CAT_NAME[c])}</span>
              <span className="text-xs text-white/40 tabular-nums">{mine > 0 && <b className="mr-1.5 text-gold">{L(`ตั้งเอง ${mine}`, `${mine} set`)}</b>}{keys.length}</span>
            </summary>
            <ul className="divide-y divide-white/5 bg-black/10">
              {keys.map((k) => <ValueRow key={k} k={k} prefs={prefs} worth={worth} onChange={onChange} />)}
            </ul>
          </details>
        )
      })}
    </section>
  )
}

/** แถวค่าของ 1 ชนิด: รูป ชื่อ ที่มา ราคาร้าน + ช่องใส่ค่าเอง */
function ValueRow({ k, prefs, worth, onChange }: { k: PackItemKey; prefs: WorthPrefs; worth: Worth; onChange: (k: PackItemKey, v: number | undefined) => void }) {
  const d = ITEMS[k]
  const own = prefs.worth[k]
  const def = defaultWorth(k, prefs.profile as Profile)
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <PackTile k={k} n={1} size="sm" noCount muted={!(worth[k] > 0)} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium leading-snug">{itemName(k)}</span>
        <span className="block text-[11px] leading-snug text-white/45">
          {d.unknown ? L('ยังไม่รู้ค่า · ใส่เองได้', 'Value unknown · set your own') : d.note ? L(...d.note) : ''}
          {d.shop !== undefined && <> · {L('ร้าน', 'shop')} {num(d.shop)}</>}
        </span>
      </span>
      <label className={`pill flex items-center gap-1 px-2.5 py-1 ${own !== undefined ? 'border-gold/60' : ''}`}>
        <input type="number" inputMode="decimal" min={0} step="any" value={own ?? ''} placeholder={num(def)}
          onChange={(e) => onChange(k, e.target.value === '' ? undefined : Math.max(0, Number(e.target.value) || 0))}
          aria-label={L(`ค่าของ ${d.th} (รูบี้)`, `${d.en} value (rubies)`)}
          className="w-16 bg-transparent text-right text-sm font-semibold tabular-nums outline-none placeholder:text-white/60" />
        <span className="text-[11px] text-white/45">{L('รูบี้', 'rb')}</span>
      </label>
    </li>
  )
}

