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
  saveCompany: (
    payload: Partial<Company> & { name: string },
    /** Logo image; pass separately so large `data:` URLs survive IPC (same idea as contact `department`). */
    photoUrl: string
  ) => Promise<Company>
  saveContact: (
    payload: Partial<Contact> & {
      firstName: string
      lastName: string
      category: Contact['category']
    },
    /** string = value, null = clear; passed separately so IPC always carries it */
    department: string | null,
    /** Profile photo `data:` URL; separate from payload for reliable IPC. */
    photoUrl: string
  ) => Promise<Contact>
  deleteIndustry: (id: string) => Promise<void>
  deleteCompany: (id: string) => Promise<void>
  deleteContact: (id: string) => Promise<void>
  updateContactPin: (id: string, latitude: number, longitude: number) => Promise<Contact>
  updateCompanyPin: (id: string, latitude: number, longitude: number) => Promise<Company>
  geocodeSearch: (query: string) => Promise<GeocodeResult | null>
  openExternal: (url: string) => Promise<void>
  /** macOS / Electron: image on clipboard when `clipboardData` in the renderer is empty. */
  readClipboardImageDataUrlSync: () => string | null
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
  saveCompany: (payload, photoUrl) =>
    ipcRenderer.invoke('data:saveCompany', payload, photoUrl),
  saveContact: (payload, department, photoUrl) =>
    ipcRenderer.invoke('data:saveContact', payload, department, photoUrl),
  deleteIndustry: (id) => ipcRenderer.invoke('data:deleteIndustry', id),
  deleteCompany: (id) => ipcRenderer.invoke('data:deleteCompany', id),
  deleteContact: (id) => ipcRenderer.invoke('data:deleteContact', id),
  updateContactPin: (id, latitude, longitude) =>
    ipcRenderer.invoke('data:updateContactPin', id, latitude, longitude),
  updateCompanyPin: (id, latitude, longitude) =>
    ipcRenderer.invoke('data:updateCompanyPin', id, latitude, longitude),
  geocodeSearch: (query) => ipcRenderer.invoke('geo:search', query),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  readClipboardImageDataUrlSync: () => {
    const v = ipcRenderer.sendSync('clipboard:readImageDataUrlSync') as string | null | undefined
    return v ?? null
  }
}

contextBridge.exposeInMainWorld('book', api)

declare global {
  interface Window {
    book: BookAPI
  }
}
