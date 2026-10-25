import { track } from './usage'
/**
 * บันทึกส่วนของหน้าเป็นรูป PNG (ชัด 2 เท่า)
 * - ใส่ data-noexport ที่ปุ่ม/ส่วนที่ไม่อยากให้ติดในรูป
 * - มือถือ: เปิดหน้าแชร์ (ส่งเข้าไลน์/ดิสคอร์ดได้เลย) · คอม: ดาวน์โหลดไฟล์
 */
/** รอรูปใน element โหลดเสร็จ (กันรูปอัศวินหายในภาพ) */
/** ปิดปุ่มบันทึกรูปไว้ก่อน (ยังไม่มีคนใช้) — เปิดกลับโดยเปลี่ยนเป็น true */
export const EXPORT_ON = false

export async function waitImages(el: HTMLElement, timeoutMs = 8000) {
  // รูป loading="lazy" ที่อยู่นอกจอจะไม่โหลดเลย (ค้างจนหมดเวลา) → สั่งโหลดทันที
  el.querySelectorAll('img[loading="lazy"]').forEach((i) => { (i as HTMLImageElement).loading = 'eager' })
  const imgs = [...el.querySelectorAll('img')].filter((i) => !i.complete)
  await Promise.race([
    Promise.all(imgs.map((i) => new Promise((r) => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }) }))),
    new Promise((r) => setTimeout(r, timeoutMs)),
  ])
}

export async function exportPng(el: HTMLElement, filename: string) {
  track('export_image')
  // ไลบรารีจับภาพหน้าจอ (~50 kB) โหลดตอนกดบันทึกรูปเท่านั้น — ไม่ต้องติดมากับโค้ดหน้าบ้านศัตรู/แผน (เปิดหน้าเร็วขึ้น)
  const { domToPng } = await import('modern-screenshot')
  const url = await domToPng(el, {
    scale: 2,
    backgroundColor: '#161c2e',
    filter: (n) => !(n instanceof HTMLElement && n.dataset.noexport !== undefined),
  })
  const name = filename.replace(/[\\/:*?"<>|]/g, '-') + '.png'
  const isPhone = /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent)
  if (isPhone && navigator.canShare) {
    const blob = await (await fetch(url)).blob()
    const file = new File([blob], name, { type: 'image/png' })
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename })
        return
      } catch { /* ยกเลิกแชร์ → ดาวน์โหลดแทน */ }
    }
  }
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
}
