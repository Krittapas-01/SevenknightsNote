import { ChevronRight, Footprints, X } from 'lucide-react'
import { Fragment, useEffect, useId, useRef, useState } from 'react'
import { noteFor } from './HeroDetailModal'
import UnitCard, { UNIT_SLOT_RADIUS } from './UnitCard'
import { unitLabel } from '../data/heroes'
import { tx, L } from '../lib/i18n'
import type { HeroNote, Team } from '../lib/types'

type Props = {
  team: Team
  heroNotes?: HeroNote[]
  small?: boolean
  /** ส่งมา = พิมพ์ความเร็วทีมได้ */
  onSpeed?: (speed: number) => void
}

/** อัศวินในทีมเรียงตามความเร็วโจมตี (มากไปน้อย, เท่ากัน = ตามช่อง) · ตัวที่ยังไม่มีค่าอยู่ท้าย */
export function speedOrder(team: Team, notes: HeroNote[] | undefined) {
  const list = team.slots
    .map((h, slot) => (h ? { h, slot, spd: notes ? noteFor(h, notes)?.stats?.spd : undefined } : null))
    .filter((x): x is { h: string; slot: number; spd: number | undefined } => !!x)
  const known = list.filter((x): x is { h: string; slot: number; spd: number } => typeof x.spd === 'number')
    .sort((a, b) => b.spd - a.spd || a.slot - b.slot)
  const missing = list.filter((x) => typeof x.spd !== 'number')
  return { known, missing, total: known.reduce((s, x) => s + x.spd, 0), full: list.length > 0 && missing.length === 0 }
}

/**
 * ป้ายความเร็วทีม (รูปรอยเท้า) — กดแล้วเปิดกล่องแบบในเกม: อัศวินเรียงตามความเร็วโจมตี
 * ทุกตัวมีความเร็วโจมตี = ความเร็วทีมคือผลรวม (ใส่ให้อัตโนมัติ ตอนบันทึกก็ใส่ให้ — fillSpeed ใน lib/teamSpeed)
 * ไม่ครบ = ตอนแก้ทีมพิมพ์ตัวเลขเองได้ หรือเว้นไว้
 */
export default function TeamSpeed({ team, heroNotes, small, onSpeed }: Props) {
  const [open, setOpen] = useState(false)
  const inputId = useId()
  const boxRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('pointerdown', down, true)
    window.addEventListener('keydown', key)
    return () => { window.removeEventListener('pointerdown', down, true); window.removeEventListener('keydown', key) }
  }, [open])

  const order = speedOrder(team, heroNotes)
  const speed = order.full ? order.total : team.speed || 0
  const icon = <Footprints className={small ? 'h-3.5 w-3.5 text-gold' : 'h-5 w-5 text-gold'} />
  const pillCls = `pill flex items-center gap-1.5 border-gold-deep/60 ${small ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-base'}`
  const title = tx('ความเร็วทีม')

  return (
    <div ref={boxRef} className="relative">
      {onSpeed && !order.full ? (
        <label htmlFor={inputId} data-tour="team-speed" className={pillCls}>
          <button type="button" onClick={() => setOpen((v) => !v)} title={title} aria-expanded={open} className="-m-1 grid place-items-center rounded-full p-1 hover:bg-white/10">
            {icon}
          </button>
          <input
            id={inputId}
            type="number"
            inputMode="numeric"
            min={0}
            value={speed || ''}
            placeholder="0"
            onChange={(e) => onSpeed(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
            className="w-16 bg-transparent text-right font-bold tabular-nums text-gold outline-none [appearance:textfield] placeholder:text-gold/60 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </label>
      ) : (
        <button type="button" data-tour="team-speed" onClick={() => setOpen((v) => !v)} title={order.full ? `${title} · ${tx('ผลรวมความเร็วโจมตีของทุกตัว')}` : title} aria-expanded={open}
          className={`${pillCls} hover:border-gold/70`}>
          {icon}
          <span className="min-w-6 text-right font-bold tabular-nums text-gold">{speed}</span>
        </button>
      )}
      {open && <SpeedBox order={order} speed={speed} editable={!!onSpeed} onClose={() => setOpen(false)} />}
    </div>
  )
}

function SpeedBox({ order: o, speed, editable, onClose }: { order: ReturnType<typeof speedOrder>; speed: number; editable: boolean; onClose: () => void }) {
  const { known, missing, total } = o
  const order = [...known, ...missing]

  return (
    <div data-noexport role="dialog" aria-label={tx('ความเร็วทีม')}
      className="speed-box absolute right-0 top-full z-40 mt-2 w-[min(19rem,calc(100vw-3rem))] rounded-2xl border border-gold/40 bg-[var(--surface-3)] p-3 text-left text-sm shadow-2xl">
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <Footprints className="h-4 w-4 text-gold" />
        <span className="flex-1 font-semibold">{tx('ความเร็วทีม')}</span>
        <span className="font-bold tabular-nums text-gold">{speed}</span>
        <button type="button" onClick={onClose} title={tx('ปิด')} className="-mr-1 grid h-7 w-7 place-items-center rounded-full text-white/60 hover:bg-white/10">
          <X className="h-4 w-4" />
        </button>
      </div>

      {order.length > 0 && (
        <div className="mt-3">
          <div className="text-xs text-white/50">{tx('ลำดับอัศวินตามความเร็วโจมตี')}</div>
          <div className="mt-1.5 flex items-start justify-center gap-0.5">
            {order.map((x, i) => (
              <Fragment key={x.slot}>
                {i > 0 && <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-white/40" strokeWidth={3} />}
                <div className={`flex w-11 flex-col items-center ${x.spd === undefined ? 'opacity-45' : ''}`} title={unitLabel(x.h)}>
                  <div className="h-11 w-11 text-[10px]" style={{ borderRadius: UNIT_SLOT_RADIUS }}>
                    <UnitCard id={x.h} small showName={false} />
                  </div>
                  <span className={`mt-0.5 text-xs font-bold tabular-nums ${x.spd === undefined ? 'text-white/50' : 'text-gold'}`}>{x.spd ?? '?'}</span>
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      )}

      {order.length === 0 ? (
        <p className="mt-2 text-xs text-white/50">{tx('ยังไม่มีอัศวินในทีม')}</p>
      ) : missing.length > 0 ? (
        <p className="mt-2 text-xs leading-snug text-white/50">
          {known.length === 0
            ? tx('ยังไม่มีความเร็วโจมตีของอัศวินในทีมนี้ ใส่ได้ที่ค่าความสามารถของอัศวิน')
            : L(`ยังไม่มีความเร็วโจมตีของ ${missing.map((x) => unitLabel(x.h)).join(', ')} (ใส่ได้ที่ค่าความสามารถของอัศวิน)`,
              `No attack speed yet for ${missing.map((x) => unitLabel(x.h)).join(', ')} (add it in the hero's stats)`)}
          {editable && <span className="mt-1 block text-white/60">{tx('ทีมที่ยังไม่ครบ พิมพ์ความเร็วทีมเองได้ หรือเว้นไว้ก็ได้')}</span>}
        </p>
      ) : (
        <div className="mt-2 rounded-xl bg-black/20 px-2.5 py-1.5 text-xs text-white/60">
          {tx('ความเร็วโจมตีรวม')} <b className="tabular-nums text-gold">{total}</b>
          <span className="mt-0.5 block text-white/45">{tx('ทุกตัวมีความเร็วครบ ใส่เป็นความเร็วทีมให้อัตโนมัติ')}</span>
        </div>
      )}

    </div>
  )
}
