import { Bug, Check, Copy, Lightbulb, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { tx } from '../lib/i18n'

/** ชื่อ Discord ผู้พัฒนา — ลิงก์ตรงไม่ได้ เลยให้กดคัดลอก */
const DISCORD = 'bruhh_exe'

/** โลโก้ Discord (simple-icons, CC0) */
export function DiscordIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
    </svg>
  )
}

/** ปุ่มลอยมุมขวาล่าง: แจ้งบั๊ก / ขอฟีเจอร์ / คำแนะนำ (ซ่อนเองตอนมีแถบล่าง เช่น แถบอัศวิน) */
export default function ContactFab() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const out = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', out)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', out); document.removeEventListener('keydown', esc) }
  }, [open])

  const copy = () => {
    navigator.clipboard?.writeText(DISCORD).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  return (
    <div ref={box} data-noexport className="contact-fab fixed right-4 z-40 flex flex-col items-end gap-3 sm:right-6"
      style={{ bottom: 'calc(16px + env(safe-area-inset-bottom))' }}>
      {open && (
        <div role="dialog" aria-label={tx('ติดต่อผู้พัฒนา')} className="contact-card panel panel-gold w-[min(20rem,calc(100vw-2rem))] p-4 text-sm">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-gold/50 bg-gold/15 text-gold">
              <DiscordIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white">{tx('มีอะไรบอกได้เลย')}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-white/60">{tx('ทักมาทาง Discord ตอบเร็วที่สุด')}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label={tx('ปิด')} className="-mr-1 -mt-1 rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          <ul className="mt-3 space-y-1.5 text-xs text-white/75">
            <li className="flex items-center gap-2"><Bug className="h-3.5 w-3.5 text-red-300" />{' '}{tx('เจอบั๊ก / หน้าเว็บแสดงผิด')}</li>
            <li className="flex items-center gap-2"><Lightbulb className="h-3.5 w-3.5 text-gold" />{' '}{tx('อยากได้ฟีเจอร์ / มีคำแนะนำ')}</li>
          </ul>

          <button type="button" onClick={copy}
            className="mt-3 flex w-full items-center justify-between gap-2 rounded-xl border border-gold/40 bg-black/25 px-3 py-2.5 text-left transition hover:border-gold/70 hover:bg-gold/10">
            <span className="min-w-0">
              <span className="block text-[11px] text-white/55">Discord</span>
              <span className="block truncate font-semibold text-white">{DISCORD}</span>
            </span>
            <span className={`flex shrink-0 items-center gap-1 text-xs font-semibold ${copied ? 'text-emerald-300' : 'text-gold'}`}>
              {copied ? <><Check className="h-4 w-4" />{' '}{tx('คัดลอกแล้ว')}</> : <><Copy className="h-4 w-4" />{' '}{tx('คัดลอก')}</>}
            </span>
          </button>
          <p className="mt-2 text-center text-[11px] text-white/40">{tx('คัดลอกชื่อแล้วเพิ่มเพื่อนใน Discord')}</p>
        </div>
      )}

      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={tx('ติดต่อ / แจ้งบั๊ก')}
        title={tx('ติดต่อ / แจ้งบั๊ก')}
        className="contact-fab-btn grid place-items-center rounded-full border border-gold/60 text-gold shadow-[0_8px_24px_#05091599,0_0_18px_#f4d58d22,inset_0_0_0_3px_#0a102580] transition hover:scale-105 hover:border-gold hover:text-[#fff1c9]"
        style={{ width: 52, height: 52, background: 'radial-gradient(circle at 35% 30%, #2c3a58, #141c2e 75%)' }}>
        {open ? <X className="h-5 w-5" /> : <DiscordIcon className="h-6 w-6" />}
      </button>
    </div>
  )
}
