import { useApp } from '../context/AppContext'

export default function WorkspaceSetup(): React.ReactElement {
  const { chooseWorkspace, loading } = useApp()

  return (
    <div className="welcome-bg">
      <div className="welcome-card">
        <div className="welcome-card-inner">
          <div className="welcome-icon" aria-hidden />
          <h1 className="welcome-title">Choose your library folder</h1>
          <p className="welcome-lead">
            Industries, companies, and contacts are saved as readable JSON files. Pick a folder on your machine, or one
            you already sync.
          </p>
          <ul className="welcome-list">
            <li>We create industries, companies, and contacts subfolders.</li>
            <li>You can browse, diff, or back up with any tool.</li>
            <li>No vendor cloud. No account gate.</li>
          </ul>
          <div className="welcome-actions">
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
    </div>
  )
}
