/**
 * แพทช์โน้ต (ใหม่สุดอยู่บนสุด) แบบ Minecraft: เวอร์ชัน + ชื่อแพทช์ → หมวด ใหม่ / เปลี่ยน / แก้บั๊ก → หัวข้อย่อย → รายการ
 * เพิ่มแพทช์ใหม่ไว้บนสุดทุกครั้งที่ deploy · id ต้องไม่ซ้ำ (ใช้วันที่ + ตัวอักษร) — เครื่องที่ยังไม่เห็น id ล่าสุดจะเห็นป๊อปอัป
 */
import { EN } from './i18n'

export type PatchItem = { text: string; guide?: string }
export type PatchGroup = { title?: string; items: PatchItem[] }
export type PatchKind = 'new' | 'change' | 'fix'
export type ChangelogEntry = {
  id: string
  version: string
  date: string
  /** ชื่อแพทช์ */
  title: string
  /** สรุป 1–2 บรรทัด */
  summary?: string
  sections: { kind: PatchKind; groups: PatchGroup[] }[]
}
export const PATCH_KIND: Record<PatchKind, string> = EN
  ? { new: 'New features', change: 'Changes', fix: 'Bug fixes' }
  : { new: 'ฟีเจอร์ใหม่', change: 'การเปลี่ยนแปลง', fix: 'แก้บั๊ก' }
import { PACKS_ON } from './packs'
const g = (title: string | undefined, ...items: (string | PatchItem)[]): PatchGroup => ({ title, items: items.map((x) => (typeof x === 'string' ? { text: x } : x)) })

const CHANGELOG_TH: ChangelogEntry[] = [
  {
    id: '2026-10-16',
    version: '1.5',
    date: '16 ต.ค. 2026',
    title: 'Swift Blade',
    summary: 'อัศวินใหม่กิยูและชิโนบุ · หน้าเทียบพลังโจมตี · แผนบุกเลือกจากบ้านศัตรูที่จดไว้ · ลื่นขึ้นทั้งเว็บ และแก้บั๊กอีกเพียบ',
    sections: [
      { kind: 'new', groups: [
        g('อัศวินใหม่', 'กิยู (สมดุล) และชิโนบุ (เวท) ทั้งร่างปกติและร่าง awake — ชื่อสกิล วันเข้าเกม ค่าโจมตีพื้นฐาน (หน้าบิสกิต) และอ่านชื่อจากรูปได้'),
        g('รูปสกิล', 'เพิ่มรูปสกิลบน สกิลล่าง และสกิลอเวคของกิยูกับชิโนบุครบทั้ง 6 รูป'),
        g('รูปอัศวิน', 'เพิ่มรูปกิยูและชิโนบุร่างปกติ พร้อมรูปย่อบนการ์ด'),
        g('เทียบพลังโจมตี (ใหม่)',
          'หน้าใหม่ในเมนู ☰: ใส่สัตว์เลี้ยง รูปแบบ บัฟทั้งทีม และดีบัฟลดโจมตีของฝั่งตรงข้าม (เช่น ฮายอน) แล้วดูว่าอัศวิน 2 ตัวใครโจมตีจริงสูงกว่า',
          'บอกว่าต้องดันตั้งต้นอีกเท่าไรถึงจะนำ · base ของอัศวินใส่ให้เอง · เลือกตัวเดียวกันทั้ง 2 ช่องได้ (เทียบของคนละชุด) · ค่าที่ใส่จำไว้ในเครื่อง',
          'บัฟแต่ละอันติ๊กเลือกได้ว่าให้ตัวไหน (เหมือนช่องโดนลด) — เช่น บัฟที่ให้เฉพาะตัวเอง'),
        g('สนับสนุน 7K Note',
          'มีช่องทางช่วยค่าเซิร์ฟเวอร์แล้ว: เมนู ☰ → "สนับสนุน 7K Note" หรือลิงก์เล็ก ๆ ท้ายเว็บ · คนไทยใช้ EasyDonate (พร้อมเพย์/TrueMoney) ต่างประเทศใช้ Ko-fi',
          'เว็บยังใช้ฟรีทุกฟีเจอร์เหมือนเดิม ไม่มีอะไรล็อก · ขอบคุณทุกคนที่ใช้และแนะนำเพื่อนครับ 🙏'),
        g('เปลี่ยนชื่อกิลด์', 'เจ้าของกิลด์กดปุ่ม "ตั้งค่ากิลด์" (เดิมชื่อ "รหัสแก้ไข") → เปลี่ยนชื่อกิลด์ได้ · ลิงก์ดูและลิงก์แก้ไขเดิมใช้ต่อได้ · ชื่อห้ามซ้ำกับกิลด์อื่น'),
        g('แผนบุก: ใช้บ้านศัตรูที่จดไว้ (กลับมาแล้ว)',
          'ขั้น ① "บ้านที่จะตี" กด "เลือกจากบ้านศัตรูที่จดไว้" ดึงทีมบ้านมาได้เลย ไม่ต้องจัดใหม่',
          'ขั้น ② เลือกจากทีมแก้ที่จดไว้ของบ้านนั้นก่อน เรียงตามลำดับที่ตั้งไว้ (#1 มงกุฎ) · แตะการ์ด = ทีมหลัก · "+ สำรอง" = เพิ่มเป็นตัวสำรอง',
          'ไม่มีทีมที่ใช่ กด "จัดทีมแก้เอง" หรือใช้พรีเซตได้เหมือนเดิม · บ้านที่ดึงมาไม่ถามลำดับสกิลซ้ำทุกไม้แล้ว'),
      ] },
      { kind: 'change', groups: [
        g('เร็วและลื่นขึ้น',
          'เปิดหน้ากิลด์/บ้านศัตรู/แผนแล้วหน้าไม่กระโดด: ระหว่างโหลดมีกรอบโครงร่างแทน และแถบประกาศจองที่ไว้ก่อน (มือถือขยับน้อยลงราว 90%)',
          'พิมพ์ค้นหา (บ้านศัตรู · อัศวิน · ที่จดไว้) และกดกรองแท็กไม่หน่วงแล้ว — ตัวอักษรขึ้นทันที รายการตามมาทีหลัง (มือถือช้าเร็วขึ้นหลายเท่า)',
          'รูปอัศวินที่เห็นตอนเปิดหน้าโหลดก่อน หน้าแรก/บ้านศัตรู/กิลด์ขึ้นครบเร็วขึ้น',
          'เปิดเว็บทิ้งไว้แล้วไม่ได้ใช้ / หน้าต่างอยู่ข้างหลัง → เช็กประกาศทุก 5 นาที (ใช้งานอยู่ยังทุก 1 นาที กลับมาใช้ = เช็กทันที) · สลับไปมาระหว่างบ้านศัตรู/แผน/หน้ากิลด์ ไม่โหลดข้อมูลซ้ำ',
          'กดบันทึก/ลบทีมแก้หรือบ้านศัตรู หน้าเปลี่ยนทันทีไม่ต้องรอเซิร์ฟเวอร์ (บันทึกต่อเบื้องหลัง · ถ้าไม่สำเร็จขึ้นป้ายให้กดกลับไปแก้ งานไม่หาย)',
          'สลับแท็บทีมแก้ / เปิดดูทีมแก้ทั้งหมด / ดูรายละเอียดทั้งทีม ตอบสนองทันที · แถบอัศวินด้านล่างเลื่อนและกดลื่นขึ้น',
          'กด + เปิดแถบอัศวินขึ้นทันที (เตรียมแถบไว้ล่วงหน้าตอนเครื่องว่าง · เร็วขึ้นราว 2–3 เท่าบนมือถือ) · สลับแท็บอัศวิน/สัตว์เลี้ยงไม่ต้องโหลดการ์ดใหม่',
          'กดการ์ดใส่ทีมและลากการ์ดลงช่องลื่นขึ้น (ใส่ตัวแล้วไม่ต้องวาดการ์ดทั้งแถบใหม่) · การ์ดในแถบใช้รูปย่อบนจอที่ไม่ต้องการรูปใหญ่',
          'ตารางอัศวินหน้าใหญ่ (ดูทั้งหมด) บนคอมเลื่อนลื่นไม่กระตุก ชี้เมาส์ผ่านการ์ดไม่หน่วง เปิดและกดใส่ตัวเร็วขึ้น · พื้นหลังหน้าต่างทุกอันมืดเฉย ๆ ไม่เบลอแล้ว (เหมือนบนมือถือ)',
          'หน้ากิลด์: มีคนแก้ระหว่างเปิดดู การ์ดบ้านศัตรูไม่สลับที่เอง (ขึ้นปุ่ม "เรียงล่าสุดขึ้นก่อน" ให้กดเอง)',
          'เปิดเว็บครั้งต่อไปเร็วขึ้น: เบราว์เซอร์เก็บโค้ด ฟอนต์ และรูปอัศวินไว้ในเครื่อง ไม่ต้องถามเซิร์ฟเวอร์ซ้ำทุกไฟล์ · ข้อมูลกิลด์เริ่มโหลดพร้อมกับตัวหน้าเว็บ · รูปอัศวินบางตัวไฟล์เล็กลงกว่าครึ่ง (ภาพเท่าเดิม) และจอคอมใช้รูปขนาดพอดีจอ',
          'กดลิงก์ไปหน้าอื่นตอนเลื่อนลงมาแล้ว หน้าใหม่เริ่มที่บนสุด (เดิมเปิดค้างกลาง/ท้ายหน้า แล้วเนื้อหาเด้ง) · เปิดหน้ากิลด์ไว้ เว็บโหลดหน้าบ้านศัตรู/แผนรอไว้ตอนเครื่องว่าง กดแล้วเปิดเร็วขึ้น',
          'หน้าต่างป๊อปอัป (เช่น "มีอะไรใหม่" และตั้งค่า) ขึ้นครั้งเดียวเต็มขนาด ไม่ขึ้นกรอบเล็กแล้วยืดพรวดทีหลัง',
          'คนที่แก้ได้: เปิดหน้ากิลด์/บ้านศัตรู/แผน ปุ่มแก้ขึ้นพร้อมหน้าเลย (เดิมขึ้นแบบดูอย่างเดียวก่อน แล้วปุ่มโผล่ทีหลังดันการ์ดลง)'),
        g('สงครามเบ็ดเสร็จ', 'นับซีซันถัดไปให้เอง (ทุก 14 วัน) · ระหว่างซีซันนับถอยหลังซีซันใหม่ · คะแนนที่จดจากซีซันก่อนมีป้ายเตือนให้ใช้ต่อหรือล้าง'),
        g('เครื่องประดับ', 'หน้าเลือกเครื่องประดับเรียงแหวนตามลำดับในสมุดภาพของเกม'),
        g('ความเป็นส่วนตัว', 'ผู้ดูแลเว็บเข้าดูข้อมูลของทุกกิลด์ได้ (รวมกิลด์ที่สร้างไว้แล้ว) และจะไม่แชร์ต่อให้ผู้อื่น · มีข้อความนี้ใต้ปุ่มสร้างกิลด์ด้วย'),
        g('หัวเว็บมือถือโล่งขึ้น', 'กดรูปโปรไฟล์ → เมนู พรีเซต & ทีมที่ชอบ / ดูการสอนหน้านี้ / ออกจากระบบ (ปุ่ม ? กับปุ่มออกจากระบบย้ายเข้าไปในนี้)', 'ปุ่ม ? / 🌐 ไม่มีกรอบ · จอแคบหรือตั้งตัวอักษรใหญ่ ชื่อเว็บย่อเองไม่ให้ล้น · ยังไม่ล็อกอิน ปุ่มเข้าสู่ระบบเหลือโลโก้ Discord'),
      ] },
      { kind: 'fix', groups: [
        g(undefined,
          'กดเข้าบ้านศัตรูตอนกรองแท็ก/ค้นหาอยู่ แล้วกดย้อนกลับ ยังอยู่ที่ตัวกรอง/คำค้นเดิม และตำแหน่งเลื่อนเดิม (เดิมเด้งกลับไปทั้งหมด)',
          'ตรา God rank ในหน้าคำนวณแต้มเบ็ดเสร็จคมชัดขึ้น',
          'มือถือ: รูปโปรไฟล์ Discord บนหัวเว็บไม่โดนบีบแล้ว และหน้าเว็บไม่เลื่อนข้าง/ไม่ซูมออกเอง (ปุ่ม Discord มุมขวาล่างไม่หลุดจอตอนเลื่อน)',
          'จอคอม: ชี้เมาส์ที่ขอบล่างการ์ดแผนสงคราม การ์ดไม่สั่นขึ้นลงแล้ว',
          'แผนวอร์: กำลังแก้แผนอยู่แล้วกดเปิดแผนอื่น (เช่น ชื่อแผนในแถบประกาศ) ร่างที่แก้ไม่ค้างไปทับแผนนั้นแล้ว — หน้าจะออกจากโหมดแก้ให้',
          'คนที่แก้ได้เพราะยศ Discord แก้ทีม/แผน/ประกาศได้เหมือนเดิม แต่ตั้งรหัสใหม่ ลบกิลด์ และตั้งค่า Discord ได้เฉพาะคนที่มีรหัสแก้ไข',
          'กันเดารหัสแก้ไขแน่นขึ้น (ยิงพร้อมกันหลายครั้งก็ลองได้ไม่เกิน 10 ครั้ง)',
          'ลากอัศวินไปวางช่องว่างของการ์ดทีมที่มีครบ 3 ตัวแล้ว อัศวินไม่หายจากทีมเดิมแล้ว (วางไม่ได้ และไม่ขึ้นกรอบทอง)',
          'ล็อกอิน Discord อยู่แล้ว Discord ล่ม ยังบันทึกด้วยรหัสแก้ไขได้ตามปกติ',
          'แผนที่ใช้อยู่ไม่หายเองแล้ว เมื่อประกาศอัตโนมัติสะสมเกิน 200 อัน',
          'ประกาศ 07:00 ที่ตั้งข้อความเองด้วย {day} (หน้าภาษาอังกฤษ) ขึ้นชื่อวันแล้ว ทั้งในเว็บและ Discord',
          'เน็ตสะดุดตอนหน้าโหลดข้อมูลใหม่เบื้องหลัง หน้าไม่กลายเป็น "ไม่พบ" แล้ว — ข้อมูลเดิมอยู่ครบ มีป้ายเล็ก ๆ ให้กดลองใหม่ (ร่างที่แก้อยู่ไม่หาย)',
          'หลังอัปเดตเว็บ แท็บที่เปิดค้างไว้กดไปหน้าอื่นแล้วไม่จอขาว (โหลดเวอร์ชันใหม่ให้เอง) · หน้าไหนมีปัญหาจะขึ้นปุ่มโหลดใหม่แทนจอขาว',
          'แก้แผนแล้วเผลอกดลิงก์ รีเฟรช หรือกดยกเลิก จะถามก่อนทิ้งสิ่งที่แก้',
          'ตอบหน้าต่าง "จดลงบ้านศัตรู" หลังบันทึกแผน ไม่ย้อนสิ่งที่คนอื่นเพิ่งแก้ในแผนเดียวกันแล้ว',
          'ตั้งเป็นบ้านหลัก/ลบบ้านหลัก: แท็กและโน้ตย้ายไปพร้อมบ้าน ไม่ไปติดบ้านผิดแล้ว',
          'แก้บ้านศัตรู/ทีมแก้พร้อมกันสองคน คนที่บันทึกทีหลังจะได้รับแจ้งให้เปิดของล่าสุดก่อน ไม่ทับของอีกคนเงียบ ๆ',
          'อ่านค่าความสามารถจากรูป: ปุ่ม "เพิ่มเข้าทีม" ไม่เอาอุปกรณ์/คำอธิบายของอีกตัวไปใส่ · กรอกเอง/แก้ของเดิมขึ้นค่าเดิมให้แก้ต่อ และช่องที่ไม่ได้ใส่ไม่ลบค่าเดิม · เปิดรอบใหม่ไม่มีภาพ/ค่าของรอบก่อนค้าง',
          'อ่านรูป: เลข 1 ที่อ่านเป็น l หรือ I (เช่น Attack l,389) และ % ที่ใช้จุลภาค (12,5%) อ่านถูกแล้ว',
          'แผนกัน: ตั้งชื่อไม้ได้ในหน้าต่างตั้งไม้ และปุ่ม "กลับไปตั้งลำดับการใช้สกิล" ทำงานแล้ว',
          'จอคอม: ลากอัศวินแล้วหน้าต่างเลื่อนเอง (ลากใกล้ขอบ) หรือหมุนล้อเมาส์ระหว่างลาก วงทองและที่วางตรงกับช่องใต้เมาส์แล้ว (เดิมคลาดไปช่องข้าง ๆ)',
          'เปิดหน้าต่างอยู่ หน้าด้านหลังไม่เลื่อนตามแล้ว และหัวเว็บไม่หายไประหว่างเปิดหน้าต่าง',
          'จอคอม: หน้าที่ยังโหลดไม่เสร็จหรือหน้าสั้น ท้ายเว็บไม่โผล่กลางจอแล้วโดนดันลง · หน้าไม่ขยับซ้าย-ขวาตอนแถบเลื่อนโผล่/หาย · เปิดกิลด์ครั้งแรก แถบประกาศโหลดเสร็จแล้วไม่ดันเนื้อหาลง',
          'บอสจุติ: รอบเริ่มวันจันทร์ 07:00 จบเที่ยงคืนวันอาทิตย์ (เดิมนับเร็วไป 1 วัน) — แจ้งวันสุดท้ายวันอาทิตย์ และรอบใหม่วันจันทร์'),
      ] },
    ],
  },
  {
    id: '2026-10-11',
    version: '1.4',
    date: '11 ต.ค. 2026',
    title: 'Guided Tour',
    summary: 'การสอนใช้แบบส่องปุ่มจริง เรียงลำดับทีมแก้ แอนิเมชันทั้งเว็บ และอ่านชื่อจากรูปแม่นขึ้น',
    sections: [
      { kind: 'new', groups: [
        ...(PACKS_ON ? [
        g('เช็กความคุ้มค่าแพ็ค (ใหม่)',
          'หน้าใหม่ เข้าได้จากหน้าแรกหรือเมนู ☰: เรียงแพ็คในเกมจากคุ้มสุดไปน้อยสุด เทียบเป็น % กับ Monthly Key Bundle (= 100%)',
          'คิดเป็นรูบี้ต่อบาท: กล่องกุญแจ 1 กล่อง (60 กุญแจ) = 100 รูบี้ · ตั๋วสุ่ม 1 ใบ = 100 รูบี้ · ตั๋วเรด โทปาซ และของอื่นแสดงไว้แต่ไม่นับ · กดดูวิธีคิดของแต่ละแพ็คได้',
          'ใส่งบ (บาท) แล้วแนะนำชุดแพ็คที่ได้ของมากที่สุดในงบนั้น',
          'กด + ที่แพ็คที่ซื้อไปแล้ว → ไม่แนะนำซ้ำเกินจำนวนที่ซื้อได้ · แพ็ครายวัน/สัปดาห์/เดือนนับใหม่เองตามรอบ 07:00')] : []),
        g('ปุ่มเปลี่ยนภาษา',
          'ปุ่ม 🌐 บนหัวเว็บ เปลี่ยน ไทย / English ได้ทุกหน้า (ถ้ากำลังแก้ทีมหรือแผนอยู่จะถามก่อน เพราะหน้าจะโหลดใหม่)',
          'เครื่องที่ไม่ได้ตั้งภาษาไทย เข้าครั้งแรกจะถามครั้งเดียวว่าจะใช้ภาษาอังกฤษไหม'),
        g('การสอนใช้ (กลับมาแล้วแบบใหม่)',
          'เข้าแต่ละหน้าครั้งแรกจะส่องปุ่มจริงแล้วอธิบายทีละขั้น: หน้ากิลด์ บ้านศัตรู การจัดทีม แผนสงคราม และอ่านค่าความสามารถจากรูป',
          'บางขั้นให้ลองทำเอง เช่น แตะช่อง + 2 ครั้งเปิดตารางอัศวินจอใหญ่ หรือใส่รูปจริง — ทำสำเร็จแล้วไปขั้นต่อไปเอง',
          'สอนทางลัดด้วย: แตะตัวในทีมแล้วแตะช่องอื่น = สลับ · แตะตัวในแถบ = เปลี่ยนตัว · แตะซ้ำ = เอาออก',
          'ดูซ้ำได้ที่ปุ่ม ? บนหัวเว็บ · สอนใหม่ตั้งแต่ต้นได้ที่ ตั้งค่า → ข้อมูลในเครื่อง → การสอนใช้'),
        g('เรียงลำดับทีมแก้',
          'กดค้างที่แท็บ "ทีมแก้ #" แล้วลากไปวางตำแหน่งที่ต้องการ (มือถือกดค้างครู่หนึ่งก่อนลาก)',
          'ทีมแก้ #1 มีมงกุฎ = แนะนำให้ใช้ก่อน',
          'ปุ่ม "เรียงตามไลค์" เรียงตามจำนวน 👍 ให้ในครั้งเดียว',
          'ในหน้าต่าง "ดูทั้งหมด" มีปุ่ม ◀ ▶ ย้ายทีละช่อง และ 👑 ขึ้นเป็น #1 — เห็นทุกทีมพร้อมกันแล้วเรียงได้เลย',
          'มีการสอนให้ลองลากเรียงจริง ขึ้นครั้งเดียวตอนเข้าบ้านที่มีทีมแก้ 2 ทีมขึ้นไป (คนที่เคยดูการสอนหน้านี้แล้วก็ได้เห็น)'),
        g('อ่านค่าความสามารถจากรูป',
          'ตัวที่เคยจดไว้ในเครื่องนี้ ใช้ของเดิมได้เลยในหน้าต่างนี้ (ค่าความสามารถ เซต เครื่องประดับ) ไม่ต้องแคปใหม่',
          'ถ้ารูปเป็นอัศวินที่ยังไม่อยู่ในทีม จะเด้งถามว่าจะเพิ่มเข้าทีมเลยไหม'),
        g('แอนิเมชันตอนจัดทีม',
          'ใส่อัศวินแล้วเด้งเข้าช่อง · ย้าย/สลับตัว หรือเปลี่ยนรูปแบบ อัศวินเลื่อนไปที่ใหม่ · ตั้งลำดับสกิลแล้วเลขเด้งขึ้น',
          'บันทึกบ้านศัตรู/ทีมแก้/แผนแล้วมีป้าย "บันทึกแล้ว" และการ์ดที่เพิ่งบันทึกเรืองทอง',
          'แผนบุก: แท็บบ้านกับขั้น ① ② ③ มีแถบทองเลื่อนตาม · เปลี่ยนขั้น/สลับบ้านเนื้อหาเลื่อนตามทิศ · ตั้งไม้เสร็จการ์ดไม้นั้นเรือง'),
        g('แอนิเมชัน',
          'เปิดหน้าไหนส่วนต่าง ๆ จะค่อย ๆ ลอยขึ้นมา · VS ปะทะกันตอนเปิดหน้า',
          'หน้าแรกมีวงเวทหมุนและละอองทอง · กดไลค์มีประกาย · แถบ Season เติมสีทองตามรอบที่ผ่านไป',
          'บิสกิต: เปลี่ยนรูปแบบแล้วช่องเลื่อนไปที่ใหม่แบบลื่น ๆ',
          'ไม่ชอบหรือเครื่องช้า ปิดได้ที่ ตั้งค่า → ลดแอนิเมชัน'),
      ] },
      { kind: 'change', groups: [
        g('แผนสงคราม',
          'จอคอมเห็นการ์ดครบ 5 ไม้ในแถวเดียว ทั้งแผนบุกและแผนกัน และใช้พื้นที่ด้านข้างได้เต็มขึ้น',
          'หน้าต่างถามลำดับการใช้สกิลกระชับขึ้น'),
        g('หน้าตา',
          'โหมดสว่างเปลี่ยนเป็นโทนเทาอุ่น การ์ดสว่างกว่าพื้นหลัง อ่านง่ายขึ้น',
          'VS อยู่ใต้การ์ดทีม ไม่บังอัศวิน',
          'เลขลำดับการใช้สกิลอยู่ซ้ายรูปอัศวินทุกที่'),
        g('ชื่ออัศวิน', 'ไอลีนกับฮายอนร่าง awake แสดงคำว่า awake ตามตราในเกม'),
        g('อ่านชื่ออัศวินจากรูป', 'แม่นขึ้นมาก ทั้งชื่อไทยและอังกฤษ (ชื่อไทยอ่านถูกจาก ~70% เป็น ~90%) และเลือกผิดตัวเงียบ ๆ น้อยลงมาก'),
        g('เร็วและลื่นขึ้น',
          'เปิดกิลด์ซ้ำ ถ้าข้อมูลไม่เปลี่ยนจะไม่โหลดใหม่ทั้งหมด · สิ่งที่คนอื่นแก้จะขึ้นภายในราว 1 นาที',
          'ไฟล์ที่โหลดครั้งแรกเล็กลง และแอนิเมชันไม่กินเครื่องตอนเปิดหน้าทิ้งไว้'),
        g('ข้อความสั้นลง', 'ตัดคำแนะนำที่ไม่จำเป็นออก (เช่น ตำแหน่งช่องสัตว์เลี้ยง) และเอาปุ่ม "ใช้ทั้งคอมพ์" ข้างฟอร์มทีมแก้ออก'),
      ] },
      { kind: 'fix', groups: [
        g(undefined,
          'รูปแบบบุก/ป้องกัน (4 ตัวในแถวเดียว) การ์ดทีมไม่ล้นกรอบแล้ว และอัศวินยังตัวใหญ่เท่าเดิมถ้าไม่มีสัตว์เลี้ยงสำรอง',
          'จอคอม: หน้าแก้ทีมแก้ การ์ดทีมไม่ยืดตามโน้ตยาว ๆ จนตกไปด้านล่าง และติดอยู่บนจอตอนเลื่อน',
          'อ่านรูป: ชื่อสั้นที่ต่างกันตัวเดียวไม่สลับกันแล้ว (เช่น ลุค ↔ ซีค)'),
      ] },
    ],
  },
  {
    id: '2026-10-10',
    version: '1.3',
    date: '10 ต.ค. 2026',
    title: 'Light & Words',
    summary: 'ภาษาอังกฤษ โหมดสว่าง คำเรียกใหม่ แผนสงครามแบบการ์ด และตั้งไม้ทีละขั้น',
    sections: [
      { kind: 'new', groups: [
        g('ภาษาอังกฤษ', 'ตั้งค่า → ภาษา / Language: ไทย / English', 'ชื่ออัศวินและสัตว์เลี้ยงใช้ชื่อตามเกมเวอร์ชันอังกฤษ · ค้นหาได้ทั้งชื่อไทยและอังกฤษ'),
        g('โหมดสว่าง', 'ตั้งค่า → ธีม: มืด / สว่าง / ตามเครื่อง'),
        g('แผนสงครามแบบการ์ด',
          'แผนบุกและแผนกันเป็นการ์ดแบบหน้าจัดทีมในเกม 1 ใบต่อ 1 ไม้',
          'กดการ์ดเพื่อดูรายละเอียด และเลื่อนดูไม้ถัดไปด้วยปุ่ม ‹ ›'),
        g('ตั้งไม้ทีละขั้น',
          'บ้านที่จะตี → ทีมแก้ → อุปกรณ์/ค่าความสามารถ',
          'แผนกันเริ่มที่บ้านกันเลย · กดออกนอกหน้าต่างจะถามก่อนถ้ายังไม่ได้บันทึก'),
        g('ดูรายละเอียดทั้งทีม', 'ป๊อปอัปรูปแบบทีม + อุปกรณ์/ค่าความสามารถของอัศวินทีละตัว'),
        g('จัดทีมง่ายขึ้น',
          'ดับเบิลคลิกช่องว่าง = เปิดหน้าเลือกอัศวินแบบใหญ่',
          'ลากสลับตำแหน่งอัศวินข้ามการ์ดได้ (เช่น ระหว่างทีมแก้กับทีมสำรอง)',
          'ปุ่ม "ล้างข้อมูลตัวนี้" ในตารางอุปกรณ์/ค่าความสามารถ'),
        g('หน้าบ้านศัตรู', 'ปุ่ม "แก้ไข" ลอยมุมขวาล่าง กดแล้วเลือก แก้ทีมแก้ / เพิ่มทีมแก้ / แก้บ้านศัตรู'),
        g('ตั้งค่า',
          'เมนู ☰ ล่างสุด: ขนาดหน้าเว็บ ลดแอนิเมชัน เลื่อนหน้านุ่ม และข้อมูลในเครื่อง',
          'หน้ากิลด์สลับมุมมองคนแก้/คนดูได้'),
        g('แถบประกาศ', 'โชว์แผนที่ใช้วันนี้ให้ตรงกับวัน (วันตี = แผนบุก · วันจัดบ้าน = แผนกัน)'),
      ] },
      { kind: 'change', groups: [
        g('เปลี่ยนคำเรียก',
          'ฮีโร่ → อัศวิน · สเตตัส → ค่าความสามารถ · จองสกิล → ลำดับการใช้สกิล · ค่ายกล → รูปแบบ · สปีด → ความเร็ว',
          'ของ/แหวน → อุปกรณ์/เครื่องประดับ · แท็ก โจมตี/เวทย์/ถึก → กายภาพ/เวท/แทงก์ (แท็กเดิมของกิลด์ไม่หาย)',
          'ทีมเป้าหมาย/ทีมศัตรู → บ้านศัตรู · ทีมบุก → ทีมแก้ · คอมพ์สำรอง → ทีมสำรอง · ทีมกันของเรา → บ้านกัน'),
        g('แผนสงคราม',
          'ทุกทีมต้องมีสัตว์เลี้ยง และถามก่อนถ้ายังตั้งลำดับการใช้สกิลไม่ครบ',
          'แผนกันเตือนถ้าใช้อัศวินหรือสัตว์เลี้ยงซ้ำข้ามไม้',
          'ประกาศแผนบุกกับแผนกันแยกกัน ประกาศอันหนึ่งแล้วอีกอันไม่หลุด'),
        g('ค่าความสามารถ', 'อ่านจากรูปแม่นขึ้น (ใช้ภาพป๊อปอัปในหน้าจัดทีมได้) และใส่เซต/เครื่องประดับ/คำอธิบายได้ในหน้าต่างเดียว'),
        g('หน้าตา',
          'การ์ดทีมขนาดเท่ากันทุกที่ ไม่ว่ารูปแบบไหน',
          'แท็บมีแถบทองเลื่อนตาม และแถบเลื่อนสีทองทั้งเว็บ',
          'ปุ่มลบกดสองครั้งเพื่อยืนยัน แทนหน้าต่างของเบราว์เซอร์'),
        g('ค้นหาบ้านศัตรู', 'ค้นจากทีมบ้านศัตรูอย่างเดียว ไม่รวมทีมแก้ (ผลค้นหาตรงขึ้น)'),
        g('ปิดไว้ชั่วคราว', 'คู่มือ/ทัวร์สอนใช้ และปุ่มบันทึกเป็นรูป — กำลังทำใหม่', 'เลือกบ้านจากที่จดไว้ในแผนบุก — ตอนนี้จัดบ้านที่จะตีเองในหน้าต่างตั้งไม้'),
      ] },
      { kind: 'fix', groups: [
        g(undefined,
          'กดกากบาทหรือ Esc ในหน้าต่างถาม = ยกเลิก (เดิมไปทำขั้นต่อไปเลย)',
          'ดาวท้าย banner กิลด์ไม่ทับปุ่มรหัสแก้ไขแล้ว',
          'ไม่มีเคอร์เซอร์กะพริบบนข้อความเวลาคลิกหน้าเว็บ',
          'ลากแถบแผนสงครามออกนอกขอบแล้วปล่อยเมาส์ แถบไม่เลื่อนตามเมาส์ต่อเองแล้ว',
          'แท็บหน้ากิลด์ (แผนสงคราม ↔ บ้านศัตรู) เลื่อนเข้าแบบมีแอนิเมชันจนจบ ไม่สะดุดกลางทาง',
          'ค้นหาบ้านศัตรูด้วยชื่ออัศวินภาษาอังกฤษได้ (เช่น Melia)',
          'ลบประกาศ / ลบแผน / ลบพรีเซต ใช้ปุ่มกดสองครั้ง ไม่มีหน้าต่างของเบราว์เซอร์เด้งขึ้นมาแล้ว',
          'มือถือ: ช่องกรอกค่าความสามารถเรียงคอลัมน์เดียว ชื่อค่าไม่โดนตัด',
          'หน้ารายละเอียดไม้ไม่มีชื่อไม้ซ้ำสองที่แล้ว',
          'คำเก่าที่ยังหลงอยู่เปลี่ยนให้ครบ (เช่น จองแล้ว → ตั้งแล้ว, คิว → ลำดับ, ของ → อุปกรณ์)'),
      ] },
    ],
  },
  {
    id: '2026-10-08',
    version: '1.2',
    date: '8 ต.ค. 2026',
    title: 'Practice Grounds',
    summary: 'วิธีใช้ในแต่ละหน้า กิลด์ทดลอง และหน้ากิลด์ลื่นขึ้น',
    sections: [
      { kind: 'new', groups: [
        g('วิธีใช้', 'ปุ่ม "วิธีใช้" ในหน้ากิลด์ บ้านศัตรู และแผนสงคราม พร้อมปุ่มลองฝึกในกิลด์ทดลอง (กดได้ทุกอย่าง ไม่บันทึกจริง)'),
        g('แผนสงคราม', { text: 'ถามใส่ความเร็วทีมให้ตอนบันทึก ถ้าใส่ความเร็วโจมตีครบทุกตัว', guide: 'stats' }),
        g('ติดต่อ', { text: 'ปุ่ม Discord มุมขวาล่าง สำหรับแจ้งบั๊กหรือเสนอฟีเจอร์', guide: 'contact' }),
      ] },
      { kind: 'change', groups: [
        g(undefined,
          'หน้าบ้านศัตรูเบาลงและเลื่อนด้วยลูกกลิ้งเมาส์ลื่นขึ้น แม้กิลด์จะมีหลายสิบทีม',
          'หน้าคำนวณแต้มเบ็ดเสร็จบอกวันเวลาจบซีซัน และตราแรงค์คมขึ้น'),
      ] },
    ],
  },
  {
    id: '2026-10-07',
    version: '1.1',
    date: '7 ต.ค. 2026',
    title: 'Quick Load',
    summary: 'หน้ากิลด์โหลดเร็วขึ้น',
    sections: [
      { kind: 'change', groups: [
        g(undefined,
          'เปิดกิลด์ที่เคยเข้าแล้วขึ้นทันที แล้วค่อยอัปเดตข้อมูลล่าสุดตามหลัง',
          { text: 'แท็กหลัก (กายภาพ เวท แทงก์) อยู่หน้าสุดเสมอ แท็กที่เพิ่มเองเรียงตามลำดับที่ใส่', guide: 'targets' }),
      ] },
    ],
  },
  {
    id: '2026-10-06',
    version: '1.0',
    date: '6 ต.ค. 2026',
    title: 'Presets & Favorites',
    summary: 'พรีเซต ทีมที่ชอบ และแผนบุกหลายบ้าน',
    sections: [
      { kind: 'new', groups: [
        g('ทีมที่ชอบ & พรีเซต',
          'กด 👍 ทีมแก้ที่ตีแล้วชนะ เก็บไว้ดูในหน้า "พรีเซต & ทีมที่ชอบ" (ล็อกอิน Discord)',
          'บันทึกทีมแก้เป็นพรีเซตของตัวเอง ใช้ได้ทุกกิลด์ทุกเครื่อง'),
        g('แผนบุก', { text: 'ไม้ 1 ไม้ใส่บ้านที่จะตีได้สูงสุด 3 บ้าน', guide: 'plans' }),
        g('ค่าความสามารถ', { text: 'อ่านจากรูปหน้าข้อมูลอัศวินในเกม และปุ่มใช้ค่าล่าสุดของตัวนั้น', guide: 'stats' }),
        g('สงครามเบ็ดเสร็จ', 'หน้าคำนวณแต้ม'),
      ] },
      { kind: 'change', groups: [
        g(undefined, { text: 'บ้านศัตรูที่แก้ใน 24 ชม. มีจุดเขียว และทีมที่แก้ล่าสุดอยู่บนสุด', guide: 'targets' }),
      ] },
    ],
  },
]

/** แพทช์โน้ตภาษาอังกฤษ (id/version ตรงกับฝั่งไทย) */
const CHANGELOG_EN: ChangelogEntry[] = [
  {
    id: '2026-10-16', version: '1.5', date: '16 Oct 2026', title: 'Swift Blade',
    summary: 'New heroes Giyu and Shinobu, Attack Compare, attack plans from saved enemy defenses, a smoother site and a long list of fixes',
    sections: [
      { kind: 'new', groups: [
        g('New heroes', 'Giyu (Universal) and Shinobu (Magic), base and awakened — skill names, release dates, base attack (Biscuit page) and name reading from screenshots'),
        g('Skill icons', 'Added all six upper, lower and awakening skill icons for Giyu and Shinobu'),
        g('Hero portraits', 'Added base-form portraits and card thumbnails for Giyu and Shinobu'),
        g('Attack Compare (new)',
          'New page in the ☰ menu: enter your pet, formation, team buffs and the enemy attack debuff (e.g. Hayeon) to see which of two heroes really hits harder',
          'Shows how much more starting attack one needs to pass the other · hero base attack is filled in for you · you can pick the same hero twice to compare gear · your inputs are remembered on this device',
          'Tick which hero gets each buff (like the debuff box) — e.g. a buff that only hits the caster'),
        g('Support 7K Note',
          'You can now help with server costs: ☰ menu → "Support 7K Note" or the small link at the bottom · EasyDonate (PromptPay/TrueMoney) in Thailand, Ko-fi worldwide',
          'Every feature stays free — nothing is locked · thanks to everyone using and sharing the site 🙏'),
        g('Rename your guild', 'Guild owners: "Guild settings" (was "Edit code") → change the guild name · existing view and edit links keep working · names must be unique'),
        g('Attack plans: saved enemy defenses (back)',
          'Step ① "Defense to attack" — tap "Pick from saved enemy defenses" to bring the team in, no rebuilding',
          'Step ② shows that defense\'s saved counters first, in your set order (#1 crown) · tap a card = main counter · "+ Backup" adds a backup',
          'Nothing fits? "Build my own" or a preset still work · picked defenses no longer nag for skill order on every slot'),
      ] },
      { kind: 'change', groups: [
        g('Faster & smoother',
          "Guild, defense and plan pages no longer jump while loading: skeleton placeholders show instead and the announcement bar reserves its space (about 90% less shifting on mobile)",
          'Typing in search (defenses · heroes · saved teams) and tapping tag filters no longer lag — letters appear instantly, results follow (several times faster on slow phones)',
          'Hero portraits on the first screen load first, so the home, defense and guild pages fill in sooner',
          'A tab left open but unused (or behind other windows) checks for announcements every 5 minutes (every minute while you use it, instantly when you come back) · moving between defenses, plans and the guild page no longer reloads the data',
          'Saving or deleting a counter or enemy defense updates the page instantly (it finishes saving in the background · if it fails, a banner lets you go back to editing without losing anything)',
          'Switching counter tabs, opening all counters and full team details respond instantly · the hero bar at the bottom scrolls and taps more smoothly',
          'Tapping + opens the hero bar instantly (it is prepared in the background while idle · about 2–3× faster on phones) · switching between Heroes and Pets no longer rebuilds the cards',
          'Tapping a card into the team and dragging cards onto slots feel smoother (adding a hero no longer redraws the whole bar) · bar cards use smaller images on screens that do not need full size',
          'The big hero grid (View all) scrolls smoothly on desktop, hovering over cards no longer lags, and it opens and adds heroes faster · popup backgrounds are now plain dimmed instead of blurred (like on phones)',
          'Guild page: if someone edits while you are looking, enemy defense cards no longer jump around (a "sort latest first" button appears instead)',
          'Faster return visits: your browser now keeps the code, fonts and hero portraits instead of re-checking every file with the server · guild data starts loading together with the page itself · some hero portraits are less than half the file size (same picture), and PCs get portraits sized for the screen',
          'Following a link after scrolling down opens the new page at the top (it used to open mid-page or at the bottom and then jump) · while a guild page is open, the defense and plan pages are prepared in the background so they open faster',
          'Popups (like "What\'s new" and Settings) appear once at full size instead of a small box that suddenly stretches',
          'Editors: the guild, defense and plan pages show your edit buttons right away (they used to load as view-only, then the buttons popped in and pushed the cards down)'),
        g('Total War', 'Now rolls over to the next season by itself (every 14 days), counts down to the new season between seasons, and flags a score saved last season so you can keep or clear it'),
        g('Accessories', 'The accessory picker lists rings in the in-game codex order'),
        g('Privacy', 'The site admin can view every guild\'s data (including guilds created before) and never shares it with anyone else; this note is now under the Create guild button too'),
        g('Cleaner phone header', 'Tap your profile picture → menu with Presets & favorites / page guide / Log out (the ? and log-out buttons moved in here)', 'Borderless ? / 🌐 buttons · the site name shortens itself on narrow screens or large text so nothing overflows · logged out, the sign-in button is just the Discord logo'),
      ] },
      { kind: 'fix', groups: [
        g(undefined,
          'Opening an enemy defense while filtering by tag/search and going back keeps your filter, search and scroll position (it used to reset to All)',
          'Sharper God rank emblem on the Total War score calculator',
          'Phones: your Discord avatar in the header is no longer squished, and the page no longer slides sideways or zooms out (the Discord button stays in the bottom corner while scrolling)',
          'PC: hovering the bottom edge of a war plan card no longer makes it jitter up and down',
          'War plans: opening another plan while editing (e.g. from the announcement bar) no longer carries your draft over and overwrites that plan — the page leaves edit mode instead',
          'People who can edit through their Discord role can still edit teams, plans and announcements, but only edit-password holders can change the password, delete the guild or change Discord settings',
          'Edit-password guessing protection is stricter (many requests at once still get at most 10 tries)',
          'Dragging a hero onto an empty slot of a team that already has 3 heroes no longer makes the hero vanish from its original team (the drop is refused and no gold ring shows)',
          'If Discord is down while you\'re logged in, saving with your edit password still works',
          'The active plan no longer disappears once automatic announcements pile up past 200',
          'Custom 07:00 announcements using {day} now show the day name, on the site and in Discord',
          'A network hiccup during a background refresh no longer turns the page into "not found" — your data stays, with a small banner to try again (drafts are kept)',
          'After a site update, tabs left open no longer go blank when you open another page (the new version loads by itself) · if a page breaks you get a reload button instead of a blank screen',
          'If you\'ve edited a plan, clicking a link, refreshing or pressing Cancel asks before throwing your changes away',
          'Answering the "log to enemy defenses" prompt after saving a plan no longer reverts what someone else just changed in that plan',
          'Make main defense / remove main defense: tags and notes now move with their defense instead of sticking to the wrong one',
          'When two people edit the same enemy defense or counter, the later save is told to reopen the latest version instead of silently overwriting',
          'Reading stats from screenshots: "add to team" no longer copies another hero\'s gear/notes · manual entry starts from the saved values and blank fields keep the old ones · reopening no longer shows the previous image/values',
          'Screenshot reading: a leading 1 read as l or I (e.g. Attack l,389) and percentages with a decimal comma (12,5%) now read correctly',
          'Defense plans: you can name a slot in the slot window, and "go back to set skill order" now works',
          'PC: if the window scrolls while you drag a hero (near the edge, or with the mouse wheel), the gold ring and the drop now match the slot under the pointer (it used to land on a neighbouring slot)',
          'With a popup open, the page behind it no longer scrolls along, and the site header no longer disappears',
          'PC: on short or still-loading pages the footer no longer shows up mid-screen and then gets pushed down · the page no longer shifts sideways when the scrollbar appears or disappears · the first time you open a guild, the announcement bar no longer pushes the page down when it finishes loading',
          'World boss: rounds now run Monday 07:00 → Sunday midnight (it was one day early) — last-day alert on Sunday, new round on Monday'),
      ] },
    ],
  },
  {
    id: '2026-10-11', version: '1.4', date: '11 Oct 2026', title: 'Guided Tour',
    summary: 'Spotlight guides, counter ordering, animations everywhere and sharper screenshot name reading',
    sections: [
      { kind: 'new', groups: [
        ...(PACKS_ON ? [
        g('Pack value checker (new)',
          'A new page, from the home page or the ☰ menu: in-game packs ranked from best to worst value, as a % of the Monthly Key Bundle (= 100%)',
          'Measured in rubies per baht: 1 key chest (60 keys) = 100 rubies · 1 summon ticket = 100 rubies · raid tickets, topaz and extras are shown but not counted · tap a pack to see the math',
          'Enter a budget (baht) to get the pack combo with the most value for it',
          "Tap + on packs you've already bought so they aren't suggested past their limit · daily/weekly/monthly packs reset on their own at the 07:00 reset")] : []),
        g('Language button',
          'A 🌐 button at the top switches ไทย / English on every page (if you are editing a team or plan it asks first, since the page reloads)',
          "Devices not set to Thai get a one-time prompt offering English on the first visit"),
        g('Guides (back, rebuilt)',
          'The first time you open a page, the real buttons are highlighted and explained step by step: guild, enemy defenses, team building, war plans and reading stats from a screenshot',
          'Some steps let you try it yourself — double-tap + for the big hero grid, or add a real screenshot — and move on once it works',
          'Shortcuts too: tap a hero then another slot = swap · tap a hero in the bar = replace · tap again = remove',
          'Replay with the ? button at the top · restart every guide in Settings → Local data → Guides'),
        g('Counter order',
          'Press and drag a "Counter #" tab to reorder (on mobile, hold a moment before dragging)',
          'Counter #1 wears a crown = try this one first',
          '"Sort by likes" orders them by 👍 in one tap',
          'In "See all", ◀ ▶ move a team one place and 👑 makes it #1 — reorder while seeing every team at once',
          "A hands-on guide lets you try dragging — it shows once on a defense with 2+ counters (even if you've seen this page's guide)"),
        g('Stats from screenshot', 'Heroes you saved on this device can reuse their stats, sets and accessories right in this window — no new screenshot', "If the screenshot shows a hero who isn't on the team, a popup asks whether to add them"),
        g('Team-building animations',
          'Heroes pop into slots · moving/swapping heroes or changing formation glides them to their new spot · skill-order badges pop in',
          'Saving a defense, counter or plan shows a "Saved" badge and the card you just saved glows gold',
          'Attack plans: house tabs and steps ① ② ③ have a sliding gold highlight · switching step/house slides the content · the slot card glows after you finish it'),
        g('Animations',
          'Page sections rise in as each page opens · the VS emblem clashes in',
          'Landing page arcane ring and drifting gold motes · likes burst with sparkles · the Season pill fills with gold as the season goes on',
          'Biscuit: slots glide into place when you switch formation',
          'Not your thing or a slow device? Settings → Reduce motion'),
      ] },
      { kind: 'change', groups: [
        g('War plans', 'On desktop all 5 slot cards fit in one row for attack and defense plans, using the side space', 'The skill-order prompt is shorter'),
        g('Look & feel', 'Light mode uses a warm grey palette with cards lighter than the page', 'The VS emblem sits under the team cards instead of covering heroes', 'Skill-order badges are on the left of the hero everywhere'),
        g('Hero names', 'Awakened Eileene and Hayeon are now labeled (Awakened), matching the in-game badge'),
        g('Reading names from screenshots', 'Much more accurate for Thai and English names (Thai ~70% → ~90% correct) and far fewer silent wrong picks'),
        g('Faster & smoother',
          "Reopening a guild skips the full reload when nothing changed · edits by others show up within about a minute", 'Smaller first download, and animations no longer cost anything while the page sits idle'),
        g('Shorter messages', 'Removed unneeded hints (like where the pet box is) and the "use whole comp" button next to the counter form'),
      ] },
      { kind: 'fix', groups: [
        g(undefined,
          'Attack/Protective formations (four heroes in one column) no longer overflow the team card, and heroes stay full size when there are no backup pets',
          'Desktop counter editor: the team card no longer stretches with long hero notes and stays in view while scrolling',
          'Screenshot reading: short names one letter apart no longer get swapped (e.g. Rook ↔ Sieg)'),
      ] },
    ],
  },
  {
    id: '2026-10-10', version: '1.3', date: '10 Oct 2026', title: 'Light & Words',
    summary: 'Light mode, English, new wording, card-style war plans and step-by-step slot setup',
    sections: [
      { kind: 'new', groups: [
        g('English', 'Settings → Language: Thai / English · hero and pet names use the English game names'),
        g('Light mode', 'Settings → Theme: Dark / Light / Device'),
        g('Card-style war plans', 'Attack and defense plans show one in-game style team card per slot', 'Tap a card for details, and use ‹ › to move between slots'),
        g('Step-by-step slot setup', 'Defense to attack → counter → gear/stats', 'Defense plans start at the defense step · clicking outside asks before discarding changes'),
        g('Full team details', 'Popup with the team formation + gear/stats of each hero'),
        g('Easier team building', 'Double-click an empty slot to open the large hero picker', 'Drag heroes between cards to swap them (e.g. counter ↔ backup team)', '"Clear this hero" button in the gear/stats table'),
        g('Enemy defense page', 'Floating "Edit" button at the bottom right with Edit counter / Add counter / Edit enemy defense'),
        g('Settings', 'Bottom of the ☰ menu: page size, reduce motion, smooth scrolling and local data', 'Switch between editor and viewer view on the guild page'),
        g('Announcement bar', "Shows today's plan for the day type (attack day = attack plan · setup day = defense plan)"),
      ] },
      { kind: 'change', groups: [
        g('New wording', 'Hero, stats, skill queue, formation and speed now use the in-game terms', 'Tags Attack/Magic/Tank → Physical/Magic/Tank (existing guild tags are kept)', 'Target team → enemy defense · attack team → counter · alternate comp → backup team · our defense → defense'),
        g('War plans', 'Every team needs a pet, and you are asked first if the skill queue is incomplete', 'Defense plans warn about heroes or pets used in more than one slot', 'Attack and defense plans are announced separately'),
        g('Stats', 'More accurate screenshot reading (in-team popups work too), and sets/accessories/notes in the same window'),
        g('Look & feel', 'Team cards are the same size everywhere, whatever the formation', 'Tabs have a sliding gold highlight, and gold scrollbars site-wide', 'Delete buttons ask for a second tap instead of a browser dialog'),
        g('Enemy defense search', 'Searches the enemy team only, not counters (more relevant results)'),
        g('Temporarily off', 'Guides/tours and save-as-image — being reworked', 'Picking saved defenses in attack plans — build the defense to attack in the slot setup instead'),
      ] },
      { kind: 'fix', groups: [
        g(undefined,
          'The X button or Esc in a confirmation now cancels (it used to continue)',
          'The star on the guild banner no longer covers the edit code button',
          'No more blinking text cursor when clicking the page',
          'Dragging the war plan rail past its edge and releasing outside no longer keeps it scrolling with the mouse',
          'Guild page tabs (War plans ↔ Enemy defenses) now slide in smoothly all the way',
          'Enemy defense search finds English hero names (e.g. Melia)',
          'Deleting announcements, plans and presets uses a two-tap button — no more browser pop-ups',
          'Mobile: stat inputs are in a single column so stat names are no longer cut off',
          'Slot details no longer show the slot name twice'),
      ] },
    ],
  },
  {
    id: '2026-10-08', version: '1.2', date: '8 Oct 2026', title: 'Practice Grounds',
    summary: 'Per-page help, a practice guild and smoother guild pages',
    sections: [
      { kind: 'new', groups: [
        g('Help', 'A "Help" button on the guild, enemy defense and war plan pages, with practice in a demo guild (nothing is saved)'),
        g('War plans', { text: 'Asks to fill team speed on save when every hero has attack speed', guide: 'stats' }),
        g('Contact', { text: 'Discord button at the bottom right to report bugs or suggest features', guide: 'contact' }),
      ] },
      { kind: 'change', groups: [
        g(undefined, 'Enemy defense page is lighter and scrolls smoothly even with dozens of teams', 'Total War calculator shows the season end time, with sharper rank emblems'),
      ] },
    ],
  },
  {
    id: '2026-10-07', version: '1.1', date: '7 Oct 2026', title: 'Quick Load',
    summary: 'Guild pages load faster',
    sections: [
      { kind: 'change', groups: [
        g(undefined, 'Guilds you opened before show instantly, then refresh in the background', { text: 'Main tags (Physical, Magic, Tank) always come first; custom tags keep their order', guide: 'targets' }),
      ] },
    ],
  },
  {
    id: '2026-10-06', version: '1.0', date: '6 Oct 2026', title: 'Presets & Favorites',
    summary: 'Presets, favorite teams and multi-defense attack slots',
    sections: [
      { kind: 'new', groups: [
        g('Favorites & presets', 'Tap 👍 on counters that won and find them on the "Presets & favorites" page (Discord login)', 'Save counters as your own presets, usable in every guild on every device'),
        g('Attack plans', { text: 'One slot can target up to 3 defenses', guide: 'plans' }),
        g('Stats', { text: 'Read stats from an in-game hero page screenshot, plus a button to reuse your latest stats', guide: 'stats' }),
        g('Total War', 'Points calculator'),
      ] },
      { kind: 'change', groups: [
        g(undefined, { text: 'Enemy defenses edited in the last 24h get a green dot, and recently edited teams go on top', guide: 'targets' }),
      ] },
    ],
  },
]
export const CHANGELOG = EN ? CHANGELOG_EN : CHANGELOG_TH

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
