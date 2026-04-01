export type ContactCategory =
  | 'personal'
  | 'work'
  | 'networking'
  | 'client'
  | 'candidate'
  | 'family'
  | 'other'

/** User-defined labels for contacts (skills, relocation, languages, etc.) */
export interface Tag {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface PhoneEntry {
  label: string
  value: string
}

/** Email with a role (work, personal, etc.), same pattern as {@link PhoneEntry}. */
export interface EmailEntry {
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

/** File stored under `contact-attachments/{contactId}/` in the workspace. */
export interface ContactAttachment {
  id: string
  /** Original filename for display */
  fileName: string
  /** Path relative to workspace root, e.g. `contact-attachments/{id}/{uuid}.pdf` */
  relativePath: string
  sizeBytes?: number
  createdAt: string
}

export interface Contact {
  id: string
  firstName: string
  lastName: string
  /** Starred in the Favorites tab */
  favorite?: boolean
  title?: string
  /** Workplace department; one of the standard labels from the app list, or a custom string if edited elsewhere. */
  department?: string
  /** Relationship facets; a person can be work + personal + networking, etc. */
  categories: ContactCategory[]
  emails: EmailEntry[]
  phones: PhoneEntry[]
  linkedinUrl?: string
  /** Profile image: `data:` URL from the app, or a remote `https:` URL if you pasted a link. */
  photoUrl?: string
  website?: string
  companyIds: string[]
  industryIds: string[]
  /** Ids from the library `tags/` folder; create tags under Library → Tags */
  tagIds: string[]
  notes?: string
  /** ISO date YYYY-MM-DD */
  birthday?: string
  address?: string
  /** IANA zone (e.g. America/Chicago). Set in the contact card or inferred from map coordinates. */
  timeZone?: string
  latitude?: number
  longitude?: number
  /** Résumés, assessments, references, etc. Files live under `contact-attachments/` */
  attachments?: ContactAttachment[]
  createdAt: string
  updatedAt: string
}

/** Result of picking files to attach to a contact */
export type AddContactAttachmentsResult = { canceled: true } | { canceled: false; contact: Contact }

/** Result from Nominatim (main process only); not stored as JSON entity */
export interface GeocodeResult {
  lat: number
  lon: number
  displayName: string
  /** Single-line address built from structured parts when the geocoder returns them */
  formattedAddress?: string
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
  tags: Tag[]
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
  | { canceled: false; imported: { industries: number; tags: number; companies: number; contacts: number } }
