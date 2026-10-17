/**
 * เตรียมหน้าต่างที่สร้างรอไว้ (Modal keep="prerender" เช่น ตารางอัศวินหน้าใหญ่) ตอนเครื่องว่าง
 *
 * หน้าต่างที่ซ่อนรอ (.modal-idle) ใช้ content-visibility: hidden → เบราว์เซอร์ไม่เคยคำนวณสไตล์/ตำแหน่งของข้างในเลย
 * กดเปิดครั้งแรกจึงต้องคำนวณการ์ด 100+ ใบทั้งหมดในจังหวะกด (CPU ช้า ×4 ≈ 0.3 วิ จอค้าง)
 * ที่นี่: ตอนเครื่องว่าง ปลดซ่อนชั่วคราว ([data-warming] — ยังอยู่นอกจอ ไม่ต้องวาดภาพ) แล้วให้เบราว์เซอร์คำนวณทีละไม่กี่ชิ้น
 * ([data-warm] เช่น การ์ดแต่ละใบ) ตามเวลาว่างที่มี ครบแล้วซ่อนกลับ
 * content-visibility: hidden จำผลที่คำนวณไว้ → ตอนเปิดจริงเหลือแค่วาดภาพ
 * + loadImages: ทยอยสั่งโหลดรูปที่ซ่อนอยู่ล่วงหน้า (เปิดแล้วรูปมาพร้อมการ์ด)
 */

type Idle = (cb: (d?: IdleDeadline) => void) => number
const w = (typeof window !== 'undefined' ? window : undefined) as (Window & typeof globalThis) | undefined
const idle: Idle = w && typeof w.requestIdleCallback === 'function'
  ? (cb) => w.requestIdleCallback(cb, { timeout: 3000 })
  : (cb) => setTimeout(cb, 120) as unknown as number
const cancelIdle = (id: number) => {
  if (w && typeof w.cancelIdleCallback === 'function') w.cancelIdleCallback(id)
  else clearTimeout(id)
}

/** ชิ้นต่อรอบ (การ์ดละ ~0.4ms ที่ CPU ปกติ) · เหลือเวลาว่างน้อยกว่านี้ (ms) = รอรอบหน้า */
const BATCH = 6
const MIN_LEFT = 5

/**
 * root = ตัวที่ซ่อนอยู่ (.modal-idle) · box = กล่องเนื้อหา · seen = ชิ้นที่เคยเตรียมแล้ว (เตรียมซ้ำเฉพาะชิ้นใหม่)
 * คืนฟังก์ชันหยุด (เช่น ผู้ใช้กดเปิดก่อนเตรียมเสร็จ → ชิ้นที่เหลือวาดตอนเปิดตามปกติ)
 */
export function prewarm(root: HTMLElement, box: HTMLElement, seen: WeakSet<Element>, done?: () => void): () => void {
  let parts: HTMLElement[] | null = null
  let i = 0
  let id = 0
  let stopped = false
  // คืนชิ้นที่ยังไม่ได้เตรียมให้เป็นปกติ (ชิ้นที่เตรียมแล้วค้าง visible ไว้ = ค่าเดิมของมันอยู่แล้ว ไม่ต้องคำนวณสไตล์ใหม่)
  const finish = () => {
    stopped = true
    root.removeAttribute('data-warming')
    if (parts) for (let k = i; k < parts.length; k++) parts[k].style.removeProperty('content-visibility')
  }
  const step = (d?: IdleDeadline) => {
    if (stopped) return
    if (!root.isConnected) return finish()
    // ทำอย่างน้อย 1 ชุด แล้วทำต่อเฉพาะตอนยังมีเวลาว่างเหลือ (รอนานจนหมดเวลา/ไม่มี requestIdleCallback = ทีละชุด ไม่ทำรวดเดียว)
    const more = () => !!d && !d.didTimeout && d.timeRemaining() > MIN_LEFT
    if (!parts) {
      parts = Array.from(box.querySelectorAll<HTMLElement>('[data-warm]')).filter((p) => !seen.has(p))
      for (const p of parts) p.style.contentVisibility = 'hidden'
      root.setAttribute('data-warming', '')
      void box.offsetHeight // กรอบ + หัวหมวด (การ์ดยังซ่อน) — เบา
    }
    do {
      const end = Math.min(parts.length, i + BATCH)
      for (; i < end; i++) { parts[i].style.contentVisibility = 'visible'; seen.add(parts[i]) }
      void box.offsetHeight // บังคับคำนวณตอนนี้ (ช่วงเครื่องว่าง) ไม่ใช่ตอนกดเปิด
    } while (i < parts.length && more())
    if (i < parts.length) { id = idle(step); return }
    finish()
    done?.()
  }
  id = idle(step)
  return () => {
    if (stopped) return
    cancelIdle(id)
    finish()
  }
}

/** รูปต่อรอบ (สั่งโหลดรูปละ ~0.2ms ที่ CPU ปกติ) */
const IMG_BATCH = 8

/**
 * ทยอยสั่งโหลดรูป lazy ในกล่องที่ซ่อนอยู่ตอนเครื่องว่าง (ทีละไม่กี่รูป) + ถอดรหัส decodeFirst รูปแรก (จอแรกตอนเปิด)
 * ไม่สลับผ่าน prop ของ React: สลับ 100+ รูปใน commit เดียว = จอค้าง ~0.2 วิ ที่ CPU ช้า
 * (React ไม่แตะ loading อีกถ้า prop ไม่เปลี่ยน · การ์ดที่สร้างใหม่ทีหลังเป็น lazy → เรียกซ้ำได้ ทำเฉพาะรูปที่ยัง lazy)
 * คืนฟังก์ชันหยุด
 */
export function loadImages(box: HTMLElement | null, decodeFirst: number): () => void {
  if (!box) return () => {}
  const imgs = Array.from(box.querySelectorAll<HTMLImageElement>('img[loading="lazy"]'))
  let i = 0
  let id = 0
  let stopped = false
  const step = (d?: IdleDeadline) => {
    if (stopped) return
    do {
      const end = Math.min(imgs.length, i + IMG_BATCH)
      for (; i < end; i++) {
        imgs[i].loading = 'eager'
        if (i < decodeFirst) imgs[i].decode().catch(() => {})
      }
    } while (i < imgs.length && !!d && !d.didTimeout && d.timeRemaining() > MIN_LEFT)
    if (i < imgs.length) id = idle(step)
  }
  if (imgs.length) id = idle(step)
  return () => {
    stopped = true
    cancelIdle(id)
  }
}
