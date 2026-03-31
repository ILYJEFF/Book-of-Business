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
  industryId?: string
  notes?: string
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
