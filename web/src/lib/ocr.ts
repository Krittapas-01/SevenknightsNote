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
 * กรอบชื่อฮีโร่ในหน้าข้อมูลฮีโร่ — คำนวณจากแถว "โจมตี" กับ "ป้องกัน" (ระยะห่างแถว = หน่วยวัด)
 * ชื่ออยู่เหนือแถวโจมตี ~2-3 แถว เยื้องขวาจากรูปฮีโร่ · หาแถวไม่เจอ = null
 */
function nameRect(lines: { text: string; bbox: Box }[], w: number, h: number) {
  const atk = lines.find((l) => /[กภ]ายภ|เวท|[พผ]ลังโจ|attack/i.test(flat(l.text)))
  const def = lines.find((l) => /ป้อง|อง[กภ]ัน|defen/i.test(flat(l.text)))
  if (!atk || !def) return null
  const p = def.bbox.y0 - atk.bbox.y0
  if (p <= 0) return null
  const left = Math.max(0, Math.round(atk.bbox.x0 + 2.8 * p))
  const top = Math.max(0, Math.round(atk.bbox.y0 - 3 * p))
  const width = Math.min(w - left, Math.round(9 * p))
  const height = Math.min(h - top, Math.round(1.6 * p))
  return width > 0 && height > 0 ? { left, top, width, height } : null
}

/**
 * อ่านสเตตัสแบบเป็นบล็อก (psm 6 — แถวสเตตัสไม่หลุด) แล้วอ่านชื่อฮีโร่แยกอีกรอบ:
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
    const { data } = await worker.recognize(canvas, {}, { text: true, blocks: true })
    const rect = nameRect((data.lines ?? []) as { text: string; bbox: Box }[], canvas.width, canvas.height)
    if (!rect) return { text: data.text, name: '' }
    await worker.setParameters({ tessedit_pageseg_mode: '7' as never })
    const name = (await worker.recognize(canvas, { rectangle: rect }, { text: true })).data.text.trim()
    return { text: data.text, name }
  } finally {
    await worker.terminate()
  }
}
