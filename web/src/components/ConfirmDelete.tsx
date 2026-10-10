import { Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { tx } from '../lib/i18n'

/**
 * ปุ่มลบแบบกด 2 ครั้ง (แทนหน้าต่าง confirm ของเบราว์เซอร์) — ครั้งแรกเปลี่ยนเป็นปุ่มแดง "กดอีกครั้งเพื่อลบ"
 * กดที่อื่น / รอ 4 วิ = ยกเลิก · แบบเดียวกับลบบ้าน/ลบไม้ในแผน
 */
export default function ConfirmDelete({ onConfirm, label = tx('ลบ'), confirmLabel = tx('กดอีกครั้งเพื่อลบ'), disabled, className = '' }: {
  onConfirm: () => void
  label?: string
  confirmLabel?: string
  disabled?: boolean
  className?: string
}) {
  const [ask, setAsk] = useState(false)
  useEffect(() => {
    if (!ask) return
    const t = setTimeout(() => setAsk(false), 4000)
    return () => clearTimeout(t)
  }, [ask])
  return (
    <button type="button" disabled={disabled}
      onClick={() => { if (!ask) return setAsk(true); setAsk(false); onConfirm() }}
      onBlur={() => setAsk(false)}
      className={`flex items-center gap-1 rounded-full px-3 py-2 text-sm transition ${ask ? 'bg-red-600 font-semibold text-white' : 'text-red-300 hover:bg-red-500/15'} ${className}`}>
      <Trash2 className="h-4 w-4" /> {ask ? confirmLabel : label}
    </button>
  )
}
