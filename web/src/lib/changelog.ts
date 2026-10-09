/**
 * อัปเดตของเว็บ (ใหม่สุดอยู่บนสุด) — เพิ่มรายการใหม่ไว้บนสุดทุกครั้งที่ deploy ฟีเจอร์ที่ผู้ใช้ควรรู้
 * id ต้องไม่ซ้ำ (ใช้วันที่ + ตัวอักษร) · ผู้ใช้ที่ยังไม่เห็น id ล่าสุดจะเห็นป๊อปอัป "มีอะไรใหม่" 1 ครั้ง
 */
export type ChangelogEntry = {
  id: string
  date: string
  title: string
  items: { text: string; guide?: string }[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    id: '2026-10-08',
    date: '8 ต.ค. 2026',
    title: 'วิธีใช้ + กิลด์ทดลอง + เลื่อนหน้ากิลด์ลื่นขึ้น',
    items: [
      { text: 'ปุ่ม "วิธีใช้" ในหน้ากิลด์ ทีมเป้าหมาย และแผนวอร์ — บอกวิธีใช้เฉพาะหน้านั้น พร้อมปุ่มลองฝึกในกิลด์ทดลอง (กดได้ทุกอย่าง ไม่บันทึกจริง)' },
      { text: 'หน้าจดทีมศัตรูเบาลงและเลื่อนด้วยลูกกลิ้งเมาส์ได้ลื่นขึ้น แม้กิลด์จะมีหลายสิบทีม' },
      { text: 'แผนวอร์ (ทั้งแผนบุกและแผนกัน) ถามใส่สปีดทีมให้ตอนบันทึก ถ้าใส่ความเร็วโจมตีครบทุกตัว', guide: 'stats' },
      { text: 'หน้าคำนวณแต้มเบ็ดเสร็จบอกวันเวลาจบซีซัน และตราแรงค์คมขึ้น' },
      { text: 'ปุ่ม Discord มุมขวาล่าง สำหรับแจ้งบั๊กหรือเสนอฟีเจอร์', guide: 'contact' },
    ],
  },
  {
    id: '2026-10-07',
    date: '7 ต.ค. 2026',
    title: 'โหลดหน้ากิลด์เร็วขึ้น',
    items: [
      { text: 'เปิดกิลด์ที่เคยเข้าแล้วขึ้นทันที แล้วค่อยอัปเดตข้อมูลล่าสุดตามหลัง' },
      { text: 'แท็กหลัก (โจมตี เวทย์ ถึก) อยู่หน้าสุดเสมอ แท็กที่เพิ่มเองเรียงตามลำดับที่ใส่', guide: 'targets' },
    ],
  },
  {
    id: '2026-10-06',
    date: '6 ต.ค. 2026',
    title: 'พรีเซ็ต ทีมที่ชอบ และแผนบุกหลายบ้าน',
    items: [
      { text: 'กด 👍 ทีมแก้ที่ตีแล้วชนะ เก็บไว้ดูในหน้า "พรีเซ็ต & ทีมที่ชอบ" (ล็อกอิน Discord)' },
      { text: 'บันทึกทีมบุกเป็นพรีเซ็ตของตัวเอง ใช้ได้ทุกกิลด์ทุกเครื่อง' },
      { text: 'ไม้บุก 1 ไม้ใส่บ้านที่จะตีได้สูงสุด 3 บ้าน', guide: 'plans' },
      { text: 'อ่านสเตตัสจากรูปหน้าข้อมูลฮีโร่ในเกม และปุ่มใช้สเตตัสล่าสุดของตัวนั้น', guide: 'stats' },
      { text: 'ทีมศัตรูที่แก้ใน 24 ชม. มีจุดเขียว และทีมที่แก้ล่าสุดอยู่บนสุด', guide: 'targets' },
      { text: 'หน้าคำนวณแต้มสงครามเบ็ดเสร็จ' },
    ],
  },
]

export const LATEST_UPDATE = CHANGELOG[0]?.id ?? ''
const KEY = '7k-note:seen-update'

export function seenUpdate(): string | null {
  try { return localStorage.getItem(KEY) } catch { return LATEST_UPDATE }
}
export function markUpdateSeen() {
  try { localStorage.setItem(KEY, LATEST_UPDATE) } catch { /* ไม่มี storage ก็ไม่เป็นไร */ }
  window.dispatchEvent(new Event('7k-note:update-seen'))
}
/** อัปเดตที่ผู้ใช้ยังไม่เห็น (ใหม่กว่า id ที่เห็นล่าสุด) */
export function unseenUpdates(seen = seenUpdate()) {
  if (!seen) return CHANGELOG.slice(0, 1)
  const i = CHANGELOG.findIndex((c) => c.id === seen)
  return i < 0 ? CHANGELOG.slice(0, 1) : CHANGELOG.slice(0, i)
}
