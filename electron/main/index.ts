import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { loadSettings, saveSettings } from './store'
import { geocodeSearch } from './geocode'
import {
  deleteCompany,
  deleteContact,
  deleteIndustry,
  ensureWorkspace,
  listCompanies,
  listContacts,
  listIndustries,
  saveCompany,
  saveContact,
  saveIndustry,
  updateCompanyPin,
  updateContactPin
} from './workspace'

let mainWindow: BrowserWindow | null = null

function getWorkspace(): string | null {
  return loadSettings().workspacePath
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    titleBarStyle: 'default',
    backgroundColor: '#2a2622',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  ipcMain.handle('settings:getWorkspace', () => getWorkspace())

  ipcMain.handle('settings:chooseWorkspace', async () => {
    const win = BrowserWindow.getFocusedWindow() ?? mainWindow
    const r = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory', 'createDirectory']
    })
    if (r.canceled || !r.filePaths[0]) return null
    const p = r.filePaths[0]
    ensureWorkspace(p)
    saveSettings({ workspacePath: p })
    return p
  })

  ipcMain.handle('settings:clearWorkspace', () => {
    saveSettings({ workspacePath: null })
    return null
  })

  ipcMain.handle('workspace:openInFinder', async () => {
    const w = getWorkspace()
    if (w && existsSync(w)) await shell.openPath(w)
  })

  ipcMain.handle('workspace:revealFile', async (_e, filePath: string) => {
    if (filePath && existsSync(filePath)) shell.showItemInFolder(filePath)
  })

  const needRoot = (): string | null => {
    const w = getWorkspace()
    if (!w || !existsSync(w)) return null
    return w
  }

  ipcMain.handle('data:listIndustries', () => {
    const root = needRoot()
    if (!root) return []
    return listIndustries(root)
  })
  ipcMain.handle('data:listCompanies', () => {
    const root = needRoot()
    if (!root) return []
    return listCompanies(root)
  })
  ipcMain.handle('data:listContacts', () => {
    const root = needRoot()
    if (!root) return []
    return listContacts(root)
  })

  ipcMain.handle('data:saveIndustry', (_e, payload: unknown) => {
    const root = needRoot()
    if (!root) throw new Error('No workspace')
    return saveIndustry(root, payload as Parameters<typeof saveIndustry>[1])
  })
  ipcMain.handle('data:saveCompany', (_e, payload: unknown) => {
    const root = needRoot()
    if (!root) throw new Error('No workspace')
    return saveCompany(root, payload as Parameters<typeof saveCompany>[1])
  })
  ipcMain.handle('data:saveContact', (_e, payload: unknown, department: unknown) => {
    const root = needRoot()
    if (!root) throw new Error('No workspace')
    return saveContact(
      root,
      payload as Parameters<typeof saveContact>[1],
      department
    )
  })
  ipcMain.handle('data:updateContactPin', (_e, id: string, lat: number, lon: number) => {
    const root = needRoot()
    if (!root) throw new Error('No workspace')
    return updateContactPin(root, id, lat, lon)
  })
  ipcMain.handle('data:updateCompanyPin', (_e, id: string, lat: number, lon: number) => {
    const root = needRoot()
    if (!root) throw new Error('No workspace')
    return updateCompanyPin(root, id, lat, lon)
  })
  ipcMain.handle('data:deleteIndustry', (_e, id: string) => {
    const root = needRoot()
    if (!root) throw new Error('No workspace')
    deleteIndustry(root, id)
  })
  ipcMain.handle('data:deleteCompany', (_e, id: string) => {
    const root = needRoot()
    if (!root) throw new Error('No workspace')
    deleteCompany(root, id)
  })
  ipcMain.handle('data:deleteContact', (_e, id: string) => {
    const root = needRoot()
    if (!root) throw new Error('No workspace')
    deleteContact(root, id)
  })

  ipcMain.handle('geo:search', async (_e, query: string) => {
    if (typeof query !== 'string') return null
    return geocodeSearch(query)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
