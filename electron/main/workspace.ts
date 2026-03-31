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

export function listIndustries(root: string): Industry[] {
  return readJsonDir<Industry>(join(root, 'industries')).sort((a, b) =>
    a.name.localeCompare(b.name)
  )
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

export function saveIndustry(root: string, input: Partial<Industry> & { name: string }): Industry {
  ensureWorkspace(root)
  const id = input.id ?? uuidv4()
  const existing =
    input.id && existsSync(join(root, 'industries', `${input.id}.json`))
      ? (JSON.parse(
          readFileSync(join(root, 'industries', `${input.id}.json`), 'utf-8')
        ) as Industry)
      : null
  const row: Industry = {
    id,
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now()
  }
  writeFileSync(join(root, 'industries', `${id}.json`), JSON.stringify(row, null, 2), 'utf-8')
  touchManifest(root)
  return row
}

export function saveCompany(
  root: string,
  input: Partial<Company> & { name: string }
): Company {
  ensureWorkspace(root)
  const id = input.id ?? uuidv4()
  const existing =
    input.id && existsSync(join(root, 'companies', `${input.id}.json`))
      ? (JSON.parse(
          readFileSync(join(root, 'companies', `${input.id}.json`), 'utf-8')
        ) as Company)
      : null
  const row: Company = {
    id,
    name: input.name.trim(),
    website: input.website?.trim() || undefined,
    industryId: input.industryId || undefined,
    notes: input.notes?.trim() || undefined,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now()
  }
  writeFileSync(join(root, 'companies', `${id}.json`), JSON.stringify(row, null, 2), 'utf-8')
  touchManifest(root)
  return row
}

export function saveContact(
  root: string,
  input: Partial<Contact> & { firstName: string; lastName: string; category: Contact['category'] }
): Contact {
  ensureWorkspace(root)
  const id = input.id ?? uuidv4()
  const existing =
    input.id && existsSync(join(root, 'contacts', `${input.id}.json`))
      ? (JSON.parse(readFileSync(join(root, 'contacts', `${input.id}.json`), 'utf-8')) as Contact)
      : null
  const row: Contact = {
    id,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    title: input.title?.trim() || undefined,
    category: input.category,
    emails: Array.isArray(input.emails) ? input.emails.map((e) => e.trim()).filter(Boolean) : [],
    phones: Array.isArray(input.phones)
      ? input.phones
          .filter((p) => p && String(p.value).trim())
          .map((p) => ({ label: (p.label || 'Phone').trim(), value: String(p.value).trim() }))
      : [],
    linkedinUrl: input.linkedinUrl?.trim() || undefined,
    website: input.website?.trim() || undefined,
    companyIds: Array.isArray(input.companyIds) ? [...new Set(input.companyIds)] : [],
    industryIds: Array.isArray(input.industryIds) ? [...new Set(input.industryIds)] : [],
    notes: input.notes?.trim() || undefined,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now()
  }
  writeFileSync(join(root, 'contacts', `${id}.json`), JSON.stringify(row, null, 2), 'utf-8')
  touchManifest(root)
  return row
}

export function deleteIndustry(root: string, id: string): void {
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
