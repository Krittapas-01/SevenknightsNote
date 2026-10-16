# 7K Note — วางแผน Guild War · Seven Knights Re:BIRTH

เว็บแฟนเมด (ไม่หารายได้) สำหรับกิลด์: จดทีมกันของศัตรูพร้อมทีมแก้และลำดับสกิล · แผนวอร์ 5 ไม้ · ประกาศ (ส่งเข้า Discord ได้) · เครื่องคิดเบ็ดเสร็จ/บิสกิต/เทียบพลังโจมตี · ไทย/อังกฤษ · ธีมมืด/สว่าง

> AI ที่จะช่วยทำโปรเจกต์นี้: อ่าน [CLAUDE.md](CLAUDE.md) ก่อน

```
web/     React 19 + Vite + Tailwind 4 + React Router   → Cloudflare Pages
api/     Cloudflare Worker (Hono) + D1 (SQLite)         → Cloudflare Workers
shared/  กติกาเกมที่ใช้ร่วมกัน (วันเกมเปลี่ยน 07:00, Season)
```

## รันบนเครื่อง (เปิด 2 terminal)

```bash
# terminal 1 — API
cd api
npm install
npm run db:init       # สร้างตารางตั้งต้นใน D1 ในเครื่อง (ครั้งแรกครั้งเดียว)
npm run db:migrate    # อัปเดตตารางตาม api/migrations (รันทุกครั้งที่ดึงโค้ดใหม่)
npm run dev           # http://localhost:8787

# terminal 2 — เว็บ
cd web
npm install
npm run dev           # http://localhost:5173 (ส่ง /api ต่อไปที่ 8787 ให้เอง)
```

> npm รุ่นใหม่อาจเตือน `allow-scripts` ของ `esbuild`/`workerd` ถ้า `npm run dev` ขึ้นว่าหาโปรแกรมไม่เจอ ให้รัน `npm approve-scripts esbuild workerd` แล้ว `npm rebuild esbuild workerd`

## ตรวจก่อนส่งงาน

```bash
cd web && npx tsc -b && npm run build
cd api && npx tsc --noEmit && npm test     # เทสต์รันใน Miniflare กับฐานข้อมูลชั่วคราว
```

## Deploy

ดับเบิลคลิก `deploy.cmd` (หรือพิมพ์ `deploy`) — ทำให้ครบในคำสั่งเดียว:
npm install → อัปเดตฐานข้อมูลจริง (migrations) → deploy API → build เว็บ → deploy ขึ้น Pages (production branch `main`)

ครั้งแรกต้อง `npx wrangler login` ก่อน · ค่าลับ (Discord OAuth ฯลฯ) ตั้งด้วย `npx wrangler secret put <NAME>` ในโฟลเดอร์ `api/`

## Branch

- `main` = โค้ดของเว็บจริง (ทำงานและ deploy จากที่นี่)
- tag `v1` = เวอร์ชันแรก · tag `before-premium` = ก่อนแต่งหน้าตารอบใหญ่

## สิทธิ์แก้ไข (ไม่ต้องสมัครสมาชิก)

- สร้างกิลด์แล้วได้ **edit key** เก็บใน localStorage ของเครื่องนั้น (server เก็บแค่ hash)
- `/g/<id>` = ดูอย่างเดียว · `/g/<id>?key=...` = ลิงก์สำหรับแก้ไข (ส่งเฉพาะคนที่ช่วยจด)
- ล็อกอิน Discord + ตั้งยศที่แก้ไขได้ในหน้าตั้งค่ากิลด์ ก็แก้ได้โดยไม่ต้องมีลิงก์

## ข้อมูลอัศวินและรูป

- รายชื่อ/ประเภท/ชื่ออังกฤษ: `web/src/data/heroes.ts` · ค่าพลังพื้นฐาน `stats.ts` · วันเข้าเกม `release.ts` · สกิล `skills.json`
- รูป: `web/src/assets/units/<ชื่ออังกฤษ>.webp` + รูปย่อ 256px ใน `thumb/` (สร้างด้วย `scripts/make-thumbs.py`) · ที่มาของรูปจดไว้ใน `SOURCES.md`
- รูปและข้อมูลอัศวินเป็นลิขสิทธิ์ของ Netmarble · ข้อมูลบางส่วนจาก [7K Atlas](https://7katlas.com) (ใส่เครดิตไว้ท้ายเว็บ)

## ฐานข้อมูล

`api/schema.sql` = ตารางตั้งต้น · การเปลี่ยนแปลงหลังจากนั้นอยู่ใน `api/migrations/` (เพิ่มไฟล์ใหม่ทุกครั้ง ห้ามแก้ไฟล์เก่า)

ตารางหลัก: `guilds` · `targets` (ทีมกันศัตรู) · `counters` (ทีมแก้) · `plans` (แผนวอร์ เก็บเป็น JSON) · `announcements` · `guild_settings`

> ห้าม commit สำเนาฐานข้อมูลจริง (`api/prod-*.sql`) — มี webhook และข้อมูลกิลด์
