/** "example.com" becomes "https://example.com"; only web, mail and phone links are kept. */
export function toSafeUrl(input: string): string {
  const url = input.trim()
  if (!url) return ''
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`
  return /^(https?:|mailto:|tel:)/i.test(withScheme) ? withScheme : ''
}
