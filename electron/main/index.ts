import { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, shell } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'
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
import {
  applyExportBundle,
  buildExportBundle,
  parseExportBundle,
  writeBundleFile
} from './dataBundle'

let mainWindow: BrowserWindow | null = null

/** No File/Edit/View/Window menus: app actions live in the renderer. macOS keeps a minimal app menu only. */
function installApplicationMenu(): void {
  if (process.platform === 'darwin') {
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        {
          label: app.name,
          submenu: [{ role: 'quit' }]
        }
      ])
    )
  } else {
    Menu.setApplicationMenu(null)
  }
}

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
    autoHideMenuBar: true,
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
  installApplicationMenu()
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
  ipcMain.handle('data:saveCompany', (_e, payload: unknown, urlChannels: unknown) => {
    const root = needRoot()
    if (!root) throw new Error('No workspace')
    return saveCompany(
      root,
      payload as Parameters<typeof saveCompany>[1],
      urlChannels as Parameters<typeof saveCompany>[2]
    )
  })
  ipcMain.handle('data:saveContact', (_e, payload: unknown, department: unknown, urlChannels: unknown) => {
    const root = needRoot()
    if (!root) throw new Error('No workspace')
    return saveContact(
      root,
      payload as Parameters<typeof saveContact>[1],
      department,
      urlChannels as Parameters<typeof saveContact>[3]
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

  ipcMain.handle('data:exportWorkspace', async () => {
    const root = needRoot()
    if (!root) throw new Error('No workspace')
    const win = BrowserWindow.getFocusedWindow() ?? mainWindow
    const bundle = buildExportBundle(root)
    const day = new Date().toISOString().slice(0, 10)
    const r = await dialog.showSaveDialog(win!, {
      defaultPath: `book-of-business-export-${day}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (r.canceled || !r.filePath) return { canceled: true as const }
    writeBundleFile(r.filePath, bundle)
    return { canceled: false as const, path: r.filePath }
  })

  ipcMain.handle('data:importWorkspace', async (_e, mode: unknown) => {
    const root = needRoot()
    if (!root) throw new Error('No workspace')
    const win = BrowserWindow.getFocusedWindow() ?? mainWindow
    const r = await dialog.showOpenDialog(win!, {
      properties: ['openFile'],
      filters: [
        { name: 'Book of Business export', extensions: ['json'] },
        { name: 'All files', extensions: ['*'] }
      ]
    })
    if (r.canceled || !r.filePaths[0]) return { canceled: true as const }
    const raw = readFileSync(r.filePaths[0], 'utf-8')
    const parsed = parseExportBundle(raw)
    if (!parsed.ok) return { canceled: false as const, error: parsed.message }
    const m = mode === 'replace' ? 'replace' : 'merge'
    const imported = applyExportBundle(root, parsed.bundle, m)
    return { canceled: false as const, imported }
  })

  ipcMain.on('clipboard:readImageDataUrlSync', (event) => {
    try {
      const img = clipboard.readImage()
      event.returnValue = img.isEmpty() ? null : img.toDataURL()
    } catch {
      event.returnValue = null
    }
  })

  ipcMain.handle('shell:openExternal', async (_e, url: string) => {
    if (typeof url !== 'string' || !url.trim()) return
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return
    await shell.openExternal(url)
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
