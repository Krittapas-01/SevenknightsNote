import { Plus } from 'lucide-react'
import { DndContext, MouseSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { useEffect, useState, type ReactNode } from 'react'
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
  // แบบหน้าจัดทีม: กดตัวที่มีอยู่ 1 ครั้ง = เลือก · กดซ้ำ = เปลี่ยนตัว · กดช่องอื่น = สลับตำแหน่ง
  const [selected, setSelected] = useState<number | null>(null)
  const tapSlot = (i: number) => {
    if (selected === null) {
      if (slots[i].id) setSelected(i)
      else setPicking(i)
      return
    }
    if (selected === i) { setSelected(null); setPicking(i); return }
    swap(selected, i)
    setSelected(null)
  }
  // ย้าย/สลับ 2 ช่อง พร้อมค่าที่กรอกไว้ (ใช้ทั้งกดเลือก และลากวาง)
  const swap = (a: number, b: number) => {
    if (a === b) return
    setState((s) => {
      const next = [...s.slots]
      ;[next[a], next[b]] = [next[b], next[a]]
      return { ...s, slots: next }
    })
  }
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setSelected(null)
    if (over) swap(Number(active.id), Number(over.id))
  }
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

  let filled = slots
    .map((r, i) => {
      // base ตายตัวตามตัวละคร (7K Atlas) แก้ไม่ได้ · ไม่รู้ base = null (ไม่นับเป็น 0)
      const base = r.id ? baseAtkOf(r.id) : null
      const screen = num(r.screen)
      const back = isBack(i)
      const pct = petBuff + (back ? formation.atk : 0) + num(r.extra)
      const name = r.id ? getUnit(r.id)?.name ?? r.id : `ช่องที่ ${i + 1}`
      return { i, name, back, base: base ?? 0, known: base !== null, screen, pct, game: screen + ((base ?? 0) * pct) / 100 }
    })
    .filter((r) => r.screen > 0)
  // ตัวที่ไม่รู้ base คำนวณโจมตีในเกมไม่ได้ → ไม่เอาไปจัดอันดับ (กันผลผิดแบบเงียบ ๆ)
  const unknownBase = filled.filter((r) => !r.known)
  filled = filled.filter((r) => r.known)

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
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="mt-5 grid grid-cols-5 items-start gap-1.5 sm:gap-3">
          {slots.map((r, i) => {
            const back = isBack(i)
            return (
              <div key={i} className={`flex min-w-0 flex-col gap-1.5 ${back ? '' : 'mt-8 sm:mt-12'}`}>
                <span className={`text-center text-[11px] font-semibold ${back ? 'text-[#ff8f9a]' : 'text-[#8fa8ff]'}`}>
                  {back ? `หลัง +${formation.atk}%` : 'หน้า'}
                </span>
                <DragSlot index={i} draggable={!!r.id}>
                <button
                  onClick={() => tapSlot(i)}
                  aria-pressed={selected === i}
                  aria-label={r.id ? `${getUnit(r.id)?.name}${selected === i ? ' (เลือกอยู่ · กดอีกครั้งเพื่อเปลี่ยนตัว)' : ''}` : `เลือกตัวละครช่องที่ ${i + 1}`}
                  className={`aspect-square w-full text-[12px] transition hover:-translate-y-0.5 ${selected === i ? 'rounded-[24%_4%_24%_4%] ring-2 ring-gold ring-offset-2 ring-offset-[#151c2e]' : ''}`}
                >
                  {r.id ? (
                    <UnitCard id={r.id} />
                  ) : (
                    <span className="slot-empty grid h-full w-full place-items-center rounded-[24%_4%_24%_4%] border border-dashed border-white/20 text-white/50">
                      <Plus className="h-1/3 w-1/3" />
                    </span>
                  )}
                </button>
                </DragSlot>
                {(r.id || r.screen) && (
                  <>
                    <input value={r.screen} onChange={(e) => setSlot(i, { screen: e.target.value })} inputMode="decimal"
                      placeholder="โจมตี" aria-label="โจมตีหน้าตัวละคร" className={input} />
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
        </DndContext>
        <p className="mt-4 text-xs text-white/45">
          กดช่องว่างเพื่อเลือกตัวละคร · กดตัวที่มีอยู่ 1 ครั้งเพื่อเลือก แล้วกดซ้ำเพื่อเปลี่ยนตัว หรือกดช่องอื่นเพื่อสลับตำแหน่ง · ช่องแรกใต้รูป = โจมตี (ตามหน้าตัวละคร) · ช่องที่ 2 = บัฟ % เพิ่มเฉพาะตัว (เช่น สกิลติดตัว) · base ตายตัวตามตัวละคร (ค่าจาก 7K Atlas)
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
        allowCustom={false}
        includeBaseForms
        onPick={(id) => picking !== null && pick(picking, id)}
        onClose={() => setPicking(null)}
      />

      {unknownBase.length > 0 && (
        <p role="alert" className="mt-6 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          ⚠️ ไม่รู้ค่า base ของ {unknownBase.map((r) => r.name).join(', ')} — ไม่ได้นับในอันดับด้านล่าง เลือกตัวละครจากรายการแทน
        </p>
      )}

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
          {unknownBase.length > 0 && (
            <p className="mt-4 rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              อันดับนี้ยังไม่รวม {unknownBase.map((r) => r.name).join(', ')} — ผลจริงอาจต่างจากนี้
            </p>
          )}
          {flipped.length > 0 ? (
            <p className="mt-4 rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-200">
              ⚠️ อันดับในเกมไม่ตรงกับหน้าตัวละคร: {flipped.map((r) => r.name).join(', ')} — ดูจากหน้าตัวละครอย่างเดียวจะเข้าใจผิดว่าบัฟลงใคร
            </p>
          ) : unknownBase.length > 0 ? null : (
            <p className="mt-4 text-sm text-white/55">อันดับในเกมตรงกับหน้าตัวละคร บัฟลงตามที่เห็นในหน้าตัวละคร</p>
          )}
        </section>
      )}
    </div>
  )
}

/** ช่องในทีมที่ลากไปวางช่องอื่นได้ (สลับตำแหน่ง) — มือถือกดค้างแล้วลาก */
function DragSlot({ index, draggable, children }: { index: number; draggable: boolean; children: ReactNode }) {
  const drag = useDraggable({ id: String(index), disabled: !draggable })
  const drop = useDroppable({ id: String(index) })
  const t = drag.transform
  return (
    <div ref={(el) => { drag.setNodeRef(el); drop.setNodeRef(el) }} {...drag.listeners}
      className={`relative touch-manipulation ${drag.isDragging ? 'z-20 opacity-80' : ''} ${drop.isOver && !drag.isDragging ? 'rounded-[24%_4%_24%_4%] ring-2 ring-gold/70' : ''}`}
      style={t ? { transform: `translate3d(${t.x}px, ${t.y}px, 0)` } : undefined}>
      {children}
    </div>
  )
}
