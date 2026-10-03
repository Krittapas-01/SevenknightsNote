export const SLOT_COUNT = 5
/** จำนวนฮีโร่สูงสุดต่อทีม (ช่องทั้งหมดมี 5 ช่อง แต่ลงได้ไม่เกินเท่านี้) — ต้องตรงกับฝั่ง api */
export const MAX_HEROES = 3
/** ช่องเสริมใต้สัตว์เลี้ยง */
export const EXTRA_COUNT = 4
/** จำนวนไม้ในแผนวอร์ */
export const WAR_SLOTS = 5

export type Team = {
  /** จำนวนช่องแถวหน้า 1-4 (ที่เหลือคือแถวหลัง) */
  front: number
  /** 5 ช่อง: index 0..front-1 = แถวหน้า, front..4 = แถวหลัง */
  slots: (string | null)[]
  pet: string | null
  /** ช่องเสริม 4 ช่องใต้สัตว์เลี้ยง */
  extras: (string | null)[]
  speed: number
  /** จองสกิลที่เก็บในตัวทีม (ใช้กับทีมศัตรู/บ้านที่ไม่มีช่อง skills แยก) */
  skills?: SkillStep[]
}

/** skill: 1 = สกิลบน, 2 = สกิลล่าง, 3 = สกิลอเวค (เฉพาะตัวร่าง awake ที่มีสกิลอเวค) */
export type SkillKey = 1 | 2 | 3
export type SkillStep = { slot: number; skill: SkillKey }
export const SKILL_LABEL: Record<SkillKey, string> = { 1: 'บน', 2: 'ล่าง', 3: 'อเวค' }

export type Counter = {
  id: string
  targetId: string
  team: Team
  skills: SkillStep[]
  note: string
  /** ของ/สเตตัสรายตัว */
  heroNotes?: HeroNote[]
  createdAt: number
  updatedAt: number
}

export type Target = {
  id: string
  team: Team
  tags: string[]
  note: string
  counters: Counter[]
  createdAt: number
  updatedAt: number
}

export type Guild = { id: string; name: string; createdAt: number }
/** โน้ตรายตัว: ของ/แหวน/สเตตัส */
import type { HeroStats } from './stats'
export type HeroNote = { hero: string; text: string; sets: string[]; rings: string[]; stats?: HeroStats }

export type WarOption = {
  team: Team
  skills: SkillStep[]
  /** เงื่อนไข เช่น "มีซอรัน C6" / "ถ้าไม่มี" */
  condition: string
  /** โน้ต ขึ้นบรรทัดใหม่ = ข้อใหม่ */
  notes: string
  heroNotes?: HeroNote[]
  /** จัดทีมเองในแผน (ไม่ได้มาจากคลังคอมพ์) */
  custom?: boolean
  /** ถามเรื่องจดลงจดทีมศัตรูแล้ว */
  logged?: boolean
}
export type WarSlot = {
  name: string
  kind: 'attack' | 'defense'
  /** ไม้บุก: บ้าน (ทีมกันศัตรู) ที่จะตี */
  vs?: Team | null
  /** ประเภทบ้าน เช่น เวทย์/กายภาพ */
  vsTag?: string
  /** id บ้านในคลังคอมพ์ (ใช้เปิดทีมแก้ของบ้านนั้น) */
  vsId?: string
  /** ไม้บุก: index ทีมหลักที่จะใช้จริง (ไม่ใส่ = ทีมแรก) */
  main?: number
  options: WarOption[]
}
export const MAX_OPTIONS = 8
export type PlanKind = 'attack' | 'defense'
export type PlanData = {
  /** แผนบุก / แผนกัน (ทุกไม้ในแผนเป็นแบบเดียวกัน) */
  kind?: PlanKind
  op: string[]
  /** ชุดทีมที่ยกเลิก (ตั้งพร้อมกันครบชุดถึงจะนับว่าผิด) */
  banned: string[][]
  note: string
  slots: WarSlot[]
}
export type Plan = { id: string; title: string; data: PlanData; createdAt: number; updatedAt: number }

export type DayType = 'attack' | 'defense' | 'rest'
export type Announcement = { id: string; body: string; planId: string | null; opponent: string; createdAt: number; /** ระบบประกาศเองตอน 07:00 */ auto?: boolean; /** คนประกาศ (ถ้าล็อกอิน Discord) */ author?: { name: string; avatar: string; role?: string } | null }

export type GuildData = {
  guild: Guild
  targets: Target[]
  plans: Plan[]
  /** ล่าสุดก่อน */
  announcements: Announcement[]
  /** 7 ช่อง จันทร์..อาทิตย์ */
  schedule: DayType[]
  /** ประกาศวันใหม่อัตโนมัติ 07:00 */
  autoAnnounce?: boolean
  /** ช่วง Season (วันในเกม YYYY-MM-DD, ว่าง = ไม่ได้ตั้ง) */
  season?: { start: string; end: string }
  /** แจ้งเตือนเข้า Discord (ไม่มี URL — เป็นความลับ) */
  discord?: { connected: boolean; mention: string; /** เซิร์ฟเวอร์ Discord + ยศที่แก้แผนได้ */ serverId: string; editRoles: string[]; /** ชื่อยศที่แสดงหลังชื่อคนประกาศ เรียงตามความสำคัญ */ roleNames?: { id: string; name: string }[] }
}

export const emptyPlan = (kind: PlanKind = 'attack'): PlanData => ({
  kind,
  op: [],
  banned: [],
  note: '',
  slots: Array.from({ length: WAR_SLOTS }, (_, i) => ({ name: `ไม้ ${i + 1}`, kind, vs: null, vsTag: '', vsId: '', options: [] })),
})
/** ชนิดแผน (แผนเก่าที่ยังไม่มี kind → ดูจากไม้ส่วนใหญ่) */
export const planKind = (d: PlanData): PlanKind =>
  d.kind ?? (d.slots.filter((s) => s.kind === 'defense').length > d.slots.filter((s) => s.kind === 'attack').length ? 'defense' : 'attack')
export const PLAN_KIND_LABEL: Record<PlanKind, string> = { attack: 'แผนบุก', defense: 'แผนกัน' }
/** เปลี่ยนชนิดแผน = ทุกไม้เปลี่ยนตาม */
export const withPlanKind = (d: PlanData, kind: PlanKind): PlanData => ({ ...d, kind, slots: d.slots.map((s) => ({ ...s, kind })) })
export const emptyOption = (): WarOption => ({ team: emptyTeam(), skills: [], condition: '', notes: '' })

export const emptyTeam = (): Team => ({
  front: 2,
  slots: [null, null, null, null, null],
  pet: null,
  extras: [null, null, null, null],
  speed: 0,
})

export const heroCount = (t: Team) => t.slots.filter(Boolean).length

export type SlotRef = { kind: 'hero' | 'pet' | 'extra'; index: number }

const remap = (skills: SkillStep[], map: Map<number, number>) =>
  skills.filter((s) => map.has(s.slot)).map((s) => ({ ...s, slot: map.get(s.slot)! }))

/**
 * เปลี่ยนรูปแบบแถว: ฮีโร่แถวหน้ายังอยู่แถวหน้า แถวหลังยังอยู่แถวหลัง (ถ้าช่องไม่พอค่อยล้นไปอีกแถว)
 * พยายามคงตำแหน่งเดิมในแถวไว้ แล้วย้ายลำดับสกิลตามให้ด้วย
 */
export function changeFormation(team: Team, skills: SkillStep[], front: number) {
  const rows = (t: Team) => [
    Array.from({ length: t.front }, (_, i) => i),
    Array.from({ length: SLOT_COUNT - t.front }, (_, i) => t.front + i),
  ]
  const [oldFront, oldBack] = rows(team)
  const size = [front, SLOT_COUNT - front]
  const start = [0, front]
  const out: (string | null)[] = Array(SLOT_COUNT).fill(null)
  const map = new Map<number, number>()
  const overflow: number[][] = [[], []]

  ;[oldFront, oldBack].forEach((row, r) => {
    const heroes = row.filter((i) => team.slots[i])
    // รอบแรก: คงตำแหน่งเดิมในแถว
    for (const i of heroes) {
      const local = i - row[0]
      if (local < size[r] && !out[start[r] + local]) {
        out[start[r] + local] = team.slots[i]
        map.set(i, start[r] + local)
      } else overflow[r].push(i)
    }
  })
  // รอบสอง: ที่ยังไม่ได้ที่ → ช่องว่างในแถวเดิม แล้วค่อยไปอีกแถว
  ;[0, 1].forEach((r) => {
    for (const i of overflow[r]) {
      const tryRow = (rr: number) => {
        for (let k = 0; k < size[rr]; k++) if (!out[start[rr] + k]) return start[rr] + k
        return -1
      }
      let j = tryRow(r)
      if (j < 0) j = tryRow(1 - r)
      if (j >= 0) { out[j] = team.slots[i]; map.set(i, j) }
    }
  })
  return { team: { ...team, front, slots: out }, skills: remap(skills, map) }
}

/** @deprecated ใช้ changeFormation แทน */
export const withFormation = (team: Team, front: number): Team => changeFormation(team, [], front).team

/** ลากสลับตำแหน่ง: ฮีโร่ ↔ ฮีโร่, สัตว์เลี้ยงหลัก/เสริม ↔ กันเอง */
export function moveSlot(team: Team, skills: SkillStep[], from: SlotRef, to: SlotRef) {
  const t: Team = { ...team, slots: [...team.slots], extras: Array.from({ length: EXTRA_COUNT }, (_, i) => team.extras[i] ?? null) }
  if (from.kind === 'hero' && to.kind === 'hero') {
    const a = from.index, b = to.index
    ;[t.slots[a], t.slots[b]] = [t.slots[b], t.slots[a]]
    const map = new Map<number, number>(Array.from({ length: SLOT_COUNT }, (_, i) => [i, i === a ? b : i === b ? a : i]))
    return { team: t, skills: remap(skills, map) }
  }
  if (from.kind !== 'hero' && to.kind !== 'hero') {
    const get = (r: SlotRef) => (r.kind === 'pet' ? t.pet : t.extras[r.index])
    const set = (r: SlotRef, v: string | null) => (r.kind === 'pet' ? (t.pet = v) : (t.extras[r.index] = v))
    const va = get(from), vb = get(to)
    set(from, vb)
    set(to, va)
  }
  return { team: t, skills }
}

/** ค่ายกลในเกม: จำนวนแถวหน้า → ชื่อ */
export const FORMATIONS: { front: number; name: string; en: string }[] = [
  { front: 2, name: 'พื้นฐาน', en: 'Basic' },
  { front: 3, name: 'สมดุล', en: 'Balanced' },
  { front: 1, name: 'บุก', en: 'Attack' },
  { front: 4, name: 'ป้องกัน', en: 'Protective' },
]
export const formationName = (front: number) => FORMATIONS.find((f) => f.front === front)?.name ?? `หน้า ${front}`
export const formationLabel = (front: number) => `ค่าย${formationName(front)} · หน้า ${front} หลัง ${SLOT_COUNT - front}`
/** จองสกิลได้สูงสุดกี่ครั้ง (ดาว 3 ดวงบนวงกลมในเกม) */
export const MAX_SKILL_QUEUE = 3

/**
 * ใส่/เอาออก ตัวละครในช่อง (unit = null คือเอาออก)
 * - ถ้าตัวนั้นอยู่ในทีมแล้ว → ย้ายไปช่องใหม่ (สลับกับตัวเดิมในช่องนั้น)
 * - ทีมครบ MAX_HEROES แล้ววางลงช่องว่าง → ไม่ทำอะไร (คืน null)
 */
export function placeUnit(team: Team, skills: SkillStep[], ref: SlotRef, unit: string | null) {
  if (ref.kind === 'hero') {
    const cur = team.slots.indexOf(unit)
    if (unit && cur >= 0) return cur === ref.index ? { team, skills } : moveSlot(team, skills, { kind: 'hero', index: cur }, ref)
    if (unit && !team.slots[ref.index] && heroCount(team) >= MAX_HEROES) return null
    const slots = [...team.slots]
    slots[ref.index] = unit
    return { team: { ...team, slots }, skills: skills.filter((s) => s.slot !== ref.index) }
  }
  // สัตว์เลี้ยงหลัก / เสริม
  const pets: SlotRef[] = [{ kind: 'pet', index: 0 }, ...Array.from({ length: EXTRA_COUNT }, (_, i) => ({ kind: 'extra' as const, index: i }))]
  const get = (r: SlotRef) => (r.kind === 'pet' ? team.pet : team.extras[r.index] ?? null)
  const cur = unit ? pets.find((r) => get(r) === unit) : undefined
  if (cur) return moveSlot(team, skills, cur, ref)
  const t: Team = { ...team, extras: Array.from({ length: EXTRA_COUNT }, (_, i) => team.extras[i] ?? null) }
  if (ref.kind === 'pet') t.pet = unit
  else t.extras[ref.index] = unit
  return { team: t, skills }
}

/** ช่องว่างถัดไปสำหรับกดใส่เร็ว (ฮีโร่: แถวหน้าก่อน / สัตว์เลี้ยง: ช่องหลักก่อน) */
export function nextEmpty(team: Team, kind: 'hero' | 'pet'): SlotRef | null {
  if (kind === 'hero') {
    if (heroCount(team) >= MAX_HEROES) return null
    const i = team.slots.findIndex((x) => !x)
    return i >= 0 ? { kind: 'hero', index: i } : null
  }
  if (!team.pet) return { kind: 'pet', index: 0 }
  const j = Array.from({ length: EXTRA_COUNT }, (_, i) => team.extras[i] ?? null).findIndex((x) => !x)
  return j >= 0 ? { kind: 'extra', index: j } : null
}

/** ตัวช่วยสำหรับทีมที่เก็บ skills ไว้ในตัวทีมเอง (team.skills) */
export const teamOps = {
  place(team: Team, ref: SlotRef, unit: string | null): Team {
    const r = placeUnit(team, team.skills ?? [], ref, unit)
    return r ? { ...r.team, skills: r.skills } : team
  },
  move(team: Team, from: SlotRef, to: SlotRef): Team {
    const r = moveSlot(team, team.skills ?? [], from, to)
    return { ...r.team, skills: r.skills }
  },
  formation(team: Team, front: number): Team {
    const r = changeFormation(team, team.skills ?? [], front)
    return { ...r.team, skills: r.skills }
  },
}
