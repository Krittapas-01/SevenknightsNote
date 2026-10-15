import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import UnitCard from '../components/UnitCard'
import UnitPicker from '../components/UnitPicker'
import { getUnit, unitLabel } from '../data/heroes'
import { baseAtkOf } from '../data/stats'
import { finalAtk, minStartToBeat, multiplier, preBuff, type AtkInput } from '../lib/atk'
import { FORMATION_ATK } from '../lib/formation'
import { L, LOCALE } from '../lib/i18n'

// เทียบพลังโจมตีจริงของ 2 ตัว หลังบัฟทีมและดีบัฟลดโจมตีของฝั่งตรงข้าม (เช่น ฮายอน)
// ใช้ดูว่าต้องดันตั้งต้นของตัวหนึ่งเท่าไรถึงจะนำอีกตัว
const STORE_KEY = '7k-note:atk'
const MAX_BUFFS = 6
// ศักยภาพสัตว์เลี้ยง: บรรทัด All Attack (%) สูงสุด 4 บรรทัด รวมกันเป็น % ของ base ที่ทั้งทีมได้
const PET_LINES = 4

type Buff = { name: string; pct: string }
// base ใช้ค่าตามอัศวิน (7K Atlas) · ช่อง base ใช้เฉพาะตัวที่ไม่รู้ค่า
type Char = { id: string | null; start: string; base: string; back: boolean; hit: boolean }
type State = { pet: string; potential: string[]; front: number; buffs: Buff[]; debuff: Buff; chars: Char[] }

// ค่าเริ่มต้นจากที่เทสจริง: สัตว์เลี้ยงเจโอ (All Attack 564, ศักยภาพ 13+18+18+11 = 60%)
// เซนอิทสึ 4972 โดนฮายอนลด 22% vs ไอลีน 4210
const DEFAULT_STATE: State = {
  pet: '564',
  potential: ['13', '18', '18', '11'],
  front: 2,
  buffs: [
    { name: L('เจโอ', 'Jeo'), pct: '37' },
    { name: L('ไอลีน', 'Eileene'), pct: '25' },
  ],
  debuff: { name: L('ฮายอน', 'Hayeon'), pct: '22' },
  chars: [
    { id: 'เซนอิทสึ awake', start: '4972', base: '', back: false, hit: true },
    { id: 'ไอลีน', start: '4210', base: '', back: false, hit: false },
  ],
}

function load(): State {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) ?? '')
    if (Array.isArray(s?.potential) && Array.isArray(s?.buffs) && s?.chars?.length === 2 && s?.debuff) return { ...DEFAULT_STATE, ...s }
  } catch {
    /* ใช้ค่าเริ่มต้น */
  }
  return DEFAULT_STATE
}

const num = (v: string) => {
  const n = Number(v.replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}
const fmt = (n: number) => n.toLocaleString(LOCALE, { maximumFractionDigits: 2 })
// ฮายอนลดแค่สายโจมตีกับสายเวท → เลือกอัศวินแล้วติ๊ก "โดนลด" ให้ตามประเภท (แก้เองได้)
const debuffedType = (id: string) => ['attack', 'magic'].includes(getUnit(id)?.type ?? '')

const INPUT = 'pill min-w-0 px-2 py-1.5 text-center tabular-nums outline-none focus:border-gold'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <p className="mt-5 text-sm font-medium text-gold first:mt-0">{title}</p>
      <div className="mt-2">{children}</div>
    </>
  )
}

export default function AtkPage() {
  const [state, setState] = useState(load)
  const [picking, setPicking] = useState<number | null>(null)
  const { pet, potential, front, buffs, debuff, chars } = state
  const potentialPct = potential.reduce((sum, v) => sum + num(v), 0)
  const formation = FORMATION_ATK.find((f) => f.front === front) ?? FORMATION_ATK[0]

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state))
    } catch {
      /* ไม่เป็นไร */
    }
  }, [state])

  const setBuff = (i: number, patch: Partial<Buff>) =>
    setState((s) => ({ ...s, buffs: s.buffs.map((b, j) => (j === i ? { ...b, ...patch } : b)) }))
  const setChar = (i: number, patch: Partial<Char>) =>
    setState((s) => ({ ...s, chars: s.chars.map((c, j) => (j === i ? { ...c, ...patch } : c)) }))
  const pick = (i: number, id: string | null) => {
    setChar(i, id ? { id, base: '', hit: debuffedType(id) } : { id: null })
    setPicking(null)
  }

  const calc = chars.map((c, i) => {
    const known = c.id ? baseAtkOf(c.id) : null
    const input: AtkInput = {
      start: num(c.start),
      base: known ?? num(c.base),
      // แผนให้ All Attack % เฉพาะแถวหลัง บวกรวมกับ % ศักยภาพสัตว์เลี้ยง
      basePct: potentialPct + (c.back ? formation.atk : 0),
      pet: num(pet),
      buffs: buffs.map((b) => num(b.pct)),
      debuff: c.hit ? num(debuff.pct) : 0,
    }
    const name = c.id ? unitLabel(c.id) : L(`ตัวที่ ${i + 1}`, `Hero ${i + 1}`)
    return { input, known, name, pre: preBuff(input), total: finalAtk(input) }
  })
  const [a, b] = calc
  const leader = a.total === b.total ? null : a.total > b.total ? a : b
  const trailer = leader === a ? b : a

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-extrabold sm:text-4xl">
        {L('เทียบ', 'Attack ')}<span className="text-gold">{L('พลังโจมตี', 'Compare')}</span>
      </h1>
      <p className="mt-2 text-white/65">
        {L('บัฟ % ทุกตัวและดีบัฟลดโจมตีของฝั่งตรงข้าม คิดจาก', 'Every % buff and enemy attack debuff is taken from the ')}
        <b className="text-white">{L('ยอดก่อนบัฟ', 'pre-buff attack')}</b>
        {L(
          ' (ตั้งต้น + base × % ศักยภาพสัตว์เลี้ยงและแผน + All Attack สัตว์เลี้ยง) แล้วเอามาบวกลบรวมกัน ใส่ค่าของ 2 ตัวเพื่อดูว่าใครโจมตีสูงกว่า และต้องดันตั้งต้นอีกเท่าไรถึงจะนำ',
          ' (starting attack + base × pet potential % and formation % + pet All Attack), then added together. Enter two heroes to see who hits harder and how much starting attack one needs to pass the other.',
        )}
      </p>

      <section className="panel panel-gold mt-5 p-4 sm:p-5">
        <Section title={L('สัตว์เลี้ยง', 'Pet')}>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-white/70">All Attack</span>
            <input
              value={pet}
              onChange={(e) => setState((s) => ({ ...s, pet: e.target.value }))}
              inputMode="decimal"
              aria-label={L('All Attack ของสัตว์เลี้ยง', 'Pet All Attack')}
              className={`${INPUT} w-20`}
            />
            <span className="ml-0 text-white/70 sm:ml-3">{L('ศักยภาพ All Attack (%)', 'Potential All Attack (%)')}</span>
            {Array.from({ length: PET_LINES }, (_, i) => (
              <input
                key={i}
                value={potential[i] ?? ''}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    potential: Array.from({ length: PET_LINES }, (_, j) => (j === i ? e.target.value : s.potential[j] ?? '')),
                  }))
                }
                inputMode="decimal"
                aria-label={L(`ศักยภาพบรรทัดที่ ${i + 1}`, `Potential line ${i + 1}`)}
                className={`${INPUT} w-14`}
              />
            ))}
            <span className="text-white/70">
              = <b className="text-gold tabular-nums">{fmt(potentialPct)}%</b>
            </span>
          </div>
        </Section>

        <Section title={L('รูปแบบ · Lv.40 (แถวหลังได้ All Attack %)', 'Formation · Lv.40 (back row gets All Attack %)')}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {FORMATION_ATK.map((f) => (
              <button
                key={f.front}
                onClick={() => setState((s) => ({ ...s, front: f.front }))}
                className={`pill px-3 py-1.5 text-sm ${f.front === front ? 'border-gold text-gold' : 'hover:border-gold'}`}
              >
                {f.front === front && '✓ '}
                {L(`${f.name} · หลัง +${f.atk}%`, `${f.name} · back +${f.atk}%`)}
              </button>
            ))}
          </div>
        </Section>

        <Section title={L('บัฟ % ทั้งทีม', 'Team % buffs')}>
          <div className="flex flex-col gap-2">
            {buffs.map((bf, i) => (
              <div key={i} className="grid grid-cols-[1fr_5rem_2rem] gap-2">
                <input
                  value={bf.name}
                  onChange={(e) => setBuff(i, { name: e.target.value })}
                  placeholder={L(`บัฟที่ ${i + 1}`, `Buff ${i + 1}`)}
                  aria-label={L(`ชื่อบัฟที่ ${i + 1}`, `Buff ${i + 1} name`)}
                  className={`${INPUT} px-3 text-left`}
                />
                <input
                  value={bf.pct}
                  onChange={(e) => setBuff(i, { pct: e.target.value })}
                  inputMode="decimal"
                  placeholder="+%"
                  aria-label={L(`บัฟที่ ${i + 1} %`, `Buff ${i + 1} %`)}
                  className={INPUT}
                />
                <button
                  onClick={() => setState((s) => ({ ...s, buffs: s.buffs.filter((_, j) => j !== i) }))}
                  aria-label={L('ลบบัฟ', 'Remove buff')}
                  className="grid place-items-center text-white/40 hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          {buffs.length < MAX_BUFFS && (
            <button
              onClick={() => setState((s) => ({ ...s, buffs: [...s.buffs, { name: '', pct: '' }] }))}
              className="pill mt-2 flex items-center gap-1 px-3 py-1.5 text-sm hover:border-gold"
            >
              <Plus className="h-4 w-4" /> {L('เพิ่มบัฟ', 'Add buff')}
            </button>
          )}
        </Section>

        <Section title={L('ดีบัฟลดโจมตีจากฝั่งตรงข้าม', 'Enemy attack debuff')}>
          <div className="grid grid-cols-[1fr_5rem_2rem] gap-2">
            <input
              value={debuff.name}
              onChange={(e) => setState((s) => ({ ...s, debuff: { ...s.debuff, name: e.target.value } }))}
              placeholder={L('ชื่อตัวที่ลด', 'Debuffer')}
              aria-label={L('ชื่อตัวที่ลดโจมตี', 'Debuffer name')}
              className={`${INPUT} px-3 text-left`}
            />
            <input
              value={debuff.pct}
              onChange={(e) => setState((s) => ({ ...s, debuff: { ...s.debuff, pct: e.target.value } }))}
              inputMode="decimal"
              placeholder="−%"
              aria-label={L('ลดโจมตี %', 'Attack down %')}
              className={INPUT}
            />
          </div>
        </Section>
      </section>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {chars.map((c, i) => {
          const r = calc[i]
          return (
            <section key={i} className={`panel p-4 sm:p-5 ${leader === r ? 'panel-gold' : ''}`}>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPicking(i)}
                  aria-label={L(`เลือกอัศวินตัวที่ ${i + 1}`, `Pick hero ${i + 1}`)}
                  className="aspect-square w-16 shrink-0 text-[11px] transition hover:-translate-y-0.5"
                >
                  {c.id ? (
                    <UnitCard id={c.id} />
                  ) : (
                    <span className="slot-empty grid h-full w-full place-items-center rounded-[24%_4%_24%_4%] border border-dashed border-white/20 text-white/50">
                      <Plus className="h-1/3 w-1/3" />
                    </span>
                  )}
                </button>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{r.name}</p>
                  <p className="text-xs text-white/50 tabular-nums">
                    {r.known !== null ? `base ${fmt(r.known)}` : L('ไม่รู้ base ใส่เองด้านล่าง', 'Unknown base, enter it below')}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="flex min-w-0 flex-col gap-1 text-xs text-white/55">
                  {L('ตั้งต้น', 'Starting attack')}
                  <input value={c.start} onChange={(e) => setChar(i, { start: e.target.value })} inputMode="decimal" className={`${INPUT} text-base text-white`} />
                </label>
                {r.known === null ? (
                  <label className="flex min-w-0 flex-col gap-1 text-xs text-white/55">
                    base
                    <input value={c.base} onChange={(e) => setChar(i, { base: e.target.value })} inputMode="decimal" className={`${INPUT} text-base text-white`} />
                  </label>
                ) : (
                  <div className="flex min-w-0 flex-col gap-1 text-xs text-white/55">
                    {L('แถว', 'Row')}
                    <RowToggle back={c.back} onChange={(back) => setChar(i, { back })} />
                  </div>
                )}
              </div>
              {r.known === null && (
                <div className="mt-2">
                  <RowToggle back={c.back} onChange={(back) => setChar(i, { back })} />
                </div>
              )}
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={c.hit} onChange={(e) => setChar(i, { hit: e.target.checked })} className="accent-red-400" />
                {L('โดนลด', 'Debuffed')}
                {debuff.name.trim() ? ` (${debuff.name.trim()})` : ''}
              </label>

              <dl className="mt-4 flex flex-col gap-1 text-sm tabular-nums">
                <div className="flex justify-between gap-2 text-white/70">
                  <dt>
                    {L('ก่อนบัฟ', 'Pre-buff')}{' '}
                    <span className="text-xs text-white/45">
                      ({fmt(r.input.start)} + {fmt((r.input.base * r.input.basePct) / 100)} + {fmt(r.input.pet)})
                    </span>
                  </dt>
                  <dd>{fmt(r.pre)}</dd>
                </div>
                {buffs.map((bf, j) =>
                  num(bf.pct) ? (
                    <div key={j} className="flex justify-between gap-2 text-white/70">
                      <dt>
                        +{fmt(num(bf.pct))}% {bf.name}
                      </dt>
                      <dd>+{fmt((r.pre * num(bf.pct)) / 100)}</dd>
                    </div>
                  ) : null,
                )}
                {r.input.debuff > 0 && (
                  <div className="flex justify-between gap-2 text-red-300">
                    <dt>
                      −{fmt(r.input.debuff)}% {debuff.name}
                    </dt>
                    <dd>−{fmt((r.pre * r.input.debuff) / 100)}</dd>
                  </div>
                )}
                <div className="mt-1 flex justify-between gap-2 border-t border-white/15 pt-2 text-base font-semibold">
                  <dt>{L('โจมตีจริง', 'Final attack')}</dt>
                  <dd className={leader === r ? 'text-gold' : ''}>{fmt(r.total)}</dd>
                </div>
              </dl>
            </section>
          )
        })}
      </div>

      <UnitPicker
        open={picking !== null}
        kind="hero"
        index={picking ?? 0}
        current={picking !== null ? chars[picking].id : null}
        used={chars.map((c) => c.id).filter(Boolean) as string[]}
        full={false}
        allowCustom={false}
        includeBaseForms
        onPick={(id) => picking !== null && pick(picking, id)}
        onClose={() => setPicking(null)}
      />

      <section className="panel panel-gold mt-8 p-4 sm:p-5">
        <h2 className="font-semibold text-gold">{L('ผลเทียบ', 'Result')}</h2>
        <p className="mt-2 text-lg">
          {leader ? (
            <>
              <b className="text-gold">{leader.name}</b> {L('นำ', 'leads')} {trailer.name} {L('อยู่', 'by')}{' '}
              <b className="tabular-nums">{fmt(leader.total - trailer.total)}</b>
            </>
          ) : (
            L('เท่ากันพอดี', 'Exactly tied')
          )}
        </p>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          {calc.map((r, i) => {
            const other = calc[1 - i]
            const need = minStartToBeat(r.input, other.total)
            const diff = need === null ? 0 : need - r.input.start
            return (
              <li key={i} className="rounded-xl bg-white/5 px-3 py-2">
                {need === null ? (
                  L(
                    `${r.name} นำ ${other.name} ไม่ได้ เพราะบัฟรวมหักดีบัฟแล้วเหลือ ${fmt(multiplier(r.input) * 100)}%`,
                    `${r.name} can't pass ${other.name}: buffs minus debuff leave ${fmt(multiplier(r.input) * 100)}%`,
                  )
                ) : (
                  <>
                    {L(`${r.name} ต้องมีตั้งต้น `, `${r.name} needs starting attack `)}
                    <b className="text-gold tabular-nums">{fmt(need)}</b>
                    {L(` ขึ้นไปถึงจะนำ ${other.name}`, `+ to pass ${other.name}`)}
                    <span className="text-white/55">
                      {' '}
                      {diff > 0
                        ? L(`(ตอนนี้ ${fmt(r.input.start)}, ขาดอีก ${fmt(diff)})`, `(now ${fmt(r.input.start)}, ${fmt(diff)} short)`)
                        : L(`(ตอนนี้ ${fmt(r.input.start)}, นำอยู่แล้ว ลดได้อีก ${fmt(-diff)})`, `(now ${fmt(r.input.start)}, already ahead with ${fmt(-diff)} to spare)`)}
                    </span>
                  </>
                )}
              </li>
            )
          })}
        </ul>
        <p className="mt-3 text-xs text-white/45">
          {L(
            'คิดโดยให้ base สัตว์เลี้ยง และแผนคงที่ เปลี่ยนแค่ตั้งต้น · base ตามอัศวิน (ค่าจาก 7K Atlas) · ข้อมูลเก็บไว้ในเครื่องนี้เท่านั้น',
            'Base, pet and formation stay fixed; only starting attack changes · Base per hero from 7K Atlas · Data stays on this device',
          )}
        </p>
      </section>
    </div>
  )
}

/** แถวหน้า / แถวหลัง (แถวหลังได้ All Attack % จากรูปแบบ) */
function RowToggle({ back, onChange }: { back: boolean; onChange: (back: boolean) => void }) {
  const opt = (value: boolean, label: string) => (
    <button
      type="button"
      onClick={() => onChange(value)}
      aria-pressed={back === value}
      className={`flex-1 rounded-full px-2 py-1.5 text-sm ${back === value ? 'bg-white/15 text-gold' : 'text-white/60 hover:text-white'}`}
    >
      {label}
    </button>
  )
  return (
    <div className="pill flex p-0.5">
      {opt(false, L('หน้า', 'Front'))}
      {opt(true, L('หลัง', 'Back'))}
    </div>
  )
}
