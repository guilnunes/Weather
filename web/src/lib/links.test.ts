import { describe, expect, it } from 'vitest'
import { toSafeUrl } from './links'

describe('toSafeUrl', () => {
  it('adds https to bare addresses and keeps web, mail and phone links', () => {
    expect(toSafeUrl(' example.com/page ')).toBe('https://example.com/page')
    expect(toSafeUrl('http://a.org')).toBe('http://a.org')
    expect(toSafeUrl('mailto:me@a.org')).toBe('mailto:me@a.org')
    expect(toSafeUrl('tel:+5511999999999')).toBe('tel:+5511999999999')
  })

  it('drops empty and script links', () => {
    expect(toSafeUrl('   ')).toBe('')
    expect(toSafeUrl('javascript:alert(1)')).toBe('')
    expect(toSafeUrl('data:text/html,hi')).toBe('')
  })
})
