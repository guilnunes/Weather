// Demo entries so the History screen can be shown with some life in it.
// Loaded only on request, from Settings. All samples are from yesterday or
// earlier, so they never change the current mood.

import type { MoodKey } from './moods'

interface SampleSeed {
  daysAgo: number
  hour: number
  minute: number
  mood: MoodKey
  note: string
}

const SEEDS: SampleSeed[] = [
  { daysAgo: 1, hour: 8, minute: 12, mood: 'peaceful', note: '<p>Slept well for once. Coffee on the balcony before anyone woke up.</p>' },
  { daysAgo: 2, hour: 22, minute: 40, mood: 'sad', note: '' },
  { daysAgo: 2, hour: 18, minute: 5, mood: 'angry', note: '<p>Bus didn’t show up <em>again</em>. Walked home in the rain.</p>' },
  { daysAgo: 2, hour: 9, minute: 30, mood: 'neutral', note: '' },
  { daysAgo: 3, hour: 20, minute: 15, mood: 'happy', note: '<p>Dinner with <strong>Ana</strong> and Leo. Laughed until my face hurt.</p>' },
  { daysAgo: 3, hour: 10, minute: 24, mood: 'anxious', note: '<p>Presentation at 3pm. Chest tight all morning.</p><p>Things that helped:</p><ul><li><p>Breathing exercise</p></li><li><p>Texting Bia</p></li></ul>' },
  { daysAgo: 4, hour: 23, minute: 50, mood: 'depressed', note: '' },
  { daysAgo: 4, hour: 14, minute: 0, mood: 'sad', note: '<p>Missed Mom’s call. Feeling far from home today.</p>' },
  { daysAgo: 5, hour: 11, minute: 45, mood: 'peaceful', note: '<p>Long walk by the river after lunch. Quiet.</p>' },
  { daysAgo: 6, hour: 19, minute: 20, mood: 'anxious', note: '' },
  { daysAgo: 6, hour: 8, minute: 55, mood: 'neutral', note: '' },
  { daysAgo: 7, hour: 21, minute: 10, mood: 'happy', note: '<p>Finished the book. Good ending.</p>' },
  { daysAgo: 8, hour: 16, minute: 35, mood: 'angry', note: '<p>Argument with my landlord about the repairs.</p>' },
  { daysAgo: 8, hour: 9, minute: 5, mood: 'peaceful', note: '' },
  { daysAgo: 9, hour: 13, minute: 30, mood: 'neutral', note: '<p>Ordinary day. That’s fine.</p>' },
]

export function sampleEntries(now: number): { mood: MoodKey; createdAt: number; note: string }[] {
  return SEEDS.map((s) => {
    const d = new Date(now)
    d.setDate(d.getDate() - s.daysAgo)
    d.setHours(s.hour, s.minute, 0, 0)
    return { mood: s.mood, createdAt: d.getTime(), note: s.note }
  })
}
