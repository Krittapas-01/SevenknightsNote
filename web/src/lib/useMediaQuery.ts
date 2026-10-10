import { useEffect, useState } from 'react'

/** true เมื่อหน้าจอตรงเงื่อนไข เช่น useMediaQuery('(min-width: 1024px)') */
export function useMediaQuery(q: string) {
  const [ok, setOk] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const on = () => setOk(m.matches)
    on()
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [q])
  return ok
}
