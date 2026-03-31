import { useState } from 'react'
import { useApp } from '../context/AppContext'

export default function SettingsView(): React.ReactElement {
  const { workspacePath, chooseWorkspace, openWorkspaceFolder, clearWorkspace, refresh } = useApp()
  const [showClear, setShowClear] = useState(false)

  return (
    <div className="scroll-y" style={{ flex: 1, padding: '32px 40px 48px' }}>
      <div style={{ maxWidth: 560 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Your library</h2>
        <p className="muted" style={{ marginTop: 10, lineHeight: 1.65 }}>
          Data never leaves this folder unless you put the folder in a synced drive. Each record is a small JSON file
          you can inspect, diff, or archive with any tool.
        </p>

        <div
          style={{
            marginTop: 28,
            padding: 20,
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-panel)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.02) inset'
          }}
        >
          <div className="field-label">Active folder</div>
          <div
            style={{
              marginTop: 8,
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--text-secondary)',
              wordBreak: 'break-all',
              lineHeight: 1.5
            }}
          >
            {workspacePath ?? 'No folder selected'}
          </div>
          <div style={{ marginTop: 18, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <button type="button" className="btn btn-primary focus-ring" onClick={() => void chooseWorkspace()}>
              Choose folder
            </button>
            <button
              type="button"
              className="btn btn-ghost focus-ring"
              disabled={!workspacePath}
              onClick={() => void openWorkspaceFolder()}
            >
              Reveal in Finder
            </button>
            <button type="button" className="btn btn-ghost focus-ring" onClick={() => setShowClear(true)}>
              Disconnect folder
            </button>
          </div>
        </div>

        <div style={{ marginTop: 28 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Cloud sync</h3>
          <p className="muted small" style={{ marginTop: 10, lineHeight: 1.65 }}>
            On macOS, pick a folder inside iCloud Drive. On Windows, pick a folder inside OneDrive. The app only reads
            and writes files in that tree. Conflict behavior follows your sync provider if two machines edit the same
            file at once, so favor editing on one device at a time for the same person.
          </p>
        </div>

        <div style={{ marginTop: 24 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>On-disk layout</h3>
          <pre
            className="small"
            style={{
              marginTop: 12,
              padding: 16,
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-raised)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              overflow: 'auto',
              lineHeight: 1.5
            }}
          >
{`your-library/
  manifest.json
  industries/
    <id>.json
  companies/
    <id>.json
  contacts/
    <id>.json`}
          </pre>
        </div>
      </div>

      {showClear && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            zIndex: 50
          }}
        >
          <div
            style={{
              width: 'min(440px, 100%)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-panel)',
              padding: 24,
              boxShadow: 'var(--shadow-soft)'
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 16 }}>Disconnect this folder?</div>
            <p className="muted small" style={{ marginTop: 10, lineHeight: 1.6 }}>
              Your files stay on disk. The app only forgets the path on this computer until you choose a folder again.
            </p>
            <div style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost focus-ring" onClick={() => setShowClear(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary focus-ring"
                onClick={() => {
                  void clearWorkspace().then(() => {
                    setShowClear(false)
                    void refresh()
                  })
                }}
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
