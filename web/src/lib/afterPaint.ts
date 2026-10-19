import { startTransition, useEffect, useState } from 'react'

/**
 * เรียก f หลังจอวาดเฟรมถัดไปเสร็จ (rAF → setTimeout: rAF รันก่อนวาด, setTimeout ที่ตั้งในนั้นรันหลังวาด) · คืนฟังก์ชันยกเลิก
 * ใช้แยก "ปุ่ม/ตัวอักษรที่กดขึ้นจอ" ออกจาก "งานหนักที่ตามมา" ให้ผู้ใช้เห็นผลการกดก่อน (INP)
 */
export function afterPaint(f: () => void): () => void {
  let t: ReturnType<typeof setTimeout> | undefined
  const r = requestAnimationFrame(() => { t = setTimeout(f, 0) })
  return () => { cancelAnimationFrame(r); clearTimeout(t) }
}

/**
 * ค่าที่ตามหลัง value 1 เฟรม: value เปลี่ยน → จอวาดส่วนที่เปลี่ยนทันทีก่อน แล้วค่อยใช้ค่าใหม่ (แบบ transition) หลังวาดเสร็จ
 * ต่างจาก useDeferredValue ที่เริ่มคำนวณค่าใหม่ทันทีหลังกด (มักก่อนจอได้วาด → ปุ่มที่กดรอรายการทั้งหมด)
 * กดซ้ำเร็ว ๆ = ยกเลิกรอบเก่า ทำรอบล่าสุดรอบเดียว
 */
export function useAfterPaint<T>(value: T): T {
  const [shown, setShown] = useState(value)
  useEffect(() => {
    if (Object.is(value, shown)) return
    return afterPaint(() => startTransition(() => setShown(value)))
  }, [value, shown])
  return shown
}
