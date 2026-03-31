import { useApp } from '../context/AppContext'

type NavItem = {
  id: 'contacts' | 'companies' | 'map' | 'industries' | 'settings'
  label: string
  countKey?: 'contacts' | 'companies' | 'map' | 'industries'
}

const items: NavItem[] = [
  { id: 'contacts', label: 'Contacts', countKey: 'contacts' },
  { id: 'companies', label: 'Companies', countKey: 'companies' },
  { id: 'map', label: 'Map', countKey: 'map' },
  { id: 'industries', label: 'Industries', countKey: 'industries' },
  { id: 'settings', label: 'Library' }
]

export default function Sidebar(): React.ReactElement {
  const { section, setSection, contacts, companies, industries } = useApp()

  const plotted =
    contacts.filter((c) => c.latitude != null && c.longitude != null).length +
    companies.filter((c) => c.latitude != null && c.longitude != null).length

  const counts: Record<string, number> = {
    contacts: contacts.length,
    companies: companies.length,
    map: plotted,
    industries: industries.length
  }

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <p className="sidebar-eyebrow">Local ledger</p>
        <h1 className="sidebar-title">Book of Business</h1>
        <p className="sidebar-tag">Files on disk in a folder you choose. No cloud unless you sync it yourself.</p>
      </header>

      <nav className="sidebar-nav" aria-label="Sections">
        {items.map((it) => {
          const active = section === it.id
          const count = it.countKey != null ? counts[it.countKey] ?? 0 : null
          return (
            <button
              key={it.id}
              type="button"
              className={`sidebar-link focus-ring${active ? ' sidebar-link--active' : ''}`}
              onClick={() => setSection(it.id)}
            >
              <span>{it.label}</span>
              {count !== null && <span className="sidebar-link-count">{count}</span>}
            </button>
          )
        })}
      </nav>

      <p className="sidebar-foot">JSON on disk. Sync the folder if you want copies elsewhere.</p>
    </aside>
  )
}
