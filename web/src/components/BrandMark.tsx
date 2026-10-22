/** โลโก้ดาว ✦ ในกรอบโล่ — วาดเป็น SVG ไม่ใช้ตัวอักษร ✦
 *  (ฟอนต์ Kanit ไม่มีตัว ✦ → แต่ละเครื่องไปยืมฟอนต์ระบบ: ไอแพด/ไอโฟนดาวเล็กและจมลงล่างกรอบ) */
export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor">
        <path d="M8 0.5 9.6 6.4 15.5 8 9.6 9.6 8 15.5 6.4 9.6 0.5 8 6.4 6.4Z" />
      </svg>
    </span>
  )
}
