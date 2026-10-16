/**
 * ล็อกการเลื่อนหน้าหลัง ตอนเปิดหน้าต่าง/ชั้นเต็มจอ — นับจำนวน: เปิดซ้อนกันได้ ปลดล็อกเมื่อปิดครบทุกอัน
 * ล็อกที่ <html> ไม่ใช่ <body>: html มี overflow-x: clip (index.css) → ค่า overflow ของ body ไม่ถูกส่งไปที่หน้าจอ
 * ล็อกที่ body = หน้าหลังยังเลื่อนได้ + body กลายเป็นกล่องเลื่อนเอง หัวเว็บ (sticky) เลยหลุดหายไปตอนเปิดหน้าต่าง
 * (html มี scrollbar-gutter: stable → แถบเลื่อนหายตอนล็อก หน้าไม่ขยับซ้าย-ขวา)
 * @returns ฟังก์ชันปลดล็อก (เรียกซ้ำได้ ปลดแค่ครั้งเดียว)
 */
let locks = 0

export function lockScroll() {
  if (locks++ === 0) document.documentElement.style.overflow = 'hidden'
  let released = false
  return () => {
    if (released) return
    released = true
    locks = Math.max(0, locks - 1)
    if (!locks) document.documentElement.style.overflow = ''
  }
}

/** มีหน้าต่างเปิดล็อกอยู่ไหม (lib/smoothWheel ใช้: ลูกกลิ้งเลื่อนหน้าด้วยโค้ด ซึ่ง overflow: hidden กันไม่ได้) */
export const isScrollLocked = () => locks > 0
