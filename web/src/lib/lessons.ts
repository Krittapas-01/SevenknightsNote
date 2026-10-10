/** บทเรียนในกิลด์ทดลอง: ภารกิจติ๊กเองจาก state ของกิลด์ทดลอง */
import { DEMO_WEBHOOK, type demoState } from './demo'
import { heroCount, planKind } from './types'

type S = NonNullable<ReturnType<typeof demoState>>
export type LessonKey = 'targets' | 'plans' | 'discord'
export type Mission = { title: string; how: string; done: (s: S) => boolean; copy?: string }

const mine = (s: S) => s.data.targets.filter((t) => !s.seeded.includes(t.id))
const attackPlans = (s: S) => s.data.plans.filter((p) => planKind(p.data) === 'attack')
const slots = (s: S) => attackPlans(s).flatMap((p) => p.data.slots)

export const LESSONS: Record<LessonKey, { title: string; intro: string; missions: Mission[] }> = {
  targets: {
    title: 'บ้านศัตรู',
    intro: 'ลองจดบ้านศัตรูที่เจอ พร้อมทีมที่ใช้ตีผ่าน',
    missions: [
      { title: 'เพิ่มบ้านศัตรูใหม่', how: 'แท็บ "บ้านศัตรู" → ปุ่ม "เพิ่มบ้านศัตรู" → จัดทีมของบ้านนั้น แล้วกด "บันทึก"', done: (s) => mine(s).length > 0 },
      { title: 'ใส่แท็กให้บ้านนั้น', how: 'ตอนจดบ้านศัตรู เลือกแท็ก กายภาพ / เวท / แทงก์ (หรือพิมพ์เอง) แล้วบันทึก', done: (s) => mine(s).some((t) => t.tags.length > 0) },
      { title: 'เพิ่มทีมแก้', how: 'เปิดทีมที่เพิ่งจด → "เพิ่มทีมแก้" → จัดทีมที่ใช้ตี แล้วกด "บันทึก"', done: (s) => mine(s).some((t) => t.counters.length > 0) },
      { title: 'ตั้งลำดับการใช้สกิลในทีมแก้', how: 'ตอนแก้ทีมแก้ แตะวงกลมดาวล่างสุด แล้วแตะสกิลตามลำดับ', done: (s) => mine(s).some((t) => t.counters.some((c) => c.skills.length > 0)) },
      { title: 'จดอุปกรณ์/ค่าความสามารถอย่างน้อย 1 ตัว', how: 'ใต้ทีมแก้ ส่วน "อุปกรณ์/ค่าความสามารถรายตัว" → อ่านค่าความสามารถจากรูป หรือเพิ่มอัศวินแล้วพิมพ์เอง', done: (s) => mine(s).some((t) => t.counters.some((c) => (c.heroNotes?.length ?? 0) > 0)) },
    ],
  },
  plans: {
    title: 'แผนสงคราม',
    intro: 'ลองวางแผนบุก 1 ไม้ แล้วประกาศให้ทั้งกิลด์ใช้',
    missions: [
      { title: 'สร้างแผนบุก', how: 'แท็บ "แผนสงคราม" → ปุ่ม "สร้างแผนบุก" → ตั้งชื่อ แล้วกด "บันทึกแผน"', done: (s) => attackPlans(s).length > 0 },
      { title: 'เลือกบ้านที่จะตีให้ไม้ 1', how: 'ในแผน กด "แก้ไข" → ไม้ 1 → "เลือกจากบ้านศัตรูที่จดไว้" (ทีมแก้ของบ้านนั้นจะมาด้วย)', done: (s) => slots(s).some((x) => !!x.vs && heroCount(x.vs) > 0) },
      { title: 'มีทีมแก้ในไม้นั้น', how: 'เลือกบ้านจากที่จดไว้จะได้ทีมแก้มาเลย หรือกด "จัดทีมเอง" แล้วบันทึกแผน', done: (s) => slots(s).some((x) => x.options.some((o) => heroCount(o.team) > 0)) },
      { title: 'เพิ่มบ้านที่ 2 ให้ไม้เดียวกัน', how: 'ไม้นี้ตีได้หลายบ้าน: กด "เพิ่มบ้าน" ข้างแท็บบ้าน แล้วเลือกบ้านอีกหลัง', done: (s) => slots(s).some((x) => (x.alts?.length ?? 0) > 0) },
      { title: 'ประกาศให้กิลด์ใช้แผนนี้', how: 'กลับหน้ากิลด์ → ปุ่ม "ประกาศ" → เลือกแผนที่ให้ใช้ แล้วกดประกาศ', done: (s) => s.data.announcements.some((a) => !!a.planId) },
    ],
  },
  discord: {
    title: 'เชื่อม Discord',
    intro: 'ลองเชื่อมห้อง Discord จำลอง — ข้อความจะขึ้นในกล่องด้านล่างแทนการส่งจริง',
    missions: [
      { title: 'ใส่ลิงก์ Webhook', how: 'หน้ากิลด์ แถวตารางสงคราม → ไอคอน "เชื่อม Discord" → วางลิงก์ตัวอย่างด้านล่าง แล้วบันทึก', done: (s) => !!s.data.discord?.connected, copy: DEMO_WEBHOOK },
      { title: 'ส่งข้อความทดสอบ', how: 'ในหน้าต่างเชื่อม Discord กด "ส่งข้อความทดสอบ"', done: (s) => s.sent.some((m) => m.kind === 'test') },
      { title: 'ตั้งยศที่จะแท็กตอนประกาศ', how: 'หัวข้อ "แท็กใครตอนประกาศ" เลือก @here / @everyone หรือ "ยศ" แล้วใส่ Role ID (เช่นอันด้านล่าง) แล้วกดบันทึก', done: (s) => !!s.data.discord?.mention, copy: '123456789012345678' },
      { title: 'ตั้งยศที่แก้แผนได้', how: 'หัวข้อ "ยศใน Discord" ใส่ Server ID (เช่นอันด้านล่าง) → "เพิ่มยศ" ใส่ Role ID ติ๊ก "แก้แผนได้" แล้วกดบันทึก', done: (s) => (s.data.discord?.editRoles.length ?? 0) > 0 && !!s.data.discord?.serverId, copy: '987654321098765432' },
      { title: 'เปิดประกาศอัตโนมัติ 07:00', how: 'ไอคอนเฟือง "แก้ตารางสงคราม" → เปิด "ประกาศวันใหม่อัตโนมัติ 07:00" แล้วบันทึก', done: (s) => !!s.data.autoAnnounce },
      { title: 'ประกาศ แล้วดูข้อความเข้า Discord', how: 'ปุ่ม "ประกาศ" บนหน้ากิลด์ → พิมพ์ข้อความแล้วประกาศ', done: (s) => s.sent.some((m) => m.kind === 'announce') },
    ],
  },
}
