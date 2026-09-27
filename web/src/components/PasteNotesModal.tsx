import { useMemo, useState } from 'react'
import { baseName, getUnit } from '../data/heroes'
import { parseNotes } from '../lib/pasteNotes'
import type { Parsed } from '../lib/pasteNotes'
import Modal from './Modal'

/** วางข้อความโน้ตทั้งแผน → ดูตัวอย่างก่อนใส่ */
export default function PasteNotesModal({ open, onClose, onApply }: { open: boolean; onClose: () => void; onApply: (p: Parsed) => void }) {
  const [text, setText] = useState('')
  const parsed = useMemo(() => parseNotes(text), [text])
  const name = (id: string) => baseName(getUnit(id)?.name ?? id)
  return (
    <Modal open={open} title="วางโน้ตจากข้อความ" onClose={onClose} wide>
      <p className="mb-2 text-sm text-white/60">
        แบ่งทีมด้วย <b>Team 1</b>, <b>Team 2</b>… · บรรทัด <b>ชื่อฮีโร่ : รายละเอียด</b> = ของรายตัว · บรรทัดอื่น = โน้ตทีม
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={14}
          placeholder={'Team 1  ถ้ามี เกลลิดัส c6 ใช้แทนไอลีนได้\nแร็ดกริด : บล็อก 78 / ต้าน เท่าที่ได้\nอาริส : บล็อก 78 / เข้าเป้า เท่าที่ได้\nTeam 2 ขอแหวนดีที่สุดให้ทีมนี้\nยุนกอน : คริ 50 / จุด 50'}
          className="w-full rounded-xl border border-white/15 bg-black/20 p-3 text-sm outline-none focus:border-gold" />
        <div className="max-h-[22rem] space-y-3 overflow-y-auto text-sm">
          {parsed.teams.length === 0 && <p className="text-white/40">ตัวอย่างจะขึ้นตรงนี้</p>}
          {parsed.teams.map((t, i) => (
            <div key={i} className="rounded-xl bg-black/20 p-3">
              <div className="font-semibold text-gold">ไม้ {t.index}{t.index > 5 && <span className="ml-2 text-red-300">(เกิน 5 ไม้ — ข้าม)</span>}</div>
              {t.heroes.map((h, j) => (
                <div key={j} className="mt-1">
                  <span className="font-semibold">{name(h.id)}</span>
                  {norm(h.raw) !== norm(name(h.id)) && <span className="ml-1 text-xs text-amber-300">(จาก “{h.raw}”)</span>}
                  <span className="text-white/70"> — {h.text || '—'}</span>
                </div>
              ))}
              {t.notes.map((n, j) => <div key={j} className="mt-1 text-white/60">! {n}</div>)}
            </div>
          ))}
          {parsed.unknown.length > 0 && (
            <p className="text-amber-200">หาฮีโร่ไม่เจอ (ใส่เป็นโน้ตแทน): {parsed.unknown.join(', ')}</p>
          )}
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button disabled={!parsed.teams.length} onClick={() => { onApply(parsed); setText('') }} className="btn-gold flex-1 py-2">ใส่ลงแผน</button>
        <button onClick={onClose} className="pill px-5 py-2">ยกเลิก</button>
      </div>
      <p className="mt-2 text-xs text-white/45">ใส่ในทีมหลัก (แผนบุก) หรือทางเลือกแรก (แผนกัน) · ไม้ที่ยังไม่มีทีม จะเอาฮีโร่ในโน้ตมาจัดทีมให้ · ยังไม่บันทึกจนกด “บันทึกแผน”</p>
    </Modal>
  )
}
const norm = (s: string) => s.replace(/\s+/g, '')
