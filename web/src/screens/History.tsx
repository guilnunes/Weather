import { ChevronRight } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Face } from '../components/Face'
import { TabBar } from '../components/TabBar'
import { formatDayHeading, formatTime, startOfDay } from '../lib/format'
import { useNow, useThemeColor } from '../lib/hooks'
import { getMood } from '../lib/moods'
import { navigate } from '../lib/router'
import { noteToPlainText, useStoreState, type Entry } from '../lib/store'

const PAGE_BG = '#F7F4F1'

/**
 * The sequence of mood blocks, newest first, grouped by day. Deliberately a
 * diary rather than a dashboard: no scores, no trend lines. Each day gets a
 * small "weather strip" of that day's colours, in the order they happened.
 */
export function History() {
  const { entries } = useStoreState()
  const now = useNow(60_000)
  useThemeColor(PAGE_BG)

  const days = groupByDay(entries)

  return (
    <div className="screen page">
      <header className="page-header">
        <h1>History</h1>
      </header>
      <main className="page-body">
        {days.length === 0 ? (
          <div className="empty">
            <p className="empty-title">Nothing here yet</p>
            <p>Tap a colour on Home whenever you want to note how you feel. Your moods and notes will gather here.</p>
          </div>
        ) : (
          days.map(({ day, items }) => (
            <section key={day} className="day" aria-label={formatDayHeading(day, now)}>
              <div className="day-head">
                <h2>{formatDayHeading(day, now)}</h2>
                <div className="day-strip" aria-hidden="true">
                  {[...items].reverse().map((e) => (
                    <span key={e.id} style={{ background: getMood(e.mood).color }} />
                  ))}
                </div>
              </div>
              <ul className="entry-list">
                {items.map((e) => (
                  <li key={e.id}>
                    <EntryRow entry={e} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </main>
      <TabBar active="history" />
    </div>
  )
}

function EntryRow({ entry }: { entry: Entry }) {
  const mood = getMood(entry.mood)
  const preview = noteToPlainText(entry.note)
  return (
    <button
      type="button"
      className="entry-row"
      onClick={() => navigate({ name: 'entry', id: entry.id })}
    >
      <span className={`entry-chip mood-${mood.key}`} style={{ '--mood': mood.color } as CSSProperties}>
        <Face mood={mood.key} size={30} />
      </span>
      <span className="entry-row-main">
        <span className="entry-row-top">
          <strong>{mood.label}</strong>
          <time dateTime={new Date(entry.createdAt).toISOString()}>{formatTime(entry.createdAt)}</time>
        </span>
        <span className={`entry-row-note${preview ? '' : ' is-empty'}`}>{preview || 'Add a note'}</span>
      </span>
      <ChevronRight className="entry-row-go" size={18} aria-hidden="true" />
    </button>
  )
}

function groupByDay(entries: Entry[]): { day: number; items: Entry[] }[] {
  const groups = new Map<number, Entry[]>()
  for (const e of [...entries].sort((a, b) => b.createdAt - a.createdAt)) {
    const day = startOfDay(e.createdAt)
    const list = groups.get(day)
    if (list) list.push(e)
    else groups.set(day, [e])
  }
  return [...groups].map(([day, items]) => ({ day, items }))
}
