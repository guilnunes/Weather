import { beforeEach, describe, expect, it } from 'vitest'
import { createStore, type Entry, type Remote, type Settings } from './store'

const T0 = new Date('2026-09-26T10:24:00').getTime()

/** An in-memory account database that can be switched offline. */
function fakeRemote(initial: Entry[] = [], settings: Settings | null = null) {
  const db = new Map(initial.map((e) => [e.id, e]))
  const remote = {
    offline: false,
    settings,
    calls: [] as string[],
    db,
    check(name: string) {
      remote.calls.push(name)
      if (remote.offline) throw new Error('offline')
    },
    async pull() {
      remote.check('pull')
      return { entries: [...db.values()], settings: remote.settings }
    },
    async upsert(entries: Entry[]) {
      remote.check('upsert')
      entries.forEach((e) => db.set(e.id, e))
    },
    async remove(ids: string[]) {
      remote.check('remove')
      ids.forEach((id) => db.delete(id))
    },
    async removeAll() {
      remote.check('removeAll')
      db.clear()
    },
    async saveSettings(s: Settings) {
      remote.check('saveSettings')
      remote.settings = { ...s }
    },
  }
  return remote satisfies Remote
}

const tick = () => new Promise((r) => setTimeout(r, 0))

describe('syncing with the account', () => {
  beforeEach(() => localStorage.clear())

  it('sends new moods, notes and deletions to the account', async () => {
    const remote = fakeRemote()
    const store = createStore(localStorage, { key: 'k', remote })
    const a = store.logMood('sad', T0)
    store.saveNote(a.id, '<p>Missed the call.</p>', T0 + 5)
    const b = store.logMood('happy', T0 + 10)
    store.deleteEntry(b.id)
    await store.retry()
    await tick()
    expect([...remote.db.values()]).toEqual([expect.objectContaining({ id: a.id, note: '<p>Missed the call.</p>' })])
    expect(store.getSyncStatus()).toBe('synced')
  })

  it('still sends changes made after a sync that had nothing to send', async () => {
    const remote = fakeRemote()
    const store = createStore(localStorage, { key: 'k', remote })
    await store.sync()
    store.logMood('overwhelmed', T0)
    await tick()
    await tick()
    expect(remote.db.size).toBe(1)
    expect(store.hasPending()).toBe(false)
  })

  it('keeps changes made offline and sends them once back online', async () => {
    const remote = fakeRemote()
    remote.offline = true
    const store = createStore(localStorage, { key: 'k', remote })
    store.logMood('anxious', T0)
    await tick()
    expect(store.getSyncStatus()).toBe('offline')
    expect(store.getState().entries).toHaveLength(1)

    // The queue survives a reload of the app.
    const reopened = createStore(localStorage, { key: 'k', remote })
    expect(reopened.hasPending()).toBe(true)
    remote.offline = false
    await reopened.retry()
    expect(remote.db.size).toBe(1)
    expect(reopened.hasPending()).toBe(false)
  })

  it('takes the account as the source of truth on sign-in', async () => {
    const onServer: Entry = { id: 'a0000000-0000-4000-8000-000000000001', mood: 'overwhelmed', createdAt: T0, updatedAt: T0, note: '' }
    const remote = fakeRemote([onServer], { holdHours: 6 })
    localStorage.setItem('k', JSON.stringify({ entries: [{ id: 'stale', mood: 'sad', createdAt: T0 }] }))
    const store = createStore(localStorage, { key: 'k', remote })
    await store.sync()
    expect(store.getState().entries.map((e) => e.id)).toEqual([onServer.id])
    expect(store.getState().settings.holdHours).toBe(6)
  })

  it('sends queued changes before pulling, so nothing is lost', async () => {
    const remote = fakeRemote()
    remote.offline = true
    const store = createStore(localStorage, { key: 'k', remote })
    const e = store.logMood('neutral', T0)
    await tick()
    remote.offline = false
    await store.sync()
    expect(remote.calls.slice(-2)).toEqual(['upsert', 'pull'])
    expect(store.getState().entries.map((x) => x.id)).toEqual([e.id])
  })

  it('saves the fading time to the account', async () => {
    const remote = fakeRemote()
    const store = createStore(localStorage, { key: 'k', remote })
    store.setHoldHours(8)
    await store.retry()
    await tick()
    expect(remote.settings).toEqual({ holdHours: 8 })
  })

  it('imports pre-account entries once, giving old ids a uuid', async () => {
    const remote = fakeRemote()
    const store = createStore(localStorage, { key: 'k', remote })
    const legacy: Entry[] = [{ id: 'lq3x-ab12', mood: 'happy', createdAt: T0, updatedAt: T0, note: '<p>Old</p>' }]
    store.importEntries(legacy)
    await store.retry()
    await tick()
    const [saved] = [...remote.db.values()]
    expect(saved).toMatchObject({ mood: 'happy', note: '<p>Old</p>' })
    expect(saved.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('deletes everything in the account', async () => {
    const remote = fakeRemote()
    const store = createStore(localStorage, { key: 'k', remote })
    store.logMood('angry', T0)
    store.clearAll()
    await store.retry()
    await tick()
    expect(remote.db.size).toBe(0)
    expect(store.getState().entries).toEqual([])
  })
})
