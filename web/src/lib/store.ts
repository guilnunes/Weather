// Entries and settings for the signed-in person.
//
// The screens read and write a local copy (localStorage, one per account), so
// the app stays instant and works offline. Every change is also queued for the
// account's database (a Remote); the queue is persisted and retried until it
// goes through, and the account's data is pulled back in on sign-in.

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

/** Where entries lived before accounts existed (one per device). */
export const LEGACY_STORAGE_KEY = 'weather.v1'

type Listener = () => void

/** The account's database, as seen by the store. */
export interface Remote {
  pull(): Promise<{ entries: Entry[]; settings: Settings | null }>
  upsert(entries: Entry[]): Promise<void>
  remove(ids: string[]): Promise<void>
  removeAll(): Promise<void>
  saveSettings(settings: Settings): Promise<void>
}

/** A change waiting to reach the account's database. */
export type PendingOp =
  | { kind: 'upsert'; entries: Entry[] }
  | { kind: 'delete'; ids: string[] }
  | { kind: 'clear' }
  | { kind: 'settings' }

/** 'offline' means changes are saved on this device and waiting to sync. */
export type SyncStatus = 'local' | 'syncing' | 'synced' | 'offline'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // RFC 4122 version 4, for browsers without randomUUID (the database wants a uuid).
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
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

export function parse(raw: string | null): State {
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

interface StoreOptions {
  /** localStorage key for this account's copy. */
  key?: string
  remote?: Remote
}

function sorted(entries: Entry[]) {
  return [...entries].sort((a, b) => b.createdAt - a.createdAt)
}

function applyOp(state: State, op: PendingOp): State {
  switch (op.kind) {
    case 'upsert': {
      const ids = new Set(op.entries.map((e) => e.id))
      return { ...state, entries: sorted([...op.entries, ...state.entries.filter((e) => !ids.has(e.id))]) }
    }
    case 'delete':
      return { ...state, entries: state.entries.filter((e) => !op.ids.includes(e.id)) }
    case 'clear':
      return { ...state, entries: [] }
    case 'settings':
      return state
  }
}

export function createStore(storage: Storage | null, { key = LEGACY_STORAGE_KEY, remote }: StoreOptions = {}) {
  const pendingKey = `${key}.pending`
  let state: State = parse(read(key))
  let pending: PendingOp[] = readPending()
  let status: SyncStatus = remote ? (pending.length ? 'offline' : 'syncing') : 'local'
  let flushing: Promise<void> | null = null
  let disposed = false
  const listeners = new Set<Listener>()

  function read(k: string): string | null {
    try {
      return storage?.getItem(k) ?? null
    } catch {
      return null
    }
  }

  function write(k: string, value: string) {
    try {
      storage?.setItem(k, value)
    } catch {
      // Storage full or blocked (private mode): keep working in memory.
    }
  }

  function readPending(): PendingOp[] {
    try {
      const ops = JSON.parse(read(pendingKey) ?? '[]')
      return Array.isArray(ops) ? ops : []
    } catch {
      return []
    }
  }

  function emit() {
    listeners.forEach((l) => l())
  }

  function setStatus(next: SyncStatus) {
    if (status !== next) {
      status = next
      emit()
    }
  }

  function commit(next: State) {
    state = next
    write(key, JSON.stringify(state))
    emit()
  }

  /** Apply a change locally now, and queue it for the account. */
  function change(op: PendingOp) {
    commit(applyOp(state, op))
    if (!remote) return
    pending = [...pending, op]
    write(pendingKey, JSON.stringify(pending))
    void flush()
  }

  async function send(op: PendingOp) {
    if (!remote) return
    switch (op.kind) {
      case 'upsert':
        return remote.upsert(op.entries)
      case 'delete':
        return remote.remove(op.ids)
      case 'clear':
        return remote.removeAll()
      case 'settings':
        return remote.saveSettings(state.settings)
    }
  }

  /** Send queued changes in order; stop at the first failure and retry later. */
  function flush(): Promise<void> {
    if (!remote || disposed) return Promise.resolve()
    if (flushing) return flushing
    const run = async () => {
      setStatus('syncing')
      try {
        while (pending.length && !disposed) {
          await send(pending[0])
          pending = pending.slice(1)
          write(pendingKey, JSON.stringify(pending))
        }
        setStatus('synced')
      } catch {
        setStatus('offline')
      }
    }
    // Cleared only once `flushing` is assigned: an empty run finishes synchronously.
    flushing = run().finally(() => {
      flushing = null
    })
    return flushing
  }

  return {
    getState: () => state,
    getSyncStatus: () => status,
    hasPending: () => pending.length > 0,

    subscribe(listener: Listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    getEntry: (id: string) => state.entries.find((e) => e.id === id),

    /**
     * Records a mood, when the person saves it on the journal screen. `at` is
     * when the mood was tapped; its fading timer runs from then.
     */
    logMood(mood: MoodKey, at = Date.now(), note = ''): Entry {
      const entry: Entry = { id: newId(), mood, createdAt: at, updatedAt: at, note: normalizeNote(note) }
      change({ kind: 'upsert', entries: [entry] })
      return entry
    },

    saveNote(id: string, note: string, now = Date.now()) {
      const entry = state.entries.find((e) => e.id === id)
      if (!entry) return
      change({ kind: 'upsert', entries: [{ ...entry, note: normalizeNote(note), updatedAt: now }] })
    },

    deleteEntry(id: string) {
      change({ kind: 'delete', ids: [id] })
    },

    setHoldHours(holdHours: number) {
      commit({ ...state, settings: { ...state.settings, holdHours } })
      change({ kind: 'settings' })
    },

    loadSample(now = Date.now()) {
      const samples = sampleEntries(now).map((s) => ({ ...s, id: newId(), updatedAt: s.createdAt }))
      change({ kind: 'upsert', entries: samples })
    },

    /** Moves entries made on this device before accounts existed into the account. */
    importEntries(entries: Entry[]) {
      if (!entries.length) return
      const known = new Set(state.entries.map((e) => e.id))
      const fresh = entries
        .filter((e) => !known.has(e.id))
        .map((e) => (UUID_RE.test(e.id) ? e : { ...e, id: newId() }))
      if (fresh.length) change({ kind: 'upsert', entries: fresh })
    },

    clearAll() {
      change({ kind: 'clear' })
    },

    /**
     * Sends anything queued, then replaces the local copy with the account's
     * data (the account is the source of truth). Changes made meanwhile are
     * kept on top.
     */
    async sync() {
      if (!remote) return
      await flush()
      if (pending.length || disposed) return
      setStatus('syncing')
      try {
        const remoteState = await remote.pull()
        if (disposed) return
        let next: State = {
          entries: sorted(remoteState.entries),
          settings: remoteState.settings ?? state.settings,
        }
        for (const op of pending) next = applyOp(next, op)
        commit(next)
        setStatus(pending.length ? 'syncing' : 'synced')
        if (pending.length) void flush()
      } catch {
        setStatus('offline')
      }
    },

    /** Try the queue again (on reconnect, on return to the app). */
    retry: () => (pending.length ? flush() : Promise.resolve()),

    dispose() {
      disposed = true
      listeners.clear()
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

export function browserStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

// The store the screens use is a stable facade over the signed-in account's
// store, so components keep their subscriptions when the account changes.
let current: Store = createStore(null)
const facadeListeners = new Set<Listener>()
const notify = () => facadeListeners.forEach((l) => l())
let unsubscribeCurrent = current.subscribe(notify)

function swap(next: Store) {
  unsubscribeCurrent()
  current.dispose()
  current = next
  unsubscribeCurrent = current.subscribe(notify)
  notify()
}

/** Opens the signed-in person's store and syncs it with their account. */
export function openAccountStore(userId: string, remote: Remote): Store {
  const storage = browserStorage()
  const next = createStore(storage, { key: `weather.v2.${userId}`, remote })
  swap(next)
  // Entries made on this device before accounts existed join the first account that signs in here.
  const legacy = parse(storage?.getItem(LEGACY_STORAGE_KEY) ?? null)
  if (legacy.entries.length) {
    next.importEntries(legacy.entries)
    try {
      storage?.removeItem(LEGACY_STORAGE_KEY)
    } catch {
      // ignore
    }
  }
  void next.sync()
  return next
}

/** Removes an account's copy from this device (after signing out or deleting it). */
export function clearLocalCopy(userId: string) {
  const storage = browserStorage()
  try {
    storage?.removeItem(`weather.v2.${userId}`)
    storage?.removeItem(`weather.v2.${userId}.pending`)
  } catch {
    // ignore
  }
}

/** Forgets the account in memory (its local copy stays until cleared). */
export function closeAccountStore() {
  swap(createStore(null))
}

export const store: Store = new Proxy({} as Store, {
  get(_, prop: keyof Store) {
    if (prop === 'subscribe') {
      return (listener: Listener) => {
        facadeListeners.add(listener)
        return () => {
          facadeListeners.delete(listener)
        }
      }
    }
    return current[prop]
  },
})

export function useStoreState(): State {
  return useSyncExternalStore(store.subscribe, store.getState)
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(store.subscribe, store.getSyncStatus)
}
