/**
 * หน้าเว็บ /g/* (Cloudflare Pages Function) — เฉพาะบอทที่ทำตัวอย่างลิงก์ (Discord, LINE, Facebook ฯลฯ):
 * ใส่ og:title / og:description / og:image ของกิลด์ · บ้านศัตรู (รูปอัศวิน 3 ตัว) · แผน ลงใน index.html
 * คนทั่วไป = ส่งหน้าเว็บเดิมทันที (ไม่เรียก API เพิ่ม)
 * ห้าม log URL และห้ามใส่ query ลงในแท็ก (ลิงก์แชร์อาจมี ?key= รหัสแก้ไข)
 */
import { esc, manifest, thumbOf, OG_H, OG_W, type Env } from '../../server/og'

const BOT = /Discordbot|Twitterbot|facebookexternalhit|Facebot|Slackbot|TelegramBot|WhatsApp|LinkedInBot|Embedly|redditbot|SkypeUriPreview|line-poker|Iframely|vkShare|Pinterest/i

type Card = { name: string; target: { heroes: string[]; pet: string | null; tags: string[]; counters: number } | null; plan: { title: string } | null }
type Ctx = { request: Request; env: Env; next: () => Promise<Response> }

export const onRequest = async (ctx: Ctx): Promise<Response> => {
  const res = await ctx.next()
  if (ctx.request.method !== 'GET' || !BOT.test(ctx.request.headers.get('user-agent') || '')) return res
  if (!(res.headers.get('content-type') || '').includes('text/html')) return res
  const url = new URL(ctx.request.url)
  const m = /^\/g\/([^/]+)(?:\/([tp])\/([^/]+))?\/?$/.exec(url.pathname)
  if (!m) return res
  let tags: string
  try {
    tags = await metaTags(ctx.env, url, decodeURIComponent(m[1]), m[2] === 't' ? decodeURIComponent(m[3]) : '', m[2] === 'p' ? decodeURIComponent(m[3]) : '')
  } catch {
    return res // ไม่พบกิลด์ / API ล่ม → หน้าเว็บปกติ (ไม่ log รายละเอียด)
  }
  return new HTMLRewriter()
    .on('title', { element(e) { e.setInnerContent(tagsTitle(tags)) } })
    .on('meta[name="theme-color"]', { element(e) { e.setAttribute('content', '#e2bf72') } }) // สีแถบข้างกล่องตัวอย่างใน Discord
    .on('head', { element(e) { e.append(tags, { html: true }) } })
    .transform(res)
}

/** ดึงข้อความจาก og:title ที่ทำไว้ (ใช้เป็น <title> ด้วย) */
const tagsTitle = (tags: string) => {
  const t = /<meta property="og:title" content="([^"]*)"/.exec(tags)?.[1] ?? '7K Note'
  return t.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
}

async function metaTags(env: Env, url: URL, gid: string, tid: string, pid: string) {
  const mf = await manifest(env, url.origin)
  if (!mf.api) throw new Error('no api')
  const q = new URLSearchParams({ ...(tid ? { t: tid } : {}), ...(pid ? { p: pid } : {}) })
  const r = await fetch(`${mf.api}/api/guild/${encodeURIComponent(gid)}/card${q.size ? `?${q}` : ''}`, { signal: AbortSignal.timeout(4000) })
  if (!r.ok) throw new Error(`card ${r.status}`)
  const card = (await r.json()) as Card
  const page = url.origin + url.pathname // ไม่มี query (กัน ?key= หลุด)
  let title = `${card.name} · 7K Note`
  let desc = 'บ้านศัตรู ทีมแก้ และแผน Guild War ของกิลด์ · Seven Knights Re:BIRTH'
  let image = `${url.origin}/logo-1024.png`
  let large = false
  if (tid && card.target) {
    const t = card.target
    title = `${t.heroes.join(' · ') || 'บ้านศัตรู'} — ${card.name}`
    desc = [`บ้านศัตรู · ทีมแก้ ${t.counters} ทีม`, t.pet && `สัตว์เลี้ยง ${t.pet}`, t.tags.length && t.tags.join(' ')].filter(Boolean).join(' · ')
    const known = t.heroes.filter((h) => thumbOf(mf, h))
    if (known.length) {
      image = `${url.origin}/og/team.png?h=${encodeURIComponent(known.join(','))}`
      large = true
    }
  } else if (pid && card.plan) {
    title = `${card.plan.title} — ${card.name}`
    desc = `แผนวอร์ของกิลด์ ${card.name} · 7K Note`
  }
  return [
    ['og:site_name', '7K Note'], ['og:type', 'website'], ['og:locale', 'th_TH'],
    ['og:title', title], ['og:description', desc], ['og:url', page], ['og:image', image],
    ...(large ? [['og:image:width', String(OG_W)], ['og:image:height', String(OG_H)]] : []),
  ].map(([k, v]) => `<meta property="${k}" content="${esc(v)}" />`).concat(
    `<meta name="description" content="${esc(desc)}" />`,
    `<meta name="twitter:card" content="${large ? 'summary_large_image' : 'summary'}" />`,
  ).join('')
}
