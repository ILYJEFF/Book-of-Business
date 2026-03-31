export type ContactCategory = 'personal' | 'work' | 'networking' | 'other'

export interface PhoneEntry {
  label: string
  value: string
}

export interface Industry {
  id: string
  name: string
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
  createdAt: string
  updatedAt: string
}

export interface Contact {
  id: string
  firstName: string
  lastName: string
  title?: string
  category: ContactCategory
  emails: string[]
  phones: PhoneEntry[]
  linkedinUrl?: string
  website?: string
  companyIds: string[]
  industryIds: string[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface WorkspaceManifest {
  schemaVersion: number
  app: string
  updatedAt: string
}
