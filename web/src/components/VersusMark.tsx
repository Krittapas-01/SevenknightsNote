import { useId } from 'react'

// Angular lettering drawn as paths so the battle mark is independent of fonts.
const LETTERS = 'M106 85 124 79 124 135 138 149 153 125 151 75 168 65 169 124 139 170 108 143Z M190 77 216 91 216 109 202 115 202 98 191 93 180 100 180 119 214 136 214 162 188 178 163 164 163 143 177 137 177 157 188 164 200 157 200 145 166 128 166 92Z'

export default function VersusMark({ className = '' }: { className?: string }) {
  const id = useId().replace(/:/g, '')
  const paint = (name: string) => `url(#${id}-${name})`

  return (
    <svg viewBox="0 0 320 240" role="img" aria-label="VS" focusable="false" className={`vs-mark pointer-events-none block h-auto shrink-0 ${className}`}>
      <defs>
        <linearGradient id={`${id}-gold`} x1="0" y1="65" x2="0" y2="180" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fffbd3" />
          <stop offset=".36" stopColor="#ffe77f" />
          <stop offset=".65" stopColor="#fff5af" />
          <stop offset="1" stopColor="#efa52f" />
        </linearGradient>
        <linearGradient id={`${id}-blue`} x1="10" y1="0" x2="163" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#245cff" stopOpacity="0" />
          <stop offset=".55" stopColor="#3988ff" stopOpacity=".7" />
          <stop offset="1" stopColor="#a4d9ff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-red`} x1="162" y1="0" x2="310" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffc1a7" stopOpacity="0" />
          <stop offset=".45" stopColor="#f13b65" stopOpacity=".65" />
          <stop offset="1" stopColor="#df204a" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-blue-haze`}>
          <stop stopColor="#2369fc" stopOpacity=".3" /><stop offset="1" stopColor="#2369fc" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-red-haze`}>
          <stop stopColor="#d82b55" stopOpacity=".28" /><stop offset="1" stopColor="#d82b55" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-flare`}>
          <stop stopColor="#fffbe2" stopOpacity=".95" />
          <stop offset=".18" stopColor="#ffe89a" stopOpacity=".6" />
          <stop offset=".5" stopColor="#ffbf40" stopOpacity=".15" />
          <stop offset="1" stopColor="#ffbf40" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="3" />
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* ตอนเข้า: หมอกฟ้า/แดงจางเข้า → คลื่นพลังวิ่งเข้าหากลาง → ตัว VS กระแทกลง → สายฟ้าฟาด → แสงแฟลร์ระเบิด
          จบแล้วนิ่ง (แสงหายใจ/ดาวระยิบตอนอยู่เฉย ๆ อยู่ใน VsArena เป็นชั้น HTML ที่ GPU ทำ) */}
      <ellipse className="vs-haze vs-haze-l" cx="85" cy="125" rx="85" ry="77" fill={paint('blue-haze')} />
      <ellipse className="vs-haze vs-haze-r" cx="237" cy="125" rx="83" ry="77" fill={paint('red-haze')} />
      <g fill="none" strokeLinecap="round">
        <path className="vs-wave vs-wave-l" pathLength={1} d="M8 139C62 92 104 166 160 122M14 114C63 157 107 86 160 125" stroke={paint('blue')} strokeWidth="9" opacity=".2" />
        <path className="vs-wave vs-wave-l" pathLength={1} d="M8 139C62 92 104 166 160 122M14 114C63 157 107 86 160 125" stroke={paint('blue')} strokeWidth="1.5" />
        <path className="vs-wave vs-wave-r" pathLength={1} d="M162 123C215 85 256 168 313 108M164 125C218 158 254 95 310 132" stroke={paint('red')} strokeWidth="9" opacity=".2" />
        <path className="vs-wave vs-wave-r" pathLength={1} d="M162 123C215 85 256 168 313 108M164 125C218 158 254 95 310 132" stroke={paint('red')} strokeWidth="1.5" />
      </g>

      <g className="vs-letters">
        <path d={LETTERS} fill="#9d501c" transform="translate(0 2)" />
        <path d={LETTERS} fill={paint('gold')} stroke="#fff2a4" strokeWidth=".7" strokeLinejoin="miter" filter={paint('glow')} />
        {/* Narrow bevels catch the light without softening the letter silhouettes. */}
        <path className="vs-bevel" d="M109 86 121 83 121 137 138 153 139 166 111 142Z M190 80 212 93 204 96 191 90 177 98 169 94Z M169 126 203 143 203 158 188 168 188 175 211 161 211 138Z" fill="#fff8c5" opacity=".65" />
      </g>

      <ellipse className="vs-flare" cx="161" cy="121" rx="65" ry="69" fill={paint('flare')} />
      <g className="vs-slash">
        <path d="M213 29 170 120 113 213 154 120Z" fill="#ffcc4a" opacity=".5" filter={paint('glow')} />
        <path d="M207 40 163 123 120 202 157 119Z" fill="#fff6bc" filter={paint('glow')} />
        <path d="M85 77 163 117 241 171 160 125Z" fill="#ffe48b" opacity=".55" />
      </g>
      <path className="vs-core" d="M161 102 164 118 181 122 164 125 159 143 158 126 142 121 158 118Z" fill="#fffde8" />
      <g fill="#ffe8ad" opacity=".6">
        <path className="vs-twinkle" d="M83 91 84 95 88 96 84 97 83 101 82 97 78 96 82 95Z" />
        <path className="vs-twinkle" d="M244 144 245 148 249 149 245 150 244 154 243 150 239 149 243 148Z" />
        <path className="vs-twinkle" d="M189 54 190 57 193 58 190 59 189 62 188 59 185 58 188 57Z" />
        <circle className="vs-twinkle" cx="132" cy="188" r="1" /><circle className="vs-twinkle" cx="205" cy="66" r="1" /><circle className="vs-twinkle" cx="229" cy="114" r=".8" />
      </g>
    </svg>
  )
}
