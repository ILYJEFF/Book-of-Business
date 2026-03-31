import { useApp } from '../context/AppContext'

export default function WorkspaceSetup(): React.ReactElement {
  const { chooseWorkspace, loading } = useApp()

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
        background:
          'radial-gradient(1200px 600px at 50% -10%, rgba(138,180,212,0.08), transparent 55%), var(--bg-base)'
      }}
    >
      <div
        style={{
          maxWidth: 440,
          width: '100%',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          background: 'var(--bg-panel)',
          boxShadow: 'var(--shadow-soft)',
          padding: '36px 32px 32px'
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'var(--accent-dim)',
            border: '1px solid rgba(138,180,212,0.25)',
            marginBottom: 20
          }}
        />
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>
          Choose your library folder
        </h1>
        <p className="muted" style={{ marginTop: 12, lineHeight: 1.6 }}>
          Everything lives in a folder on your machine: industries, companies, and contacts as simple
          JSON files. Pick an empty folder, or a folder you already sync with iCloud or OneDrive.
        </p>
        <ul className="muted small" style={{ margin: '16px 0 0', paddingLeft: 18, lineHeight: 1.7 }}>
          <li>We create subfolders: industries, companies, contacts</li>
          <li>You can browse or back up the files any time</li>
          <li>No account, no cloud we control</li>
        </ul>
        <div style={{ marginTop: 28, display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn btn-primary focus-ring"
            disabled={loading}
            onClick={() => void chooseWorkspace()}
          >
            Select folder
          </button>
        </div>
      </div>
    </div>
  )
}
