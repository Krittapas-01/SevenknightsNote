/** สอนทีละขั้นหลังสร้างกิลด์ใหม่ (เก็บในเครื่องที่สร้างกิลด์) */
import type { GuildData } from './types'
import { planKind } from './types'

type Flags = { on: boolean; shared?: boolean; skipDiscord?: boolean; hidden?: boolean; done?: boolean }
const KEY = '7k-note:onboard'
const read = (): Record<string, Flags> => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} } }
function write(gid: string, patch: Partial<Flags>) {
  try {
    const all = read()
    all[gid] = { ...(all[gid] ?? { on: false }), ...patch }
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch { /* ไม่มี storage ก็ไม่เป็นไร */ }
  window.dispatchEvent(new Event('7k-note:onboard'))
}
export const onboardFlags = (gid: string): Flags | null => read()[gid] ?? null
/** ปิดระบบสอน/ทัวร์ไว้ก่อน (ยังทำไม่เสร็จ) — เปิดกลับโดยเปลี่ยนเป็น true */
export const TUTORIAL_ON = false
export const startOnboarding = (gid: string) => { if (TUTORIAL_ON) write(gid, { on: true }) }
export const setOnboard = write
/** กดคัดลอกลิงก์ดูอย่างเดียวแล้ว (นับเป็นแชร์) */
export const markShared = (gid: string) => { if (read()[gid]?.on) write(gid, { shared: true }) }

export type OnboardStep = {
  key: string
  title: string
  how: string
  /** data-onboard ของปุ่มที่ให้กะพริบ */
  target: string
  /** หน้าที่ปุ่มนั้นอยู่ */
  go: (gid: string, d: GuildData) => string
  done: (d: GuildData, f: Flags) => boolean
  optional?: boolean
}

export const ONBOARD_STEPS: OnboardStep[] = [
  {
    key: 'target', title: 'จดบ้านศัตรูบ้านแรก', target: 'add-target',
    how: 'แท็บ "บ้านศัตรู" → กดปุ่มที่กะพริบ → จัดทีมของบ้านศัตรูที่เจอ ใส่แท็ก แล้วกด "บันทึก"',
    go: (g) => `/g/${g}?tab=targets`, done: (d) => d.targets.length > 0,
  },
  {
    key: 'counter', title: 'จดทีมที่ใช้ตีบ้านนั้น', target: 'add-counter',
    how: 'เปิดบ้านที่จดไว้ → "เพิ่มทีมแก้" → จัดทีมที่ตีผ่าน ตั้งลำดับการใช้สกิล แล้วกด "บันทึก"',
    go: (g, d) => (d.targets[0] ? `/g/${g}/t/${d.targets[0].id}` : `/g/${g}?tab=targets`), done: (d) => d.targets.some((t) => t.counters.length > 0),
  },
  {
    key: 'plan', title: 'สร้างแผนบุกแผนแรก', target: 'new-attack',
    how: 'แท็บ "แผนสงคราม" → "สร้างแผนบุก" → แต่ละไม้เลือกจากบ้านศัตรูที่จดไว้ (ทีมแก้จะมาด้วย) แล้ว "บันทึกแผน"',
    go: (g) => `/g/${g}`, done: (d) => d.plans.some((p) => planKind(p.data) === 'attack'),
  },
  {
    key: 'announce', title: 'ประกาศให้กิลด์ใช้แผน', target: 'announce',
    how: 'หน้ากิลด์ → ปุ่ม "ประกาศ" → เลือกแผนที่ให้ใช้ (และกิลด์ที่เจอ) แล้วกดประกาศ',
    go: (g) => `/g/${g}`, done: (d) => d.announcements.some((a) => !!a.planId),
  },
  {
    key: 'share', title: 'ส่งลิงก์ให้คนในกิลด์', target: 'share',
    how: 'กด "ลิงก์ดูอย่างเดียว" เพื่อคัดลอก แล้ววางในแชตกิลด์ — ทุกคนเปิดดูแผนได้ไม่ต้องสมัคร',
    go: (g) => `/g/${g}`, done: (_d, f) => !!f.shared,
  },
  {
    key: 'discord', title: 'เชื่อม Discord ของกิลด์', target: 'discord', optional: true,
    how: 'ไอคอนแชตในแถวตารางสงคราม → วางลิงก์ Webhook ของห้อง → ประกาศจะเข้าห้อง Discord อัตโนมัติ',
    go: (g) => `/g/${g}`, done: (d, f) => !!d.discord?.connected || !!f.skipDiscord,
  },
]
