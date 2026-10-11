import { X } from 'lucide-react'
import { useState } from 'react'
import { PRESET_TAGS } from '../data/heroes'
import { isMainTag, sortTags, tagStyle, tagText } from '../lib/tags'
import { tx, L } from '../lib/i18n'

export const MAX_TAGS = 5

/** แท็กบ้านศัตรู: ชิปที่เลือกแล้ว + แท็กสำเร็จรูป + พิมพ์เอง (Enter) · สูงสุด 5 */
export default function TagEditor({ tags, onChange, className = '' }: { tags: string[]; onChange: (tags: string[]) => void; className?: string }) {
  const [input, setInput] = useState('')
  const add = (t: string) => {
    const v = t.trim().slice(0, 20)
    if (!v || tags.includes(v)) return
    // กายภาพ / เวท / แทงก์ เลือกได้อย่างเดียว — เลือกอันใหม่ = แทนอันเดิม
    const rest = isMainTag(v) ? tags.filter((x) => !isMainTag(x)) : tags
    if (rest.length >= MAX_TAGS) return
    onChange(sortTags([...rest, v]))
    setInput('')
  }
  return (
    <div className={className}>
      <p className="text-sm text-white/60">{tx('แท็ก (สูงสุด')}{' '}{MAX_TAGS}) <span className={`text-xs ${tags.some(isMainTag) ? 'text-white/40' : 'font-semibold text-amber-300'}`}>{tx('· ต้องเลือกประเภท 1 อย่าง: กายภาพ / เวท / แทงก์')}</span></p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {tags.map((t) => (
          <span key={t} className="tag-pop flex items-center gap-1 rounded-full py-0.5 pl-3 pr-1 text-sm font-semibold" style={tagStyle(t)}>
            {tagText(t)}
            <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} className="rounded-full p-0.5 hover:bg-white/10" aria-label={L(`เอาแท็ก ${tagText(t)} ออก`, `Remove tag ${tagText(t)}`)}>
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        {PRESET_TAGS.filter((t) => !tags.includes(t)).map((t) => (
          <button type="button" key={t} onClick={() => add(t)} className="rounded-full border border-dashed border-white/25 px-3 py-0.5 text-sm text-white/60 hover:border-sky-300 hover:text-sky-100">
            + {tagText(t)}
          </button>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(input) } }}
          placeholder={tx('แท็กอื่น + Enter')}
          className="w-32 rounded-full border border-white/15 bg-black/20 px-3 py-0.5 text-sm outline-none focus:border-sky-300"
        />
      </div>
    </div>
  )
}
