// Who is signed in, for the whole app. Signing in opens that person's store
// (synced with their account); signing out closes it.

import type { User } from '@supabase/supabase-js'
import { useSyncExternalStore } from 'react'
import { closeAccountStore, openAccountStore, store } from './store'
import { redirectUrl, supabase, supabaseRemote } from './supabase'

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  /** Came back from a "reset password" email: must choose a new password. */
  | { status: 'recovery'; user: User }
  | { status: 'signedIn'; user: User }

let state: AuthState = { status: supabase ? 'loading' : 'signedOut' }
/** An error sent back in the URL by Google or an email link, shown once on the sign-in page. */
let redirectError: string | null = readRedirectError()
const listeners = new Set<() => void>()
let openUserId: string | null = null

function readRedirectError(): string | null {
  const params = new URLSearchParams(location.search)
  const message = params.get('error_description') ?? params.get('error')
  if (!message) return null
  history.replaceState(history.state, '', `${location.pathname}${location.hash}`)
  return message.replace(/\+/g, ' ')
}

function set(next: AuthState) {
  state = next
  const user = next.status === 'signedIn' ? next.user : null
  if (user && openUserId !== user.id) {
    openUserId = user.id
    openAccountStore(user.id, supabaseRemote(supabase!, user.id))
  } else if (!user && next.status !== 'loading' && next.status !== 'recovery' && openUserId) {
    openUserId = null
    closeAccountStore()
  }
  listeners.forEach((l) => l())
}

if (supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    // Supabase calls back inside its own lock; act on it just after.
    setTimeout(() => {
      if (event === 'PASSWORD_RECOVERY' && session) set({ status: 'recovery', user: session.user })
      else if (state.status === 'recovery' && event !== 'SIGNED_OUT' && session) set({ status: 'recovery', user: session.user })
      else if (session) set({ status: 'signedIn', user: session.user })
      else set({ status: 'signedOut' })
    }, 0)
  })

  // Keep trying to sync queued changes when the connection or the app comes back.
  window.addEventListener('online', () => void store.retry())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void store.sync()
  })
  window.setInterval(() => void store.retry(), 60_000)
}

export function useAuth(): AuthState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

export function takeRedirectError(): string | null {
  const message = redirectError
  redirectError = null
  return message
}

/** Plain-language versions of Supabase's auth errors. */
export function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '')
  if (/invalid login credentials/i.test(message)) return 'That email and password don’t match an account.'
  if (/email not confirmed/i.test(message)) return 'Please confirm your email first: open the link we sent you.'
  if (/already registered|already been registered|user already exists/i.test(message))
    return 'There’s already an account with this email. Sign in instead.'
  if (/password should be at least|weak password|password is too weak/i.test(message))
    return 'Choose a longer password: at least 8 characters.'
  if (/rate limit|too many/i.test(message)) return 'Too many attempts. Please wait a few minutes and try again.'
  if (/provider is not enabled|unsupported provider/i.test(message))
    return 'Google sign-in isn’t switched on for this app yet.'
  if (/failed to fetch|network/i.test(message)) return 'Can’t reach the server. Check your connection and try again.'
  return message || 'Something went wrong. Please try again.'
}

function client() {
  if (!supabase) throw new Error('Accounts aren’t set up for this build.')
  return supabase
}

export async function signInWithGoogle() {
  const { error } = await client().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectUrl() },
  })
  if (error) throw error
}

export async function signInWithEmail(email: string, password: string) {
  const { error } = await client().auth.signInWithPassword({ email, password })
  if (error) throw error
}

/** Returns true when the account still needs its email confirmed. */
export async function signUpWithEmail(email: string, password: string): Promise<boolean> {
  const { data, error } = await client().auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectUrl() },
  })
  if (error) throw error
  // Supabase hides whether an email is taken: a known address comes back with no identities.
  if (data.user && data.user.identities?.length === 0) throw new Error('User already registered')
  return !data.session
}

export async function resendConfirmation(email: string) {
  const { error } = await client().auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectUrl() } })
  if (error) throw error
}

export async function sendPasswordReset(email: string) {
  const { error } = await client().auth.resetPasswordForEmail(email, { redirectTo: redirectUrl() })
  if (error) throw error
}

export async function setNewPassword(password: string) {
  const { data, error } = await client().auth.updateUser({ password })
  if (error) throw error
  set({ status: 'signedIn', user: data.user })
}

/** The privacy consent given on first sign-in (needed for health-related data). */
export function hasConsented(user: User): boolean {
  return Boolean(user.user_metadata?.weather_consent_at)
}

export async function giveConsent() {
  const { data, error } = await client().auth.updateUser({
    data: { weather_consent_at: new Date().toISOString() },
  })
  if (error) throw error
  set({ status: 'signedIn', user: data.user })
}

export async function signOut() {
  await client().auth.signOut()
}

/** Deletes the account and everything in it (via the delete-account function). */
export async function deleteAccount() {
  const { error } = await client().functions.invoke('delete-account', { method: 'POST' })
  if (error) throw error
  await client().auth.signOut({ scope: 'local' })
}
