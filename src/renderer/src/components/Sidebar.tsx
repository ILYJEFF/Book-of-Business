import { useApp } from '../context/AppContext'
import { IconBuilding, IconContacts, IconLayers, IconLibrary } from './NavIcons'

const items = [
  { id: 'contacts' as const, label: 'Contacts', hint: 'People you know', Icon: IconContacts },
  { id: 'companies' as const, label: 'Companies', hint: 'Organizations', Icon: IconBuilding },
  { id: 'industries' as const, label: 'Industries', hint: 'Sectors & markets', Icon: IconLayers },
  { id: 'settings' as const, label: 'Library', hint: 'Folder & sync', Icon: IconLibrary }
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
      <div>
        <div className="sidebar-brand-mark" aria-hidden>
          B
        </div>
        <div className="sidebar-brand-kicker">Book of Business</div>
        <div className="sidebar-brand-title">Command center</div>
        <p className="sidebar-brand-sub">Your relationships, stored as files you own.</p>
      </div>

      <nav className="sidebar-nav" aria-label="Primary">
        {items.map((it) => {
          const active = section === it.id
          return (
            <button
              key={it.id}
              type="button"
              className={`sidebar-item focus-ring${active ? ' sidebar-item--active' : ''}`}
              onClick={() => setSection(it.id)}
            >
              <span className="sidebar-item-icon">
                <it.Icon />
              </span>
              <span className="sidebar-item-body">
                <span className="sidebar-item-label">{it.label}</span>
                <span className="sidebar-item-hint">{it.hint}</span>
              </span>
              {it.id !== 'settings' && (
                <span className="sidebar-item-count">{counts[it.id] ?? 0}</span>
              )}
            </button>
          )
        })}
      </nav>

      <p className="sidebar-foot">
        Plain JSON on disk. Drop the folder into iCloud or OneDrive if you want it everywhere.
      </p>
    </aside>
  )
}
