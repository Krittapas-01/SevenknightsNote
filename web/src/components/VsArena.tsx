import type { ReactNode } from 'react'

/** ซ้าย = ทีมเรา, ขวา = ทีมศัตรู, กลาง = VS แบบในเกม (มือถือจะเรียงบน-ล่าง) */
export default function VsArena({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="vs-arena relative flex flex-col items-center gap-4 lg:flex-row lg:items-stretch lg:justify-center lg:gap-0">
      <div className="w-full max-w-[400px] lg:w-[380px] [&>*]:h-full">{left}</div>
      <div className="relative grid h-24 w-full place-items-center lg:h-auto lg:w-56 lg:shrink-0">
        <div className="vs-glow pointer-events-none absolute inset-x-0 top-1/2 h-40 -translate-y-1/2 lg:h-72" />
        <div className="vs-text relative text-7xl lg:text-[8.5rem]">VS</div>
      </div>
      <div className="w-full max-w-[400px] lg:w-[380px] [&>*]:h-full">{right}</div>
    </div>
  )
}
