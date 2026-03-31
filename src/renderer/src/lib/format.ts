import type { Company, Contact, Industry } from '../../../shared/types'

/** One or two letters for company list and avatars (e.g. "Acme Corp" → AC). */
export function companyInitials(name: string): string {
  const t = name.trim()
  if (!t) return '?'
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const a = parts[0][0] ?? ''
    const b = parts[1][0] ?? ''
    const s = (a + b).toUpperCase()
    return s || '?'
  }
  return (t[0] ?? '?').toUpperCase()
}

export function contactDisplayName(c: Contact): string {
  const t = `${c.firstName} ${c.lastName}`.trim()
  return t || 'Unnamed contact'
}

/** Safe URL for opening a LinkedIn company or profile link in the browser. */
export function safeLinkedInOpenUrl(linkedinUrl?: string | null): string | null {
  const raw = linkedinUrl?.trim()
  if (!raw) return null
  try {
    const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    const host = u.hostname.replace(/^www\./i, '').toLowerCase()
    if (host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) return null
    return u.href
  } catch {
    return null
  }
}

export function contactLinkedInOpenUrl(c: Pick<Contact, 'linkedinUrl'>): string | null {
  return safeLinkedInOpenUrl(c.linkedinUrl)
}

export function companyLinkedInOpenUrl(c: Pick<Company, 'linkedinUrl'>): string | null {
  return safeLinkedInOpenUrl(c.linkedinUrl)
}

/** Safe http(s) website URL for opening externally (not javascript:, data:, etc.). */
export function safeWebsiteOpenUrl(website?: string | null): string | null {
  const raw = website?.trim()
  if (!raw) return null
  try {
    const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    if (!u.hostname) return null
    return u.href
  } catch {
    return null
  }
}

export function initials(c: Contact): string {
  const a = c.firstName?.[0] ?? ''
  const b = c.lastName?.[0] ?? ''
  const s = (a + b).toUpperCase()
  return s || '?'
}

export function companyById(map: Map<string, Company>, id: string): string {
  return map.get(id)?.name ?? 'Unknown company'
}

export function industryById(map: Map<string, Industry>, id: string): string {
  return map.get(id)?.name ?? 'Unknown industry'
}

/** Full path "Parent · Child · Leaf" for selects and summaries */
export function industryPathLabel(map: Map<string, Industry>, id: string): string {
  const parts: string[] = []
  let cur: string | undefined = id
  const seen = new Set<string>()
  while (cur && !seen.has(cur)) {
    seen.add(cur)
    const row = map.get(cur)
    if (!row) {
      parts.unshift('?')
      break
    }
    parts.unshift(row.name)
    cur = row.parentId
  }
  return parts.join(' · ')
}
