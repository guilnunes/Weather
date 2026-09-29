import { useEffect, useState } from 'react'

/** Current time, refreshed on an interval so fading moods update on screen. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const id = window.setInterval(tick, intervalMs)
    // Coming back to the tab after hours away should show the faded state at once.
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [intervalMs])
  return now
}

/** Tints the mobile browser / status bar to match the screen. */
export function useThemeColor(color: string) {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (meta) meta.content = color
  }, [color])
}
