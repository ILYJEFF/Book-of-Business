import type { Company, Contact, GeocodeResult, Industry } from '../../shared/types'

export interface BookBridge {
  getWorkspace: () => Promise<string | null>
  chooseWorkspace: () => Promise<string | null>
  clearWorkspace: () => Promise<null>
  openWorkspaceInFinder: () => Promise<void>
  listIndustries: () => Promise<Industry[]>
  listCompanies: () => Promise<Company[]>
  listContacts: () => Promise<Contact[]>
  saveIndustry: (payload: Partial<Industry> & { name: string }) => Promise<Industry>
  saveCompany: (payload: Partial<Company> & { name: string }) => Promise<Company>
  saveContact: (
    payload: Partial<Contact> & {
      firstName: string
      lastName: string
      category: Contact['category']
    }
  ) => Promise<Contact>
  deleteIndustry: (id: string) => Promise<void>
  deleteCompany: (id: string) => Promise<void>
  deleteContact: (id: string) => Promise<void>
  updateContactPin: (id: string, latitude: number, longitude: number) => Promise<Contact>
  updateCompanyPin: (id: string, latitude: number, longitude: number) => Promise<Company>
  geocodeSearch: (query: string) => Promise<GeocodeResult | null>
}

declare global {
  interface Window {
    book: BookBridge
  }
}

export {}
