/**
 * ตัวอย่างลิงก์ (Discord ฯลฯ) — ใช้ใน Pages Functions (web/functions) เท่านั้น ไม่ได้อยู่ในโค้ดหน้าเว็บ
 * - รูป: รูปย่ออัศวิน (webp) 1–3 ตัว วางบนพื้นหลังมืด กรอบทอง → PNG 1200×630 (ไม่มีตัวหนังสือในรูป = ไม่ต้องมีฟอนต์ไทย)
 * - ชื่ออัศวิน/ชื่อกิลด์ อยู่ใน og:title / og:description แทน
 * ห้าม log URL ของคำขอ (ลิงก์แชร์อาจมี ?key= รหัสแก้ไข)
 */
import decodeWebp, { init as initWebp } from '@jsquash/webp/decode'
import WEBP_DEC_WASM from '@jsquash/webp/codec/dec/webp_dec.wasm'
import { imageKeys } from '../src/data/heroNames'

export type Env = { ASSETS: { fetch: (input: Request | URL | string, init?: RequestInit) => Promise<Response> } }
export type Manifest = { api: string; thumbs: Record<string, string> }

let manifestP: Promise<Manifest> | null = null
/** dist/og-manifest.json (vite.config.ts → ogManifest) — จำไว้ทั้ง isolate (deploy ใหม่ = isolate ใหม่) */
export function manifest(env: Env, origin: string): Promise<Manifest> {
  manifestP ??= env.ASSETS.fetch(new URL('/og-manifest.json', origin)).then((r) => {
    if (!r.ok) throw new Error(`manifest ${r.status}`)
    return r.json() as Promise<Manifest>
  })
  manifestP.catch(() => { manifestP = null })
  return manifestP
}

/** ไฟล์รูปย่อของอัศวิน (จับคู่ชื่อแบบเดียวกับเว็บ) · ไม่รู้จัก = null */
export const thumbOf = (m: Manifest, id: string) => imageKeys(id.normalize('NFC').trim()).map((k) => m.thumbs[k]).find(Boolean) ?? null

export const OG_W = 1200
export const OG_H = 630
type Img = { data: Uint8ClampedArray; width: number; height: number }

let webpReady: Promise<void> | null = null
export async function decodeThumb(buf: ArrayBuffer): Promise<Img> {
  webpReady ??= initWebp(WEBP_DEC_WASM as WebAssembly.Module)
  await webpReady
  return decodeWebp(buf)
}

const GOLD = [226, 191, 114]
const SLOT = [30, 36, 58]

/** ระยะจากจุดถึงขอบสี่เหลี่ยมมุมโค้ง (ลบ = อยู่ข้างใน) — จุดอ้างอิงจากมุมซ้ายบนของกล่อง */
function roundRectDist(x: number, y: number, w: number, h: number, r: number) {
  const qx = Math.abs(x - w / 2) - (w / 2 - r)
  const qy = Math.abs(y - h / 2) - (h / 2 - r)
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
}
const cover = (d: number) => (d <= -0.5 ? 1 : d >= 0.5 ? 0 : 0.5 - d)

/** ภาพ RGB (ไม่มี alpha) ขนาด OG_W×OG_H: พื้นไล่สี + แสงทองจาง ๆ กลางภาพ + การ์ดรูปอัศวินเรียงกลาง */
export function renderTeam(imgs: Img[]): Uint8ClampedArray {
  const W = OG_W, H = OG_H
  const out = new Uint8ClampedArray(W * H * 3)
  for (let y = 0; y < H; y++) {
    const t = y / (H - 1)
    for (let x = 0; x < W; x++) {
      const glow = 0.13 * Math.max(0, 1 - Math.hypot(x - W / 2, (y - H / 2) * 1.6) / 620)
      const o = (y * W + x) * 3
      out[o] = 29 + (14 - 29) * t + GOLD[0] * glow
      out[o + 1] = 37 + (18 - 37) * t + GOLD[1] * glow
      out[o + 2] = 64 + (34 - 64) * t + GOLD[2] * glow
    }
  }
  const n = imgs.length
  const P = n === 1 ? 380 : 330 // ขนาดการ์ด
  const GAP = 44, B = 7, R = 30
  const total = n * P + (n - 1) * GAP
  const x0 = Math.round((W - total) / 2), y0 = Math.round((H - P) / 2)
  imgs.forEach((img, i) => {
    const bx = x0 + i * (P + GAP)
    const inner = P - 2 * B
    // รูปต้นฉบับ: ตัดให้เต็มกรอบสี่เหลี่ยมจัตุรัส (cover) แล้วย่อ/ขยายแบบ bilinear
    const side = Math.min(img.width, img.height)
    const sx0 = (img.width - side) / 2, sy0 = (img.height - side) / 2
    const scale = side / inner
    for (let y = 0; y < P; y++) {
      for (let x = 0; x < P; x++) {
        const a = cover(roundRectDist(x + 0.5, y + 0.5, P, P, R))
        if (!a) continue
        const o = ((y0 + y) * W + bx + x) * 3
        let r = GOLD[0], g = GOLD[1], b = GOLD[2]
        const ai = cover(roundRectDist(x + 0.5 - B, y + 0.5 - B, inner, inner, R - B))
        if (ai) {
          const fx = Math.min(img.width - 1.001, Math.max(0, sx0 + (x - B + 0.5) * scale - 0.5))
          const fy = Math.min(img.height - 1.001, Math.max(0, sy0 + (y - B + 0.5) * scale - 0.5))
          const ix = Math.floor(fx), iy = Math.floor(fy), dx = fx - ix, dy = fy - iy
          const p = (xx: number, yy: number, c: number) => img.data[(yy * img.width + xx) * 4 + c]
          const s = (c: number) => (p(ix, iy, c) * (1 - dx) + p(ix + 1, iy, c) * dx) * (1 - dy) + (p(ix, iy + 1, c) * (1 - dx) + p(ix + 1, iy + 1, c) * dx) * dy
          const al = s(3) / 255
          const pr = s(0) * al + SLOT[0] * (1 - al), pg = s(1) * al + SLOT[1] * (1 - al), pb = s(2) * al + SLOT[2] * (1 - al)
          r = pr * ai + r * (1 - ai); g = pg * ai + g * (1 - ai); b = pb * ai + b * (1 - ai)
        }
        out[o] = r * a + out[o] * (1 - a)
        out[o + 1] = g * a + out[o + 1] * (1 - a)
        out[o + 2] = b * a + out[o + 2] * (1 - a)
      }
    }
  })
  return out
}

const CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 }
  return t
})()
function crc32(buf: Uint8Array) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type: string, data: Uint8Array) {
  const out = new Uint8Array(12 + data.length)
  const v = new DataView(out.buffer)
  v.setUint32(0, data.length)
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
  out.set(data, 8)
  v.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)))
  return out
}

/** RGB 8 บิต → PNG (filter "Up" ทุกแถว + zlib จาก CompressionStream ที่มีใน Workers อยู่แล้ว) */
export async function encodePng(rgb: Uint8ClampedArray, w: number, h: number): Promise<Uint8Array> {
  const row = w * 3
  const raw = new Uint8Array((row + 1) * h)
  for (let y = 0; y < h; y++) {
    const o = y * (row + 1)
    raw[o] = 2
    const cur = y * row, prev = cur - row
    for (let i = 0; i < row; i++) raw[o + 1 + i] = (rgb[cur + i] - (y ? rgb[prev + i] : 0)) & 255
  }
  const z = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer())
  const ihdr = new Uint8Array(13)
  const v = new DataView(ihdr.buffer)
  v.setUint32(0, w); v.setUint32(4, h); ihdr[8] = 8; ihdr[9] = 2 // 8 บิต RGB
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', z), chunk('IEND', new Uint8Array())]
  const png = new Uint8Array(parts.reduce((s, p) => s + p.length, 0))
  let at = 0
  for (const p of parts) { png.set(p, at); at += p.length }
  return png
}

export const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!)
