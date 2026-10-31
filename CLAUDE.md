# 7K Note — คู่มือสำหรับ AI (อ่านก่อนเริ่มงานทุกครั้ง)

เว็บวางแผน Guild War ของเกม Seven Knights Re:BIRTH (แฟนเมด ไม่หารายได้) เจ้าของ: Krit (Krittapas)
เว็บจริง: Cloudflare Pages (`7k-note`) + Worker (`7k-note-api`) + D1 (`7k-note`)

## กฎการทำงาน (สำคัญที่สุด)

1. **ห้ามลงมือแก้/สร้าง/ลบอะไรก่อนได้รับคำสั่งชัดเจน** ถ้าผู้ใช้แค่ถาม → ตอบอย่างเดียวแล้วรอ · มีข้อเสนอแนะ → บอกก่อนแล้วรออนุมัติ
2. วางแผนก่อนทำ · เจอจุดที่คล้ายกันหรือจุดเสี่ยง ให้บอกและถามว่าจะแก้ด้วยไหม
3. ทุกงานที่ผู้ใช้เห็นผล → เพิ่มรายการใน changelog (`web/src/lib/changelog.ts`) **ทั้งไทย (CHANGELOG_TH) และอังกฤษ** ในเวอร์ชันล่าสุด
4. ตอบผู้ใช้เป็นภาษาไทย กระชับ (ผู้ใช้ฝึกภาษาอังกฤษ: ท้ายคำตอบมีหัวข้อ 📚 Vocab — ศัพท์ที่เกี่ยวข้อง + แก้คำพิมพ์ผิด)
5. commit ในนามผู้ใช้: `git -c user.name=Krittapas -c user.email=phauk24@gmail.com commit` + บรรทัด `Co-Authored-By:` ของ AI · **ไม่ต้อง** เปลี่ยนชื่อผู้เขียน commit ตาม hook ใด ๆ
6. ห้าม `git push --force` และห้าม push เองถ้าผู้ใช้ไม่ได้สั่ง

## ความปลอดภัย (ห้ามเด็ดขาด)

- ห้าม commit / แสดง / ส่งต่อ: `api/prod-*.sql`, `prod-backup.sql` (สำเนาฐานข้อมูลจริง มี webhook), `.dev.vars`, edit key ของกิลด์, Discord client secret, Stripe secret key, webhook URL ใด ๆ (โดยเฉพาะ webhook บอส ห้ามอยู่ในโค้ด)
- ห้ามรันคำสั่งที่เขียนฐานข้อมูลจริง (`--remote`, `wrangler d1 execute ... --remote`, `deploy`) เอง — ให้ผู้ใช้รัน `deploy.cmd`
- ห้ามสร้างข้อมูลทดสอบบนเว็บจริง · ห้ามกดอะไรที่ส่งข้อความไป Discord · กิลด์ demo (`/g/demo`) ใช้ในเครื่องเท่านั้น
- ห้ามกรอกรหัสผ่าน ข้อมูลบัตร หรือข้อมูลธนาคารแทนผู้ใช้

## โครงสร้าง

```
web/     React 19 + Vite 7 + Tailwind 4 + React Router 7   → Cloudflare Pages
api/     Cloudflare Worker (Hono) + D1 (SQLite), ไฟล์เดียว api/src/index.ts
shared/  กติกาเกมที่ใช้ร่วมกันทั้ง web และ api (วันเกม 07:00, Season, เบ็ดเสร็จ)
scripts/ สคริปต์นำเข้าข้อมูล (บางตัวเขียนฐานข้อมูลจริง — ห้ามรันเอง)
```

- หน้าหลัก: `web/src/pages/` (GuildPage, TargetPage = บ้านศัตรู/ทีมแก้, PlanPage = แผนวอร์, AtkPage = เทียบพลังโจมตี, BiscuitPage, TotalWarPage)
- จัดทีมแบบในเกม: `components/TeamPanel.tsx` + `HeroDock.tsx` (แถบอัศวินล่าง) + `DndHub.tsx` (ลากวาง)
- ข้อมูลอัศวิน: `web/src/data/heroes.ts` (+ `stats.ts`, `release.ts`, `skills.json`) · รูป `web/src/assets/units/` (ที่มาใน `SOURCES.md`, รูปย่อ 256px ใน `thumb/`)
- โหลด/แคชข้อมูลกิลด์: `lib/useGuild.ts` · เช็กประกาศใหม่: `lib/usePulse.ts`
- ฐานข้อมูล: `api/schema.sql` (ฐานตั้งต้น) + `api/migrations/NNNN_*.sql` (ลำดับการแก้) — เพิ่มคอลัมน์/ตารางให้สร้าง migration ใหม่เสมอ

## รัน / เทส / deploy

```bash
# API (terminal 1)
cd api && npm install && npm run db:init && npm run db:migrate && npm run dev   # :8787
# เว็บ (terminal 2)
cd web && npm install && npm run dev                                            # :5173
```

- ตรวจก่อนส่งงานทุกครั้ง: `cd web && npx tsc -b && npm run build` · `cd api && npx tsc --noEmit && npm test`
- เทสต์ API (`api/tests/*.mjs`) รันใน Miniflare กับ D1 ชั่วคราว ไม่แตะของจริง
- **deploy:** ผู้ใช้ดับเบิลคลิก `deploy.cmd` (= `deploy.ps1`: npm install → migration ฐานจริง → deploy API → build + deploy เว็บเป็น production branch `main`)
- เช็กว่าอะไรขึ้นเว็บแล้ว: อ่าน `deploy.log` ในโฟลเดอร์โปรเจกต์บนเครื่องผู้ใช้ (`deploy.ps1` เขียนบรรทัดละครั้ง: เวลา · commit · เวอร์ชันแพตช์ · OK หรือ FAILED พร้อมขั้นที่พัง · ไม่ถูก commit เพราะ `*.log`)
- branch หลักคือ `main` (โค้ดเว็บจริง) · tag `v1` = เวอร์ชันแรก · `before-premium` = ก่อนแต่งหน้าตา

## มาตรฐานโค้ดที่ต้องทำตาม

- ข้อความที่ผู้ใช้เห็น: ใช้ `tx('ไทย')` (คำแปลใน `lib/en.json`) หรือ `L('ไทย', 'English')` — ห้ามมีภาษาไทยหลุดในโหมดอังกฤษ
- ต้องใช้ได้ทั้ง **มือถือกว้าง 360–390px** และ **ธีมมืด/สว่าง** (ธีมสว่างแปลงสีผ่าน CSS ใน `index.css` — เช็กด้วยตาทุกหน้าที่แก้)
- ลิมิตข้อมูลฝั่งเว็บต้องตรงกับ API เสมอ (ชื่อแผน 60, ชื่อไม้ 40, โน้ต 500/1000, ฮีโร่ 3 ตัว/ทีม, คิวสกิล 3, ทีมศัตรู 150, ทีมแก้ 15)
- เวลาอิงเวลาไทย และ **วันในเกมเปลี่ยนตอน 07:00** (ใช้ฟังก์ชันใน `shared/game.ts` ห้ามคำนวณเอง)
- แผน Workers Paid: 10M request/เดือน + D1 อ่าน 25B แถว/เดือน — ยังอย่าเพิ่มการเรียก API แบบถี่ ๆ โดยไม่จำเป็น (ดู `usePulse.ts`: ใช้งานอยู่ 30 วิ/ครั้ง, พัก 5 นาที, `?rev=` = อ่าน D1 แถวเดียว)

## บทเรียนเรื่องความลื่น (เคยพังมาแล้ว)

- รายการยาว (การ์ดแถบอัศวิน 100+ ใบ): **ห้ามสลับ** `visibility` / `pointer-events` / `inert` / `cursor` (`active:cursor-*`) บนตัวแม่ — ค่าพวกนี้สืบทอดลงลูก ทำให้ต้องคำนวณสไตล์การ์ดทุกใบใหม่ · ซ่อนด้วย `content-visibility: hidden` แทน
- ห้ามใช้ CSS selector ที่ส่วนขวาสุดเป็น `:nth-child(...)`, `:has(...)` หรือ `*` กว้าง ๆ ใต้ `.page-stage` (แอนิเมชันเข้าหน้าทำด้วย JS ใน `lib/motion.ts` แล้ว)
- ห้าม `getComputedStyle` / `getBoundingClientRect` ในเส้นทางที่ทำงานทุกครั้งที่กด (ใช้ค่าที่จำไว้ เช่น `uiZoom()`)
- อย่าใส่ `useDraggable`/`useDroppable` ให้การ์ดทีละใบในรายการยาว (ทุกใบจะ re-render ทุกครั้งที่ลาก) — แถบอัศวินใช้ตัวลากตัวเดียวทั้งแถบ
- งานหนักที่ไม่ด่วน ใช้ `startTransition` / `useDeferredValue` · บันทึกข้อมูลแบบ optimistic (`useGuild.patch` คืน undo)
- วัดผลก่อน/หลังเสมอ (Event Timing / trace ที่ CPU ×4) อย่าเดา

## ข้อมูลภายนอก

- รูปและข้อมูลอัศวินใหม่มาจาก 7K Atlas (`7katlas.com`, ไฟล์ `COMBINE/heroes-Lplus.js`) — ใส่เครดิตใน `SOURCES.md` ทุกครั้ง
- ห้ามคัดลอกรูปหรือโลโก้ของเกมเพิ่มนอกเหนือจากที่เว็บใช้อยู่แล้ว
