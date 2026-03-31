import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import type {
  Company,
  Contact,
  Industry,
  WorkspaceManifest
} from '../../src/shared/types'
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

export function listContacts(root: string): Contact[] {
  return readJsonDir<Contact>(join(root, 'contacts')).sort((a, b) => {
    const an = `${a.lastName} ${a.firstName}`
    const bn = `${b.lastName} ${b.firstName}`
    return an.localeCompare(bn)
  })
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

export function saveCompany(
  root: string,
  input: Partial<Company> & { name: string },
  /** Passed separately from the renderer so large `data:` URLs are not dropped by IPC cloning. */
  photoUrlFromChannel?: string
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
  if (typeof photoUrlFromChannel === 'string') {
    photoUrl = photoUrlFromChannel.trim() ? photoUrlFromChannel.trim() : undefined
  } else if (Object.hasOwn(input as object, 'photoUrl')) {
    photoUrl =
      typeof input.photoUrl === 'string' && input.photoUrl.trim()
        ? input.photoUrl.trim()
        : undefined
  } else {
    photoUrl = existing?.photoUrl
  }

  let linkedinUrl: string | undefined
  if (Object.hasOwn(input as object, 'linkedinUrl')) {
    linkedinUrl =
      typeof input.linkedinUrl === 'string' && input.linkedinUrl.trim()
        ? input.linkedinUrl.trim()
        : undefined
  } else {
    linkedinUrl = existing?.linkedinUrl
  }

  const row: Company = {
    id,
    name: input.name.trim(),
    website: input.website?.trim() || undefined,
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
  input: Partial<Contact> & { firstName: string; lastName: string; category: Contact['category'] },
  /** Prefer this value (string or null to clear); avoids IPC losing nested fields on some builds. */
  departmentFromChannel?: unknown,
  /** Large `data:` URLs: pass separately so IPC cloning does not drop them. */
  photoUrlFromChannel?: string
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

  const nextLi = input.linkedinUrl?.trim() || undefined
  let photoUrl: string | undefined
  if (typeof photoUrlFromChannel === 'string') {
    photoUrl = photoUrlFromChannel.trim() ? photoUrlFromChannel.trim() : undefined
  } else if (Object.hasOwn(input as object, 'photoUrl')) {
    photoUrl =
      typeof input.photoUrl === 'string' && input.photoUrl.trim()
        ? input.photoUrl.trim()
        : undefined
  } else {
    photoUrl = existing?.photoUrl
  }

  const row: Contact = {
    id,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    title: input.title?.trim() || undefined,
    department: optDepartment(deptRaw),
    category: input.category,
    emails: Array.isArray(input.emails) ? input.emails.map((e) => e.trim()).filter(Boolean) : [],
    phones: Array.isArray(input.phones)
      ? input.phones
          .filter((p) => p && String(p.value).trim())
          .map((p) => ({ label: (p.label || 'Phone').trim(), value: String(p.value).trim() }))
      : [],
    linkedinUrl: nextLi,
    photoUrl,
    website: input.website?.trim() || undefined,
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
  const next: Contact = {
    ...cur,
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
  touchManifest(root)
}
