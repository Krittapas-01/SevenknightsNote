import { ChevronDown, ChevronRight, Footprints, X } from 'lucide-react'
import { Fragment, useEffect, useRef, useState } from 'react'
import { noteFor } from './HeroDetailModal'
import UnitCard, { UNIT_SLOT_RADIUS } from './UnitCard'
import { unitLabel } from '../data/heroes'
import { tx } from '../lib/i18n'
import type { HeroNote, Team } from '../lib/types'

type Props = {
  team: Team
  heroNotes?: HeroNote[]
  small?: boolean
  /** ส่งมา = พิมพ์ความเร็วทีมได้ (เฉพาะทีมที่ความเร็วโจมตียังไม่ครบ) */
  onSpeed?: (speed: number) => void
}

/** อัศวินในทีมเรียงตามความเร็วโจมตี (มากไปน้อย, เท่ากัน = ตามช่อง) · full = ทุกตัวมีค่า */
export function speedOrder(team: Team, notes: HeroNote[] | undefined) {
  const list = team.slots
    .map((h, slot) => (h ? { h, slot, spd: notes ? noteFor(h, notes)?.stats?.spd : undefined } : null))
    .filter((x): x is { h: string; slot: number; spd: number | undefined } => !!x)
  const known = list.filter((x): x is { h: string; slot: number; spd: number } => typeof x.spd === 'number')
    .sort((a, b) => b.spd - a.spd || a.slot - b.slot)
  return { known, total: known.reduce((s, x) => s + x.spd, 0), full: list.length > 0 && known.length === list.length }
}

/**
 * ป้ายความเร็วทีม (รูปรอยเท้า)
 * ทุกตัวมีความเร็วโจมตี = ความเร็วทีมคือผลรวม (ใส่ให้อัตโนมัติ ตอนบันทึกก็ใส่ให้ — fillSpeed ใน lib/teamSpeed)
 *   และกดป้ายแล้วเปิดกล่องแบบในเกม: อัศวินเรียงตามความเร็วโจมตี
 * ไม่ครบ = ป้ายแบบเดิม (ตอนแก้ทีมพิมพ์ตัวเลขเองได้ หรือเว้นไว้) ไม่มีกล่อง
 */
export default function TeamSpeed({ team, heroNotes, small, onSpeed }: Props) {
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const order = speedOrder(team, heroNotes)
  const show = open && order.full
  useEffect(() => {
    if (!show) return
    const down = (e: PointerEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('pointerdown', down, true)
    window.addEventListener('keydown', key)
    return () => { window.removeEventListener('pointerdown', down, true); window.removeEventListener('keydown', key) }
  }, [show])

  const speed = order.full ? order.total : team.speed || 0
  const icon = <Footprints className={small ? 'h-3.5 w-3.5 text-gold' : 'h-5 w-5 text-gold'} />
  const pillCls = `pill flex items-center gap-1.5 border-gold-deep/60 ${small ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-base'}`
  const value = <span className="min-w-6 text-right font-bold tabular-nums text-gold">{speed}</span>

  if (!order.full) {
    return onSpeed ? (
      <label data-tour="team-speed" className={pillCls}>
        {icon}
        <input
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
      <span data-tour="team-speed" className={pillCls}>{icon}{value}</span>
    )
  }

  return (
    <div ref={boxRef} className="relative">
      <button type="button" data-tour="team-speed" onClick={() => setOpen((v) => !v)} title={`${tx('ความเร็วทีม')} · ${tx('ผลรวมความเร็วโจมตีของทุกตัว')}`} aria-expanded={show}
        className={`${pillCls} border-gold/70 hover:bg-white/10 ${show ? 'bg-white/10' : ''}`}>
        {icon}{value}
        {/* ลูกศร = กดดูลำดับอัศวินได้ (ทีมที่ความเร็วไม่ครบไม่มี) */}
        <ChevronDown className={`${small ? '-ml-0.5 h-3 w-3' : '-ml-0.5 h-4 w-4'} text-gold/80 transition-transform ${show ? 'rotate-180' : ''}`} strokeWidth={3} />
      </button>
      {show && (
        <div data-noexport role="dialog" aria-label={tx('ความเร็วทีม')}
          className="speed-box absolute right-0 top-full z-40 mt-2 w-[min(19rem,calc(100vw-3rem))] rounded-2xl border border-gold/40 bg-[var(--surface-3)] p-3 text-left text-sm shadow-2xl">
          <div className="flex items-center gap-2 border-b border-white/10 pb-2">
            <Footprints className="h-4 w-4 text-gold" />
            <span className="flex-1 font-semibold">{tx('ความเร็วทีม')}</span>
            <span className="font-bold tabular-nums text-gold">{speed}</span>
            <button type="button" onClick={() => setOpen(false)} title={tx('ปิด')} className="-mr-1 grid h-7 w-7 place-items-center rounded-full text-white/60 hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 text-xs text-white/50">{tx('ลำดับอัศวินตามความเร็วโจมตี')}</div>
          <div className="mt-1.5 flex items-start justify-center gap-0.5">
            {order.known.map((x, i) => (
              <Fragment key={x.slot}>
                {i > 0 && <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-white/40" strokeWidth={3} />}
                <div className="flex w-11 flex-col items-center" title={unitLabel(x.h)}>
                  <div className="h-11 w-11 text-[10px]" style={{ borderRadius: UNIT_SLOT_RADIUS }}>
                    <UnitCard id={x.h} small showName={false} />
                  </div>
                  <span className="mt-0.5 text-xs font-bold tabular-nums text-gold">{x.spd}</span>
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
