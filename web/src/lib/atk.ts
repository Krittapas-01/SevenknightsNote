// สูตรพลังโจมตีจริงหลังบัฟ (ตามที่เทสในเกม)
// ยอดก่อนบัฟ = ตั้งต้น + base × % จาก base + โจมตีสัตว์เลี้ยง
// บัฟ % ทุกตัว และดีบัฟลดโจมตีของฝั่งตรงข้าม คิดจากยอดก่อนบัฟเหมือนกัน แล้วเอามาบวก/ลบรวม
// ยอดจริง = ยอดก่อนบัฟ × (1 + บัฟรวม% − ดีบัฟ%)

export type AtkInput = {
  start: number // ตั้งต้น
  base: number
  basePct: number // % จาก base เช่น 60
  pet: number // โจมตีสัตว์เลี้ยง
  buffs: number[] // บัฟ % แต่ละตัว
  debuff: number // ดีบัฟ % ที่โดน (0 ถ้าไม่โดน)
}

export const preBuff = (c: AtkInput) => c.start + (c.base * c.basePct) / 100 + c.pet
export const multiplier = (c: AtkInput) => 1 + (c.buffs.reduce((s, b) => s + b, 0) - c.debuff) / 100
export const finalAtk = (c: AtkInput) => preBuff(c) * multiplier(c)

// ตั้งต้นต่ำสุด (จำนวนเต็ม) ที่ทำให้ยอดจริงของ c มากกว่า target · null = ไม่มีทางนำ
export function minStartToBeat(c: AtkInput, target: number): number | null {
  const m = multiplier(c)
  if (m <= 0) return null
  const beats = (start: number) => finalAtk({ ...c, start }) > target
  let s = Math.floor(target / m - (preBuff(c) - c.start)) + 1
  // กันทศนิยมคลาดเคลื่อนตรงขอบ
  while (beats(s - 1)) s--
  while (!beats(s)) s++
  return s
}
