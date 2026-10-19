import { getUnit } from '../data/heroes'
import { MD_HERO_SIZES, unitImage } from '../components/UnitCard'
import type { GuildData } from './types'

/**
 * เปิดเว็บมาที่หน้าบ้านศัตรู / แท็บบ้านศัตรูของกิลด์ → พอข้อมูลกิลด์มา สั่งโหลดรูปอัศวินที่เห็นบนจอแรกทันที
 * ไม่ต้องรอโค้ดของหน้า (แยกไฟล์) โหลด + React วาดเสร็จก่อน · รูปพวกนี้คือ LCP ของหน้า (Web Analytics)
 * URL ต้องตรงกับ <img> ของการ์ด (unitImage + sizes เดียวกัน) เบราว์เซอร์ถึงใช้รูปที่โหลดไว้ ไม่โหลดซ้ำ
 */
export function preloadFirstScreen(path: string, search: string, data: GuildData) {
  const m = path.match(/^\/g\/[^/]+(?:\/t\/([^/]+))?\/?$/)
  if (!m) return
  const links: { href?: string; srcset?: string; sizes?: string }[] = []
  if (m[1]) {
    // หน้าบ้านศัตรู: สนาม VS ขนาดปกติ (TeamPanel + ImgPriority) = ทีมแก้อันแรก + บ้านศัตรู
    const t = data.targets.find((x) => x.id === decodeURIComponent(m[1]))
    if (!t) return
    for (const id of [...(t.counters[0]?.team.slots ?? []), ...t.team.slots]) {
      const u = id ? getUnit(id) : null
      if (!u) continue
      const { src, srcSet } = unitImage(u, false, MD_HERO_SIZES)
      links.push(srcSet ? { href: src, srcset: srcSet, sizes: MD_HERO_SIZES } : { href: src })
    }
  } else {
    // แท็บบ้านศัตรู (ไม่ได้ค้นหา/กรองแท็ก): การ์ด 3 ใบแรก (GuildPage → TargetCard priority) ใช้รูปย่อ (TeamCardLite small)
    // ลำดับเดียวกับ GuildPage: แก้ล่าสุดอยู่บนสุด (ตัวบ้านหรือทีมแก้ข้างใน)
    const q = new URLSearchParams(search)
    if (q.get('tab') !== 'targets' || q.get('q') || q.get('tag')) return
    const last = (t: GuildData['targets'][number]) => Math.max(t.updatedAt, ...t.counters.map((c) => c.updatedAt))
    for (const t of [...data.targets].sort((a, b) => last(b) - last(a)).slice(0, 3)) {
      for (const id of t.team.slots) {
        const u = id ? getUnit(id) : null
        if (u) links.push({ href: unitImage(u, true, undefined).src })
      }
    }
  }
  const seen = new Set<string>()
  for (const l of links) {
    const k = l.srcset ?? l.href
    if (!k || seen.has(k)) continue
    seen.add(k)
    const el = document.createElement('link')
    el.rel = 'preload'
    el.as = 'image'
    el.fetchPriority = 'high'
    if (l.srcset) { el.setAttribute('imagesrcset', l.srcset); el.setAttribute('imagesizes', l.sizes!) }
    if (l.href) el.href = l.href
    document.head.appendChild(el)
  }
}
