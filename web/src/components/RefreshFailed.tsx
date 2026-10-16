import { RefreshCw, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { tx } from '../lib/i18n'

/**
 * โหลดข้อมูลกิลด์ใหม่ไม่สำเร็จ (เน็ตสะดุด/ออฟไลน์) แต่มีข้อมูลบนจออยู่แล้ว → ป้ายเล็กมุมล่าง แทนการเปลี่ยนทั้งหน้าเป็น "ไม่พบ"
 * (เดิม: กำลังแก้ทีม/แผนอยู่ แล้วโหลดเบื้องหลังพลาดครั้งเดียว หน้ากลายเป็น error → ผู้ใช้กดรีเฟรช → ร่างหาย)
 */
export default function RefreshFailed() {
  const [gid, setGid] = useState<string | null>(null)
  useEffect(() => {
    const onFail = (e: Event) => setGid((e as CustomEvent<string>).detail)
    // โหลดสำเร็จรอบไหนก็ได้ (หรือเปลี่ยนหน้า) → ซ่อนป้าย
    const onOk = () => setGid(null)
    window.addEventListener('7knote:refresh-failed', onFail)
    window.addEventListener('7knote:refresh-ok', onOk)
    return () => { window.removeEventListener('7knote:refresh-failed', onFail); window.removeEventListener('7knote:refresh-ok', onOk) }
  }, [])
  if (!gid) return null
  return createPortal(
    <div role="status" data-testid="refresh-failed" className="fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
      <div className="panel flex items-center gap-2 px-3 py-2 text-sm shadow-xl">
        <span className="text-white/80">{tx('โหลดข้อมูลล่าสุดไม่สำเร็จ — ข้อมูลบนจออาจไม่ใช่ล่าสุด')}</span>
        <button type="button" onClick={() => { window.dispatchEvent(new CustomEvent('7knote:changed', { detail: gid })); setGid(null) }}
          className="pill flex items-center gap-1 px-3 py-1 text-gold hover:border-gold">
          <RefreshCw className="h-3.5 w-3.5" />{tx('ลองใหม่')}
        </button>
        <button type="button" onClick={() => setGid(null)} aria-label={tx('ปิด')} className="text-white/50 hover:text-white"><X className="h-4 w-4" /></button>
      </div>
    </div>,
    document.body,
  )
}
