import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { afterPaint } from './afterPaint'

/**
 * ค่าที่จำไว้ใน URL (?q= ?tag= ?tab=) แต่จอเปลี่ยนทันทีที่พิมพ์/กด
 * React Router เปลี่ยน URL แบบ transition: ถ้าช่องพิมพ์/ปุ่มอ่านค่าจาก URL ตรง ๆ ตัวอักษรที่พิมพ์หรือปุ่มที่กดจะยังไม่ขึ้นจอ
 * จนกว่าทั้งหน้า (กรอง + วาดการ์ดทั้งรายการ) จะเสร็จ — มือถือช้ารอเป็นครึ่งวิ (INP)
 * ที่นี่: เก็บค่าในเครื่อง (ขึ้นจอรอบถัดไปเลย) แล้วค่อยเขียน URL หลังจอวาดเสร็จ · delay = รอพิมพ์หยุดก่อนค่อยเขียน · flush() = เขียนที่ค้างไว้เดี๋ยวนี้
 * URL เปลี่ยนจากที่อื่น (ลิงก์ / ย้อนกลับ / เปลี่ยนแท็บแล้วล้างตัวกรอง) → ใช้ค่าจาก URL
 */
export function useParam<T extends string | null>(params: URLSearchParams, read: (p: URLSearchParams) => T, write: (v: T) => void, delay = 0) {
  const url = read(params)
  const [value, setValue] = useState(url)
  const [seen, setSeen] = useState(url)
  const last = useRef(url) // ค่าที่เราเขียนลง URL ล่าสุด
  const next = useRef<{ v: T } | null>(null) // ค่าที่รอเขียน
  const cancel = useRef<() => void>(() => {})
  if (url !== seen) {
    setSeen(url)
    // ไม่ใช่ค่าที่เราเพิ่งเขียน และ URL จริงตอนนี้เป็นค่านี้ (ไม่ใช่รอบเก่าที่ตามมาช้า) = เปลี่ยนจากที่อื่น
    if (url !== last.current && url === read(new URLSearchParams(window.location.search))) {
      last.current = url
      next.current = null
      setValue(url)
    }
  }
  const writer = useRef(write)
  useLayoutEffect(() => { writer.current = write })
  const flush = useCallback(() => {
    cancel.current()
    const n = next.current
    next.current = null
    if (n) { last.current = n.v; writer.current(n.v) }
  }, [])
  const set = useCallback((v: T) => {
    setValue(v)
    next.current = { v }
    cancel.current()
    if (delay) { const t = setTimeout(flush, delay); cancel.current = () => clearTimeout(t) }
    else cancel.current = afterPaint(flush)
  }, [delay, flush])
  useEffect(() => () => cancel.current(), [])
  return [value, set, flush] as const
}
