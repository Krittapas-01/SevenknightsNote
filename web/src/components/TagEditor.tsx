import { X } from 'lucide-react'
import { useState } from 'react'
import { PRESET_TAGS } from '../data/heroes'
import { sortTags, tagStyle } from '../lib/tags'

export const MAX_TAGS = 5

/** แท็กทีมเป้าหมาย: ชิปที่เลือกแล้ว + แท็กสำเร็จรูป + พิมพ์เอง (Enter) · สูงสุด 5 */
export default function TagEditor({ tags, onChange, className = '' }: { tags: string[]; onChange: (tags: string[]) => void; className?: string }) {
  const [input, setInput] = useState('')
  const add = (t: string) => {
    const v = t.trim().slice(0, 20)
    if (!v || tags.includes(v) || tags.length >= MAX_TAGS) return
    onChange(sortTags([...tags, v]))
    setInput('')
  }
  return (
    <div className={className}>
      <p className="text-sm text-white/60">แท็ก (สูงสุด {MAX_TAGS})</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {tags.map((t) => (
          <span key={t} className="flex items-center gap-1 rounded-full py-0.5 pl-3 pr-1 text-sm font-semibold" style={tagStyle(t)}>
            {t}
            <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} className="rounded-full p-0.5 hover:bg-white/10" aria-label={`เอาแท็ก ${t} ออก`}>
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        {PRESET_TAGS.filter((t) => !tags.includes(t)).map((t) => (
          <button type="button" key={t} onClick={() => add(t)} className="rounded-full border border-dashed border-white/25 px-3 py-0.5 text-sm text-white/60 hover:border-sky-300 hover:text-sky-100">
            + {t}
          </button>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(input) } }}
          placeholder="แท็กอื่น + Enter"
          className="w-32 rounded-full border border-white/15 bg-black/20 px-3 py-0.5 text-sm outline-none focus:border-sky-300"
        />
      </div>
    </div>
  )
}
