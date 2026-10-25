/**
 * /og/team.png?h=อัศวิน1,อัศวิน2,อัศวิน3 → รูป PNG 1200×630 สำหรับตัวอย่างลิงก์ (ดู functions/g/[[path]].ts)
 * รับเฉพาะชื่ออัศวินที่มีรูปในเว็บ (ชื่อที่ไม่รู้จักตัดทิ้ง) → รูปมีได้จำกัด ไม่มีใครสั่งวาดของแปลก ๆ ซ้ำ ๆ ได้
 * วาดแล้วเก็บใน Cache API + Cache-Control 7 วัน (Discord เก็บรูปไว้เองอีกชั้น)
 */
import { decodeThumb, encodePng, manifest, renderTeam, thumbOf, OG_H, OG_W, type Env } from '../../server/og'

type Ctx = { request: Request; env: Env; params: { file?: string | string[] }; next: () => Promise<Response>; waitUntil: (p: Promise<unknown>) => void }
const VERSION = 1 // เปลี่ยนหน้าตารูปเมื่อไหร่ ขยับเลขนี้ (แคชเก่าไม่ถูกใช้)

export const onRequest = async (ctx: Ctx): Promise<Response> => {
  if (ctx.params.file !== 'team.png' || ctx.request.method !== 'GET') return ctx.next()
  const url = new URL(ctx.request.url)
  const logo = () => Response.redirect(`${url.origin}/logo-1024.png`, 302)
  const mf = await manifest(ctx.env, url.origin).catch(() => null)
  if (!mf) return logo()
  const ids = [...new Set((url.searchParams.get('h') || '').split(',').map((s) => s.trim()).filter((s) => s && s.length <= 40))]
  const files = ids.map((id) => thumbOf(mf, id)).filter((f): f is string => !!f).slice(0, 3)
  if (!files.length) return logo()
  // แคชตามไฟล์รูปจริง (ไม่ใช่ข้อความใน URL) — สะกดชื่อต่างกันแต่รูปเดียวกัน = ใช้แคชเดียวกัน
  const key = new Request(`${url.origin}/og/team.png?f=${encodeURIComponent(files.join('|'))}&v=${VERSION}`)
  const cache = (globalThis.caches as unknown as { default?: Cache } | undefined)?.default
  const hit = await cache?.match(key).catch(() => undefined)
  if (hit) return hit
  const imgs = await Promise.all(files.map(async (f) => decodeThumb(await (await ctx.env.ASSETS.fetch(new URL(f, url.origin))).arrayBuffer())))
  const png = await encodePng(renderTeam(imgs), OG_W, OG_H)
  const res = new Response(png.buffer as ArrayBuffer, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=604800' } })
  if (cache) ctx.waitUntil(cache.put(key, res.clone()).catch(() => {}))
  return res
}
