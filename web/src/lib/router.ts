// Tiny hash router. Hash URLs keep deep links working on static hosting
// (GitHub Pages) without server rewrites.

import { useSyncExternalStore } from 'react'
import { isMoodKey, type MoodKey } from './moods'

export type Route =
  | { name: 'home' }
  | { name: 'history' }
  | { name: 'settings' }
  /** A mood just tapped, not saved yet: `at` is when it was tapped. */
  | { name: 'new'; mood: MoodKey; at: number }
  | { name: 'entry'; id: string }
  // Signed-out pages.
  | { name: 'signin' }
  | { name: 'signup' }
  | { name: 'forgot' }

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/'
  const entry = path.match(/^\/entry\/([^/]+)$/)
  if (entry) return { name: 'entry', id: decodeURIComponent(entry[1]) }
  const fresh = path.match(/^\/new\/([a-z]+)\/(\d+)$/)
  // A tap time in the future can only come from an edited link: ignore it.
  if (fresh && isMoodKey(fresh[1]) && Number(fresh[2]) <= Date.now()) {
    return { name: 'new', mood: fresh[1], at: Number(fresh[2]) }
  }
  if (path === '/history') return { name: 'history' }
  if (path === '/settings') return { name: 'settings' }
  if (path === '/signin') return { name: 'signin' }
  if (path === '/signup') return { name: 'signup' }
  if (path === '/forgot') return { name: 'forgot' }
  return { name: 'home' }
}

/** The journal for a mood tapped right now. */
export function newEntryRoute(mood: MoodKey): Route {
  return { name: 'new', mood, at: Date.now() }
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/'
    case 'history':
      return '#/history'
    case 'settings':
      return '#/settings'
    case 'new':
      return `#/new/${route.mood}/${route.at}`
    case 'entry':
      return `#/entry/${encodeURIComponent(route.id)}`
    case 'signin':
    case 'signup':
    case 'forgot':
      return `#/${route.name}`
  }
}

// Each history entry records how many in-app pages sit behind it, so "back"
// never leaves the app when the person opened a deep link directly. Kept in
// history.state so the browser's own back button stays in sync.
function depth(): number {
  const d = (history.state as { depth?: unknown } | null)?.depth
  return typeof d === 'number' ? d : 0
}

export function navigate(route: Route, { replace = false } = {}) {
  const hash = routeToHash(route)
  if (replace) {
    history.replaceState({ depth: depth() }, '', hash)
  } else {
    history.pushState({ depth: depth() + 1 }, '', hash)
  }
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

export function goBack(fallback: Route = { name: 'home' }) {
  if (depth() > 0) {
    history.back()
  } else {
    navigate(fallback, { replace: true })
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => location.hash)
  return parseRoute(hash)
}
