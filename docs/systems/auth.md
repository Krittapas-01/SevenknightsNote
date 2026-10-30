# ระบบสิทธิ์และล็อกอิน (1.7)

แผนภาพ Mermaid (GitHub/VS Code แสดงเป็นรูปให้เอง) · โค้ดอยู่ใน `api/src/index.ts` (checkAuth / viewGate / currentUser / touchSession) · เทสต์ `api/tests/view-lock.mjs`, `owner.mjs`, `session.mjs`

แก้ระบบเหล่านี้เมื่อไหร่ ให้แก้แผนภาพในไฟล์นี้ด้วย

## 1 · ใครทำอะไรได้ในหน้ากิลด์ (แบบสิทธิ์เดียว 1.7)

ทุกคำขอบอกระดับที่ต้องใช้ (ดู / แก้ / เจ้าของ) แล้วเช็กทางที่ถูกที่สุดก่อน ยังอ่านฐานข้อมูลแค่ 1 แถวต่อการเปิดหน้า

โค้ด: ดู = `viewGate` · แก้ = `checkKey` · เจ้าของ = `checkOwner` (ทั้งหมดผ่าน `checkAuth`) · ตัวนับรหัสผิดแยกกัน 2 ชุด: รหัสเข้ากิลด์ กับ รหัสแก้ไข — คนแก้ผ่านได้แม้ IP นั้นโดนล็อกเพราะใส่รหัสเข้ากิลด์ผิด

```mermaid
flowchart TD
  A(["คำขอเข้ามา + ระดับที่ต้องใช้<br/>ดู · แก้ · เจ้าของ"]) --> B[("อ่านแถวกิลด์ 1 แถว<br/>รหัสแก้ไข · รหัสเข้ากิลด์ · ตั้งค่า Discord · ตัวนับรหัสผิด")]
  B --> C{"ใส่รหัสผิดเกิน 10 ครั้ง<br/>ใน 15 นาที?"}
  C -- ใช่ --> LOCK["429 ล็อก 15 นาที"]
  C -- ไม่ --> D{"ต้องการแค่ ดู?"}
  D -- ใช่ --> E{"กิลด์ตั้งรหัสเข้ากิลด์ไหม"}
  E -- ไม่ตั้ง --> OKV["ผ่าน · คนดู"]
  E -- ตั้ง --> F{"รหัสเข้ากิลด์ถูก?"}
  F -- ถูก --> OKV
  F -- ไม่มี / ผิด --> G
  D -- ไม่ --> G{"รหัสแก้ไขถูก?"}
  G -- ถูก --> OKO["ผ่าน · เจ้าของ"]
  G -- ไม่มี / ผิด --> H{"ต้องการ เจ้าของ?"}
  H -- ใช่ --> DENY
  H -- ไม่ --> I{"ล็อกอิน Discord<br/>และมียศที่ติ๊กไว้?<br/>(รูป 2)"}
  I -- มี --> OKE["ผ่าน · คนแก้ได้"]
  I -- ไม่มี --> J{"ต้องการแค่ ดู?"}
  J -- ใช่ --> GATE["401 ขึ้นกล่องใส่รหัสเข้ากิลด์"]
  J -- ไม่ --> DENY["403 ไม่มีสิทธิ์"]

  classDef ok fill:#d1fadf,stroke:#12b76a,color:#054f31
  classDef bad fill:#fee4e2,stroke:#f04438,color:#7a271a
  classDef gate fill:#fef0c7,stroke:#f79009,color:#7a2e0e
  class OKV,OKO,OKE ok
  class DENY,LOCK bad
  class GATE gate
```

## 2 · เช็กยศ Discord (คนแก้ได้)

กล่องสีเหลือง: ถ้า token Discord หมดอายุ Discord ตอบ 401 แล้วคนแก้ได้จะกลายเป็นคนดูเงียบ ๆ — เพราะแบบนี้ตอนต่ออายุ session (รูป 4) ต้องขอ token Discord ใหม่ไปพร้อมกันเสมอ

```mermaid
flowchart TD
  A(["ต้องรู้ว่าคนนี้มียศแก้ได้ไหม"]) --> B{"กิลด์ใส่ Server ID<br/>และติ๊กยศ แก้แผนได้ ไว้?"}
  B -- ไม่ --> NO["ไม่มียศ"]
  B -- ใช่ --> C{"มี session ที่ยังไม่หมดอายุ?<br/>(รูป 4)"}
  C -- ไม่ --> NO
  C -- มี --> D[("member_cache<br/>user_id:server_id")]
  D --> E{"เช็กไปไม่เกิน 5 นาที?"}
  E -- ใช่ --> R{"มียศที่ติ๊กไว้?"}
  E -- ไม่ / ไม่เคยเช็ก --> F["ถาม Discord<br/>GET /users/@me/guilds/:server/member<br/>ด้วย access_token ของคนนี้"]
  F -- "200" --> G["จำยศใหม่ + เวลา"]
  F -- "404 ไม่อยู่ในเซิร์ฟ" --> G2["จำว่าไม่มียศ"]
  F -- "401 token หมดอายุ / 429 / ล่ม" --> H["ใช้ผลเก่าถ้ามี<br/>ไม่จำผลนี้"]
  G --> R
  G2 --> R
  H --> R
  R -- มี --> OK["คนแก้ได้"]
  R -- ไม่มี --> NO
  CLEAN["ทุกคืน ลบผลที่เก่ากว่า 24 ชม."] -.-> D

  classDef ok fill:#d1fadf,stroke:#12b76a,color:#054f31
  classDef bad fill:#fee4e2,stroke:#f04438,color:#7a271a
  classDef warn fill:#fef0c7,stroke:#f79009,color:#7a2e0e
  class OK ok
  class NO bad
  class H warn
```

## 3 · ล็อกอินด้วย Discord

1.7 เก็บ refresh_token, created_at และ last_seen ไว้ใน session ด้วย

```mermaid
sequenceDiagram
  actor U as ผู้ใช้
  participant W as เว็บ (Pages)
  participant A as API (Worker)
  participant D as Discord
  participant DB as D1
  U->>W: กด ล็อกอินด้วย Discord
  W->>A: GET /api/auth/discord/login?return=หน้าเดิม
  A->>DB: เก็บ state สุ่ม (อายุ 10 นาที)
  A-->>U: พาไปหน้า Discord (scope identify + guilds.members.read)
  U->>D: กดอนุญาต
  D-->>A: GET /api/auth/discord/callback?code&state
  A->>DB: เช็ก state แล้วลบทิ้ง
  A->>D: แลก code เป็น access_token (อายุ 7 วัน) + refresh_token
  A->>D: GET /users/@me (ชื่อ รูป)
  A->>DB: INSERT session: token_hash, access_token, expires_at = ตอนนี้ + 7 วัน
  Note over A,DB: ใหม่ 1.7: เก็บ refresh_token และ created_at ด้วย (ตอนนี้ทิ้ง refresh_token ไป)
  A-->>W: กลับหน้าเดิม #discord=token
  W->>W: เก็บ token ในเครื่อง ส่งเป็น Authorization: Bearer ทุกคำขอ
```

## 4 · เช็ก session + ต่ออายุ (ใหม่ 1.7)

กล่องสีน้ำเงินคือของใหม่ 1.7 · เกือบทุกคำขอจบที่ “ใช้ต่อ ไม่เขียนอะไร” · ต่ออายุ ~4 วันครั้งต่อคน + จด last_seen วันละครั้ง (หน้า admin) · คำขอพร้อมกันหลายอันจองด้วย last_seen ก่อน ขอ token Discord ได้ทีละครั้ง · Discord ตอบ 400/401 = เลิกต่อ ใช้จนหมดแล้วล็อกอินใหม่

```mermaid
flowchart TD
  A(["คำขอมี Authorization: Bearer"]) --> B[("อ่าน session 1 แถว<br/>(อ่านอยู่แล้วทุกครั้ง)")]
  B --> C{"เจอ และยังไม่หมดอายุ?"}
  C -- ไม่ --> OUT["ถือว่าไม่ได้ล็อกอิน<br/>เว็บขึ้นปุ่มล็อกอินใหม่"]
  C -- ใช่ --> D{"เหลือน้อยกว่า 3 วัน?"}
  D -- ไม่ --> USE["ใช้ต่อ ไม่เขียนอะไร<br/>(เกือบทุกคำขอจบตรงนี้)"]
  D -- ใช่ --> E{"ล็อกอินครั้งแรกเกิน 30 วัน?<br/>(ถ้าเปิดเพดาน)"}
  E -- ใช่ --> STAY["ไม่ต่อ ใช้จนครบ<br/>แล้วล็อกอินใหม่"]
  E -- ไม่ --> F{"มี refresh_token?"}
  F -- "ไม่มี (session ก่อน 1.7)" --> STAY
  F -- มี --> G["ขอ access_token ใหม่จาก Discord<br/>(ทำเบื้องหลัง ไม่ให้หน้าช้า)"]
  G -- "ได้" --> H[("UPDATE session<br/>access_token, refresh_token ใหม่<br/>expires_at = ตอนนี้ + 7 วัน<br/>(+ last_seen ถ้าเปิด)")]
  G -- "ไม่ได้ เช่น ถอนสิทธิ์แอปใน Discord" --> STAY
  H --> USE
  STAY --> USE

  classDef ok fill:#d1fadf,stroke:#12b76a,color:#054f31
  classDef bad fill:#fee4e2,stroke:#f04438,color:#7a271a
  classDef new fill:#e0eaff,stroke:#444ce7,color:#2d3282
  class USE ok
  class OUT bad
  class E,F,G,H new
```

## 5 · ชีวิตของ session ล็อกอิน

คนที่เข้าเว็บอย่างน้อยทุก 7 วันจะไม่หลุด (จนครบเพดาน 30 วัน ถ้าเปิด)

```mermaid
flowchart LR
  START(("ล็อกอิน")) -- "อายุ 7 วัน" --> ACT["ใช้งาน<br/>เหลือ 3–7 วัน"]
  ACT -- "ผ่านไป 4 วัน" --> SOON["ใกล้หมด<br/>เหลือไม่ถึง 3 วัน"]
  SOON -- "เข้าเว็บ<br/>ต่อเป็น 7 วัน<br/>+ token Discord ใหม่" --> ACT
  SOON -- "ไม่เข้าเว็บจนครบ<br/>ครบเพดาน 30 วัน<br/>ต่อ token ไม่ได้" --> EXP["หมดอายุ<br/>ลบตอนเก็บกวาดทุกคืน"]
  ACT -- "กดออกจากระบบ" --> OUT["ออกจากระบบ<br/>ลบแถวทันที"]
  SOON -- "กดออกจากระบบ" --> OUT

  classDef ok fill:#d1fadf,stroke:#12b76a,color:#054f31
  classDef warn fill:#fef0c7,stroke:#f79009,color:#7a2e0e
  classDef bad fill:#fee4e2,stroke:#f04438,color:#7a271a
  class ACT ok
  class SOON warn
  class EXP,OUT bad
```

## 6 · ตารางที่เกี่ยวข้อง

view_code มาจาก 1.6.1 (migration 0031) · 3 คอลัมน์ “ใหม่ 1.7” ใน sessions มาจาก migration 0032_session_renew

```mermaid
erDiagram
  guilds ||--o| guild_settings : "ตั้งค่า"
  guilds ||--o{ auth_fails : "ตัวนับรหัสผิด"
  guild_settings ||--o{ member_cache : "server_id"
  sessions }o--o{ member_cache : "user_id"
  guilds {
    TEXT id PK
    TEXT edit_hash "รหัสแก้ไข = เจ้าของ"
    TEXT view_code "รหัสเข้ากิลด์ 1.6.1"
  }
  guild_settings {
    TEXT guild_id PK
    TEXT discord_guild_id "Server ID"
    TEXT discord_edit_roles "ยศที่แก้ได้"
    TEXT discord_role_names "ชื่อยศ"
  }
  auth_fails {
    TEXT k PK "gid:ip"
    INTEGER count "ผิดได้ 10"
    INTEGER since "ใน 15 นาที"
  }
  sessions {
    TEXT token_hash PK
    TEXT user_id "Discord"
    TEXT access_token "อายุ 7 วัน"
    INTEGER expires_at
    TEXT refresh_token "ใหม่ 1.7"
    INTEGER created_at "ใหม่ 1.7"
    INTEGER last_seen "ใหม่ 1.7 ถ้าเปิด"
  }
  member_cache {
    TEXT k PK "user_id:server_id"
    TEXT roles "JSON"
    INTEGER at "แคช 5 นาที"
  }
  oauth_states {
    TEXT state PK
    TEXT return_to
    INTEGER created_at "อายุ 10 นาที"
  }
```
