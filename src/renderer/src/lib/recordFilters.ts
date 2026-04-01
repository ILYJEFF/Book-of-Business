import type { Company, Contact, ContactCategory, Industry, Tag } from '../../../shared/types'
import { companyById, industryPathLabel } from './format'

export type MapPinFilter = 'any' | 'mapped' | 'unmapped'

export const CONTACT_CATEGORIES: { id: ContactCategory; label: string }[] = [
  { id: 'personal', label: 'Personal' },
  { id: 'work', label: 'Work' },
  { id: 'networking', label: 'Networking' },
  { id: 'client', label: 'Client' },
  { id: 'candidate', label: 'Candidate' },
  { id: 'family', label: 'Family' },
  { id: 'other', label: 'Other' }
]

export const CONTACT_CATEGORY_ORDER: ContactCategory[] = CONTACT_CATEGORIES.map((x) => x.id)

export interface ContactFilterModel {
  query: string
  /** Empty = all relationships */
  categories: Set<ContactCategory>
  /** Empty = any tag; contact must have at least one selected tag */
  tagIds: Set<string>
  companyId: string
  industryId: string
  mapPin: MapPinFilter
}

export function createDefaultContactFilters(): ContactFilterModel {
  return {
    query: '',
    categories: new Set(),
    tagIds: new Set(),
    companyId: '',
    industryId: '',
    mapPin: 'any'
  }
}

export function contactPassesFilters(
  c: Contact,
  f: ContactFilterModel,
  companyMap: Map<string, Company>,
  industryMap: Map<string, Industry>,
  tagMap: Map<string, Tag>
): boolean {
  if (f.categories.size > 0) {
    const cc = c.categories ?? []
    const any = cc.some((cat) => f.categories.has(cat))
    if (!any) return false
  }
  if (f.tagIds.size > 0) {
    const ids = c.tagIds ?? []
    const anyTag = [...f.tagIds].some((tid) => ids.includes(tid))
    if (!anyTag) return false
  }
  if (f.companyId && !c.companyIds.includes(f.companyId)) return false
  if (f.industryId && !c.industryIds.includes(f.industryId)) return false
  const mapped =
    c.latitude != null &&
    c.longitude != null &&
    Number.isFinite(c.latitude) &&
    Number.isFinite(c.longitude)
  if (f.mapPin === 'mapped' && !mapped) return false
  if (f.mapPin === 'unmapped' && mapped) return false
  const q = f.query.trim().toLowerCase()
  if (q) {
    const blob = [
      c.firstName,
      c.lastName,
      c.title,
      ...(c.emails ?? []).map((e) => e.value),
      ...(c.phones?.map((p) => p.value) ?? []),
      ...c.companyIds.map((id) => companyById(companyMap, id)),
      ...c.industryIds.map((id) => industryPathLabel(industryMap, id)),
      ...(c.tagIds ?? []).map((id) => tagMap.get(id)?.name ?? ''),
      c.birthday ?? '',
      c.address,
      c.timeZone ?? '',
      c.notes ?? ''
    ]
      .join(' ')
      .toLowerCase()
    if (!blob.includes(q)) return false
  }
  return true
}

export function activeContactFilterCount(f: ContactFilterModel): number {
  let n = f.query.trim() ? 1 : 0
  if (f.categories.size > 0) n++
  if (f.tagIds.size > 0) n++
  if (f.companyId) n++
  if (f.industryId) n++
  if (f.mapPin !== 'any') n++
  return n
}

/** Facet controls only (not search text). Used for badges and expand logic. */
export function facetContactFilterCount(f: ContactFilterModel): number {
  let n = 0
  if (f.categories.size > 0) n++
  if (f.tagIds.size > 0) n++
  if (f.companyId) n++
  if (f.industryId) n++
  if (f.mapPin !== 'any') n++
  return n
}

export interface CompanyFilterModel {
  query: string
  industryId: string
  mapPin: MapPinFilter
}

export function createDefaultCompanyFilters(): CompanyFilterModel {
  return {
    query: '',
    industryId: '',
    mapPin: 'any'
  }
}

export function companyPassesFilters(
  c: Company,
  f: CompanyFilterModel,
  industryMap: Map<string, Industry>
): boolean {
  if (f.industryId && c.industryId !== f.industryId) return false
  const mapped =
    c.latitude != null &&
    c.longitude != null &&
    Number.isFinite(c.latitude) &&
    Number.isFinite(c.longitude)
  if (f.mapPin === 'mapped' && !mapped) return false
  if (f.mapPin === 'unmapped' && mapped) return false
  const q = f.query.trim().toLowerCase()
  if (q) {
    const ind = c.industryId ? industryPathLabel(industryMap, c.industryId) : ''
    const blob = [c.name, c.website ?? '', c.notes ?? '', c.address ?? '', ind].join(' ').toLowerCase()
    if (!blob.includes(q)) return false
  }
  return true
}

export function activeCompanyFilterCount(f: CompanyFilterModel): number {
  let n = f.query.trim() ? 1 : 0
  if (f.industryId) n++
  if (f.mapPin !== 'any') n++
  return n
}

export function facetCompanyFilterCount(f: CompanyFilterModel): number {
  let n = 0
  if (f.industryId) n++
  if (f.mapPin !== 'any') n++
  return n
}
