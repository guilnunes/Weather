import { Download, LogOut, Sparkles, Trash2, UserX } from 'lucide-react'
import { useState } from 'react'
import { Dialog } from '../components/Dialog'
import { TabBar } from '../components/TabBar'
import { deleteAccount, friendlyError, signOut, useAuth } from '../lib/auth'
import { useThemeColor } from '../lib/hooks'
import { clearLocalCopy, HOLD_HOURS_OPTIONS, store, useStoreState, useSyncStatus, type SyncStatus } from '../lib/store'

const SYNC_TEXT: Record<SyncStatus, string> = {
  local: '',
  syncing: 'Syncing…',
  synced: 'All changes saved to your account.',
  offline: 'Offline: changes are saved on this device and will sync when you’re back online.',
}

const PAGE_BG = '#F7F4F1'

export function Settings() {
  const { entries, settings } = useStoreState()
  const auth = useAuth()
  const user = auth.status === 'signedIn' ? auth.user : null
  const sync = useSyncStatus()
  const [confirmClear, setConfirmClear] = useState(false)
  const [confirm, setConfirm] = useState<'signout' | 'delete-account' | null>(null)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function doSignOut() {
    if (!user) return
    setBusy(true)
    await signOut()
    // Don't leave a readable copy of the journal behind on a shared device.
    clearLocalCopy(user.id)
  }

  async function doDeleteAccount() {
    if (!user) return
    setBusy(true)
    setAccountError(null)
    try {
      await deleteAccount()
      clearLocalCopy(user.id)
    } catch (error) {
      setAccountError(friendlyError(error))
      setBusy(false)
      setConfirm(null)
    }
  }
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
            Saved to your account, readable only by you. {entries.length}{' '}
            {entries.length === 1 ? 'entry' : 'entries'}. {SYNC_TEXT[sync]}
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

        <section className="card">
          <h2 className="card-title">Account</h2>
          <p className="card-note">Signed in as {user?.email ?? 'you'}.</p>
          {accountError && (
            <p className="card-note is-error" role="alert">
              {accountError}
            </p>
          )}
          <div className="row-list">
            <button
              type="button"
              className="row-btn"
              disabled={busy}
              onClick={() => (store.hasPending() ? setConfirm('signout') : void doSignOut())}
            >
              <LogOut size={20} aria-hidden="true" />
              Sign out
            </button>
            <button
              type="button"
              className="row-btn is-danger"
              disabled={busy}
              onClick={() => setConfirm('delete-account')}
            >
              <UserX size={20} aria-hidden="true" />
              Delete account
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

      {confirm === 'signout' && (
        <Dialog
          title="Sign out now?"
          message="Some changes haven’t reached your account yet (you seem to be offline). Signing out now will lose them."
          onClose={() => setConfirm(null)}
          actions={[
            { label: 'Stay signed in', onClick: () => setConfirm(null), variant: 'primary' },
            { label: 'Sign out anyway', onClick: () => void doSignOut(), variant: 'danger' },
          ]}
        />
      )}
      {confirm === 'delete-account' && (
        <Dialog
          title="Delete your account?"
          message="Your account and every mood and note in it will be permanently deleted. Export them first if you want a copy. This can’t be undone."
          onClose={() => setConfirm(null)}
          actions={[
            { label: 'Cancel', onClick: () => setConfirm(null) },
            { label: busy ? 'Deleting…' : 'Delete account', onClick: () => void doDeleteAccount(), variant: 'danger' },
          ]}
        />
      )}
      {confirmClear && (
        <Dialog
          title="Delete all entries?"
          message="Every mood and note in your account will be removed, on all your devices. This can’t be undone."
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
