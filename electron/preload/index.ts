import { contextBridge, ipcRenderer } from 'electron'
import type { Company, Contact, GeocodeResult, Industry } from '../../src/shared/types'

export interface BookAPI {
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

const api: BookAPI = {
  getWorkspace: () => ipcRenderer.invoke('settings:getWorkspace'),
  chooseWorkspace: () => ipcRenderer.invoke('settings:chooseWorkspace'),
  clearWorkspace: () => ipcRenderer.invoke('settings:clearWorkspace'),
  openWorkspaceInFinder: () => ipcRenderer.invoke('workspace:openInFinder'),
  listIndustries: () => ipcRenderer.invoke('data:listIndustries'),
  listCompanies: () => ipcRenderer.invoke('data:listCompanies'),
  listContacts: () => ipcRenderer.invoke('data:listContacts'),
  saveIndustry: (payload) => ipcRenderer.invoke('data:saveIndustry', payload),
  saveCompany: (payload) => ipcRenderer.invoke('data:saveCompany', payload),
  saveContact: (payload) => ipcRenderer.invoke('data:saveContact', payload),
  deleteIndustry: (id) => ipcRenderer.invoke('data:deleteIndustry', id),
  deleteCompany: (id) => ipcRenderer.invoke('data:deleteCompany', id),
  deleteContact: (id) => ipcRenderer.invoke('data:deleteContact', id),
  updateContactPin: (id, latitude, longitude) =>
    ipcRenderer.invoke('data:updateContactPin', id, latitude, longitude),
  updateCompanyPin: (id, latitude, longitude) =>
    ipcRenderer.invoke('data:updateCompanyPin', id, latitude, longitude),
  geocodeSearch: (query) => ipcRenderer.invoke('geo:search', query)
}

contextBridge.exposeInMainWorld('book', api)

declare global {
  interface Window {
    book: BookAPI
  }
}
