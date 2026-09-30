// Account screens: sign in, sign up, forgot / set new password, the
// first-time privacy consent, and the "check your email" steps.

import { Eye, EyeOff, Lock, Mail, MapPin, Trash2 } from 'lucide-react'
import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react'
import { useThemeColor } from '../lib/hooks'
import { MOODS } from '../lib/moods'
import { navigate } from '../lib/router'
import {
  friendlyError,
  giveConsent,
  resendConfirmation,
  sendPasswordReset,
  setNewPassword,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  signUpWithEmail,
  takeRedirectError,
} from '../lib/auth'
import { fetchAuthSettings } from '../lib/supabase'

const PAGE_BG = '#F7F4F1'
const MIN_PASSWORD = 8

function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  useThemeColor(PAGE_BG)
  return (
    <div className="screen page auth">
      <div className="auth-scroll">
        <div className="auth-brand" aria-hidden="true">
          {MOODS.map((m) => (
            <span key={m.key} style={{ background: m.color }} />
          ))}
        </div>
        <p className="auth-app">Weather</p>
        <h1 className="auth-title">{title}</h1>
        {subtitle && <p className="auth-subtitle">{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}

/** Google's multicolour "G", as its branding guidelines ask. */
function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

function useGoogleAvailable(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null)
  useEffect(() => {
    let alive = true
    void fetchAuthSettings().then((s) => alive && setAvailable(s ? s.google : false))
    return () => {
      alive = false
    }
  }, [])
  return available
}

function GoogleButton({ label, onError }: { label: string; onError: (message: string) => void }) {
  const available = useGoogleAvailable()
  const [busy, setBusy] = useState(false)
  if (available === false) {
    return <p className="auth-note">Google sign-in isn’t switched on for this app yet. Use your email for now.</p>
  }
  return (
    <button
      type="button"
      className="auth-google"
      disabled={busy || available === null}
      onClick={async () => {
        setBusy(true)
        try {
          await signInWithGoogle() // leaves the page for Google
        } catch (error) {
          onError(friendlyError(error))
          setBusy(false)
        }
      }}
    >
      <GoogleLogo />
      {label}
    </button>
  )
}

function Divider() {
  return (
    <div className="auth-divider" role="separator">
      <span>or with email</span>
    </div>
  )
}

function Field(props: {
  label: string
  type: 'email' | 'password'
  value: string
  onChange: (value: string) => void
  autoComplete: string
  hint?: string
  autoFocus?: boolean
}) {
  const id = useId()
  const [shown, setShown] = useState(false)
  const isPassword = props.type === 'password'
  return (
    <div className="auth-field">
      <label htmlFor={id}>{props.label}</label>
      <div className="auth-input-wrap">
        {isPassword ? <Lock size={18} aria-hidden="true" /> : <Mail size={18} aria-hidden="true" />}
        <input
          id={id}
          type={isPassword && !shown ? 'password' : isPassword ? 'text' : 'email'}
          inputMode={isPassword ? undefined : 'email'}
          autoComplete={props.autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          required
          minLength={isPassword && props.autoComplete === 'new-password' ? MIN_PASSWORD : undefined}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          autoFocus={props.autoFocus}
          aria-describedby={props.hint ? `${id}-hint` : undefined}
        />
        {isPassword && (
          <button
            type="button"
            className="auth-reveal"
            aria-label={shown ? 'Hide password' : 'Show password'}
            onClick={() => setShown(!shown)}
          >
            {shown ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {props.hint && (
        <p className="auth-hint" id={`${id}-hint`}>
          {props.hint}
        </p>
      )}
    </div>
  )
}

function ErrorText({ message }: { message: string | null }) {
  return (
    <p className="auth-error" role="alert">
      {message}
    </p>
  )
}

function SubmitButton({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <button type="submit" className="auth-primary" disabled={busy}>
      {busy ? 'One moment…' : children}
    </button>
  )
}

const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

/** Runs an async form action with busy + friendly error state. */
function useAction() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, setError, run }
}

export function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { busy, error, setError, run } = useAction()
  useEffect(() => {
    const redirectError = takeRedirectError()
    if (redirectError) setError(friendlyError(redirectError))
  }, [setError])

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!looksLikeEmail(email)) return setError('Enter the email address you signed up with.')
    if (!password) return setError('Enter your password.')
    void run(() => signInWithEmail(email.trim(), password))
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to see your moods and notes.">
      <GoogleButton label="Continue with Google" onError={setError} />
      <Divider />
      <form className="auth-form" onSubmit={submit} noValidate>
        <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
        <button type="button" className="auth-link auth-forgot" onClick={() => navigate({ name: 'forgot' })}>
          Forgot password?
        </button>
        <ErrorText message={error} />
        <SubmitButton busy={busy}>Sign in</SubmitButton>
      </form>
      <p className="auth-switch">
        New here?{' '}
        <button type="button" className="auth-link" onClick={() => navigate({ name: 'signup' }, { replace: true })}>
          Create an account
        </button>
      </p>
    </AuthLayout>
  )
}

export function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const { busy, error, setError, run } = useAction()

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!looksLikeEmail(email)) return setError('Enter a valid email address.')
    if (password.length < MIN_PASSWORD) {
      setError(`Choose a longer password: at least ${MIN_PASSWORD} characters.`)
      return
    }
    void run(async () => {
      const needsConfirmation = await signUpWithEmail(email.trim(), password)
      if (needsConfirmation) setSentTo(email.trim())
      // Otherwise the new session signs them straight in.
    })
  }

  if (sentTo) return <CheckEmail email={sentTo} onResend={() => resendConfirmation(sentTo)} kind="confirm" />

  return (
    <AuthLayout title="Create your account" subtitle="Your moods and notes stay private to you, on any device.">
      <GoogleButton label="Sign up with Google" onError={setError} />
      <Divider />
      <form className="auth-form" onSubmit={submit} noValidate>
        <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD} characters.`}
        />
        <ErrorText message={error} />
        <SubmitButton busy={busy}>Create account</SubmitButton>
      </form>
      <p className="auth-switch">
        Already have an account?{' '}
        <button type="button" className="auth-link" onClick={() => navigate({ name: 'signin' }, { replace: true })}>
          Sign in
        </button>
      </p>
    </AuthLayout>
  )
}

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const { busy, error, setError, run } = useAction()

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!looksLikeEmail(email)) return setError('Enter a valid email address.')
    void run(async () => {
      await sendPasswordReset(email.trim())
      setSentTo(email.trim())
    })
  }

  if (sentTo) return <CheckEmail email={sentTo} onResend={() => sendPasswordReset(sentTo)} kind="reset" />

  return (
    <AuthLayout title="Reset your password" subtitle="We’ll email you a link to choose a new one.">
      <form className="auth-form" onSubmit={submit} noValidate>
        <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" autoFocus />
        <ErrorText message={error} />
        <SubmitButton busy={busy}>Send reset link</SubmitButton>
      </form>
      <p className="auth-switch">
        <button type="button" className="auth-link" onClick={() => navigate({ name: 'signin' }, { replace: true })}>
          Back to sign in
        </button>
      </p>
    </AuthLayout>
  )
}

function CheckEmail({ email, onResend, kind }: { email: string; onResend: () => Promise<void>; kind: 'confirm' | 'reset' }) {
  const { busy, error, run } = useAction()
  const [resent, setResent] = useState(false)
  return (
    <AuthLayout
      title="Check your email"
      subtitle={
        <>
          We sent a link to <strong>{email}</strong>.{' '}
          {kind === 'confirm' ? 'Open it on this device to finish creating your account.' : 'Open it on this device to choose a new password.'}
        </>
      }
    >
      <p className="auth-note">Can’t find it? Look in your spam folder, or send it again.</p>
      <ErrorText message={error} />
      <button
        type="button"
        className="auth-secondary"
        disabled={busy || resent}
        onClick={() =>
          void run(async () => {
            await onResend()
            setResent(true)
          })
        }
      >
        {resent ? 'Sent again' : 'Send again'}
      </button>
      <p className="auth-switch">
        <button type="button" className="auth-link" onClick={() => navigate({ name: 'signin' }, { replace: true })}>
          Back to sign in
        </button>
      </p>
    </AuthLayout>
  )
}

/** Shown after following a "reset password" email link. */
export function SetNewPassword() {
  const [password, setPassword] = useState('')
  const { busy, error, setError, run } = useAction()
  function submit(e: FormEvent) {
    e.preventDefault()
    if (password.length < MIN_PASSWORD) {
      setError(`Choose a longer password: at least ${MIN_PASSWORD} characters.`)
      return
    }
    void run(async () => {
      await setNewPassword(password)
      navigate({ name: 'home' }, { replace: true })
    })
  }
  return (
    <AuthLayout title="Choose a new password">
      <form className="auth-form" onSubmit={submit} noValidate>
        <Field
          label="New password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD} characters.`}
          autoFocus
        />
        <ErrorText message={error} />
        <SubmitButton busy={busy}>Save password</SubmitButton>
      </form>
    </AuthLayout>
  )
}

/**
 * First sign-in only: explicit consent to store mood and journal data, which
 * counts as sensitive (health-related) personal data under LGPD and GDPR.
 */
export function Consent({ email }: { email: string | undefined }) {
  const { busy, error, run } = useAction()
  return (
    <AuthLayout title="Before you start" subtitle={email ? <>Signed in as {email}</> : undefined}>
      <ul className="consent-list">
        <li>
          <Lock size={20} aria-hidden="true" />
          <span>
            Weather saves the moods and notes you log to your account, so you can see them on any device. Only
            you can read them.
          </span>
        </li>
        <li>
          <MapPin size={20} aria-hidden="true" />
          <span>They are stored with Supabase, in São Paulo, Brazil. Nothing is shared with other apps.</span>
        </li>
        <li>
          <Trash2 size={20} aria-hidden="true" />
          <span>You can export everything or delete your account, and all of it, at any time in Settings.</span>
        </li>
      </ul>
      <p className="auth-note">
        Moods and journal notes can say something about your health, so we ask for your clear agreement first.
      </p>
      <ErrorText message={error} />
      <button type="button" className="auth-primary" disabled={busy} onClick={() => void run(giveConsent)}>
        {busy ? 'One moment…' : 'I agree, let’s start'}
      </button>
      <button type="button" className="auth-secondary" disabled={busy} onClick={() => void signOut()}>
        Not now, sign out
      </button>
    </AuthLayout>
  )
}

export function Loading() {
  useThemeColor(PAGE_BG)
  return (
    <div className="screen page auth auth-loading" aria-busy="true">
      <div className="auth-brand" aria-hidden="true">
        {MOODS.map((m) => (
          <span key={m.key} style={{ background: m.color }} />
        ))}
      </div>
      <p className="visually-hidden">Loading</p>
    </div>
  )
}

export function NotConfigured() {
  return (
    <AuthLayout
      title="Accounts aren’t set up"
      subtitle="This build has no Supabase project configured (VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in web/.env)."
    >
      {null}
    </AuthLayout>
  )
}
