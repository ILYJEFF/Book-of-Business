import type { Company, Contact, Industry } from '../../../shared/types'

export function contactDisplayName(c: Contact): string {
  const t = `${c.firstName} ${c.lastName}`.trim()
  return t || 'Unnamed contact'
}

/** Safe https URL for opening in the browser, or null if missing or not a LinkedIn host. */
export function contactLinkedInOpenUrl(c: Pick<Contact, 'linkedinUrl'>): string | null {
  const raw = c.linkedinUrl?.trim()
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
