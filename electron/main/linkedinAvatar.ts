/**
 * Resolve a LinkedIn profile headshot URL for a public /in/ profile.
 *
 * 1) Microlink API (https://microlink.io) reads the page and returns og:image.
 *    Your profile URL is sent to their service (see their privacy policy).
 * 2) Fallback: fetch HTML in-app via Electron net.fetch (Chromium stack), then global fetch,
 *    and parse og:image tags.
 */

import { net } from 'electron'

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

async function fetchWithNetOrGlobal(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await net.fetch(url, init)
  } catch {
    return globalThis.fetch(url, init)
  }
}

/** Microlink resolves Open Graph metadata without running a full browser. */
async function fetchPhotoViaMicrolink(profileUrl: string): Promise<string | null> {
  const api = new URL('https://api.microlink.io/')
  api.searchParams.set('url', profileUrl)

  let res: Response
  try {
    res = await globalThis.fetch(api.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(28_000)
    })
  } catch {
    return null
  }

  if (!res.ok) return null

  let body: unknown
  try {
    body = await res.json()
  } catch {
    return null
  }

  const row = body as { status?: string; data?: { image?: { url?: string } } }
  if (row.status !== 'success') return null
  const url = row.data?.image?.url?.trim()
  if (!url) return null
  if (!isLikelyProfilePhotoUrl(url)) return null
  return url
}

async function fetchPhotoViaHtmlScrape(profileUrl: string): Promise<string | null> {
  let res: Response
  try {
    res = await fetchWithNetOrGlobal(profileUrl, {
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(22_000)
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

  return extractBestProfileImage(html)
}

export async function fetchLinkedInProfilePhotoUrl(linkedinUrl: string): Promise<string | null> {
  const profile = normalizeLinkedInProfileUrl(linkedinUrl)
  if (!profile) return null

  const fromMicrolink = await fetchPhotoViaMicrolink(profile)
  if (fromMicrolink) return fromMicrolink

  return fetchPhotoViaHtmlScrape(profile)
}
