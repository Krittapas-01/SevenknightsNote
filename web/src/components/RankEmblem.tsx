import normal from '../assets/totalwar-ranks/normal.webp'
import high from '../assets/totalwar-ranks/high.webp'
import rare from '../assets/totalwar-ranks/rare.webp'
import legend from '../assets/totalwar-ranks/legend.webp'
import god from '../assets/totalwar-ranks/god.webp'

const EMBLEMS = [normal, high, rare, legend, god]
const NAMES = ['ทั่วไป', 'ระดับสูง', 'หายาก', 'ตำนาน', 'เทพเจ้า']
const GLOWS = ['#e7b08f', '#48d3ad', '#ff5975', '#ffd05b', '#a98aff']

/** ตราแรงค์จากภาพในเกม พร้อมเงาและแสงเรืองสีประจำแรงค์ */
export default function RankEmblem({ rank, size = 64, glow = false }: { rank: number; size?: number; glow?: boolean }) {
  const index = Math.max(0, Math.min(EMBLEMS.length - 1, rank))
  const emblemSize = Math.max(size, 1)
  return (
    <span
      className="inline-grid shrink-0 place-items-center"
      style={{
        width: emblemSize,
        height: emblemSize,
        filter: glow
          ? `drop-shadow(0 0 ${size / 5}px ${GLOWS[index]}cc) drop-shadow(0 2px 4px rgba(0,0,0,.65))`
          : `drop-shadow(0 2px ${Math.max(2, size / 10)}px ${GLOWS[index]}75) drop-shadow(0 1px 2px rgba(0,0,0,.55))`,
      }}
      title={NAMES[index]}
    >
      <img
        src={EMBLEMS[index]}
        alt={`ตราแรงค์${NAMES[index]}`}
        draggable={false}
        className="h-full w-full object-contain"
      />
    </span>
  )
}
