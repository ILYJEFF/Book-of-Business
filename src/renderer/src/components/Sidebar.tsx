import { useApp } from '../context/AppContext'

const items = [
  { id: 'contacts' as const, label: 'Contacts' },
  { id: 'companies' as const, label: 'Companies' },
  { id: 'industries' as const, label: 'Industries' },
  { id: 'settings' as const, label: 'Library' }
]

export default function Sidebar(): React.ReactElement {
  const { section, setSection, contacts, companies, industries } = useApp()

  const counts: Record<string, number> = {
    contacts: contacts.length,
    companies: companies.length,
    industries: industries.length
  }

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <h1 className="sidebar-title">Book of Business</h1>
        <p className="sidebar-tag">Local files. Your folder.</p>
      </header>

      <nav className="sidebar-nav" aria-label="Sections">
        {items.map((it) => {
          const active = section === it.id
          return (
            <button
              key={it.id}
              type="button"
              className={`sidebar-link focus-ring${active ? ' sidebar-link--active' : ''}`}
              onClick={() => setSection(it.id)}
            >
              <span>{it.label}</span>
              {it.id !== 'settings' && <span className="sidebar-link-count">{counts[it.id] ?? 0}</span>}
            </button>
          )
        })}
      </nav>

      <p className="sidebar-foot">JSON on disk. Sync the folder if you want copies elsewhere.</p>
    </aside>
  )
}
