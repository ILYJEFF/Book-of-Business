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
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: 13
        }}
      >
        Opening library…
      </div>
    )
  }

  if (!workspacePath) {
    return <WorkspaceSetup />
  }

  return (
    <div style={{ height: '100%', display: 'flex', minHeight: 0 }}>
      <Sidebar />
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
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
