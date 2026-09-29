import { ChevronLeft, Save, Trash2 } from 'lucide-react'
import { Suspense, lazy, useRef, useState, type CSSProperties } from 'react'
import { Dialog } from '../components/Dialog'
import { Face } from '../components/Face'
import { formatDate, formatTime } from '../lib/format'
import { useThemeColor } from '../lib/hooks'
import { getMood, type MoodKey } from '../lib/moods'
import { goBack } from '../lib/router'
import { normalizeNote, store, useStoreState } from '../lib/store'

// The editor is the heaviest part of the app, so it loads in its own chunk
// (and is warmed up in the background from main.tsx).
const RichTextEditor = lazy(() => import('../components/RichTextEditor'))

/**
 * A mood just tapped on Home. Nothing is recorded until Save: going back
 * cancels it, so no entry is kept and no fading timer starts.
 */
export function NewEntryScreen({ mood, at }: { mood: MoodKey; at: number }) {
  const [savedHere, setSavedHere] = useState(false)
  const alreadySaved = useStoreState().entries.find((e) => e.mood === mood && e.createdAt === at)

  // Reached again after saving (e.g. the browser's Forward button): show the
  // saved entry rather than offering to log the same mood twice.
  if (alreadySaved && !savedHere) return <EntryScreen id={alreadySaved.id} />

  return (
    <JournalScreen
      key={`${mood}-${at}`}
      moodKey={mood}
      at={at}
      initialNote=""
      onSave={(note) => {
        setSavedHere(true)
        store.logMood(mood, at, note)
      }}
      discardMessage={`This ${getMood(mood).label.toLowerCase()} mood won’t be logged, and your note will be lost.`}
    />
  )
}

/** An entry already saved, opened from History to read, annotate or delete. */
export function EntryScreen({ id }: { id: string }) {
  const entry = useStoreState().entries.find((e) => e.id === id)
  if (!entry) return <MissingEntry />
  return (
    <JournalScreen
      // Keyed so switching entries starts a fresh editor.
      key={entry.id}
      moodKey={entry.mood}
      at={entry.createdAt}
      initialNote={entry.note}
      onSave={(note) => store.saveNote(entry.id, note)}
      onDelete={() => store.deleteEntry(entry.id)}
      discardMessage="Your mood stays logged. Only the changes to your note will be lost."
    />
  )
}

interface JournalProps {
  moodKey: MoodKey
  at: number
  initialNote: string
  onSave: (note: string) => void
  onDelete?: () => void
  discardMessage: string
}

function JournalScreen({ moodKey, at, initialNote, onSave, onDelete, discardMessage }: JournalProps) {
  const mood = getMood(moodKey)
  const [draft, setDraft] = useState(initialNote)
  const [confirm, setConfirm] = useState<'discard' | 'delete' | null>(null)
  const saved = useRef(false)
  const dirty = normalizeNote(draft) !== initialNote
  useThemeColor(mood.color)

  function onBack() {
    if (dirty) setConfirm('discard')
    else goBack()
  }

  function save() {
    // Leaving takes a moment; a second tap must not save twice.
    if (saved.current) return
    saved.current = true
    onSave(draft)
    goBack()
  }

  function remove() {
    if (!onDelete) return
    // Delete once we've left, so this screen never flashes "missing".
    const done = () => {
      window.removeEventListener('hashchange', done)
      onDelete()
    }
    window.addEventListener('hashchange', done)
    goBack()
  }

  const style = { '--mood': mood.color, '--mood-deep': mood.deep } as CSSProperties

  return (
    <div className={`screen entry mood-${mood.key}`} style={style}>
      <div className="entry-decor" aria-hidden="true" />
      <header className="entry-top">
        <button type="button" className="round-btn" aria-label="Back" onClick={onBack}>
          <ChevronLeft size={30} strokeWidth={2.6} />
        </button>
        {onDelete && (
          <button
            type="button"
            className="round-btn is-quiet"
            aria-label="Delete this entry"
            onClick={() => setConfirm('delete')}
          >
            <Trash2 size={20} strokeWidth={2.2} />
          </button>
        )}
      </header>

      <div className="entry-hero">
        <Face mood={mood.key} size={100} />
        <h1 className="entry-mood">{mood.label}</h1>
        <p className="entry-date">{formatDate(at)}</p>
        <p className="entry-time">{formatTime(at)}</p>
      </div>

      <Suspense fallback={<div className="journal-card" />}>
        <RichTextEditor initialHtml={initialNote} placeholder="What’s on your mind?" onChange={setDraft} />
      </Suspense>

      <button type="button" className="save-btn" onClick={save}>
        <Save size={26} strokeWidth={2.4} aria-hidden="true" />
        Save
      </button>

      {confirm === 'discard' && (
        <Dialog
          title="Leave without saving?"
          message={discardMessage}
          onClose={() => setConfirm(null)}
          actions={[
            { label: 'Keep writing', onClick: () => setConfirm(null), variant: 'primary' },
            { label: 'Discard', onClick: () => goBack(), variant: 'danger' },
          ]}
        />
      )}
      {confirm === 'delete' && (
        <Dialog
          title="Delete this entry?"
          message="The mood and its note will be removed from your history."
          onClose={() => setConfirm(null)}
          actions={[
            { label: 'Cancel', onClick: () => setConfirm(null) },
            { label: 'Delete', onClick: remove, variant: 'danger' },
          ]}
        />
      )}
    </div>
  )
}

function MissingEntry() {
  useThemeColor('#F7F4F1')
  return (
    <div className="screen page missing">
      <p>This entry is no longer here.</p>
      <button type="button" className="text-btn" onClick={() => goBack()}>
        Go back
      </button>
    </div>
  )
}
