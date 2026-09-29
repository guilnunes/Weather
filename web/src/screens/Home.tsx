import type { CSSProperties } from 'react'
import { Face } from '../components/Face'
import { TabBar } from '../components/TabBar'
import { formatTime } from '../lib/format'
import { useNow, useThemeColor } from '../lib/hooks'
import { MOODS, type MoodKey } from '../lib/moods'
import { navigate, newEntryRoute } from '../lib/router'
import { currentMood, useStoreState } from '../lib/store'

/**
 * The colour bands. A tap opens the journal for that mood; the mood is only
 * recorded (and starts fading) once it is saved there.
 */
export function Home() {
  const state = useStoreState()
  const now = useNow()
  const current = currentMood(state, now)
  useThemeColor(MOODS[0].color)

  function pick(mood: MoodKey) {
    navigate(newEntryRoute(mood))
  }

  return (
    <div className="screen home">
      <main className="bands">
        <h1 className="visually-hidden">How are you feeling?</h1>
        {MOODS.map((m) => {
          const isCurrent = current?.entry.mood === m.key
          return (
            <button
              key={m.key}
              type="button"
              className={`band mood-${m.key}`}
              style={{ '--mood': m.color } as CSSProperties}
              onClick={() => pick(m.key)}
            >
              <Face mood={m.key} size={68} />
              <span className="band-label">{m.label}</span>
              {isCurrent && (
                <span className="band-now">
                  <span className="visually-hidden">Current mood, </span>
                  now · until {formatTime(current.until)}
                </span>
              )}
            </button>
          )
        })}
      </main>
      <TabBar active="home" />
    </div>
  )
}
