import { Check, Globe, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { LANG, L, setLang } from '../lib/i18n'
import type { LangPref } from '../lib/prefs'

const OPTIONS: [LangPref, string][] = [['th', 'ไทย'], ['en', 'English']]
const ASKED = '7k-note:lang-asked'

/** มีงานค้างที่ยังไม่บันทึกไหม (กำลังจัดทีม/แก้แผน) — เปลี่ยนภาษาแล้วหน้าโหลดใหม่ งานจะหาย */
const hasUnsaved = () => !!document.querySelector('[data-tour-editing], [data-tour="plan-save"]')
const markAsked = () => { try { localStorage.setItem(ASKED, '1') } catch { /* ไม่มี storage */ } }

/** ปุ่มเปลี่ยนภาษาบนหัวเว็บ (🌐 TH/EN) — กดแล้วเลือกภาษา · มีงานค้าง = ถามก่อน */
export default function LangButton() {
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState<LangPref | null>(null)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', down)
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('pointerdown', down); document.removeEventListener('keydown', key) }
  }, [open])
  useEffect(() => { if (!open) setConfirm(null) }, [open])

  const pick = (lang: LangPref) => {
    if (lang === LANG) return setOpen(false)
    if (hasUnsaved() && confirm !== lang) return setConfirm(lang)
    markAsked()
    setLang(lang)
  }

  return (
    <div ref={box} className="relative mr-2">
      <button type="button" data-testid="lang-button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu"
        title="ภาษา / Language" aria-label="ภาษา / Language"
        className={`flex h-9 shrink-0 items-center gap-1 rounded-lg border px-2 text-sm font-semibold ${open ? 'border-gold text-gold' : 'border-white/20 text-white/80 hover:border-gold hover:text-gold'}`}>
        <Globe className="h-5 w-5" />
        <span className="hidden sm:inline">{LANG === 'en' ? 'EN' : 'TH'}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-56"><div role="menu" className="panel p-1.5 shadow-xl">
          {OPTIONS.map(([v, label]) => (
            <button key={v} type="button" role="menuitemradio" aria-checked={LANG === v} onClick={() => pick(v)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${LANG === v ? 'font-semibold text-gold' : 'text-white/80 hover:bg-white/10'}`}>
              <span className="w-4">{LANG === v && <Check className="h-4 w-4" />}</span>{label}
            </button>
          ))}
          {confirm && (
            <div className="mt-1 rounded-lg border border-amber-400/30 bg-amber-500/10 p-2.5 text-xs text-amber-100">
              {L('มีงานที่ยังไม่บันทึก — เปลี่ยนภาษาแล้วหน้าจะโหลดใหม่ งานที่แก้อยู่จะหาย', 'You have unsaved changes — switching reloads the page and they will be lost.')}
              <div className="mt-2 flex justify-end gap-1.5">
                <button type="button" onClick={() => setConfirm(null)} className="rounded-full px-3 py-1 text-white/70 hover:bg-white/10">{L('ยกเลิก', 'Cancel')}</button>
                <button type="button" onClick={() => pick(confirm)} className="rounded-full bg-amber-400/90 px-3 py-1 font-semibold text-ink hover:bg-amber-300">{L('เปลี่ยนเลย', 'Switch anyway')}</button>
              </div>
            </div>
          )}
        </div></div>
      )}
    </div>
  )
}

/**
 * ครั้งแรกที่เข้า: เครื่องไม่ได้ตั้งภาษาไทย และยังไม่เคยเลือกภาษาเอง → ถามครั้งเดียวว่าจะใช้อังกฤษไหม
 * (ไม่เปลี่ยนเอง — คนไทยหลายคนตั้งเครื่องเป็นอังกฤษ)
 */
export function LangSuggest() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (LANG === 'en') return
    try {
      if (localStorage.getItem(ASKED)) return
      if ('lang' in JSON.parse(localStorage.getItem('7k-note:prefs') || '{}')) return // เคยเลือกภาษาเองแล้ว
    } catch { return }
    const langs = navigator.languages?.length ? navigator.languages : [navigator.language]
    if (langs.some((l) => l?.toLowerCase().startsWith('th'))) return
    // รอให้หน้าต่างอื่น (เช่น "มีอะไรใหม่") ปิดก่อน แล้วค่อยถาม
    let t = 0
    const tryShow = () => { if (document.querySelector('[data-app-modal]')) t = window.setTimeout(tryShow, 700); else setShow(true) }
    t = window.setTimeout(tryShow, 1200)
    return () => clearTimeout(t)
  }, [])
  if (!show) return null
  const close = () => { markAsked(); setShow(false) }
  return (
    // .panel ตั้ง position: relative → ใช้กล่องนอกเป็นตัว fixed
    <div className="fixed bottom-4 left-4 right-20 z-50 max-w-md sm:right-auto">
    <div role="dialog" aria-label="Language" data-testid="lang-suggest" className="wiz-arrive panel panel-gold p-4 shadow-2xl">
      <button type="button" onClick={close} aria-label="Close" className="absolute right-2 top-2 rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
      <p className="flex items-center gap-2 pr-6 font-semibold text-gold"><Globe className="h-5 w-5 shrink-0" /> This site is in Thai</p>
      <p className="mt-1 text-sm text-white/70">Switch to English? You can change it anytime with the 🌐 button at the top.</p>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={close} className="rounded-full px-4 py-1.5 text-sm text-white/70 hover:bg-white/10">ใช้ภาษาไทยต่อ</button>
        <button type="button" onClick={() => { markAsked(); setLang('en') }} className="btn-gold px-4 py-1.5 text-sm">Switch to English</button>
      </div>
    </div>
    </div>
  )
}
