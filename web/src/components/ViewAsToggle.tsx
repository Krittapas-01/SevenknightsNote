import { Eye, Pencil } from 'lucide-react'
import { setViewer, useViewer } from '../lib/prefs'
import { useSlidePill } from '../lib/slide'
import { tx } from '../lib/i18n'

/** สลับมุมมองของกิลด์นี้: คนแก้ (เห็นปุ่มแก้) / คนดู (เห็นแบบคนในกิลด์ที่ไม่มีสิทธิ์แก้) — โชว์เฉพาะคนที่แก้ได้ */
export default function ViewAsToggle({ gid }: { gid: string }) {
  const viewer = useViewer(gid)
  const p = useSlidePill(viewer ? 'view' : 'edit')
  const btn = (on: boolean) => `relative z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors ${on ? 'font-semibold text-ink' : 'text-white/70 hover:bg-white/10'}`
  return (
    <div ref={p.box} className="pill relative flex p-0.5" title={tx('ดูหน้ากิลด์แบบที่คนในกิลด์เห็น (ซ่อนปุ่มแก้ทั้งหมด)')}>
      <span aria-hidden className="slide-pill" style={p.pill} />
      <button ref={p.item('edit')} type="button" onClick={() => setViewer(gid, false)} className={btn(!viewer)}><Pencil className="h-4 w-4" />{' '}{tx('คนแก้')}</button>
      <button ref={p.item('view')} type="button" onClick={() => setViewer(gid, true)} className={btn(viewer)}><Eye className="h-4 w-4" />{' '}{tx('คนดู')}</button>
    </div>
  )
}

/** แถบเตือนใต้หัวเว็บ: กำลังอยู่ในมุมมองคนดู (ทุกหน้าของกิลด์นี้) */
export function ViewerBar({ gid }: { gid: string }) {
  const viewer = useViewer(gid)
  if (!viewer) return null
  return (
    <div className="border-b border-sky-300/30 bg-sky-500/15 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-1.5 text-sm text-sky-100">
        <Eye className="h-4 w-4 shrink-0" />{' '}{tx('กำลังดูแบบคนดู — ปุ่มแก้ถูกซ่อนไว้')}
        <button type="button" onClick={() => setViewer(gid, false)} className="ml-auto rounded-full border border-sky-200/50 px-3 py-0.5 text-xs font-semibold hover:bg-sky-400/20">
          {tx('กลับเป็นคนแก้')}
        </button>
      </div>
    </div>
  )
}
