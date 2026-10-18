/**
 * ภาษา (ตั้งค่า → ภาษา) — ไทย / English
 * เปลี่ยนภาษาแล้วโหลดหน้าใหม่ ข้อความทั้งเว็บจึงอ่านค่าครั้งเดียวตอนเปิดเว็บได้ (ไม่ต้องทำ state)
 * ใช้: L('บันทึก', 'Save')
 */
import { getPrefs, setPrefs, type LangPref } from './prefs'
import EN_DICT from './en.json'

export const LANG: LangPref = getPrefs().lang === 'en' ? 'en' : 'th'
export const EN = LANG === 'en'
/** ข้อความ 2 ภาษา: ไทย, อังกฤษ */
export const L = (th: string, en: string) => (EN ? en : th)
/** locale สำหรับวันที่/ตัวเลข */
export const LOCALE = EN ? 'en-GB' : 'th-TH'

export function setLang(lang: LangPref) {
  if (lang === LANG) return
  setPrefs({ lang })
  location.reload()
}
if (typeof document !== 'undefined') {
  document.documentElement.lang = LANG
  // ชื่อแท็บเบราว์เซอร์ (index.html เป็นภาษาไทย)
  if (EN) document.title = '7K Note — Guild War team notes'
}

const DICT = EN_DICT as Record<string, string>
const norm = (s: string) => s.replace(/\s+/g, ' ').trim()
/** แปลข้อความไทยเป็นอังกฤษจากพจนานุกรม (lib/en.json) — ไม่มีคำแปล = ใช้ไทยเดิม */
export const tx = (th: string) => (EN ? DICT[norm(th)] ?? th : th)
