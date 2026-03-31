import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync
} from 'fs'
import { basename, extname, isAbsolute, join, relative, resolve } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { formatNanpPhone } from '../../src/shared/phoneFormat'
import type {
  Company,
  Contact,
  ContactAttachment,
  ContactCategory,
  EmailEntry,
  Industry,
  PhoneEntry,
  SaveUrlChannels,
  Tag,
  WorkspaceManifest
} from '../../src/shared/types'

const ALLOWED_CONTACT_CATEGORIES: readonly ContactCategory[] = [
  'personal',
  'work',
  'networking',
  'client',
  'candidate',
  'family',
  'other'
]

function orderContactCategories(arr: ContactCategory[]): ContactCategory[] {
  const rank = new Map(ALLOWED_CONTACT_CATEGORIES.map((c, i) => [c, i]))
  return [...new Set(arr)].sort((a, b) => (rank.get(a) ?? 99) - (rank.get(b) ?? 99))
}

/** Disk + IPC: legacy single `category` upgrades to `categories`. */
export function normalizeContactCategoriesFromDisk(
  raw: Contact & { category?: unknown }
): ContactCategory[] {
  const allowed = new Set<ContactCategory>(ALLOWED_CONTACT_CATEGORIES)
  const arr = raw.categories
  if (Array.isArray(arr)) {
    const out = arr.filter(
      (x): x is ContactCategory => typeof x === 'string' && allowed.has(x as ContactCategory)
    )
    const unique = orderContactCategories(out)
    if (unique.length > 0) return unique
  }
  const leg = raw.category
  if (typeof leg === 'string' && allowed.has(leg as ContactCategory)) return [leg as ContactCategory]
  return ['work'] as ContactCategory[]
}

function normalizeContactCategoriesInput(raw: unknown): ContactCategory[] {
  const allowed = new Set<ContactCategory>(ALLOWED_CONTACT_CATEGORIES)
  if (!Array.isArray(raw)) return ['work'] as ContactCategory[]
  const out = raw.filter(
    (x): x is ContactCategory => typeof x === 'string' && allowed.has(x as ContactCategory)
  )
  const unique = orderContactCategories(out)
  return unique.length > 0 ? unique : (['work'] as ContactCategory[])
}

function normalizeTagIdsFromDisk(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.map((id) => String(id).trim()).filter(Boolean))]
}
const SCHEMA = 1
const APP_ID = 'book-of-business'

function ensureDir(p: string): void {
  if (!existsSync(p)) mkdirSync(p, { recursive: true })
}

function manifestPath(root: string): string {
  return join(root, 'manifest.json')
}

export function ensureWorkspace(root: string): void {
  ensureDir(root)
  ensureDir(join(root, 'industries'))
  ensureDir(join(root, 'tags'))
  ensureDir(join(root, 'companies'))
  ensureDir(join(root, 'contacts'))
  const mp = manifestPath(root)
  if (!existsSync(mp)) {
    const m: WorkspaceManifest = {
      schemaVersion: SCHEMA,
      app: APP_ID,
      updatedAt: new Date().toISOString()
    }
    writeFileSync(mp, JSON.stringify(m, null, 2), 'utf-8')
  } else {
    touchManifest(root)
  }
}

function touchManifest(root: string): void {
  const mp = manifestPath(root)
  try {
    const cur = JSON.parse(readFileSync(mp, 'utf-8')) as WorkspaceManifest
    const next: WorkspaceManifest = {
      ...cur,
      schemaVersion: SCHEMA,
      app: APP_ID,
      updatedAt: new Date().toISOString()
    }
    writeFileSync(mp, JSON.stringify(next, null, 2), 'utf-8')
  } catch {
    const m: WorkspaceManifest = {
      schemaVersion: SCHEMA,
      app: APP_ID,
      updatedAt: new Date().toISOString()
    }
    writeFileSync(mp, JSON.stringify(m, null, 2), 'utf-8')
  }
}

function readJsonDir<T>(dir: string): T[] {
  if (!existsSync(dir)) return []
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'))
  const out: T[] = []
  for (const f of files) {
    try {
      const raw = readFileSync(join(dir, f), 'utf-8')
      out.push(JSON.parse(raw) as T)
    } catch {
      /* skip corrupt */
    }
  }
  return out
}

/** Stable ids for parent lookups: use JSON id, else filename stem (missing id broke sub-industry saves). */
function readIndustriesFromDisk(dir: string): Industry[] {
  if (!existsSync(dir)) return []
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'))
  const out: Industry[] = []
  for (const f of files) {
    try {
      const raw = readFileSync(join(dir, f), 'utf-8')
      const parsed = JSON.parse(raw) as Record<string, unknown>
      const stem = f.replace(/\.json$/i, '')
      const id =
        typeof parsed.id === 'string' && parsed.id.trim() ? parsed.id.trim() : stem
      const name =
        typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : 'Untitled'
      let parentId: string | undefined
      if (typeof parsed.parentId === 'string' && parsed.parentId.trim()) {
        parentId = parsed.parentId.trim()
      }
      const description =
        typeof parsed.description === 'string' && parsed.description.trim()
          ? parsed.description.trim()
          : undefined
      const createdAt =
        typeof parsed.createdAt === 'string' && parsed.createdAt.trim()
          ? parsed.createdAt.trim()
          : now()
      const updatedAt =
        typeof parsed.updatedAt === 'string' && parsed.updatedAt.trim()
          ? parsed.updatedAt.trim()
          : now()
      out.push({ id, name, parentId, description, createdAt, updatedAt })
    } catch {
      /* skip corrupt */
    }
  }
  return out
}

function wouldCreateIndustryCycle(
  all: Industry[],
  industryId: string,
  newParentId: string
): boolean {
  const byId = new Map(all.map((i) => [i.id, i] as const))
  let walk: string | undefined = newParentId
  const seen = new Set<string>()
  while (walk) {
    if (walk === industryId) return true
    if (seen.has(walk)) break
    seen.add(walk)
    walk = byId.get(walk)?.parentId
  }
  return false
}

export function listIndustries(root: string): Industry[] {
  return readIndustriesFromDisk(join(root, 'industries'))
}

export function listCompanies(root: string): Company[] {
  return readJsonDir<Company>(join(root, 'companies')).sort((a, b) =>
    a.name.localeCompare(b.name)
  )
}

function normalizeEmailsFromDisk(raw: unknown): EmailEntry[] {
  if (!Array.isArray(raw)) return []
  const out: EmailEntry[] = []
  for (const e of raw) {
    if (typeof e === 'string') {
      const v = e.trim()
      if (v) out.push({ label: 'Other', value: v })
    } else if (e && typeof e === 'object') {
      const o = e as Record<string, unknown>
      const value = String(o.value ?? '').trim()
      if (!value) continue
      const label = String(o.label ?? 'Other').trim() || 'Other'
      out.push({ label, value })
    }
  }
  return out
}

function normalizePhonesFromDisk(raw: unknown): PhoneEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((p) => p && typeof p === 'object' && String((p as PhoneEntry).value ?? '').trim())
    .map((p) => {
      const o = p as PhoneEntry
      return {
        label: String(o.label ?? '').trim() || 'Other',
        value: formatNanpPhone(String(o.value).trim())
      }
    })
}

/** Normalize attachment rows from disk or save payloads. Exported for import bundle normalization. */
export function normalizeContactAttachmentsFromDisk(raw: unknown): ContactAttachment[] {
  if (!Array.isArray(raw)) return []
  const out: ContactAttachment[] = []
  for (const a of raw) {
    if (!a || typeof a !== 'object') continue
    const o = a as Record<string, unknown>
    const id = String(o.id ?? '').trim()
    const fileName = String(o.fileName ?? '').trim()
    const rel = String(o.relativePath ?? '').trim()
    if (!id || !fileName || !rel) continue
    const sizeBytes =
      typeof o.sizeBytes === 'number' && Number.isFinite(o.sizeBytes) ? o.sizeBytes : undefined
    const createdAt =
      typeof o.createdAt === 'string' && o.createdAt.trim() ? o.createdAt.trim() : now()
    out.push({
      id,
      fileName,
      relativePath: rel.replace(/\\/g, '/'),
      sizeBytes,
      createdAt
    })
  }
  return out
}

function coerceContactFromDisk(c: Contact): Contact {
  const { category: _legacyCategory, ...rest } = c as Contact & { category?: unknown }
  return {
    ...rest,
    favorite: c.favorite === true,
    categories: normalizeContactCategoriesFromDisk(c as Contact & { category?: unknown }),
    tagIds: normalizeTagIdsFromDisk(c.tagIds),
    emails: normalizeEmailsFromDisk(c.emails as unknown),
    phones: normalizePhonesFromDisk(c.phones as unknown),
    attachments: normalizeContactAttachmentsFromDisk(c.attachments)
  }
}

/** Resolve a workspace-relative attachment path to an absolute file only if it stays under `contact-attachments/`. */
export function resolveContactAttachmentPath(root: string, relativePath: string): string | null {
  const rel = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!rel.startsWith('contact-attachments/')) return null
  const parts = rel.split('/').filter((x) => x && x !== '.' && x !== '..')
  if (parts.length < 3) return null
  const full = resolve(root, ...parts)
  const rootAttach = resolve(root, 'contact-attachments')
  const relBetween = relative(rootAttach, full)
  if (relBetween.startsWith('..') || isAbsolute(relBetween)) return null
  if (!existsSync(full)) return null
  return full
}

export function listContacts(root: string): Contact[] {
  return readJsonDir<Contact>(join(root, 'contacts'))
    .map(coerceContactFromDisk)
    .sort((a, b) => {
      const an = `${a.lastName} ${a.firstName}`
      const bn = `${b.lastName} ${b.firstName}`
      return an.localeCompare(bn)
    })
}

export function listTags(root: string): Tag[] {
  return readJsonDir<Tag>(join(root, 'tags')).sort((a, b) => a.name.localeCompare(b.name))
}

export function saveTag(root: string, input: Partial<Tag> & { name: string }): Tag {
  ensureWorkspace(root)
  const id = input.id ?? uuidv4()
  const existing =
    input.id && existsSync(join(root, 'tags', `${input.id}.json`))
      ? (JSON.parse(readFileSync(join(root, 'tags', `${input.id}.json`), 'utf-8')) as Tag)
      : null
  const row: Tag = {
    id,
    name: input.name.trim(),
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now()
  }
  ensureDir(join(root, 'tags'))
  writeFileSync(join(root, 'tags', `${id}.json`), JSON.stringify(row, null, 2), 'utf-8')
  touchManifest(root)
  return row
}

/** Removes the tag file and strips the id from every contact. */
export function deleteTag(root: string, id: string): void {
  const dir = join(root, 'contacts')
  if (existsSync(dir)) {
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      const path = join(dir, f)
      const raw = JSON.parse(readFileSync(path, 'utf-8')) as Contact
      const base = coerceContactFromDisk(raw)
      if (!base.tagIds.includes(id)) continue
      const next: Contact = {
        ...base,
        tagIds: base.tagIds.filter((t) => t !== id),
        updatedAt: now()
      }
      writeFileSync(path, JSON.stringify(next, null, 2), 'utf-8')
    }
  }
  const p = join(root, 'tags', `${id}.json`)
  if (existsSync(p)) unlinkSync(p)
  touchManifest(root)
}

function now(): string {
  return new Date().toISOString()
}

function optNum(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim()) {
    const n = parseFloat(v)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

function optDepartment(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined
  if (typeof v === 'string') {
    const t = v.trim()
    return t || undefined
  }
  const t = String(v).trim()
  return t || undefined
}

function optLatLon(
  lat: unknown,
  lon: unknown
): { latitude?: number; longitude?: number } {
  const latitude = optNum(lat)
  const longitude = optNum(lon)
  if (latitude === undefined || longitude === undefined) return {}
  return { latitude, longitude }
}

export function saveIndustry(root: string, input: Partial<Industry> & { name: string }): Industry {
  ensureWorkspace(root)
  const dir = join(root, 'industries')
  const all = readIndustriesFromDisk(dir)
  const id = input.id ?? uuidv4()
  const existing =
    input.id && existsSync(join(dir, `${input.id}.json`))
      ? (JSON.parse(readFileSync(join(dir, `${input.id}.json`), 'utf-8')) as Industry)
      : null

  const rawParent = (input as { parentId?: unknown }).parentId
  let parentId: string | undefined
  if (typeof rawParent === 'string' && rawParent.trim()) {
    parentId = rawParent.trim()
  } else if (rawParent != null && String(rawParent).trim()) {
    parentId = String(rawParent).trim()
  }
  if (parentId && !all.some((x) => x.id === parentId)) {
    parentId = undefined
  }
  if (parentId && (parentId === id || wouldCreateIndustryCycle(all, id, parentId))) {
    parentId = undefined
  }

  const row: Industry = {
    id,
    name: input.name.trim(),
    parentId,
    description: input.description?.trim() || undefined,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now()
  }
  writeFileSync(join(dir, `${id}.json`), JSON.stringify(row, null, 2), 'utf-8')
  touchManifest(root)
  return row
}

function isSaveUrlChannels(x: unknown): x is SaveUrlChannels {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    typeof o.photoUrl === 'string' &&
    typeof o.linkedinUrl === 'string' &&
    typeof o.website === 'string'
  )
}

export function saveCompany(
  root: string,
  input: Partial<Company> & { name: string },
  /** Logo, LinkedIn, and site URLs (parallel to payload so IPC keeps them). */
  urlChannels?: SaveUrlChannels
): Company {
  ensureWorkspace(root)
  const id = input.id ?? uuidv4()
  const existing =
    input.id && existsSync(join(root, 'companies', `${input.id}.json`))
      ? (JSON.parse(
          readFileSync(join(root, 'companies', `${input.id}.json`), 'utf-8')
        ) as Company)
      : null
  const coords = optLatLon(input.latitude, input.longitude)

  let photoUrl: string | undefined
  let linkedinUrl: string | undefined
  let website: string | undefined

  if (isSaveUrlChannels(urlChannels)) {
    photoUrl = urlChannels.photoUrl.trim() ? urlChannels.photoUrl.trim() : undefined
    linkedinUrl = urlChannels.linkedinUrl.trim() ? urlChannels.linkedinUrl.trim() : undefined
    website = urlChannels.website.trim() ? urlChannels.website.trim() : undefined
  } else {
    if (Object.hasOwn(input as object, 'photoUrl')) {
      photoUrl =
        typeof input.photoUrl === 'string' && input.photoUrl.trim()
          ? input.photoUrl.trim()
          : undefined
    } else {
      photoUrl = existing?.photoUrl
    }
    if (Object.hasOwn(input as object, 'linkedinUrl')) {
      linkedinUrl =
        typeof input.linkedinUrl === 'string' && input.linkedinUrl.trim()
          ? input.linkedinUrl.trim()
          : undefined
    } else {
      linkedinUrl = existing?.linkedinUrl
    }
    website = input.website?.trim() || undefined
  }

  const row: Company = {
    id,
    name: input.name.trim(),
    website,
    linkedinUrl,
    industryId: input.industryId || undefined,
    notes: input.notes?.trim() || undefined,
    photoUrl,
    address: input.address?.trim() || undefined,
    ...coords,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now()
  }
  writeFileSync(join(root, 'companies', `${id}.json`), JSON.stringify(row, null, 2), 'utf-8')
  touchManifest(root)
  return row
}

export function saveContact(
  root: string,
  input: Partial<Contact> & { firstName: string; lastName: string; categories: ContactCategory[] },
  /** Prefer this value (string or null to clear); avoids IPC losing nested fields on some builds. */
  departmentFromChannel?: unknown,
  /** Photo + LinkedIn + website strings beside payload for reliable IPC. */
  urlChannels?: SaveUrlChannels
): Contact {
  ensureWorkspace(root)
  const id = input.id ?? uuidv4()
  const existing =
    input.id && existsSync(join(root, 'contacts', `${input.id}.json`))
      ? (JSON.parse(readFileSync(join(root, 'contacts', `${input.id}.json`), 'utf-8')) as Contact)
      : null
  const coords = optLatLon(input.latitude, input.longitude)
  const deptRaw =
    departmentFromChannel !== undefined
      ? departmentFromChannel
      : (input as Record<string, unknown>)['department']

  let linkedinUrl: string | undefined
  let photoUrl: string | undefined
  let website: string | undefined

  if (isSaveUrlChannels(urlChannels)) {
    photoUrl = urlChannels.photoUrl.trim() ? urlChannels.photoUrl.trim() : undefined
    linkedinUrl = urlChannels.linkedinUrl.trim() ? urlChannels.linkedinUrl.trim() : undefined
    website = urlChannels.website.trim() ? urlChannels.website.trim() : undefined
  } else {
    linkedinUrl = input.linkedinUrl?.trim() || undefined
    website = input.website?.trim() || undefined
    if (Object.hasOwn(input as object, 'photoUrl')) {
      photoUrl =
        typeof input.photoUrl === 'string' && input.photoUrl.trim()
          ? input.photoUrl.trim()
          : undefined
    } else {
      photoUrl = existing?.photoUrl
    }
  }

  const favorite = Object.hasOwn(input as object, 'favorite')
    ? input.favorite === true
    : existing?.favorite === true

  const attachments = Object.hasOwn(input as object, 'attachments')
    ? normalizeContactAttachmentsFromDisk((input as Record<string, unknown>).attachments)
    : normalizeContactAttachmentsFromDisk((existing as Record<string, unknown> | null)?.attachments)

  const categories: ContactCategory[] = Object.hasOwn(input as object, 'categories')
    ? normalizeContactCategoriesInput(input.categories)
    : existing
      ? normalizeContactCategoriesFromDisk(existing as Contact & { category?: unknown })
      : (['work'] as ContactCategory[])

  const tagIds = Object.hasOwn(input as object, 'tagIds')
    ? normalizeTagIdsFromDisk(input.tagIds)
    : normalizeTagIdsFromDisk(existing?.tagIds)

  const row: Contact = {
    id,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    favorite,
    title: input.title?.trim() || undefined,
    department: optDepartment(deptRaw),
    categories,
    tagIds,
    emails: normalizeEmailsFromDisk(input.emails),
    phones: Array.isArray(input.phones)
      ? input.phones
          .filter((p) => p && String((p as PhoneEntry).value).trim())
          .map((p) => {
            const o = p as PhoneEntry
            return {
              label: String(o.label ?? '').trim() || 'Other',
              value: formatNanpPhone(String(o.value).trim())
            }
          })
      : [],
    linkedinUrl,
    photoUrl,
    website,
    companyIds: Array.isArray(input.companyIds) ? [...new Set(input.companyIds)] : [],
    industryIds: Array.isArray(input.industryIds) ? [...new Set(input.industryIds)] : [],
    notes: input.notes?.trim() || undefined,
    birthday: Object.hasOwn(input as object, 'birthday')
      ? typeof input.birthday === 'string' && input.birthday.trim()
        ? input.birthday.trim()
        : undefined
      : existing?.birthday,
    address: input.address?.trim() || undefined,
    ...coords,
    attachments,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now()
  }
  writeFileSync(join(root, 'contacts', `${id}.json`), JSON.stringify(row, null, 2), 'utf-8')
  touchManifest(root)
  return row
}

export function updateContactPin(root: string, id: string, latitude: number, longitude: number): Contact {
  ensureWorkspace(root)
  const p = join(root, 'contacts', `${id}.json`)
  if (!existsSync(p)) throw new Error('NOT_FOUND')
  const cur = JSON.parse(readFileSync(p, 'utf-8')) as Contact
  const base = coerceContactFromDisk(cur)
  const next: Contact = {
    ...base,
    latitude,
    longitude,
    updatedAt: now()
  }
  writeFileSync(p, JSON.stringify(next, null, 2), 'utf-8')
  touchManifest(root)
  return next
}

export function updateCompanyPin(root: string, id: string, latitude: number, longitude: number): Company {
  ensureWorkspace(root)
  const p = join(root, 'companies', `${id}.json`)
  if (!existsSync(p)) throw new Error('NOT_FOUND')
  const cur = JSON.parse(readFileSync(p, 'utf-8')) as Company
  const next: Company = {
    ...cur,
    latitude,
    longitude,
    updatedAt: now()
  }
  writeFileSync(p, JSON.stringify(next, null, 2), 'utf-8')
  touchManifest(root)
  return next
}

export function deleteIndustry(root: string, id: string): void {
  const all = readIndustriesFromDisk(join(root, 'industries'))
  if (all.some((i) => i.parentId === id)) {
    throw new Error('INDUSTRY_HAS_CHILDREN')
  }
  const p = join(root, 'industries', `${id}.json`)
  if (existsSync(p)) unlinkSync(p)
  touchManifest(root)
}

export function deleteCompany(root: string, id: string): void {
  const p = join(root, 'companies', `${id}.json`)
  if (existsSync(p)) unlinkSync(p)
  touchManifest(root)
}

export function deleteContact(root: string, id: string): void {
  const p = join(root, 'contacts', `${id}.json`)
  if (existsSync(p)) unlinkSync(p)
  const attDir = join(root, 'contact-attachments', id)
  if (existsSync(attDir)) rmSync(attDir, { recursive: true, force: true })
  touchManifest(root)
}

export function addContactAttachmentsFromPaths(
  root: string,
  contactId: string,
  absoluteSourcePaths: string[]
): Contact {
  ensureWorkspace(root)
  const p = join(root, 'contacts', `${contactId}.json`)
  if (!existsSync(p)) throw new Error('NOT_FOUND')
  const cur = JSON.parse(readFileSync(p, 'utf-8')) as Contact
  const base = coerceContactFromDisk(cur)
  const dir = join(root, 'contact-attachments', contactId)
  ensureDir(dir)
  const attachments = normalizeContactAttachmentsFromDisk(base.attachments)
  for (const abs of absoluteSourcePaths) {
    if (!abs || !existsSync(abs)) continue
    const st = statSync(abs)
    if (!st.isFile()) continue
    const ext = extname(abs) || ''
    const attId = uuidv4()
    const destName = `${attId}${ext}`
    const destAbs = join(dir, destName)
    const relativePath = `contact-attachments/${contactId}/${destName}`
    copyFileSync(abs, destAbs)
    attachments.push({
      id: attId,
      fileName: basename(abs),
      relativePath,
      sizeBytes: st.size,
      createdAt: now()
    })
  }
  const next: Contact = {
    ...base,
    attachments,
    updatedAt: now()
  }
  writeFileSync(p, JSON.stringify(next, null, 2), 'utf-8')
  touchManifest(root)
  return coerceContactFromDisk(next)
}

export function removeContactAttachment(
  root: string,
  contactId: string,
  attachmentId: string
): Contact {
  const p = join(root, 'contacts', `${contactId}.json`)
  if (!existsSync(p)) throw new Error('NOT_FOUND')
  const cur = JSON.parse(readFileSync(p, 'utf-8')) as Contact
  const base = coerceContactFromDisk(cur)
  const attachments = normalizeContactAttachmentsFromDisk(base.attachments)
  const idx = attachments.findIndex((a) => a.id === attachmentId)
  if (idx === -1) throw new Error('NOT_FOUND')
  const [removed] = attachments.splice(idx, 1)
  const full = resolveContactAttachmentPath(root, removed.relativePath)
  if (full) unlinkSync(full)
  const next: Contact = { ...base, attachments, updatedAt: now() }
  writeFileSync(p, JSON.stringify(next, null, 2), 'utf-8')
  touchManifest(root)
  return coerceContactFromDisk(next)
}

export function setContactFavorite(root: string, contactId: string, favorite: boolean): Contact {
  const p = join(root, 'contacts', `${contactId}.json`)
  if (!existsSync(p)) throw new Error('NOT_FOUND')
  const cur = JSON.parse(readFileSync(p, 'utf-8')) as Contact
  const base = coerceContactFromDisk(cur)
  const next: Contact = { ...base, favorite, updatedAt: now() }
  writeFileSync(p, JSON.stringify(next, null, 2), 'utf-8')
  touchManifest(root)
  return coerceContactFromDisk(next)
}
