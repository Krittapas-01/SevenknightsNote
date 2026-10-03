import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import catalog from '../data/catalog.json'

// บิสกิตบัฟให้ตัวที่ "โจมตีในเกม" สูงสุด 2 อันดับ
// โจมตีในเกม = โจมตีหน้าตัวละคร + base × บัฟ% (บัฟ % คิดจาก base ไม่ใช่ค่ารวม)
const BISCUIT_TARGETS = 2
const MAX_ROWS = 5
const STORE_KEY = '7k-note:biscuit'

type Row = { name: string; base: string; screen: string; extra: string }

// มือถือ: ชื่อ+ปุ่มลบบรรทัดแรก แล้วช่องตัวเลข 3 ช่องบรรทัดที่สอง · จอใหญ่: แถวเดียว
const ROW_GRID = 'grid-cols-[1fr_1fr_4rem_2rem] sm:grid-cols-[1fr_6rem_7rem_5rem_2rem]'
// base โจมตีที่เช็กจากในเกมแล้ว (เติมเพิ่มได้เมื่อรู้ค่าของสายอื่น)
const BASE_PRESETS = [
  { value: 1500, label: 'ไฟ/น้ำ สายโจมตี' },
  { value: 1712, label: 'ไฟ/น้ำ สายโจมตี awake' },
  { value: 1095, label: 'แสง สายสนับสนุน' },
  { value: 1253, label: 'แสง สายสนับสนุน awake' },
]
const PLACEHOLDER = { base: 'base', screen: 'หน้าตัวละคร', extra: 'บัฟ%' } as const

const EMPTY_ROW: Row = { name: '', base: '', screen: '', extra: '' }
const DEFAULT_STATE = {
  buff: '10',
  rows: [
    { name: 'ตัว A', base: '1500', screen: '4523', extra: '' },
    { name: 'ตัว B', base: '1712', screen: '4505', extra: '' },
    { name: 'ตัว C', base: '1400', screen: '4510', extra: '' },
  ] as Row[],
}

function load(): typeof DEFAULT_STATE {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) ?? '')
    if (Array.isArray(s?.rows) && typeof s?.buff === 'string') return s
  } catch {
    /* ใช้ค่าเริ่มต้น */
  }
  return DEFAULT_STATE
}

const num = (v: string) => {
  const n = Number(v.replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}
const fmt = (n: number) => Math.round(n).toLocaleString('th-TH')

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="ลบแถว" className="grid place-items-center text-white/40 hover:text-red-300 sm:order-last">
      <Trash2 className="h-4 w-4" />
    </button>
  )
}

export default function BiscuitPage() {
  const [state, setState] = useState(load)
  const { buff, rows } = state

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state))
    } catch {
      /* ไม่เป็นไร */
    }
  }, [state])

  const setRow = (i: number, patch: Partial<Row>) =>
    setState((s) => ({ ...s, rows: s.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) }))

  const filled = rows
    .map((r, i) => {
      const base = num(r.base)
      const screen = num(r.screen)
      const pct = num(buff) + num(r.extra)
      return { i, name: r.name.trim() || `ตัวที่ ${i + 1}`, base, screen, pct, game: screen + (base * pct) / 100 }
    })
    .filter((r) => r.screen > 0)

  const byScreen = [...filled].sort((a, b) => b.screen - a.screen)
  const byGame = [...filled].sort((a, b) => b.game - a.game)
  const gameRank = new Map(byGame.map((r, k) => [r.i, k]))
  const screenRank = new Map(byScreen.map((r, k) => [r.i, k]))
  const cutoff = byGame[BISCUIT_TARGETS]?.game // ตัวที่ 3 ที่ต้องชนะให้ได้
  const flipped = filled.filter(
    (r) => (screenRank.get(r.i)! < BISCUIT_TARGETS) !== (gameRank.get(r.i)! < BISCUIT_TARGETS),
  )

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold sm:text-4xl">
        เช็กบัฟ<span className="text-gold">บิสกิต</span>
      </h1>
      <p className="mt-2 text-white/65">
        บิสกิตบัฟให้ตัวที่โจมตีสูงสุด {BISCUIT_TARGETS} ตัวในทีม แต่เกมนับจาก<b className="text-white">โจมตีในเกม</b> ซึ่งรวมบัฟ %
        ที่คิดจาก base ของแต่ละตัวแล้ว ตัวที่หน้าตัวละครสูงกว่าจึงอาจไม่ได้บัฟ
      </p>

      <section className="panel mt-6 p-4 sm:p-5">
        <label className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gold">บัฟโจมตี % ที่ทั้งทีมได้ตอนเริ่มเกม</span>
          <input
            value={buff}
            onChange={(e) => setState((s) => ({ ...s, buff: e.target.value }))}
            inputMode="decimal"
            className="pill w-24 px-3 py-1.5 text-center tabular-nums outline-none focus:border-gold"
          />
        </label>

        <div className={`mt-4 hidden gap-2 text-xs text-white/50 sm:grid ${ROW_GRID}`}>
          <span>ชื่อตัวละคร</span>
          <span>base</span>
          <span>หน้าตัวละคร</span>
          <span>บัฟ%เพิ่ม</span>
          <span />
        </div>
        <datalist id="biscuit-heroes">
          {catalog.heroes.map((h) => (
            <option key={h} value={h} />
          ))}
        </datalist>
        <datalist id="biscuit-bases">
          {BASE_PRESETS.map((b) => (
            <option key={b.value} value={b.value} label={b.label} />
          ))}
        </datalist>
        <div className="mt-1 flex flex-col gap-2">
          {rows.map((r, i) => (
            <div key={i} className={`grid gap-2 border-b border-white/10 pb-2 sm:border-0 sm:pb-0 ${ROW_GRID}`}>
              <input
                value={r.name}
                onChange={(e) => setRow(i, { name: e.target.value })}
                list="biscuit-heroes"
                placeholder={`ตัวที่ ${i + 1}`}
                className="pill col-span-3 min-w-0 px-3 py-1.5 outline-none focus:border-gold sm:col-span-1"
              />
              <RemoveButton onClick={() => setState((s) => ({ ...s, rows: s.rows.filter((_, j) => j !== i) }))} />
              {(['base', 'screen', 'extra'] as const).map((k) => (
                <input
                  key={k}
                  value={r[k]}
                  onChange={(e) => setRow(i, { [k]: e.target.value })}
                  inputMode="decimal"
                  list={k === 'base' ? 'biscuit-bases' : undefined}
                  placeholder={PLACEHOLDER[k]}
                  aria-label={PLACEHOLDER[k]}
                  className="pill min-w-0 px-2 py-1.5 text-center tabular-nums outline-none focus:border-gold"
                />
              ))}
            </div>
          ))}
        </div>
        {rows.length < MAX_ROWS && (
          <button
            onClick={() => setState((s) => ({ ...s, rows: [...s.rows, { ...EMPTY_ROW }] }))}
            className="pill mt-3 flex items-center gap-1 px-3 py-1.5 text-sm hover:border-gold"
          >
            <Plus className="h-4 w-4" /> เพิ่มตัวละคร
          </button>
        )}
        <p className="mt-3 text-xs text-white/45">
          "บัฟ%เพิ่ม" ใช้กับบัฟที่ได้เฉพาะตัวนั้น (เช่น สกิลติดตัว) · base กดเลือกได้ที่ช่อง base (ไฟ/น้ำ สายโจมตี, แสง สายสนับสนุน) · ข้อมูลเก็บไว้ในเครื่องนี้เท่านั้น
        </p>
      </section>

      {filled.length > 0 && (
        <section className="panel panel-gold mt-8 p-4 sm:p-5">
          <h2 className="font-semibold text-gold">อันดับโจมตีในเกม</h2>
          <ol className="mt-3 flex flex-col gap-2">
            {byGame.map((r, k) => {
              const gets = k < BISCUIT_TARGETS
              // ส่วนต่างกับเส้นตัด: ตัวที่ได้บัฟนำตัวที่ 3 อยู่เท่าไร / ตัวที่ไม่ได้ขาดอีกเท่าไร
              const gap = gets ? (cutoff !== undefined ? r.game - cutoff : undefined) : byGame[BISCUIT_TARGETS - 1].game - r.game
              return (
                <li
                  key={r.i}
                  className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-3 py-2 ${gets ? 'bg-gold/15 ring-1 ring-gold/60' : 'bg-white/5'}`}
                >
                  <span className="w-5 text-white/50 tabular-nums">{k + 1}</span>
                  <span className="flex-1 font-medium">{r.name}</span>
                  <span className="text-sm text-white/55 tabular-nums">
                    {fmt(r.screen)} + {fmt((r.base * r.pct) / 100)}
                  </span>
                  <span className="w-16 text-right font-semibold tabular-nums">{fmt(r.game)}</span>
                  <span className={`w-full text-xs sm:w-40 sm:text-right ${gets ? 'text-gold' : 'text-white/45'}`}>
                    {gets
                      ? `🍪 ได้บัฟ${gap !== undefined ? ` · นำอยู่ ${fmt(gap)}` : ''}`
                      : `ขาดอีก ${fmt(gap! + 1)} ถึงจะได้บัฟ`}
                  </span>
                </li>
              )
            })}
          </ol>
          {flipped.length > 0 ? (
            <p className="mt-4 rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-200">
              ⚠️ อันดับในเกมไม่ตรงกับหน้าตัวละคร: {flipped.map((r) => r.name).join(', ')} — ดูจากหน้าตัวละครอย่างเดียวจะเข้าใจผิดว่าบัฟลงใคร
            </p>
          ) : (
            <p className="mt-4 text-sm text-white/55">อันดับในเกมตรงกับหน้าตัวละคร บัฟลงตามที่เห็นในหน้าตัวละคร</p>
          )}
        </section>
      )}
    </div>
  )
}
