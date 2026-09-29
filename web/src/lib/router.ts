// Tiny hash router. Hash URLs keep deep links working on static hosting
// (GitHub Pages) without server rewrites.

import { useSyncExternalStore } from 'react'

export type Route =
  | { name: 'home' }
  | { name: 'history' }
  | { name: 'settings' }
  | { name: 'entry'; id: string }

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/'
  const entry = path.match(/^\/entry\/([^/]+)$/)
  if (entry) return { name: 'entry', id: decodeURIComponent(entry[1]) }
  if (path === '/history') return { name: 'history' }
  if (path === '/settings') return { name: 'settings' }
  return { name: 'home' }
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/'
    case 'history':
      return '#/history'
    case 'settings':
      return '#/settings'
    case 'entry':
      return `#/entry/${encodeURIComponent(route.id)}`
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
