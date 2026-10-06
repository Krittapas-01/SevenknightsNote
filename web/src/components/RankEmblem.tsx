/** ตราแรงค์เบ็ดเสร็จแบบวาดเอง (SVG) — โล่ + ดาบ สีตามแรงค์ · ตำนานมีช่อใบ · เทพเจ้ามีปีก */
const COLORS: [string, string, string][] = [
  ['#e7b08f', '#9a5b3f', '#5c3424'], // ทั่วไป
  ['#7ff0cf', '#2a9a82', '#14574b'], // ระดับสูง
  ['#ff8a96', '#c23048', '#6d1426'], // หายาก
  ['#ffe08a', '#d39b2a', '#7c5410'], // ตำนาน
  ['#cdbbff', '#7a5ce0', '#3c2683'], // เทพเจ้า
]

export default function RankEmblem({ rank, size = 64, glow = false }: { rank: number; size?: number; glow?: boolean }) {
  const [hi, mid, lo] = COLORS[rank] ?? COLORS[0]
  const id = `re${rank}`
  return (
    <svg viewBox="0 0 100 110" width={size} height={size * 1.1} aria-hidden="true"
      style={glow ? { filter: `drop-shadow(0 0 ${size / 6}px ${mid}aa)` } : undefined}>
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={hi} /><stop offset=".55" stopColor={mid} /><stop offset="1" stopColor={lo} /></linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#c9d2e8" /></linearGradient>
      </defs>
      {rank >= 4 && (/* ปีก */
        <g fill={hi} opacity=".85">
          <path d="M18 62 C2 56 0 40 6 30 C12 44 20 46 26 46 Z" /><path d="M82 62 C98 56 100 40 94 30 C88 44 80 46 74 46 Z" />
          <path d="M20 74 C6 72 2 62 4 54 C12 64 20 64 26 62 Z" /><path d="M80 74 C94 72 98 62 96 54 C88 64 80 64 74 62 Z" />
        </g>
      )}
      {rank === 3 && (/* ช่อใบ */
        <g fill={mid} opacity=".9">
          {[0, 1, 2, 3].map((i) => <ellipse key={i} cx={20 - i * 1.5} cy={40 + i * 11} rx="5" ry="9" transform={`rotate(${-30 + i * 12} ${20 - i * 1.5} ${40 + i * 11})`} />)}
          {[0, 1, 2, 3].map((i) => <ellipse key={`r${i}`} cx={80 + i * 1.5} cy={40 + i * 11} rx="5" ry="9" transform={`rotate(${30 - i * 12} ${80 + i * 1.5} ${40 + i * 11})`} />)}
        </g>
      )}
      <path d="M50 14 L82 26 L80 62 C78 82 64 94 50 102 C36 94 22 82 20 62 L18 26 Z" fill={`url(#${id}s)`} stroke={lo} strokeWidth="3" />
      <path d="M50 22 L74 31 L72 61 C70 77 60 87 50 93 C40 87 30 77 28 61 L26 31 Z" fill="none" stroke={hi} strokeOpacity=".55" strokeWidth="2" />
      {/* ดาบ */}
      <path d="M50 6 L55 18 L54 70 L50 78 L46 70 L45 18 Z" fill={`url(#${id}b)`} stroke="#5a6278" strokeWidth="1.5" />
      <rect x="38" y="66" width="24" height="5" rx="2.5" fill={hi} stroke={lo} strokeWidth="1.5" />
      <rect x="47.5" y="71" width="5" height="16" rx="2" fill={lo} />
      <circle cx="50" cy="90" r="4" fill={hi} stroke={lo} strokeWidth="1.5" />
    </svg>
  )
}
