# Brief: ทำ 7K Note ให้ดูพรีเมียม (สำหรับส่งต่อให้ AI/คนอื่นทำต่อ)

## บริบทโปรเจกต์
- เว็บจัดแผน Guild War เกม Seven Knights Re:BIRTH — React 19 + Vite + Tailwind v4 (web/), Cloudflare Worker + Hono + D1 (api/)
- ธีมอิงหน้าจอในเกม: พื้นกรมท่าเข้ม, กรอบทอง (#f4d58d), ทีมเรา = panel-gold, ทีมศัตรู = panel-enemy (ม่วง), ตัว VS ทองเรืองแสง
- สไตล์หลักอยู่ที่ web/src/index.css (.panel, .pill, .btn-gold, .vs-text, .orb, .slot-empty) ฟอนต์ Kanit
- คอมโพเนนต์หลัก: TeamPanel.tsx (การ์ดทีม), UnitCard.tsx (การ์ดตัวละคร), HeroDock.tsx (แถบเลือกตัวละครล่าง), WarBoard.tsx + AnnouncementBar.tsx (ประกาศ), PlanPage.tsx (แผนวอร์ 5 ไม้)
- ห้ามแตะ: โครงสร้างข้อมูลใน lib/types.ts, API, ระบบลากวาง (DndHub.tsx) — แก้เฉพาะหน้าตา

## สิ่งที่อยากได้ (เรียงตามความคุ้ม)
1. การ์ดตัวละคร (UnitCard): ใส่รูปจริงจาก web/src/assets/units/ แล้ว เพิ่มขอบตามระดับ/ธาตุ + เงา + hover ยกตัวนุ่ม ๆ
2. พื้นหลังหน้า: เพิ่ม texture/ลายวงเวทจาง ๆ + แสงฟุ้งน้ำเงิน-แดงหลัง VS แบบในเกม
3. ปุ่มหลัก (.btn-gold, .pill): ขอบทองสองชั้น + ประกายตอน hover
4. Animation: การ์ดเด้งเข้า slot, modal เปิดแบบ scale+fade, ดาวจองสกิลวิบวับ (ใช้ CSS/transition เท่านั้น ไม่เพิ่มไลบรารีหนัก)
5. หน้า Landing / หน้ากิลด์: header ใหญ่แบบโปสเตอร์เกม, การ์ดแผนมี ornament มุมทอง
6. ตัวเลข/หัวข้อ: ใช้ฟอนต์หัวข้อหนาขึ้น (เช่น Kanit 800) ตัวเลขสปีดแบบ tabular

## เงื่อนไข
- ต้องใช้ได้ดีบนมือถือ (กว้าง 390px)
- อย่าให้ช้า: ไม่ใช้ภาพพื้นหลังใหญ่เกิน 200KB
- เช็กด้วย `npx tsc -b` และ `npm run build` ใน web/ ต้องผ่าน
