import { ChevronLeft, Save, Trash2 } from 'lucide-react'
import { Suspense, lazy, useState, type CSSProperties } from 'react'
import { Dialog } from '../components/Dialog'
import { Face } from '../components/Face'
import { formatDate, formatTime } from '../lib/format'
import { useThemeColor } from '../lib/hooks'
import { getMood } from '../lib/moods'
import { goBack } from '../lib/router'
import { normalizeNote, store, useStoreState, type Entry } from '../lib/store'

// The editor is the heaviest part of the app, so it loads in its own chunk
// (and is warmed up in the background from main.tsx).
const RichTextEditor = lazy(() => import('../components/RichTextEditor'))

/**
 * The journal entry for one logged mood. The mood is already saved by the
 * time this opens (one tap = logged); writing here is optional and can
 * happen now or later from History.
 */
export function EntryScreen({ id }: { id: string }) {
  const entry = useStoreState().entries.find((e) => e.id === id)
  if (!entry) return <MissingEntry />
  // Keyed so switching entries starts a fresh editor.
  return <EntryEditor key={entry.id} entry={entry} />
}

function EntryEditor({ entry }: { entry: Entry }) {
  const mood = getMood(entry.mood)
  const [draft, setDraft] = useState(entry.note)
  const [confirm, setConfirm] = useState<'discard' | 'delete' | null>(null)
  const dirty = normalizeNote(draft) !== entry.note
  useThemeColor(mood.color)

  function onBack() {
    if (dirty) setConfirm('discard')
    else goBack()
  }

  function onSave() {
    store.saveNote(entry.id, draft)
    goBack()
  }

  function onDelete() {
    // Delete once we've left, so this screen never flashes "missing".
    const done = () => {
      window.removeEventListener('hashchange', done)
      store.deleteEntry(entry.id)
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
        <button
          type="button"
          className="round-btn is-quiet"
          aria-label="Delete this entry"
          onClick={() => setConfirm('delete')}
        >
          <Trash2 size={20} strokeWidth={2.2} />
        </button>
      </header>

      <div className="entry-hero">
        <Face mood={mood.key} size={100} />
        <h1 className="entry-mood">{mood.label}</h1>
        <p className="entry-date">{formatDate(entry.createdAt)}</p>
        <p className="entry-time">{formatTime(entry.createdAt)}</p>
      </div>

      <Suspense fallback={<div className="journal-card" />}>
        <RichTextEditor initialHtml={entry.note} placeholder="What’s on your mind?" onChange={setDraft} />
      </Suspense>

      <button type="button" className="save-btn" onClick={onSave}>
        <Save size={26} strokeWidth={2.4} aria-hidden="true" />
        Save
      </button>

      {confirm === 'discard' && (
        <Dialog
          title="Leave without saving?"
          message={`Your ${mood.label.toLowerCase()} mood stays logged. Only the changes to your note will be lost.`}
          onClose={() => setConfirm(null)}
          actions={[
            { label: 'Keep writing', onClick: () => setConfirm(null), variant: 'primary' },
            { label: 'Discard changes', onClick: () => goBack(), variant: 'danger' },
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
            { label: 'Delete', onClick: onDelete, variant: 'danger' },
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
