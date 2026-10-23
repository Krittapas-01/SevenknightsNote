/** โลโก้ดาว ✦ ในกรอบโล่ — วาดเป็น SVG ไม่ใช้ตัวอักษร ✦
 *  (ฟอนต์ Kanit ไม่มีตัว ✦ → แต่ละเครื่องไปยืมฟอนต์ระบบ: ไอแพด/ไอโฟนดาวเล็กและจมลงล่างกรอบ)
 *  ทรงเลียนแบบ ✦ ที่เห็นบนคอม Windows: ปลายแหลม ตัวอ้วน ขอบเว้า */
export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
        <path d="M8 .2C10.2 5.8 10.2 5.8 15.8 8 10.2 10.2 10.2 10.2 8 15.8 5.8 10.2 5.8 10.2 .2 8 5.8 5.8 5.8 5.8 8 .2Z" />
      </svg>
    </span>
  )
}
