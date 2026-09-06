import { useEffect, useState } from 'react'

// يكشف لغة/اتجاه المتصفح ويفعّل تقليل الحركة
export function useWindowQuery(q: string): boolean {
  const [m, setM] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches)
  useEffect(() => {
    const mm = window.matchMedia?.(q)
    if (!mm) return
    const f = () => setM(!!mm.matches)
    setM(!!mm.matches)
    mm.addEventListener('change', f)
    return () => mm.removeEventListener('change', f)
  }, [q])
  return m
}
