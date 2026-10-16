import { Coffee, ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import Modal from './Modal'
import { EN, L } from '../lib/i18n'

/**
 * ช่องทางสนับสนุนค่าเซิร์ฟเวอร์ (เว็บยังฟรีทุกฟีเจอร์)
 * เปิดจากเมนู ☰ / footer ผ่าน openSupport() — ไม่มีป๊อปอัปเด้งเอง
 */
const LINKS = {
  easydonate: 'https://ezdn.app/krittapassu',
  kofi: 'https://ko-fi.com/krittapassu',
}
const EVENT = '7k-note:support'
export const openSupport = () => window.dispatchEvent(new Event(EVENT))

export function SupportModal() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const on = () => setOpen(true)
    window.addEventListener(EVENT, on)
    return () => window.removeEventListener(EVENT, on)
  }, [])
  const th = (
    <Option key="th" href={LINKS.easydonate} flag="🇹🇭" name="EasyDonate"
      sub={L('พร้อมเพย์ · TrueMoney · สำหรับคนไทย', 'PromptPay · TrueMoney · for Thai players')} />
  )
  const intl = (
    <Option key="intl" href={LINKS.kofi} flag="🌏" name="Ko-fi"
      sub={L('บัตร · PayPal · จากต่างประเทศ', 'Card · PayPal · worldwide')} />
  )
  return (
    <Modal open={open} onClose={() => setOpen(false)}
      title={<span className="flex items-center gap-2"><Coffee className="h-5 w-5 text-gold" />{' '}{L('สนับสนุน 7K Note', 'Support 7K Note')}</span>}>
      <div data-testid="support-modal">
        <p className="text-sm leading-relaxed text-white/75">
          {L('7K Note ใช้ฟรีทุกฟีเจอร์ — ถ้าอยากช่วยค่าเซิร์ฟเวอร์และเวลาทำฟีเจอร์ใหม่ เลือกช่องทางได้เลย ขอบคุณมากครับ 🙏',
            'Every feature of 7K Note is free — if you\'d like to help with server costs and new features, pick a way below. Thank you! 🙏')}
        </p>
        <div className="mt-4 grid gap-3">{EN ? [intl, th] : [th, intl]}</div>
        <p className="mt-4 text-xs text-white/40">
          {L('ไม่มีฟีเจอร์ล็อก · เว็บแฟนเมด ไม่เกี่ยวข้องกับ Netmarble', 'Nothing is locked · fan-made, not affiliated with Netmarble')}
        </p>
      </div>
    </Modal>
  )
}

function Option({ href, flag, name, sub }: { href: string; flag: string; name: string; sub: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer"
      className="group flex items-center gap-3 rounded-2xl border border-gold/30 bg-black/20 px-4 py-3 transition hover:border-gold hover:bg-gold/5">
      <span className="text-2xl" aria-hidden>{flag}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-gold">{name}</span>
        <span className="block text-xs text-white/55">{sub}</span>
      </span>
      <ExternalLink className="h-4 w-4 shrink-0 text-white/40 group-hover:text-gold" />
    </a>
  )
}
