import { Download, Sparkles, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Dialog } from '../components/Dialog'
import { TabBar } from '../components/TabBar'
import { useThemeColor } from '../lib/hooks'
import { HOLD_HOURS_OPTIONS, store, useStoreState } from '../lib/store'

const PAGE_BG = '#F7F4F1'

export function Settings() {
  const { entries, settings } = useStoreState()
  const [confirmClear, setConfirmClear] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  useThemeColor(PAGE_BG)

  function flash(message: string) {
    setNotice(message)
    window.setTimeout(() => setNotice(null), 2500)
  }

  function exportEntries() {
    const blob = new Blob([store.exportJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `weather-journal-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    // Safari cancels the download if the URL is revoked straight away.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="screen page">
      <header className="page-header">
        <h1>Settings</h1>
      </header>
      <main className="page-body">
        <section className="card">
          <h2 className="card-title" id="hold-label">
            A mood fades after
          </h2>
          <div className="segmented" role="radiogroup" aria-labelledby="hold-label">
            {HOLD_HOURS_OPTIONS.map((h) => (
              <button
                key={h}
                type="button"
                role="radio"
                aria-checked={settings.holdHours === h}
                className={settings.holdHours === h ? 'is-selected' : ''}
                onClick={() => store.setHoldHours(h)}
              >
                {h} h
              </button>
            ))}
          </div>
          <p className="card-note">
            A mood is weather, not a label. After this time it quietly returns to neutral. Tap another colour
            anytime to change it sooner.
          </p>
        </section>

        <section className="card">
          <h2 className="card-title">Your journal</h2>
          <p className="card-note">
            Everything stays on this device. Nothing is sent anywhere. {entries.length}{' '}
            {entries.length === 1 ? 'entry' : 'entries'} saved.
          </p>
          <div className="row-list">
            <button type="button" className="row-btn" onClick={exportEntries} disabled={entries.length === 0}>
              <Download size={20} aria-hidden="true" />
              Export entries (JSON)
            </button>
            <button
              type="button"
              className="row-btn"
              onClick={() => {
                store.loadSample()
                flash('Sample entries added to History')
              }}
            >
              <Sparkles size={20} aria-hidden="true" />
              Add sample entries (for demos)
            </button>
            <button
              type="button"
              className="row-btn is-danger"
              onClick={() => setConfirmClear(true)}
              disabled={entries.length === 0}
            >
              <Trash2 size={20} aria-hidden="true" />
              Delete all entries
            </button>
          </div>
        </section>

        <section className="card about">
          <h2 className="card-title">About</h2>
          <p className="card-note">
            Weather is an everyday mood log and journal. One tap names how you feel; writing is always
            optional. This is an early prototype.
          </p>
        </section>

        <p className="notice" role="status">
          {notice}
        </p>
      </main>
      <TabBar active="settings" />

      {confirmClear && (
        <Dialog
          title="Delete all entries?"
          message="Every mood and note on this device will be removed. This can’t be undone."
          onClose={() => setConfirmClear(false)}
          actions={[
            { label: 'Cancel', onClick: () => setConfirmClear(false) },
            {
              label: 'Delete everything',
              variant: 'danger',
              onClick: () => {
                store.clearAll()
                setConfirmClear(false)
                flash('All entries deleted')
              },
            },
          ]}
        />
      )}
    </div>
  )
}
