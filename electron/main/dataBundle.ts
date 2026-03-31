import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import type {
  BookExportBundle,
  Company,
  Contact,
  Industry,
  PhoneEntry,
  SaveUrlChannels
} from '../../src/shared/types'
import {
  ensureWorkspace,
  listCompanies,
  listContacts,
  listIndustries,
  saveCompany,
  saveContact,
  saveIndustry
} from './workspace'

export const BOOK_EXPORT_FORMAT = 'book-of-business-export' as const
export const BOOK_EXPORT_VERSION = 1

export function buildExportBundle(root: string): BookExportBundle {
  ensureWorkspace(root)
  return {
    format: BOOK_EXPORT_FORMAT,
    version: BOOK_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    industries: listIndustries(root),
    companies: listCompanies(root),
    contacts: listContacts(root)
  }
}

function wipeJsonDir(dir: string): void {
  if (!existsSync(dir)) return
  for (const f of readdirSync(dir)) {
    if (f.endsWith('.json')) unlinkSync(join(dir, f))
  }
}

export function wipeWorkspaceEntities(root: string): void {
  ensureWorkspace(root)
  wipeJsonDir(join(root, 'contacts'))
  wipeJsonDir(join(root, 'companies'))
  wipeJsonDir(join(root, 'industries'))
}

function sortIndustriesForImport<T extends { id: string; parentId?: string }>(industries: T[]): T[] {
  const byId = new Map(industries.map((i) => [i.id, i] as const))
  const placed = new Set<string>()
  const out: T[] = []
  const pool = [...industries]
  let guard = 0
  while (pool.length && guard < industries.length + 50) {
    guard += 1
    const before = pool.length
    for (let i = pool.length - 1; i >= 0; i--) {
      const ind = pool[i]!
      const pid = ind.parentId
      if (!pid) {
        out.push(ind)
        placed.add(ind.id)
        pool.splice(i, 1)
        continue
      }
      if (placed.has(pid) || !byId.has(pid)) {
        out.push(ind)
        placed.add(ind.id)
        pool.splice(i, 1)
      }
    }
    if (pool.length === before) {
      for (const ind of pool) {
        out.push(ind)
        placed.add(ind.id)
      }
      pool.length = 0
    }
  }
  return out
}

function strOpt(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  return t || undefined
}

function optNum(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim()) {
    const n = parseFloat(v)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

const CONTACT_CATEGORIES: Contact['category'][] = ['personal', 'work', 'networking', 'other']

function normCategory(v: unknown): Contact['category'] {
  if (typeof v === 'string' && CONTACT_CATEGORIES.includes(v as Contact['category'])) {
    return v as Contact['category']
  }
  return 'work'
}

export function parseExportBundle(
  raw: string
): { ok: true; bundle: BookExportBundle } | { ok: false; message: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, message: 'File is not valid JSON.' }
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, message: 'Export must be a JSON object.' }
  }
  const o = parsed as Record<string, unknown>
  if (o.format !== BOOK_EXPORT_FORMAT) {
    return { ok: false, message: 'This file is not a Book of Business export.' }
  }
  if (typeof o.version !== 'number' || o.version < 1) {
    return { ok: false, message: 'Unsupported export version.' }
  }
  if (!Array.isArray(o.industries) || !Array.isArray(o.companies) || !Array.isArray(o.contacts)) {
    return { ok: false, message: 'Export is missing industries, companies, or contacts arrays.' }
  }
  return { ok: true, bundle: parsed as BookExportBundle }
}

function normalizeIndustryRow(x: unknown): (Partial<Industry> & { name: string }) | null {
  if (!x || typeof x !== 'object') return null
  const r = x as Record<string, unknown>
  const name = strOpt(r.name)
  if (!name) return null
  return {
    id: strOpt(r.id),
    name,
    parentId: strOpt(r.parentId),
    description: strOpt(r.description)
  }
}

function channelsFromRecord(r: Record<string, unknown>): SaveUrlChannels {
  return {
    photoUrl: typeof r.photoUrl === 'string' ? r.photoUrl : '',
    linkedinUrl: typeof r.linkedinUrl === 'string' ? r.linkedinUrl : '',
    website: typeof r.website === 'string' ? r.website : ''
  }
}

function normalizeCompanyRow(x: unknown): { input: Partial<Company> & { name: string }; channels: SaveUrlChannels } | null {
  if (!x || typeof x !== 'object') return null
  const r = x as Record<string, unknown>
  const name = strOpt(r.name)
  if (!name) return null
  const input: Partial<Company> & { name: string } = {
    ...(strOpt(r.id) ? { id: strOpt(r.id) } : {}),
    name,
    industryId: strOpt(r.industryId),
    notes: strOpt(r.notes),
    address: strOpt(r.address)
  }
  const lat = optNum(r.latitude)
  const lon = optNum(r.longitude)
  if (lat !== undefined && lon !== undefined) {
    input.latitude = lat
    input.longitude = lon
  }
  return { input, channels: channelsFromRecord(r) }
}

function normalizeContactRow(
  x: unknown
): {
  input: Partial<Contact> & { firstName: string; lastName: string; category: Contact['category'] }
  department: string | null
  channels: SaveUrlChannels
} | null {
  if (!x || typeof x !== 'object') return null
  const r = x as Record<string, unknown>
  const firstName = (strOpt(r.firstName) ?? '').trim() || 'Unknown'
  const lastName = (strOpt(r.lastName) ?? '').trim()
  const emails = Array.isArray(r.emails)
    ? r.emails.map((e) => String(e).trim()).filter(Boolean)
    : []
  const phones: PhoneEntry[] = Array.isArray(r.phones)
    ? (r.phones
        .map((p) => {
          if (!p || typeof p !== 'object') return null
          const po = p as Record<string, unknown>
          const value = String(po.value ?? '').trim()
          if (!value) return null
          return { label: (String(po.label || 'Phone').trim() || 'Phone') as string, value }
        })
        .filter(Boolean) as PhoneEntry[])
    : []
  const companyIds = Array.isArray(r.companyIds)
    ? [...new Set(r.companyIds.map((id) => String(id).trim()).filter(Boolean))]
    : []
  const industryIds = Array.isArray(r.industryIds)
    ? [...new Set(r.industryIds.map((id) => String(id).trim()).filter(Boolean))]
    : []
  const deptRaw = r.department
  const department: string | null =
    deptRaw === null || deptRaw === undefined
      ? null
      : typeof deptRaw === 'string'
        ? deptRaw.trim() || null
        : String(deptRaw).trim() || null

  const input: Partial<Contact> & {
    firstName: string
    lastName: string
    category: Contact['category']
  } = {
    ...(strOpt(r.id) ? { id: strOpt(r.id) } : {}),
    firstName,
    lastName,
    category: normCategory(r.category),
    title: strOpt(r.title),
    emails,
    phones,
    companyIds,
    industryIds,
    notes: strOpt(r.notes),
    birthday: strOpt(r.birthday),
    address: strOpt(r.address)
  }
  const lat = optNum(r.latitude)
  const lon = optNum(r.longitude)
  if (lat !== undefined && lon !== undefined) {
    input.latitude = lat
    input.longitude = lon
  }
  return { input, department, channels: channelsFromRecord(r) }
}

export function applyExportBundle(
  root: string,
  bundle: BookExportBundle,
  mode: 'merge' | 'replace'
): { industries: number; companies: number; contacts: number } {
  ensureWorkspace(root)
  if (mode === 'replace') {
    wipeWorkspaceEntities(root)
  }

  let industries = 0
  let companies = 0
  let contacts = 0

  const industryRows: { id: string; name: string; parentId?: string; description?: string }[] = []
  for (const item of bundle.industries) {
    const n = normalizeIndustryRow(item)
    if (!n) continue
    industryRows.push({
      id: n.id ?? uuidv4(),
      name: n.name,
      parentId: n.parentId,
      description: n.description
    })
  }

  for (const ind of sortIndustriesForImport(industryRows)) {
    saveIndustry(root, { id: ind.id, name: ind.name, parentId: ind.parentId, description: ind.description })
    industries += 1
  }

  for (const item of bundle.companies) {
    const n = normalizeCompanyRow(item)
    if (!n) continue
    saveCompany(root, n.input, n.channels)
    companies += 1
  }

  for (const item of bundle.contacts) {
    const n = normalizeContactRow(item)
    if (!n) continue
    saveContact(root, n.input, n.department, n.channels)
    contacts += 1
  }

  return { industries, companies, contacts }
}

export function writeBundleFile(path: string, bundle: BookExportBundle): void {
  writeFileSync(path, JSON.stringify(bundle, null, 2), 'utf-8')
}

export function readBundleFile(path: string): string {
  return readFileSync(path, 'utf-8')
}
