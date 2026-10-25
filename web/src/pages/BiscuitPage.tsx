import { Plus } from 'lucide-react'
import { zoomInPlace } from '../lib/zoom'
import { DndContext, MouseSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTrackFirstChange } from '../lib/usage'
import { markDrop, useTeamMotion } from '../lib/teamMotion'
import { afterModalClose } from '../lib/overlayMotion'
import UnitCard from '../components/UnitCard'
import UnitPicker from '../components/UnitPicker'
import { FormationDiagram } from '../components/TeamModals'
import { HEROES, unitLabel } from '../data/heroes'
import { baseAtkOf } from '../data/stats'
import { SLOT_COUNT } from '../lib/types'
import { FORMATION_ATK, FRONT_COLS } from '../lib/formation'
import './BiscuitPage.css'
import { tx, L, LOCALE } from '../lib/i18n'

// บิสกิตบัฟให้ตัวที่ "โจมตีในเกม" สูงสุด 2 อันดับ
// โจมตีในเกม = โจมตีหน้าอัศวิน + base × บัฟ% (บัฟ % คิดจาก base ไม่ใช่ค่ารวม)
const BISCUIT_TARGETS = 2
const STORE_KEY = '7k-note:biscuit'

type Slot = { id: string | null; base: string; screen: string; extra: string }

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
const fmt = (n: number) => Math.round(n).toLocaleString(LOCALE)

export default function BiscuitPage() {
  const [state, setState] = useState(load)
  useTrackFirstChange('biscuit', state)
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
  // คีย์ประจำช่อง (ไม่บันทึก) ย้ายตามค่าที่กรอกไว้ → ช่องกรอกเลื่อนตามการ์ดตอนสลับ
  const uids = useRef(Array.from({ length: SLOT_COUNT }, (_, i) => `s${i}`))
  // ย้าย/สลับ 2 ช่อง พร้อมค่าที่กรอกไว้ (ใช้ทั้งกดเลือก และลากวาง)
  const swap = (a: number, b: number) => {
    if (a === b) return
    const u = uids.current
    ;[u[a], u[b]] = [u[b], u[a]]
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
    if (over) {
      markDrop(state.slots[Number(active.id)]?.id) // ช่องปลายทางวาบทองตรงที่ปล่อย
      swap(Number(active.id), Number(over.id))
    }
  }
  const { pet, front, slots } = state
  // แอนิเมชันแบบหน้าจัดทีม: ใส่ตัว = เด้ง+แสงทอง · เปลี่ยน/ล้างตัว = จางหาย+ประกายดาว · สลับ = การ์ดและช่องกรอกเลื่อนไปช่องใหม่
  // เปลี่ยนรูปแบบ = ช่องเลื่อนขึ้นลงด้วย CSS (.biscuit-col) → fixedHosts: ไม่ใช้ตำแหน่งที่จำไว้ (จะเก่า)
  const teamRef = useRef<HTMLDivElement>(null)
  useTeamMotion(teamRef, slots.map((r, i) => `${r.id ?? ''}/${r.id || r.screen ? uids.current[i] : ''}`).join(','), true, { fixedHosts: true })
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
  // ปิดหน้าต่างเลือกก่อน แล้วค่อยใส่/เอาออก → เห็นการ์ดเด้ง/แสงทอง/ประกายดาวชัด ๆ ไม่จมอยู่หลังพื้นหลังมืด
  const pick = (i: number, id: string | null) => {
    setPicking(null)
    afterModalClose(() => {
      if (!id) setSlot(i, { ...EMPTY_SLOT })
      else setSlot(i, { id })
    })
  }

  let filled = slots
    .map((r, i) => {
      // base ตายตัวตามอัศวิน (7K Atlas) แก้ไม่ได้ · ไม่รู้ base = null (ไม่นับเป็น 0)
      const base = r.id ? baseAtkOf(r.id) : null
      const screen = num(r.screen)
      const back = isBack(i)
      const pct = petBuff + (back ? formation.atk : 0) + num(r.extra)
      const name = r.id ? unitLabel(r.id) : L(`ช่องที่ ${i + 1}`, `Slot ${i + 1}`)
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
  // อันดับเปลี่ยน (กรอกเลข/สลับช่อง/เปลี่ยนรูปแบบ) → แถวเลื่อนไปที่ใหม่ · แถวใหม่ค่อย ๆ โผล่
  const rankRef = useRef<HTMLOListElement>(null)
  useTeamMotion(rankRef, byGame.map((r) => uids.current[r.i]).join(','), true)
  const input = 'pill w-full min-w-0 px-1 py-1 text-center text-xs tabular-nums outline-none focus:border-gold sm:text-sm'

  return (
    <div className="biscuit-page mx-auto max-w-4xl">
      <header className="biscuit-heading">
        <span className="biscuit-eyebrow">SEVEN KNIGHTS · BATTLE PREP</span>
        <h1 className="text-3xl font-extrabold sm:text-4xl">
          {L('เช็กบัฟ', 'Biscuit ')}<span className="text-gold">{L('บิสกิต', 'Buff Check')}</span>
        </h1>
      <p className="mt-2 text-white/65">
        {tx('บิสกิตบัฟให้ตัวที่โจมตีสูงสุด')}{' '}{BISCUIT_TARGETS}{' '}{tx('ตัวในทีม แต่เกมนับจาก')}{L('', ' ')}<b className="text-white">{tx('โจมตีในเกม')}</b>{' '}{tx('ซึ่งรวมบัฟ % ที่คิดจาก base ของแต่ละตัวแล้ว ตัวที่หน้าอัศวินสูงกว่าจึงอาจไม่ได้บัฟ')}
      </p>
      </header>

      <section className="biscuit-setup panel panel-gold mt-5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="biscuit-section-label w-full text-sm font-medium text-gold sm:w-auto">{tx('ศักยภาพสัตว์เลี้ยง · All Attack (%)')}</span>
          {Array.from({ length: PET_LINES }, (_, i) => (
            <input
              key={i}
              value={pet[i] ?? ''}
              onChange={(e) =>
                setState((s) => ({ ...s, pet: Array.from({ length: PET_LINES }, (_, j) => (j === i ? e.target.value : s.pet[j] ?? '')) }))
              }
              inputMode="decimal"
              aria-label={L(`ศักยภาพบรรทัดที่ ${i + 1}`, `Potential line ${i + 1}`)}
              className="pill w-16 px-2 py-1.5 text-center tabular-nums outline-none focus:border-gold"
            />
          ))}
          <span className="text-sm text-white/70">
            = <b className="text-gold tabular-nums">{petBuff}%</b>
          </span>
        </div>

        <p className="biscuit-section-label mt-5 text-sm font-medium text-gold">{tx('รูปแบบ')}{' '}<span className="text-white/45">· Lv.40</span></p>
        {/* รูปรูปแบบแบบเดียวกับตอนเลือกในคอมพ์ */}
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FORMATION_ATK.map((f) => (
            <button
              key={f.front}
              onClick={() => setState((s) => ({ ...s, front: f.front }))}
              className={`biscuit-formation rounded-2xl border-2 p-1.5 text-center transition ${
                f.front === front ? 'biscuit-formation-active' : ''
              }`}
            >
              <FormationDiagram front={f.front} />
              <div className="text-sm font-semibold">{f.front === front && '✓ '}{L(`รูปแบบ${f.name}`, `${f.name} formation`)}</div>
              <div className="text-xs text-[#ff8f9a]">{tx('หลัง +')}{f.atk}{tx('% โจมตี')}</div>
            </button>
          ))}
        </div>

        {/* ทีมแนวนอนแบบในเกม: แถวหลัง (B) ยกสูง · แถวหน้า (F) ต่ำลง */}
        <DndContext sensors={sensors} onDragEnd={onDragEnd} modifiers={[zoomInPlace]}>
        <div ref={teamRef} className="biscuit-team mt-5 grid grid-cols-5 items-start gap-1.5 sm:gap-3">
          {slots.map((r, i) => {
            const back = isBack(i)
            return (
              <div key={i} className={`biscuit-col flex min-w-0 flex-col gap-1.5 ${back ? '' : 'mt-8 sm:mt-12'}`}>
                <span key={back ? `b${formation.atk}` : 'f'} className={`biscuit-row-label biscuit-flip text-center text-[11px] font-semibold ${back ? 'text-[#ff8f9a]' : 'text-[#8fa8ff]'}`}>
                  {back ? L(`หลัง +${formation.atk}%`, `Back +${formation.atk}%`) : tx('หน้า')}
                </span>
                <DragSlot index={i} draggable={!!r.id} selected={selected === i}>
                <button
                  data-m={r.id ? `b:${r.id}` : undefined}
                  onClick={() => tapSlot(i)}
                  aria-pressed={selected === i}
                  aria-label={r.id ? L(`${unitLabel(r.id)}${selected === i ? ' (เลือกอยู่ · กดอีกครั้งเพื่อเปลี่ยนตัว)' : ''}`, `${unitLabel(r.id)}${selected === i ? ' (selected · tap again to change)' : ''}`) : L(`เลือกอัศวินช่องที่ ${i + 1}`, `Pick hero for slot ${i + 1}`)}
                  className="aspect-square w-full text-[12px] transition hover:-translate-y-0.5"
                >
                  {r.id ? (
                    <UnitCard id={r.id} />
                  ) : (
                    <span data-mp={`empty:${i}`} className="slot-empty grid h-full w-full place-items-center rounded-[24%_4%_24%_4%] border border-dashed border-white/20 text-white/50">
                      <Plus className="h-1/3 w-1/3" />
                    </span>
                  )}
                </button>
                </DragSlot>
                {/* data-mhost = กรอบของช่องกรอก (อยู่ทุกคอลัมน์) → สลับช่องแล้วช่องกรอกเลื่อนจากคอลัมน์เดิมไปคอลัมน์ใหม่ */}
                <div data-mhost="" className="relative min-w-0">
                {(r.id || r.screen) && (
                  <div data-m={`v:${uids.current[i]}`} data-mpop="field" data-mfade="" className="flex min-w-0 flex-col gap-1.5">
                    <input value={r.screen} onChange={(e) => setSlot(i, { screen: e.target.value })} inputMode="decimal"
                      placeholder={tx('โจมตี')} aria-label={tx('โจมตีหน้าอัศวิน')} className={input} />
                    <input value={r.extra} onChange={(e) => setSlot(i, { extra: e.target.value })} inputMode="decimal"
                      placeholder={tx('บัฟ%+')} aria-label={tx('บัฟ % เพิ่มเฉพาะตัว')} className={`${input} text-white/70`} />
                    <span className="text-center text-[11px] text-white/45 tabular-nums">
                      {r.id && baseAtkOf(r.id) ? `base ${fmt(baseAtkOf(r.id)!)}` : tx('ไม่มี base')}
                    </span>
                  </div>
                )}
                </div>
              </div>
            )
          })}
        </div>
        </DndContext>
        <p className="biscuit-help mt-4 text-xs text-white/45">
          {tx('กดช่องว่างเพื่อเลือกอัศวิน · กดตัวที่มีอยู่ 1 ครั้งเพื่อเลือก แล้วกดซ้ำเพื่อเปลี่ยนตัว หรือกดช่องอื่นเพื่อสลับตำแหน่ง · ช่องแรกใต้รูป = โจมตี (ตามหน้าอัศวิน) · ช่องที่ 2 = บัฟ % เพิ่มเฉพาะตัว (เช่น สกิลติดตัว) · base ตายตัวตามอัศวิน (ค่าจาก 7K Atlas) · รูปแบบให้ All Attack % เฉพาะแถวหลัง (แถวหน้าได้ป้องกัน %) · ข้อมูลเก็บไว้ในเครื่องนี้เท่านั้น')}
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
          {tx('⚠️ ไม่รู้ค่า base ของ')}{' '}{unknownBase.map((r) => r.name).join(', ')}{' '}{tx('— ไม่ได้นับในอันดับด้านล่าง เลือกอัศวินจากรายการแทน')}
        </p>
      )}

      {filled.length > 0 && (
        <section className="biscuit-results panel panel-gold mt-8 p-4 sm:p-5">
          <h2 className="biscuit-section-label font-semibold text-gold">{tx('อันดับโจมตีในเกม')}</h2>
          <ol ref={rankRef} className="mt-3 flex flex-col gap-2">
            {byGame.map((r, k) => {
              const gets = k < BISCUIT_TARGETS
              // ส่วนต่างกับเส้นตัด: ตัวที่ได้บัฟนำตัวที่ 3 อยู่เท่าไร / ตัวที่ไม่ได้ขาดอีกเท่าไร
              const gap = gets ? (cutoff !== undefined ? r.game - cutoff : undefined) : byGame[BISCUIT_TARGETS - 1].game - r.game
              return (
                <li
                  key={uids.current[r.i]}
                  data-m={`r:${uids.current[r.i]}`}
                  data-mpop="row"
                  className={`biscuit-result-row flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-3 py-2 ${gets ? 'biscuit-result-winner' : ''}`}
                >
                  <span className="w-5 text-white/50 tabular-nums">{k + 1}</span>
                  <span className="flex-1 font-medium">{r.name}</span>
                  <span className="text-sm text-white/55 tabular-nums" title={L(`บัฟรวม ${r.pct}% ของ base ${fmt(r.base)}`, `Total buff ${r.pct}% of base ${fmt(r.base)}`)}>
                    {fmt(r.screen)} + {fmt((r.base * r.pct) / 100)} <span className="text-white/35">({r.back ? tx('หลัง') : tx('หน้า')} {r.pct}%)</span>
                  </span>
                  <span className="w-16 text-right font-semibold tabular-nums">{fmt(r.game)}</span>
                  <span className={`w-full text-xs sm:w-40 sm:text-right ${gets ? 'text-gold' : 'text-white/45'}`}>
                    {gets
                      ? L(`🍪 ได้บัฟ${gap !== undefined ? ` · นำอยู่ ${fmt(gap)}` : ''}`, `🍪 Gets the buff${gap !== undefined ? ` · ahead by ${fmt(gap)}` : ''}`)
                      : L(`ขาดอีก ${fmt(gap! + 1)} ถึงจะได้บัฟ`, `${fmt(gap! + 1)} more to get the buff`)}
                  </span>
                </li>
              )
            })}
          </ol>
          {unknownBase.length > 0 && (
            <p className="mt-4 rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              {tx('อันดับนี้ยังไม่รวม')}{' '}{unknownBase.map((r) => r.name).join(', ')}{' '}{tx('— ผลจริงอาจต่างจากนี้')}
            </p>
          )}
          {flipped.length > 0 ? (
            <p className="mt-4 rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-200">
              {tx('⚠️ อันดับในเกมไม่ตรงกับหน้าอัศวิน:')}{' '}{flipped.map((r) => r.name).join(', ')}{' '}{tx('— ดูจากหน้าอัศวินอย่างเดียวจะเข้าใจผิดว่าบัฟลงใคร')}
            </p>
          ) : unknownBase.length > 0 ? null : (
            <p className="mt-4 text-sm text-white/55">{tx('อันดับในเกมตรงกับหน้าอัศวิน บัฟลงตามที่เห็นในหน้าอัศวิน')}</p>
          )}
        </section>
      )}
    </div>
  )
}

/** ช่องในทีมที่ลากไปวางช่องอื่นได้ (สลับตำแหน่ง) — มือถือกดค้างแล้วลาก */
function DragSlot({ index, draggable, selected, children }: { index: number; draggable: boolean; selected: boolean; children: ReactNode }) {
  const drag = useDraggable({ id: String(index), disabled: !draggable })
  const drop = useDroppable({ id: String(index) })
  const t = drag.transform
  return (
    // data-mhost = กรอบช่อง (แสงทอง/การ์ดจางออก/ประกายดาวของ lib/teamMotion) · เลือกอยู่ = กรอบเรืองแสงแบบหน้าจัดทีม
    <div ref={(el) => { drag.setNodeRef(el); drop.setNodeRef(el) }} {...drag.listeners} data-mhost=""
      className={`relative rounded-[24%_4%_24%_4%] touch-manipulation ${drag.isDragging ? 'z-20 opacity-80' : ''} ${drop.isOver && !drag.isDragging ? 'ring-2 ring-gold/70' : ''} ${selected && !drag.isDragging ? 'slot-selected' : ''}`}
      style={t ? { transform: `translate3d(${t.x}px, ${t.y}px, 0)` } : undefined}>
      {children}
    </div>
  )
}
