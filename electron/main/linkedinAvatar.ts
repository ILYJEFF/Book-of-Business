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
    if (host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) return null
    const m = u.pathname.match(/\/in\/([^/?#]+)/i)
    if (!m?.[1]) return null
    let slug: string
    try {
      slug = decodeURIComponent(m[1]).replace(/\/+$/, '')
    } catch {
      slug = m[1].replace(/\/+$/, '')
    }
    if (!slug) return null
    return `https://www.linkedin.com/in/${slug}/`
  } catch {
    return null
  }
}

function decodeMetaContent(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function isLikelyProfilePhotoUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (!u.hostname.endsWith('licdn.com')) return false
    const p = u.pathname.toLowerCase()
    if (p.includes('article-cover') || p.includes('company-logo') || p.includes('school-logo')) return false
    return (
      p.includes('profile-displayphoto') ||
      p.includes('profile-displaybackground') ||
      (p.includes('/dms/image/') && p.includes('profile'))
    )
  } catch {
    return false
  }
}

/** Collect og:image and og:image:secure_url values; prefer a licdn profile headshot. */
function extractBestProfileImage(html: string): string | null {
  const max = Math.min(html.length, 1_200_000)
  const chunk = html.slice(0, max)
  const candidates: string[] = []
  const pushUrl = (raw: string | undefined) => {
    if (!raw) return
    const u = decodeMetaContent(raw).trim()
    if (u.startsWith('https://') || u.startsWith('http://')) candidates.push(u)
  }

  const re1 =
    /<meta[^>]*property=["'](?:og:image|og:image:secure_url)["'][^>]*content=["']([^"']*)["'][^>]*>/gi
  for (const m of chunk.matchAll(re1)) pushUrl(m[1])

  const re2 =
    /<meta[^>]*content=["']([^"']*)["'][^>]*property=["'](?:og:image|og:image:secure_url)["'][^>]*>/gi
  for (const m of chunk.matchAll(re2)) pushUrl(m[1])

  for (const c of candidates) {
    if (isLikelyProfilePhotoUrl(c)) return c
  }
  return null
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

  const og = extractBestProfileImage(html)
  return og ?? null
}
