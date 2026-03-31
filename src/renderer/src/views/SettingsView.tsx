import { useCallback, useState } from 'react'
import { useApp } from '../context/AppContext'
type Banner =
  | { kind: 'idle' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string }

function summarizeImport(r: {
  imported: { industries: number; companies: number; contacts: number }
}): string {
  const { industries, companies, contacts } = r.imported
  const parts = [
    `${industries} industr${industries === 1 ? 'y' : 'ies'}`,
    `${companies} compan${companies === 1 ? 'y' : 'ies'}`,
    `${contacts} contact${contacts === 1 ? '' : 's'}`
  ]
  return `Wrote ${parts.join(', ')}.`
}

export default function SettingsView(): React.ReactElement {
  const { workspacePath, chooseWorkspace, openWorkspaceFolder, clearWorkspace, refresh } = useApp()
  const [showClear, setShowClear] = useState(false)
  const [showReplaceImport, setShowReplaceImport] = useState(false)
  const [exportBusy, setExportBusy] = useState(false)
  const [importBusy, setImportBusy] = useState(false)
  const [banner, setBanner] = useState<Banner>({ kind: 'idle' })

  const runExport = useCallback(async () => {
    setBanner({ kind: 'idle' })
    setExportBusy(true)
    try {
      const r = await window.book.exportWorkspace()
      if (r.canceled) return
      setBanner({ kind: 'success', message: `Saved export to ${r.path}` })
    } catch (e) {
      setBanner({ kind: 'error', message: e instanceof Error ? e.message : 'Export failed.' })
    } finally {
      setExportBusy(false)
    }
  }, [])

  const runImport = useCallback(
    async (mode: 'merge' | 'replace') => {
      setBanner({ kind: 'idle' })
      setImportBusy(true)
      try {
        const r = await window.book.importWorkspace(mode)
        if (r.canceled) return
        if ('error' in r) {
          setBanner({ kind: 'error', message: r.error })
          return
        }
        setBanner({ kind: 'success', message: summarizeImport(r) })
        await refresh({ background: true })
      } catch (e) {
        setBanner({ kind: 'error', message: e instanceof Error ? e.message : 'Import failed.' })
      } finally {
        setImportBusy(false)
        setShowReplaceImport(false)
      }
    },
    [refresh]
  )

  return (
    <div className="settings-page scroll-y">
      <div className="settings-inner">
        <h2 className="settings-title">Library folder</h2>
        <p className="muted" style={{ marginTop: 12, lineHeight: 1.6, fontSize: 14 }}>
          One folder on disk. Each record is a JSON file. Point the app anywhere you want.
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
          <h3 className="settings-h3">Data management</h3>
          <p className="muted small" style={{ marginTop: 10, lineHeight: 1.65 }}>
            Export everything to one JSON file for backup or moving machines. Import merges into the current library by
            default (same IDs update existing rows). Replace clears all contacts, companies, and industries in this
            folder first, then loads the file.
          </p>

          {banner.kind !== 'idle' && (
            <div
              className={`settings-data-banner ${banner.kind === 'success' ? 'settings-data-banner--ok' : 'settings-data-banner--err'}`}
              role="status"
            >
              {banner.message}
            </div>
          )}

          <div className="settings-data-actions">
            <button
              type="button"
              className="btn btn-primary focus-ring"
              disabled={!workspacePath || exportBusy || importBusy}
              onClick={() => void runExport()}
            >
              {exportBusy ? 'Exporting…' : 'Export library…'}
            </button>
            <button
              type="button"
              className="btn btn-ghost focus-ring"
              disabled={!workspacePath || exportBusy || importBusy}
              onClick={() => void runImport('merge')}
            >
              {importBusy ? 'Importing…' : 'Import (merge)…'}
            </button>
            <button
              type="button"
              className="btn btn-ghost focus-ring settings-data-danger"
              disabled={!workspacePath || exportBusy || importBusy}
              onClick={() => setShowReplaceImport(true)}
            >
              Import (replace all)…
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-h3">Sync</h3>
          <p className="muted small" style={{ marginTop: 10, lineHeight: 1.6 }}>
            Put the folder inside iCloud, OneDrive, Dropbox, etc. if you want copies elsewhere. Same-file edits on two
            machines are up to the sync tool, not this app.
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

      {showReplaceImport && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="replace-import-title">
          <div className="modal-panel">
            <div id="replace-import-title" style={{ fontWeight: 650, fontSize: 16, letterSpacing: '-0.02em' }}>
              Replace entire library?
            </div>
            <p className="muted small" style={{ marginTop: 12, lineHeight: 1.65, marginBottom: 0 }}>
              This removes every contact, company, and industry JSON file in the active folder, then imports the file you
              pick. Other files in the folder are left alone. This cannot be undone from the app.
            </p>
            <div style={{ marginTop: 22, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-ghost focus-ring"
                disabled={importBusy}
                onClick={() => setShowReplaceImport(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger focus-ring"
                disabled={importBusy}
                onClick={() => void runImport('replace')}
              >
                {importBusy ? 'Importing…' : 'Choose file and replace'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
