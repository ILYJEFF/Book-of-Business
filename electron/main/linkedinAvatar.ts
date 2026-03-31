/**
 * Resolve a LinkedIn profile photo URL from the public /in/ page meta tags.
 * LinkedIn does not offer a supported public API for this; the HTML preview
 * often includes og:image pointing at media.licdn.com. May fail for private
 * profiles, rate limits, or HTML changes.
 */

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'

export function normalizeLinkedInProfileUrl(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  try {
    const u = new URL(t.startsWith('http') ? t : `https://${t}`)
    const host = u.hostname.replace(/^www\./i, '').toLowerCase()
    if (host !== 'linkedin.com' && host !== 'www.linkedin.com') return null
    const m = u.pathname.match(/\/in\/([^/]+)/i)
    if (!m?.[1]) return null
    const slug = decodeURIComponent(m[1]).replace(/\/+$/, '')
    if (!slug) return null
    return `https://www.linkedin.com/in/${slug}/`
  } catch {
    return null
  }
}

function extractOgImage(html: string): string | null {
  const head = html.slice(0, 400_000)
  const a = head.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
  if (a?.[1]) return a[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  const b = head.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
  if (b?.[1]) return b[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  return null
}

function isLikelyProfilePhotoUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (!u.hostname.endsWith('licdn.com')) return false
    return (
      u.pathname.includes('profile-displayphoto') ||
      u.pathname.includes('profile-displaybackground')
    )
  } catch {
    return false
  }
}

export async function fetchLinkedInProfilePhotoUrl(linkedinUrl: string): Promise<string | null> {
  const profile = normalizeLinkedInProfileUrl(linkedinUrl)
  if (!profile) return null

  let res: Response
  try {
    res = await fetch(profile, {
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(18_000)
    })
  } catch {
    return null
  }

  if (!res.ok) return null

  let html: string
  try {
    html = await res.text()
  } catch {
    return null
  }

  const og = extractOgImage(html)
  if (!og || !isLikelyProfilePhotoUrl(og)) return null
  return og
}
