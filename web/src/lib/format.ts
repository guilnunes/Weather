// Date and time wording, matching the design ("Sep 26, 2026" / "10:24").

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const weekdayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

export const formatDate = (ms: number) => dateFmt.format(ms)
export const formatTime = (ms: number) => timeFmt.format(ms)

export function startOfDay(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** "Today", "Yesterday", or e.g. "Tuesday, Sep 22". */
export function formatDayHeading(dayStart: number, now = Date.now()): string {
  const today = startOfDay(now)
  const yesterday = startOfDay(today - 1)
  if (dayStart === today) return 'Today'
  if (dayStart === yesterday) return 'Yesterday'
  return weekdayFmt.format(dayStart)
}
