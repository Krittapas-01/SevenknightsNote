/**
 * อ่านตัวหนังสือจากรูป (Tesseract.js) — ทำงานในเบราว์เซอร์ ฟรี ไม่ส่งรูปไปไหน
 * ไฟล์ engine + ภาษาอังกฤษ อยู่ใน public/ocr (โหลดครั้งแรกประมาณ 7MB แล้วเบราว์เซอร์จำไว้)
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

export async function readImageText(file: Blob, onProgress?: (p: number) => void): Promise<string> {
  const { createWorker } = await import('tesseract.js')
  const canvas = await prepare(file)
  const worker = await createWorker('eng', 1, {
    workerPath: `${BASE}worker.min.js`,
    corePath: BASE,
    langPath: BASE,
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') onProgress?.(m.progress)
    },
  })
  try {
    await worker.setParameters({ tessedit_pageseg_mode: '6' as never })
    const { data } = await worker.recognize(canvas)
    return data.text
  } finally {
    await worker.terminate()
  }
}
