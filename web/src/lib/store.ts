// Entries and settings, kept on this device only (localStorage).
// Nothing is sent anywhere: this is the private personal layer.

import { useSyncExternalStore } from 'react'
import { isMoodKey, RETIRED_MOODS, type MoodKey } from './moods'
import { sampleEntries } from './sample'

export interface Entry {
  id: string
  mood: MoodKey
  /** When the mood was logged (ms since epoch). */
  createdAt: number
  updatedAt: number
  /** Journal note as sanitized HTML from the editor; '' when there is none. */
  note: string
}

export interface Settings {
  /** How long a logged mood holds before it fades back to neutral. */
  holdHours: number
}

export interface State {
  entries: Entry[]
  settings: Settings
}

export const HOLD_HOURS_OPTIONS = [2, 4, 6, 8] as const
export const DEFAULT_SETTINGS: Settings = { holdHours: 4 }

const STORAGE_KEY = 'weather.v1'

type Listener = () => void

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** The editor's "empty" document is `<p></p>`; store that as no note at all. */
export function normalizeNote(html: string): string {
  return noteToPlainText(html).trim() === '' ? '' : html
}

export function noteToPlainText(html: string): string {
  if (!html) return ''
  const spaced = html.replace(/<\/(p|li|h\d)>/gi, ' ').replace(/<br\s*\/?>/gi, ' ')
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(spaced, 'text/html')
    return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim()
  }
  return spaced.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

function parse(raw: string | null): State {
  const empty: State = { entries: [], settings: { ...DEFAULT_SETTINGS } }
  if (!raw) return empty
  try {
    const data = JSON.parse(raw)
    const entries: Entry[] = Array.isArray(data?.entries)
      ? data.entries
          .map((e: Partial<Entry> | null) =>
            e && typeof e.mood === 'string' && e.mood in RETIRED_MOODS
              ? { ...e, mood: RETIRED_MOODS[e.mood] }
              : e,
          )
          .filter(
          (e: Partial<Entry>) =>
            typeof e?.id === 'string' && isMoodKey(e.mood) && typeof e.createdAt === 'number',
        )
      : []
    const holdHours = Number(data?.settings?.holdHours)
    return {
      entries: entries.map((e) => ({
        ...e,
        updatedAt: typeof e.updatedAt === 'number' ? e.updatedAt : e.createdAt,
        note: typeof e.note === 'string' ? e.note : '',
      })),
      settings: {
        holdHours: holdHours > 0 ? holdHours : DEFAULT_SETTINGS.holdHours,
      },
    }
  } catch {
    return empty
  }
}

export function createStore(storage: Storage | null) {
  let state: State = parse(read())
  const listeners = new Set<Listener>()

  function read(): string | null {
    try {
      return storage?.getItem(STORAGE_KEY) ?? null
    } catch {
      return null
    }
  }

  function commit(next: State) {
    state = next
    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Storage full or blocked (private mode): keep working in memory.
    }
    listeners.forEach((l) => l())
  }

  function sorted(entries: Entry[]) {
    return [...entries].sort((a, b) => b.createdAt - a.createdAt)
  }

  return {
    getState: () => state,

    subscribe(listener: Listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    getEntry: (id: string) => state.entries.find((e) => e.id === id),

    /**
     * Records a mood, when the person saves it on the journal screen. `at` is
     * when the mood was tapped; its fading timer runs from then.
     */
    logMood(mood: MoodKey, at = Date.now(), note = ''): Entry {
      const entry: Entry = { id: newId(), mood, createdAt: at, updatedAt: at, note: normalizeNote(note) }
      commit({ ...state, entries: sorted([entry, ...state.entries]) })
      return entry
    },

    saveNote(id: string, note: string, now = Date.now()) {
      commit({
        ...state,
        entries: state.entries.map((e) =>
          e.id === id ? { ...e, note: normalizeNote(note), updatedAt: now } : e,
        ),
      })
    },

    deleteEntry(id: string) {
      commit({ ...state, entries: state.entries.filter((e) => e.id !== id) })
    },

    setHoldHours(holdHours: number) {
      commit({ ...state, settings: { ...state.settings, holdHours } })
    },

    loadSample(now = Date.now()) {
      const samples = sampleEntries(now).map((s) => ({
        ...s,
        id: newId(),
        updatedAt: s.createdAt,
      }))
      commit({ ...state, entries: sorted([...samples, ...state.entries]) })
    },

    clearAll() {
      commit({ ...state, entries: [] })
    },

    exportJson(): string {
      return JSON.stringify({ app: 'weather', version: 1, ...state }, null, 2)
    },
  }
}

export type Store = ReturnType<typeof createStore>

/**
 * The mood that is still "in the air": the latest entry, while it is younger
 * than the hold time. Afterwards the person is back at the neutral resting
 * state, which is not stored as an entry: it is simply the absence of one.
 */
export function currentMood(state: State, now = Date.now()): { entry: Entry; until: number } | null {
  const latest = state.entries.reduce<Entry | null>(
    (acc, e) => (e.createdAt <= now && (!acc || e.createdAt > acc.createdAt) ? e : acc),
    null,
  )
  if (!latest) return null
  const until = latest.createdAt + state.settings.holdHours * 60 * 60 * 1000
  return until > now ? { entry: latest, until } : null
}

function browserStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

export const store = createStore(browserStorage())

export function useStoreState(): State {
  return useSyncExternalStore(store.subscribe, store.getState)
}
