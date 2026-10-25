/**
 * สถิติการใช้ปุ่ม/ฟีเจอร์ (Workers Analytics Engine) — ใช้ร่วมกันทั้งเว็บและ API
 * นับแค่ "จำนวนครั้ง" ของรายการข้างล่างนี้เท่านั้น ไม่ส่ง URL/ชื่อกิลด์/ข้อมูลผู้ใช้ (ลิงก์แชร์มี ?key= รหัสแก้ไข)
 * เพิ่มรายการใหม่: ใส่ที่นี่ (+ ชื่อที่แสดงใน USAGE_LABELS) แล้วเรียก track() ในเว็บ
 */
export const USAGE_EVENTS = ['ocr', 'announce', 'export_image', 'atk', 'biscuit', 'ruby', 'totalwar', 'packs'] as const
export type UsageEvent = (typeof USAGE_EVENTS)[number]
/** ส่งมาครั้งเดียวได้ไม่เกินเท่านี้ต่อรายการ (กันตัวเลขปลอมก้อนใหญ่) */
export const USAGE_MAX_COUNT = 50

/** [ไทย, อังกฤษ] สำหรับตารางในหน้าแอดมิน */
export const USAGE_LABELS: Record<UsageEvent, [string, string]> = {
  ocr: ['อ่านค่าจากรูป (OCR)', 'Read stats from image (OCR)'],
  announce: ['โพสต์ประกาศ (ส่ง Discord ถ้าเชื่อมไว้)', 'Post announcement (to Discord if linked)'],
  export_image: ['บันทึกรูปทีม/แผน', 'Save team/plan image'],
  atk: ['ใช้หน้าเทียบพลังโจมตี', 'Used attack compare'],
  biscuit: ['ใช้หน้าบิสกิต', 'Used biscuit check'],
  ruby: ['ใช้หน้าคำนวณรูบี้', 'Used ruby calculator'],
  totalwar: ['ใช้หน้าสงครามเบ็ดเสร็จ', 'Used Total War calculator'],
  packs: ['เปิดหน้าเช็กแพ็ค', 'Opened pack value checker'],
}
