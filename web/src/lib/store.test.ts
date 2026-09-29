import { beforeEach, describe, expect, it } from 'vitest'
import { MOODS } from './moods'
import { createStore, currentMood, noteToPlainText, normalizeNote } from './store'

const HOUR = 60 * 60 * 1000
const T0 = new Date('2026-09-26T10:24:00').getTime()

describe('store', () => {
  beforeEach(() => localStorage.clear())

  it('logs a mood with one call and persists it', () => {
    const store = createStore(localStorage)
    const entry = store.logMood('anxious', T0)
    expect(entry).toMatchObject({ mood: 'anxious', createdAt: T0, note: '' })

    const reloaded = createStore(localStorage)
    expect(reloaded.getState().entries).toHaveLength(1)
    expect(reloaded.getEntry(entry.id)?.mood).toBe('anxious')
  })

  it('keeps entries newest first', () => {
    const store = createStore(localStorage)
    store.logMood('sad', T0)
    store.logMood('happy', T0 + HOUR)
    store.logMood('angry', T0 - HOUR)
    expect(store.getState().entries.map((e) => e.mood)).toEqual(['happy', 'sad', 'angry'])
  })

  it('saves a note and treats an empty editor as no note', () => {
    const store = createStore(localStorage)
    const { id } = store.logMood('sad', T0)
    store.saveNote(id, '<p>Missed the call.</p>', T0 + 5)
    expect(store.getEntry(id)).toMatchObject({ note: '<p>Missed the call.</p>', updatedAt: T0 + 5 })

    store.saveNote(id, '<p></p>')
    expect(store.getEntry(id)?.note).toBe('')
  })

  it('deletes one entry, or all of them, and keeps settings', () => {
    const store = createStore(localStorage)
    const a = store.logMood('sad', T0)
    store.logMood('happy', T0 + 1)
    store.setHoldHours(6)
    store.deleteEntry(a.id)
    expect(store.getState().entries.map((e) => e.mood)).toEqual(['happy'])
    store.clearAll()
    expect(store.getState().entries).toEqual([])
    expect(store.getState().settings.holdHours).toBe(6)
  })

  it('notifies subscribers on change', () => {
    const store = createStore(localStorage)
    let calls = 0
    const unsubscribe = store.subscribe(() => calls++)
    store.logMood('peaceful', T0)
    unsubscribe()
    store.logMood('peaceful', T0)
    expect(calls).toBe(1)
  })

  it('survives corrupt or foreign data in storage', () => {
    localStorage.setItem('weather.v1', '{not json')
    expect(createStore(localStorage).getState().entries).toEqual([])

    localStorage.setItem(
      'weather.v1',
      JSON.stringify({
        entries: [
          { id: 'ok', mood: 'sad', createdAt: T0 },
          { id: 'bad-mood', mood: 'euphoric', createdAt: T0 },
          { mood: 'sad', createdAt: T0 },
        ],
        settings: { holdHours: -3 },
      }),
    )
    const state = createStore(localStorage).getState()
    expect(state.entries.map((e) => e.id)).toEqual(['ok'])
    expect(state.entries[0]).toMatchObject({ note: '', updatedAt: T0 })
    expect(state.settings.holdHours).toBe(4)
  })

  it('works in memory when storage is unavailable', () => {
    const store = createStore(null)
    store.logMood('happy', T0)
    expect(store.getState().entries).toHaveLength(1)
  })

  it('adds sample entries only in the past', () => {
    const store = createStore(localStorage)
    store.loadSample(T0)
    const { entries } = store.getState()
    expect(entries.length).toBeGreaterThan(10)
    expect(entries.every((e) => e.createdAt < T0)).toBe(true)
    expect(currentMood(store.getState(), T0)).toBeNull()
  })
})

describe('currentMood (a mood is weather: it fades)', () => {
  it('holds the latest mood for the hold time, then returns to neutral', () => {
    const store = createStore(null)
    store.logMood('anxious', T0)
    const state = store.getState()

    expect(currentMood(state, T0 + 3.9 * HOUR)).toMatchObject({
      entry: { mood: 'anxious' },
      until: T0 + 4 * HOUR,
    })
    expect(currentMood(state, T0 + 4 * HOUR)).toBeNull()
  })

  it('follows the hold-time setting', () => {
    const store = createStore(null)
    store.logMood('sad', T0)
    store.setHoldHours(8)
    expect(currentMood(store.getState(), T0 + 7 * HOUR)?.entry.mood).toBe('sad')
  })

  it('uses the most recent mood, and a new tap replaces it', () => {
    const store = createStore(null)
    store.logMood('angry', T0)
    store.logMood('peaceful', T0 + HOUR)
    expect(currentMood(store.getState(), T0 + 2 * HOUR)?.entry.mood).toBe('peaceful')
  })

  it('is empty when nothing has been logged', () => {
    expect(currentMood(createStore(null).getState(), T0)).toBeNull()
  })
})

describe('notes', () => {
  it('turns editor HTML into a readable one-line preview', () => {
    expect(noteToPlainText('<p>Things that helped:</p><ul><li><p>Tea</p></li><li><p>Bia</p></li></ul>')).toBe(
      'Things that helped: Tea Bia',
    )
    expect(noteToPlainText('<p>A &amp; B</p>')).toBe('A & B')
    expect(normalizeNote('<p> </p>')).toBe('')
  })
})

describe('palette', () => {
  it('has the seven designed moods in order, each with unique colours', () => {
    expect(MOODS.map((m) => m.label)).toEqual([
      'Depressed',
      'Sad',
      'Happy',
      'Peaceful',
      'Neutral',
      'Anxious',
      'Angry',
    ])
    expect(new Set(MOODS.map((m) => m.color)).size).toBe(MOODS.length)
  })
})
