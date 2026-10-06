import { Camera, CheckCircle2, ClipboardPaste, ImageUp, Save } from 'lucide-react'
import example from '../assets/help/stats-example.webp'
import Modal from './Modal'

const SEEN_KEY = '7kn-stats-help-seen'
/** เคยเห็นวิธีใช้แล้วหรือยัง (เบราว์เซอร์นี้) — เปิดให้อัตโนมัติแค่ครั้งแรก */
export const helpSeen = () => { try { return localStorage.getItem(SEEN_KEY) === '1' } catch { return true } }
export const markHelpSeen = () => { try { localStorage.setItem(SEEN_KEY, '1') } catch { /* ไม่มี storage ก็ไม่เป็นไร */ } }

const STEPS = [
  {
    icon: Camera,
    title: 'เปิดหน้าข้อมูลฮีโร่ในเกม',
    body: 'กดที่ตัวละครให้ขึ้นหน้าต่างที่มีสเตตัส 2 คอลัมน์ แบบในรูปตัวอย่าง · ตั้งเกมเป็นภาษาไทยหรืออังกฤษก็ได้',
  },
  {
    icon: ImageUp,
    title: 'แคปหน้าจอ',
    body: 'PC: กด Win + Shift + S แล้วลากครอบ (หรือ PrtSc ทั้งจอ) · มือถือ: แคปจอตามปกติ · ไม่ต้องครอปก็ได้ แต่อย่าให้มีอะไรบังชื่อหรือตัวเลข',
  },
  {
    icon: ClipboardPaste,
    title: 'ใส่รูปเข้าเว็บ',
    body: 'กดกรอบ "เลือกรูป" · ลากไฟล์มาวาง · หรือถ้าเพิ่งแคปบน PC กด Ctrl + V วางได้เลย — รอสักครู่ เว็บจะอ่านตัวเลขและชื่อฮีโร่ให้',
  },
  {
    icon: CheckCircle2,
    title: 'เช็กก่อนใส่',
    body: 'ดูว่าเลือกฮีโร่ถูกตัว (กรอบสีทอง) และตัวเลขตรงกับในเกม — ผิดช่องไหนพิมพ์แก้ได้เลย · ถ้าภาพเป็นตัวที่ไม่อยู่ในทีม เว็บจะเตือน และมีปุ่มเพิ่มตัวนั้นเข้าทีม (ทีมยังไม่ครบ 3)',
  },
  {
    icon: Save,
    title: 'กด "ใส่สเตตัส" แล้วกดบันทึกของหน้านั้น',
    body: 'สเตตัสจะยังไม่ถูกบันทึกจนกดปุ่ม "บันทึก" ของทีม/แผนที่กำลังแก้',
  },
]

/** หน้าต่างวิธีใช้ "อ่านสเตตัสจากรูป" */
export default function StatsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} title="วิธีใช้: อ่านสเตตัสจากรูป" onClose={onClose}>
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <figure>
          <img src={example} alt="ตัวอย่างหน้าข้อมูลฮีโร่ในเกม" className="w-full rounded-xl border border-white/10" />
          <figcaption className="mt-1.5 text-center text-xs text-white/45">ตัวอย่างหน้าที่ต้องแคป — มีชื่อฮีโร่ + สเตตัสครบ 2 คอลัมน์</figcaption>
        </figure>
        <ol className="space-y-3">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/15 text-sm font-bold text-gold">{i + 1}</span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-semibold text-white/90"><Icon className="h-4 w-4 text-gold" /> {title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-white/60">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <p className="mt-4 rounded-lg bg-white/5 px-3 py-2 text-xs leading-relaxed text-white/50">
        💡 ภาพชัด ไม่เบลอ จะอ่านแม่นที่สุด · ครั้งแรกต้องโหลดตัวอ่านประมาณ 8MB (ครั้งต่อไปเร็วขึ้น) · รูปไม่ถูกส่งไปไหน อ่านในเครื่องคุณเท่านั้น
        · ถ้ายังมีช่องว่าง พิมพ์ค่าเองได้ หรือส่งข้อความใน "ข้อความที่อ่านได้" มาที่ช่องแจ้งบั๊กท้ายเว็บ
      </p>
      <button type="button" onClick={onClose} className="btn-gold mt-4 w-full py-2">เข้าใจแล้ว</button>
    </Modal>
  )
}
