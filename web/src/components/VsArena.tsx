import type { ReactNode } from 'react'
import VersusMark from './VersusMark'

// ตำแหน่ง/จังหวะคงที่ (ไม่สุ่มทุก render) — ฝั่งซ้ายฟ้า ฝั่งขวาแดง
const EMBERS = [
  { side: 'ember-b', x: 8, d: 0.2, t: 4.2, drift: -14 }, { side: 'ember-b', x: 18, d: 1.6, t: 5.1, drift: 10 },
  { side: 'ember-b', x: 27, d: 3.1, t: 4.6, drift: -8 }, { side: 'ember-b', x: 36, d: 0.9, t: 5.6, drift: 12 },
  { side: 'ember-b', x: 14, d: 2.4, t: 6.0, drift: 6 }, { side: 'ember-r', x: 64, d: 0.6, t: 4.8, drift: 9 },
  { side: 'ember-r', x: 73, d: 2.0, t: 5.3, drift: -12 }, { side: 'ember-r', x: 82, d: 3.4, t: 4.4, drift: 7 },
  { side: 'ember-r', x: 91, d: 1.2, t: 5.8, drift: -9 }, { side: 'ember-r', x: 86, d: 2.8, t: 6.2, drift: 14 },
]

// ดาวระยิบรอบ VS (ตำแหน่งเป็น % ของภาพ VS)
const STARS = [{ x: 26, y: 40, d: 1.6 }, { x: 77, y: 62, d: 2.4 }, { x: 59, y: 24, d: 3.1 }, { x: 41, y: 79, d: 2.0 }, { x: 64, y: 28, d: 3.7 }, { x: 72, y: 48, d: 2.8 }]

/** ซ้าย = ทีมเรา, ขวา = บ้านศัตรู, กลาง = VS แบบในเกม (มือถือจะเรียงบน-ล่าง) */
export default function VsArena({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="vs-arena relative flex flex-col items-center gap-4 lg:flex-row lg:items-stretch lg:justify-center lg:gap-0">
      <div className="w-full max-w-[400px] lg:w-[380px] [&>*]:h-full">{left}</div>
      <div className="vs-mid relative flex h-48 w-full items-center justify-center lg:h-auto lg:w-56 lg:shrink-0">
        {/* ประกายไฟลอยขึ้นจากสองฝั่ง (ฟ้า = ทีมเรา, แดง = ศัตรู) */}
        <div className="vs-embers" aria-hidden>
          {EMBERS.map((e, i) => <span key={i} className={e.side} style={{ left: `${e.x}%`, animationDelay: `${e.d}s`, animationDuration: `${e.t}s`, ['--drift' as string]: `${e.drift}px` }} />)}
        </div>
        <div className="relative">
          <VersusMark className="w-64 max-w-full lg:w-80 lg:max-w-none" />
          <span className="vs-glow" aria-hidden />
          <span className="vs-stars" aria-hidden>
            {STARS.map((t, i) => <i key={i} style={{ left: `${t.x}%`, top: `${t.y}%`, animationDelay: `${t.d}s` }} />)}
          </span>
        </div>
      </div>
      <div className="w-full max-w-[400px] lg:w-[380px] [&>*]:h-full">{right}</div>
    </div>
  )
}
