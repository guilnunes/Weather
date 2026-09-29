// The mood palette: words, colours and order.
// This is the single source of truth, the web counterpart of the gadget's
// states.py. Colours were chosen with the psychologist and sampled from the
// approved design screens, so change them here and nowhere else.
//
// `color` is the band / page background. `deep` is the darker shade used for
// the Save button and the translucent back button on the journal screen
// (sampled from the Anxious screen; the other shades follow the same shift).

export type MoodKey =
  | 'depressed'
  | 'sad'
  | 'happy'
  | 'peaceful'
  | 'neutral'
  | 'anxious'
  | 'angry'

export interface Mood {
  key: MoodKey
  label: string
  color: string
  deep: string
}

// Top-to-bottom order of the bands on the Home screen, as designed.
export const MOODS: readonly Mood[] = [
  { key: 'depressed', label: 'Depressed', color: '#B03AFB', deep: '#8A1FD6' },
  { key: 'sad', label: 'Sad', color: '#2B6AFB', deep: '#1B4FD1' },
  { key: 'happy', label: 'Happy', color: '#38B2FC', deep: '#1689D6' },
  { key: 'peaceful', label: 'Peaceful', color: '#45C967', deep: '#26A047' },
  { key: 'neutral', label: 'Neutral', color: '#FCD82C', deep: '#E0A800' },
  { key: 'anxious', label: 'Anxious', color: '#FC8328', deep: '#DD5123' },
  { key: 'angry', label: 'Angry', color: '#FB3934', deep: '#C8201D' },
]

export const NEUTRAL_KEY: MoodKey = 'neutral'

const byKey = new Map(MOODS.map((m) => [m.key, m]))

export function getMood(key: MoodKey): Mood {
  return byKey.get(key) ?? byKey.get(NEUTRAL_KEY)!
}

export function isMoodKey(value: unknown): value is MoodKey {
  return typeof value === 'string' && byKey.has(value as MoodKey)
}
