import { useEffect, useState } from 'react'
/** Extracted from legacy Game.tsx: monotonic completion and timer cleanup. */
export function useTypewriter(text: string, instant: boolean) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    setCount(instant ? text.length : 0)
    if (instant) return
    const start = performance.now()
    const timer = window.setInterval(() => {
      const n = Math.min(text.length, Math.floor((performance.now() - start) / 1000 * 40) + 1)
      setCount(previous => Math.max(previous, n))
      if (n >= text.length) window.clearInterval(timer)
    }, 24)
    return () => window.clearInterval(timer)
  }, [text, instant])
  return { text: text.slice(0, instant ? text.length : count), done: instant || count >= text.length, complete: () => setCount(text.length) }
}
