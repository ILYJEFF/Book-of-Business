import { useApp } from '../context/AppContext'

const items = [
  { id: 'contacts' as const, label: 'Contacts', hint: 'People' },
  { id: 'companies' as const, label: 'Companies', hint: 'Orgs' },
  { id: 'industries' as const, label: 'Industries', hint: 'Sectors' },
  { id: 'settings' as const, label: 'Library', hint: 'Data' }
]

export default function Sidebar(): React.ReactElement {
  const { section, setSection, contacts, companies, industries } = useApp()

  const counts: Record<string, number> = {
    contacts: contacts.length,
    companies: companies.length,
    industries: industries.length
  }

  return (
    <aside
      style={{
        width: 232,
        minWidth: 232,
        borderRight: '1px solid var(--border-subtle)',
        background: 'linear-gradient(180deg, var(--bg-raised) 0%, var(--bg-base) 55%)',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 14px 16px'
      }}
    >
      <div style={{ padding: '4px 10px 20px' }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)'
          }}
        >
          Book of Business
        </div>
        <div style={{ marginTop: 6, fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>
          Your network
        </div>
        <div className="muted small" style={{ marginTop: 4 }}>
          Local files you control
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        {items.map((it) => {
          const active = section === it.id
          return (
            <button
              key={it.id}
              type="button"
              className="focus-ring"
              onClick={() => setSection(it.id)}
              style={{
                textAlign: 'left',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: '11px 12px',
                background: active ? 'var(--bg-panel)' : 'transparent',
                color: 'var(--text-primary)',
                boxShadow: active ? 'inset 0 0 0 1px var(--border-subtle)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10
              }}
            >
              <span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{it.label}</span>
                <span className="muted small" style={{ marginLeft: 8 }}>
                  {it.hint}
                </span>
              </span>
              {it.id !== 'settings' && (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: active ? 'var(--accent)' : 'var(--text-muted)',
                    fontVariantNumeric: 'tabular-nums'
                  }}
                >
                  {counts[it.id] ?? 0}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div
        className="muted small"
        style={{
          padding: '12px 10px 0',
          borderTop: '1px solid var(--border-subtle)',
          lineHeight: 1.5
        }}
      >
        Plain JSON on disk. Put the folder inside iCloud Drive or OneDrive to sync.
      </div>
    </aside>
  )
}
