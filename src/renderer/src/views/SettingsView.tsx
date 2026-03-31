import { useState } from 'react'
import { useApp } from '../context/AppContext'

export default function SettingsView(): React.ReactElement {
  const { workspacePath, chooseWorkspace, openWorkspaceFolder, clearWorkspace, refresh } = useApp()
  const [showClear, setShowClear] = useState(false)

  return (
    <div className="scroll-y settings-page">
      <div className="settings-inner">
        <h2 className="settings-title">Your library</h2>
        <p className="muted" style={{ marginTop: 12, lineHeight: 1.65, fontSize: 15 }}>
          Data stays in the folder you choose. Each record is a small JSON file you can inspect, diff, or archive with
          any tool.
        </p>

        <div className="settings-card">
          <div className="field-label">Active folder</div>
          <div className="settings-path">{workspacePath ?? 'No folder selected'}</div>
          <div className="settings-actions">
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

        <div className="settings-section">
          <h3 className="settings-h3">Cloud sync</h3>
          <p className="muted small" style={{ marginTop: 10, lineHeight: 1.65 }}>
            On macOS, use a folder inside iCloud Drive. On Windows, use OneDrive. The app only touches files in that
            tree. If two devices edit the same file at once, your sync provider decides how to merge, so avoid parallel
            edits on the same person when possible.
          </p>
        </div>

        <div className="settings-section">
          <h3 className="settings-h3">On-disk layout</h3>
          <pre className="code-block">{`your-library/
  manifest.json
  industries/
    <id>.json
  companies/
    <id>.json
  contacts/
    <id>.json`}</pre>
        </div>
      </div>

      {showClear && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="disconnect-title">
          <div className="modal-panel">
            <div id="disconnect-title" style={{ fontWeight: 650, fontSize: 16, letterSpacing: '-0.02em' }}>
              Disconnect this folder?
            </div>
            <p className="muted small" style={{ marginTop: 12, lineHeight: 1.6, marginBottom: 0 }}>
              Your files stay on disk. This device only forgets the path until you pick a folder again.
            </p>
            <div style={{ marginTop: 22, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
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
