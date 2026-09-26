import type { CSSProperties } from 'react'

/** สีประจำลำดับจองสกิล: 1 แดง · 2 ส้มทอง · 3 เขียว (เกิน 3 วนสีต่อ) */
const COLORS = ['#e5484d', '#f59e0b', '#22b573', '#3e8ef7', '#b45cf0']
export const queueColor = (n: number) => COLORS[(n - 1) % COLORS.length]

/** วงกลมเลขลำดับแบบสีทึบ */
export const queueStyle = (n: number): CSSProperties => {
  const c = queueColor(n)
  return {
    background: `linear-gradient(180deg, color-mix(in srgb, ${c} 80%, #fff), ${c} 55%, color-mix(in srgb, ${c} 70%, #000))`,
    color: '#fff',
    textShadow: '0 1px 1px rgba(0,0,0,.45)',
  }
}
