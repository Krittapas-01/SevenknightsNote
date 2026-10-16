/**
 * อ่านตัวหนังสือจากรูป (Tesseract.js) — ทำงานในเบราว์เซอร์ ฟรี ไม่ส่งรูปไปไหน
 * ไฟล์ engine + ภาษาอังกฤษ + ไทย อยู่ใน public/ocr (โหลดครั้งแรกประมาณ 8MB แล้วเบราว์เซอร์จำไว้)
 * อ่านพร้อมกันทั้ง 2 ภาษา → ใช้ได้ทั้งเกมที่ตั้งภาษาไทยและอังกฤษ
 */
const BASE = `${import.meta.env.BASE_URL}ocr/`

/** ขยายรูป + ขาวดำ + กลับสี (หน้าเกมตัวหนังสือขาวบนพื้นเข้ม → OCR อ่านแม่นขึ้น) */
async function prepare(file: Blob): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file)
  const scale = Math.max(1, Math.min(2.5, 2200 / bmp.width))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scale)
  c.height = Math.round(bmp.height * scale)
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.imageSmoothingQuality = 'high' // ภาพเล็ก (ครอปมา) ขยายแล้วตัวหนังสือคมกว่า
  g.drawImage(bmp, 0, 0, c.width, c.height)
  const img = g.getImageData(0, 0, c.width, c.height)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    const v = 255 - y
    d[i] = d[i + 1] = d[i + 2] = v
  }
  g.putImageData(img, 0, 0)
  return c
}

type Box = { x0: number; y0: number; x1: number; y1: number }
const flat = (t: string) => t.replace(/\s+/g, '')

/**
 * กรอบชื่ออัศวินในหน้าข้อมูลอัศวิน — คำนวณจากแถว "โจมตี" กับ "ป้องกัน" (ระยะห่างแถว = หน่วยวัด)
 * ชื่ออยู่เหนือแถวโจมตี ~2-3 แถว เยื้องขวาจากรูปอัศวิน · หาแถวไม่เจอ = null
 */
function nameRect(lines: { text: string; bbox: Box }[], w: number, h: number) {
  const atk = lines.find((l) => /[กภ]ายภ|เวท|[พผ]ลังโจ|attack/i.test(flat(l.text)))
  const def = lines.find((l) => /ป้อง|อง[กภ]ัน|defen/i.test(flat(l.text)))
  if (!atk || !def) return null
  const p = def.bbox.y0 - atk.bbox.y0
  if (p <= 0) return null
  // ครอปกว้างขึ้น (บรรทัดฉายา + ชื่อ) เผื่อภาพแต่ละแบบ (หน้าข้อมูลเต็ม/ป๊อปอัป/ขนาดจอ) เลื่อนไปนิดหน่อย
  // เดิมครอปแค่ 1.6 แถว → บางภาพตัดโดนครึ่งชื่อ/ครึ่งฉายา อ่านเพี้ยน = "บางรอบ" หาชื่อไม่เจอ
  const left = Math.max(0, Math.round(atk.bbox.x0 + 2.4 * p))
  const top = Math.max(0, Math.round(atk.bbox.y0 - 3.6 * p))
  const width = Math.min(w - left, Math.round(10 * p))
  const height = Math.min(h - top, Math.round(2.8 * p))
  return width > 0 && height > 0 ? { left, top, width, height } : null
}

/**
 * กรอบชื่อจากบรรทัด "Lv.30" — ชื่ออัศวินอยู่เหนือบรรทัดเลเวลพอดี (ทั้งหน้าข้อมูลเต็มและป๊อปอัปเล็ก)
 * แม่นกว่าคำนวณจากแถวโจมตี เพราะป๊อปอัปแต่ละแบบระยะไม่เท่ากัน
 */
function nameRectFromLevel(lines: { text: string; bbox: Box }[], w: number, h: number) {
  const lv = lines.find((l) => /lv\.?\d|lv\.?\s\d/i.test(flat(l.text)))
  if (!lv) return null
  const lh = lv.bbox.y1 - lv.bbox.y0
  if (lh <= 0) return null
  const left = Math.max(0, Math.round(lv.bbox.x0 - 0.5 * lh))
  const top = Math.max(0, Math.round(lv.bbox.y0 - 1.9 * lh))
  const width = Math.min(w - left, Math.round(Math.max(lv.bbox.x1 - lv.bbox.x0, 9 * lh)))
  const height = Math.min(h - top, Math.round(1.8 * lh))
  return width > 0 && height > 0 ? { left, top, width, height } : null
}

/** ครอปกรอบชื่อมาเป็นภาพใหม่แล้วขยายให้สูง ~140px (ป๊อปอัปเล็ก ตัวหนังสือจิ๋ว → ขยายแล้วอ่านออก) */
function cropScaled(src: HTMLCanvasElement, r: { left: number; top: number; width: number; height: number }, targetH = 140) {
  const scale = Math.max(1, Math.min(6, targetH / r.height))
  const c = document.createElement('canvas')
  c.width = Math.round(r.width * scale)
  c.height = Math.round(r.height * scale)
  const g = c.getContext('2d')!
  g.imageSmoothingQuality = 'high'
  g.drawImage(src, r.left, r.top, r.width, r.height, 0, 0, c.width, c.height)
  return c
}

/** ครอปแล้วย่อ/ขยายให้สูง targetH + ขอบขาวรอบ ๆ (ทดสอบแล้ว: ชื่อไทยสูง ~80px มีขอบ อ่านแม่นกว่าขยายใหญ่ชิดขอบ) */
function cropPadded(src: HTMLCanvasElement, r: { left: number; top: number; width: number; height: number }, targetH = 80, pad = 20) {
  const scale = Math.max(0.3, Math.min(6, targetH / r.height))
  const w = Math.round(r.width * scale), h = Math.round(r.height * scale)
  const c = document.createElement('canvas')
  c.width = w + pad * 2
  c.height = h + pad * 2
  const g = c.getContext('2d')!
  g.fillStyle = '#fff'
  g.fillRect(0, 0, c.width, c.height)
  g.imageSmoothingQuality = 'high'
  g.drawImage(src, r.left, r.top, r.width, r.height, pad, pad, w, h)
  return c
}

/**
 * กรอบหน้าข้อมูลอัศวินในภาพ (ชื่อ → แถวค่าความสามารถสุดท้าย) — ใช้ตัดอัตโนมัติเมื่อเป็นป๊อปอัปเล็กในภาพเต็มจอ
 * (เท่ากับคนครอปเอง แต่ไม่ต้องครอปในมือถือ)
 */
function panelRect(lines: { text: string; bbox: Box }[], w: number, h: number) {
  const stat = lines.filter((l) => /[กภ]ายภ|เวท|[พผ]ลังโจ|ป้อง|อง[กภ]ัน|hp|ความเร็ว|คริ|จุดอ่อน|บล็อก|เข้าเป้า|ต้านทาน|ยืดหยุ่น|ฟื้นคืน|attack|defen|block|crit/i.test(flat(l.text)))
  const atk = lines.find((l) => /[กภ]ายภ|เวท|[พผ]ลังโจ|attack/i.test(flat(l.text)))
  const def = lines.find((l) => /ป้อง|อง[กภ]ัน|defen/i.test(flat(l.text)))
  if (stat.length < 4 || !atk || !def) return null
  const p = def.bbox.y0 - atk.bbox.y0
  if (p <= 0) return null
  const x0 = Math.min(...stat.map((l) => l.bbox.x0)), x1 = Math.max(...stat.map((l) => l.bbox.x1))
  const y1 = Math.max(...stat.map((l) => l.bbox.y1))
  const left = Math.max(0, Math.round(x0 - 0.5 * p))
  const top = Math.max(0, Math.round(atk.bbox.y0 - 4.5 * p))
  const width = Math.min(w - left, Math.round(x1 - x0 + p))
  const height = Math.min(h - top, Math.round(y1 - top + p))
  return width > 0 && height > 0 ? { left, top, width, height } : null
}

/**
 * อ่านค่าความสามารถแบบเป็นบล็อก (psm 6 — แถวค่าความสามารถไม่หลุด) แล้วอ่านชื่ออัศวินแยกอีกรอบ:
 * ครอปเฉพาะบรรทัดชื่อ (psm 7) — ชื่อไทยตัวใหญ่อ่านจากทั้งภาพมักเพี้ยน (ซอรัน → เธร้น)
 */
export async function readImageText(file: Blob, onProgress?: (p: number) => void): Promise<{ text: string; name: string }> {
  const { createWorker } = await import('tesseract.js')
  const canvas = await prepare(file)
  const worker = await createWorker(['eng', 'tha'], 1, {
    workerPath: `${BASE}worker.min.js`,
    corePath: BASE,
    langPath: BASE,
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') onProgress?.(m.progress)
    },
  })
  try {
    await worker.setParameters({ tessedit_pageseg_mode: '6' as never, preserve_interword_spaces: '1' })
    let src = canvas
    let { data } = await worker.recognize(canvas, {}, { text: true, blocks: true })
    let lines = (data.lines ?? []) as { text: string; bbox: Box }[]
    // ป๊อปอัปเล็กในภาพเต็มจอ (กว้าง < 70% ของภาพ) → ตัดเฉพาะกรอบข้อมูลอัศวิน ขยาย แล้วอ่านใหม่ทั้งหมด
    const panel = panelRect(lines, canvas.width, canvas.height)
    if (panel && panel.width < canvas.width * 0.7) {
      src = cropScaled(canvas, panel, Math.min(2400, panel.height * 2.5))
      ;({ data } = await worker.recognize(src, {}, { text: true, blocks: true }))
      lines = (data.lines ?? []) as { text: string; bbox: Box }[]
    }
    // 1) เหนือบรรทัด Lv (บรรทัดเดียว psm 7) · 2) สำรอง: จากแถวโจมตี (ฉายา+ชื่อ psm 6) — อ่านทั้งสองแล้วรวมข้อความ
    const names: string[] = []
    const byLv = nameRectFromLevel(lines, src.width, src.height)
    if (byLv) {
      await worker.setParameters({ tessedit_pageseg_mode: '7' as never })
      names.push((await worker.recognize(cropScaled(src, byLv), {}, { text: true })).data.text.trim())
      // แบบย่อสูง 80px มีขอบ — ชื่ออังกฤษ (เกมตั้งภาษาอังกฤษ) อ่านออกเกือบหมด จากที่แบบขยายใหญ่อ่านว่างไป ~5%
      names.push((await worker.recognize(cropPadded(src, byLv), {}, { text: true })).data.text.trim())
    }
    const byAtk = nameRect(lines, src.width, src.height)
    if (byAtk) {
      await worker.setParameters({ tessedit_pageseg_mode: '6' as never })
      names.push((await worker.recognize(cropScaled(src, byAtk), {}, { text: true })).data.text.trim())
    }
    // 3) อ่านชื่อซ้ำด้วย "ภาษาไทยอย่างเดียว" — อ่านไทย+อังกฤษพร้อมกัน Tesseract ชอบอ่านตัวไทยเป็นตัวอังกฤษหน้าตาคล้าย
    //    (แรนด์กริด → "usuansa", ริน → "su") · ทดสอบชื่ออัศวินทุกตัว 8 แบบฟอนต์/ขนาด: จับตัวในทีมถูกเพิ่มจาก ~70% → ~90-95%
    //    (ภาพเกมภาษาอังกฤษใช้ผลจากข้อ 1-2 เหมือนเดิม — ผลที่อ่านได้ทุกรอบรวมกันแล้วค่อยเทียบชื่อ)
    if (byLv || byAtk) {
      await worker.reinitialize('tha')
      await worker.setParameters({ preserve_interword_spaces: '1' })
      for (const [r, psm] of [[byLv, '7'], [byAtk, '6']] as const) {
        if (!r) continue
        await worker.setParameters({ tessedit_pageseg_mode: psm as never })
        names.push((await worker.recognize(cropPadded(src, r), {}, { text: true })).data.text.trim())
      }
    }
    return { text: data.text, name: names.filter(Boolean).join('\n') }
  } finally {
    await worker.terminate()
  }
}
