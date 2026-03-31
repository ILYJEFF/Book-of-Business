export type ContactCategory = 'personal' | 'work' | 'networking' | 'other'

export interface PhoneEntry {
  label: string
  value: string
}

export interface Industry {
  id: string
  name: string
  /** Parent sector; omit for a top-level industry */
  parentId?: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface Company {
  id: string
  name: string
  website?: string
  linkedinUrl?: string
  industryId?: string
  notes?: string
  /** Logo or image: `data:` URL from the app, or a remote `https:` URL. */
  photoUrl?: string
  /** Street or mailing line; used with geocoding for the map */
  address?: string
  latitude?: number
  longitude?: number
  createdAt: string
  updatedAt: string
}

export interface Contact {
  id: string
  firstName: string
  lastName: string
  title?: string
  /** Workplace department; one of the standard labels from the app list, or a custom string if edited elsewhere. */
  department?: string
  category: ContactCategory
  emails: string[]
  phones: PhoneEntry[]
  linkedinUrl?: string
  /** Profile image: `data:` URL from the app, or a remote `https:` URL if you pasted a link. */
  photoUrl?: string
  website?: string
  companyIds: string[]
  industryIds: string[]
  notes?: string
  /** ISO date YYYY-MM-DD */
  birthday?: string
  address?: string
  latitude?: number
  longitude?: number
  createdAt: string
  updatedAt: string
}

/** Result from Nominatim (main process only); not stored as JSON entity */
export interface GeocodeResult {
  lat: number
  lon: number
  displayName: string
}

export interface WorkspaceManifest {
  schemaVersion: number
  app: string
  updatedAt: string
}

/** Passed beside save payloads so Electron IPC does not drop long or nested URL strings. */
export interface SaveUrlChannels {
  photoUrl: string
  linkedinUrl: string
  website: string
}

/** Full-library backup produced by Settings export. */
export interface BookExportBundle {
  format: 'book-of-business-export'
  version: number
  exportedAt: string
  industries: Industry[]
  companies: Company[]
  contacts: Contact[]
}

export type WorkspaceImportMode = 'merge' | 'replace'

export type WorkspaceExportResult =
  | { canceled: true }
  | { canceled: false; path: string }

export type WorkspaceImportResult =
  | { canceled: true }
  | { canceled: false; error: string }
  | { canceled: false; imported: { industries: number; companies: number; contacts: number } }
