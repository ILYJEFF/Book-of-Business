import { useApp } from '../context/AppContext'

export default function WorkspaceSetup(): React.ReactElement {
  const { chooseWorkspace, loading } = useApp()

  return (
    <div className="welcome-bg">
      <div className="welcome-card">
        <div className="welcome-card-inner">
          <h1 className="welcome-title">Choose a folder</h1>
          <p className="welcome-lead">
            Data is JSON files under that path. Use an empty folder, or one inside Dropbox, iCloud, OneDrive, whatever
            you already trust.
          </p>
          <ul className="welcome-list">
            <li>Creates industries, companies, contacts subfolders.</li>
            <li>You can edit or back up files outside this app.</li>
            <li>No sign-in here.</li>
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
