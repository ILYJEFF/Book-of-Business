import { AppProvider, useApp } from './context/AppContext'
import Sidebar from './components/Sidebar'
import WorkspaceSetup from './components/WorkspaceSetup'
import ContactsView from './views/ContactsView'
import CompaniesView from './views/CompaniesView'
import IndustriesView from './views/IndustriesView'
import SettingsView from './views/SettingsView'

function Shell(): React.ReactElement {
  const { workspacePath, section, loading } = useApp()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-orb" aria-hidden />
        <span>Loading library…</span>
      </div>
    )
  }

  if (!workspacePath) {
    return (
      <div style={{ height: '100%', minHeight: 0 }}>
        <WorkspaceSetup />
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        {section === 'contacts' && <ContactsView />}
        {section === 'companies' && <CompaniesView />}
        {section === 'industries' && <IndustriesView />}
        {section === 'settings' && <SettingsView />}
      </main>
    </div>
  )
}

export default function App(): React.ReactElement {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}
