import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import type { Company, Contact, Industry, Tag } from '../../../shared/types'

export type Section =
  | 'contacts'
  | 'favorites'
  | 'companies'
  | 'tags'
  | 'industries'
  | 'map'
  | 'timezones'
  | 'settings'

export type OpenRecordKind = 'contact' | 'company'

interface AppState {
  workspacePath: string | null
  section: Section
  industries: Industry[]
  tags: Tag[]
  companies: Company[]
  contacts: Contact[]
  loading: boolean
  openRecordRequest: { kind: OpenRecordKind; id: string } | null
  setSection: (s: Section) => void
  requestOpenRecord: (kind: OpenRecordKind, id: string) => void
  clearOpenRecordRequest: () => void
  refresh: (opts?: { background?: boolean }) => Promise<void>
  chooseWorkspace: () => Promise<void>
  clearWorkspace: () => Promise<void>
  openWorkspaceFolder: () => Promise<void>
}

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [workspacePath, setWorkspacePath] = useState<string | null>(null)
  const [section, setSection] = useState<Section>('contacts')
  const [industries, setIndustries] = useState<Industry[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [openRecordRequest, setOpenRecordRequest] = useState<{ kind: OpenRecordKind; id: string } | null>(null)

  const refresh = useCallback(async (opts?: { background?: boolean }) => {
    if (!opts?.background) {
      setLoading(true)
    }
    try {
      const w = await window.book.getWorkspace()
      setWorkspacePath(w)
      if (!w) {
        setIndustries([])
        setTags([])
        setCompanies([])
        setContacts([])
        return
      }
      const [ind, tg, co, ct] = await Promise.all([
        window.book.listIndustries(),
        window.book.listTags(),
        window.book.listCompanies(),
        window.book.listContacts()
      ])
      setIndustries(ind)
      setTags(tg)
      setCompanies(co)
      setContacts(ct)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const chooseWorkspace = useCallback(async () => {
    const p = await window.book.chooseWorkspace()
    if (p) await refresh()
  }, [refresh])

  const clearWorkspace = useCallback(async () => {
    await window.book.clearWorkspace()
    await refresh()
  }, [refresh])

  const openWorkspaceFolder = useCallback(async () => {
    await window.book.openWorkspaceInFinder()
  }, [])

  const requestOpenRecord = useCallback((kind: OpenRecordKind, id: string) => {
    setOpenRecordRequest({ kind, id })
    setSection(kind === 'contact' ? 'contacts' : 'companies')
  }, [])

  const clearOpenRecordRequest = useCallback(() => {
    setOpenRecordRequest(null)
  }, [])

  const value = useMemo(
    () => ({
      workspacePath,
      section,
      industries,
      tags,
      companies,
      contacts,
      loading,
      openRecordRequest,
      setSection,
      requestOpenRecord,
      clearOpenRecordRequest,
      refresh,
      chooseWorkspace,
      clearWorkspace,
      openWorkspaceFolder
    }),
    [
      workspacePath,
      section,
      industries,
      tags,
      companies,
      contacts,
      loading,
      openRecordRequest,
      requestOpenRecord,
      clearOpenRecordRequest,
      refresh,
      chooseWorkspace,
      clearWorkspace,
      openWorkspaceFolder
    ]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp outside provider')
  return v
}
