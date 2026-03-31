import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import type { Company, Contact, Industry } from '../../../shared/types'

type Section = 'contacts' | 'companies' | 'industries' | 'settings'

interface AppState {
  workspacePath: string | null
  section: Section
  industries: Industry[]
  companies: Company[]
  contacts: Contact[]
  loading: boolean
  setSection: (s: Section) => void
  refresh: () => Promise<void>
  chooseWorkspace: () => Promise<void>
  clearWorkspace: () => Promise<void>
  openWorkspaceFolder: () => Promise<void>
}

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [workspacePath, setWorkspacePath] = useState<string | null>(null)
  const [section, setSection] = useState<Section>('contacts')
  const [industries, setIndustries] = useState<Industry[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const w = await window.book.getWorkspace()
      setWorkspacePath(w)
      if (!w) {
        setIndustries([])
        setCompanies([])
        setContacts([])
        return
      }
      const [ind, co, ct] = await Promise.all([
        window.book.listIndustries(),
        window.book.listCompanies(),
        window.book.listContacts()
      ])
      setIndustries(ind)
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

  const value = useMemo(
    () => ({
      workspacePath,
      section,
      industries,
      companies,
      contacts,
      loading,
      setSection,
      refresh,
      chooseWorkspace,
      clearWorkspace,
      openWorkspaceFolder
    }),
    [
      workspacePath,
      section,
      industries,
      companies,
      contacts,
      loading,
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
