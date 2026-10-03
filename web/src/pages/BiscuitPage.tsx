import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import UnitCard from '../components/UnitCard'
import UnitPicker from '../components/UnitPicker'
import { FormationDiagram } from '../components/TeamModals'
import { HEROES, getUnit } from '../data/heroes'
import { baseAtkOf } from '../data/stats'
import { SLOT_COUNT } from '../lib/types'

// บิสกิตบัฟให้ตัวที่ "โจมตีในเกม" สูงสุด 2 อันดับ
// โจมตีในเกม = โจมตีหน้าตัวละคร + base × บัฟ% (บัฟ % คิดจาก base ไม่ใช่ค่ารวม)
const BISCUIT_TARGETS = 2
const STORE_KEY = '7k-note:biscuit'

type Slot = { id: string | null; base: string; screen: string; extra: string }

// ค่ายกล Lv.40 (จากในเกม): แถวหลังได้ All Attack % · แถวหน้าได้แค่ Defense % (ไม่มีผลกับบัฟบิสกิต)
const FORMATION_ATK: { front: number; name: string; atk: number }[] = [
  { front: 2, name: 'พื้นฐาน', atk: 14 },
  { front: 3, name: 'สมดุล', atk: 21 },
  { front: 1, name: 'บุก', atk: 10.5 },
  { front: 4, name: 'ป้องกัน', atk: 42 },
]
// คอลัมน์ (ซ้าย→ขวา) ที่เป็นแถวหน้า ตามค่ายกล (เหมือนในเกม/AtlasTeam)
const FRONT_COLS: Record<number, number[]> = { 1: [2], 2: [1, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4] }

const EMPTY_SLOT: Slot = { id: null, base: '', screen: '', extra: '' }
// บัฟ % ของทั้งทีมมาจาก "ศักยภาพ" ของสัตว์เลี้ยง: บรรทัด All Attack (%) สูงสุด 4 บรรทัด
const PET_LINES = 4
type State = { pet: string[]; front: number; slots: Slot[] }
const DEFAULT_STATE: State = {
  pet: ['13', '13', '11', '11'],
  front: 2,
  slots: [
    { id: 'ทันจิโร่', base: '1500', screen: '4523', extra: '' },
    { ...EMPTY_SLOT },
    { id: 'ซอรัน awake', base: '1712', screen: '4505', extra: '' },
    { ...EMPTY_SLOT },
    { id: 'ไอลีน', base: '1457', screen: '4510', extra: '' },
  ],
}

function load(): State {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) ?? '')
    const pet = Array.isArray(s?.pet) ? s.pet : DEFAULT_STATE.pet
    if (Array.isArray(s?.slots)) return { pet, front: FRONT_COLS[s.front] ? s.front : 2, slots: Array.from({ length: SLOT_COUNT }, (_, i) => ({ ...EMPTY_SLOT, ...s.slots[i] })) }
    // ข้อมูลแบบเก่า (เป็นแถวชื่อ) → ย้ายมาเป็นช่องในทีม
    if (Array.isArray(s?.rows)) {
      const known = new Set(HEROES.map((h) => h.id))
      const slots = Array.from({ length: SLOT_COUNT }, (_, i) => {
        const r = s.rows[i]
        return r ? { id: known.has(r.name) ? r.name : null, base: r.base ?? '', screen: r.screen ?? '', extra: r.extra ?? '' } : { ...EMPTY_SLOT }
      })
      return { pet, front: 2, slots }
    }
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

export default function BiscuitPage() {
  const [state, setState] = useState(load)
  const [picking, setPicking] = useState<number | null>(null)
  const { pet, front, slots } = state
  const petBuff = pet.reduce((sum, v) => sum + num(v), 0)
  const formation = FORMATION_ATK.find((f) => f.front === front) ?? FORMATION_ATK[0]
  const isBack = (col: number) => !FRONT_COLS[front].includes(col)

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state))
    } catch {
      /* ไม่เป็นไร */
    }
  }, [state])

  const setSlot = (i: number, patch: Partial<Slot>) =>
    setState((s) => ({ ...s, slots: s.slots.map((r, j) => (j === i ? { ...r, ...patch } : r)) }))
  const pick = (i: number, id: string | null) => {
    if (!id) setSlot(i, { ...EMPTY_SLOT })
    else setSlot(i, { id })
    setPicking(null)
  }

  const filled = slots
    .map((r, i) => {
      // base ตายตัวตามตัวละคร (7K Atlas) แก้ไม่ได้
      const base = r.id ? baseAtkOf(r.id) ?? 0 : 0
      const screen = num(r.screen)
      const back = isBack(i)
      const pct = petBuff + (back ? formation.atk : 0) + num(r.extra)
      const name = r.id ? getUnit(r.id)?.name ?? r.id : `ช่องที่ ${i + 1}`
      return { i, name, back, base, screen, pct, game: screen + (base * pct) / 100 }
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
  const input = 'pill w-full min-w-0 px-1 py-1 text-center text-xs tabular-nums outline-none focus:border-gold sm:text-sm'

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
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-full text-sm font-medium text-gold sm:w-auto">ศักยภาพสัตว์เลี้ยง All Attack (%)</span>
          {Array.from({ length: PET_LINES }, (_, i) => (
            <input
              key={i}
              value={pet[i] ?? ''}
              onChange={(e) =>
                setState((s) => ({ ...s, pet: Array.from({ length: PET_LINES }, (_, j) => (j === i ? e.target.value : s.pet[j] ?? '')) }))
              }
              inputMode="decimal"
              aria-label={`ศักยภาพบรรทัดที่ ${i + 1}`}
              className="pill w-16 px-2 py-1.5 text-center tabular-nums outline-none focus:border-gold"
            />
          ))}
          <span className="text-sm text-white/70">
            = <b className="text-gold tabular-nums">{petBuff}%</b>
          </span>
        </div>

        <p className="mt-4 text-sm font-medium text-gold">ค่ายกล (Lv.40)</p>
        {/* รูปค่ายกลแบบเดียวกับตอนเลือกในคอมพ์ */}
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FORMATION_ATK.map((f) => (
            <button
              key={f.front}
              onClick={() => setState((s) => ({ ...s, front: f.front }))}
              className={`rounded-2xl border-2 p-1.5 text-center transition ${
                f.front === front ? 'border-gold bg-gold/15 shadow-[0_0_14px_rgba(244,213,141,.4)]' : 'border-white/15 bg-black/20 hover:border-white/40'
              }`}
            >
              <FormationDiagram front={f.front} />
              <div className="text-sm font-semibold">{f.front === front && '✓ '}ค่าย{f.name}</div>
              <div className="text-xs text-[#ff8f9a]">หลัง +{f.atk}% โจมตี</div>
            </button>
          ))}
        </div>

        {/* ทีมแนวนอนแบบในเกม: แถวหลัง (B) ยกสูง · แถวหน้า (F) ต่ำลง */}
        <div className="mt-5 grid grid-cols-5 items-start gap-1.5 sm:gap-3">
          {slots.map((r, i) => {
            const back = isBack(i)
            return (
              <div key={i} className={`flex min-w-0 flex-col gap-1.5 ${back ? '' : 'mt-8 sm:mt-12'}`}>
                <span className={`text-center text-[11px] font-semibold ${back ? 'text-[#ff8f9a]' : 'text-[#8fa8ff]'}`}>
                  {back ? `หลัง +${formation.atk}%` : 'หน้า'}
                </span>
                <button
                  onClick={() => setPicking(i)}
                  aria-label={r.id ? `เปลี่ยน ${getUnit(r.id)?.name}` : `เลือกตัวละครช่องที่ ${i + 1}`}
                  className="aspect-square w-full text-[12px] transition hover:-translate-y-0.5"
                >
                  {r.id ? (
                    <UnitCard id={r.id} />
                  ) : (
                    <span className="slot-empty grid h-full w-full place-items-center rounded-[24%_4%_24%_4%] border border-dashed border-white/20 text-white/50">
                      <Plus className="h-1/3 w-1/3" />
                    </span>
                  )}
                </button>
                {(r.id || r.screen) && (
                  <>
                    <input value={r.screen} onChange={(e) => setSlot(i, { screen: e.target.value })} inputMode="decimal"
                      placeholder="หน้าตัว" aria-label="โจมตีหน้าตัวละคร" className={input} />
                    <input value={r.extra} onChange={(e) => setSlot(i, { extra: e.target.value })} inputMode="decimal"
                      placeholder="บัฟ%+" aria-label="บัฟ % เพิ่มเฉพาะตัว" className={`${input} text-white/70`} />
                    <span className="text-center text-[11px] text-white/45 tabular-nums">
                      {r.id && baseAtkOf(r.id) ? `base ${fmt(baseAtkOf(r.id)!)}` : 'ไม่มี base'}
                    </span>
                  </>
                )}
              </div>
            )
          })}
        </div>
        <p className="mt-4 text-xs text-white/45">
          กดช่องเพื่อเลือกตัวละคร · ช่องแรกใต้รูป = โจมตีหน้าตัวละคร · ช่องที่ 2 = บัฟ % เพิ่มเฉพาะตัว (เช่น สกิลติดตัว) · base ตายตัวตามตัวละคร (ค่าจาก 7K Atlas)
          · ค่ายกลให้ All Attack % เฉพาะแถวหลัง (แถวหน้าได้ป้องกัน %) · ข้อมูลเก็บไว้ในเครื่องนี้เท่านั้น
        </p>
      </section>

      <UnitPicker
        open={picking !== null}
        kind="hero"
        index={picking ?? 0}
        current={picking !== null ? slots[picking].id : null}
        used={slots.map((r) => r.id).filter(Boolean) as string[]}
        full={false}
        onPick={(id) => picking !== null && pick(picking, id)}
        onClose={() => setPicking(null)}
      />

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
                  <span className="text-sm text-white/55 tabular-nums" title={`บัฟรวม ${r.pct}% ของ base ${fmt(r.base)}`}>
                    {fmt(r.screen)} + {fmt((r.base * r.pct) / 100)} <span className="text-white/35">({r.back ? 'หลัง' : 'หน้า'} {r.pct}%)</span>
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
