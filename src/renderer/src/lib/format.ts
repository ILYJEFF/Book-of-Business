import type { Company, Contact, Industry } from '../../../shared/types'

export function contactDisplayName(c: Contact): string {
  const t = `${c.firstName} ${c.lastName}`.trim()
  return t || 'Unnamed contact'
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
