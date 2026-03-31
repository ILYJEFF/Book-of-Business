import type { Company, Contact, GeocodeResult, Industry, SaveUrlChannels } from '../../shared/types'

export interface BookBridge {
  getWorkspace: () => Promise<string | null>
  chooseWorkspace: () => Promise<string | null>
  clearWorkspace: () => Promise<null>
  openWorkspaceInFinder: () => Promise<void>
  listIndustries: () => Promise<Industry[]>
  listCompanies: () => Promise<Company[]>
  listContacts: () => Promise<Contact[]>
  saveIndustry: (payload: Partial<Industry> & { name: string }) => Promise<Industry>
  saveCompany: (
    payload: Partial<Company> & { name: string },
    urlChannels: SaveUrlChannels
  ) => Promise<Company>
  saveContact: (
    payload: Partial<Contact> & {
      firstName: string
      lastName: string
      category: Contact['category']
    },
    department: string | null,
    urlChannels: SaveUrlChannels
  ) => Promise<Contact>
  deleteIndustry: (id: string) => Promise<void>
  deleteCompany: (id: string) => Promise<void>
  deleteContact: (id: string) => Promise<void>
  updateContactPin: (id: string, latitude: number, longitude: number) => Promise<Contact>
  updateCompanyPin: (id: string, latitude: number, longitude: number) => Promise<Company>
  geocodeSearch: (query: string) => Promise<GeocodeResult | null>
  openExternal: (url: string) => Promise<void>
  readClipboardImageDataUrlSync: () => string | null
}

declare global {
  interface Window {
    book: BookBridge
  }
}

export {}
