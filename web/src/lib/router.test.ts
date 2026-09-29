import { describe, expect, it } from 'vitest'
import { parseRoute, routeToHash, type Route } from './router'

describe('router', () => {
  it('parses every route and round-trips it', () => {
    const routes: Route[] = [
      { name: 'home' },
      { name: 'history' },
      { name: 'settings' },
      { name: 'entry', id: 'abc-123' },
    ]
    for (const r of routes) expect(parseRoute(routeToHash(r))).toEqual(r)
  })

  it('falls back to Home for empty or unknown hashes', () => {
    expect(parseRoute('')).toEqual({ name: 'home' })
    expect(parseRoute('#/nope')).toEqual({ name: 'home' })
  })
})
