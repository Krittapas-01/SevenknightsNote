import type { CSSProperties } from 'react'

/** สีแท็กประเภทบ้าน — ตัวหลักกำหนดเอง ที่เหลือสุ่มจากชื่อ (ชื่อเดิมได้สีเดิมเสมอ) */
const FIXED: Record<string, string> = {
  เวทย์: '#3e8ef7',
  เวท: '#3e8ef7',
  กายภาพ: '#e5484d',
  โจมตี: '#e5484d', // ธาตุไฟ = แดง (แท็กสำเร็จรูป)
  ถึก: '#e0902f',
  อื่นๆ: '#8b93b0',
}
const PALETTE = ['#2fb67c', '#b45cf0', '#e0569b', '#17a8b8', '#c9a227', '#6f7cf2']

/** แท็กนี้คือประเภท "บ้าน" (ทีมกันศัตรู) ไม่ใช่ทีมเรา → ชื่อสั้นแบบ "บ้านกาย" / "บ้านเวทย์" */
export function houseLabel(tag: string) {
  const t = tag.trim()
  if (!t || t === 'ทั้งหมด') return t
  if (t.startsWith('บ้าน')) return t
  return `บ้าน${t === 'กายภาพ' ? 'กาย' : t === 'เวท' ? 'เวทย์' : t}`
}

export function tagColor(tag: string) {
  const t = tag.trim()
  if (FIXED[t]) return FIXED[t]
  let h = 0
  for (const ch of t) h = (h * 31 + ch.codePointAt(0)!) >>> 0
  return PALETTE[h % PALETTE.length]
}

/** ชิปแท็กแบบสีทึบ เด่นอ่านง่าย */
export const tagStyle = (tag: string): CSSProperties => {
  const c = tagColor(tag)
  return {
    background: `linear-gradient(180deg, ${c}, color-mix(in srgb, ${c} 70%, #000))`,
    color: '#fff',
    border: `1px solid color-mix(in srgb, ${c} 60%, #fff)`,
    boxShadow: `0 0 10px color-mix(in srgb, ${c} 45%, transparent)`,
    textShadow: '0 1px 2px rgba(0,0,0,.45)',
  }
}
