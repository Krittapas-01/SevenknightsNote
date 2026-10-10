import type { ReactNode } from 'react'
import VersusMark from './VersusMark'

/** ซ้าย = ทีมเรา, ขวา = บ้านศัตรู, กลาง = VS แบบในเกม (มือถือจะเรียงบน-ล่าง) */
export default function VsArena({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="vs-arena relative flex flex-col items-center gap-4 lg:flex-row lg:items-stretch lg:justify-center lg:gap-0">
      <div className="w-full max-w-[400px] lg:w-[380px] [&>*]:h-full">{left}</div>
      <div className="vs-mid relative flex h-48 w-full items-center justify-center lg:h-auto lg:w-56 lg:shrink-0">
        <VersusMark className="w-64 max-w-full lg:w-80 lg:max-w-none" />
      </div>
      <div className="w-full max-w-[400px] lg:w-[380px] [&>*]:h-full">{right}</div>
    </div>
  )
}
