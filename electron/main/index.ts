import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  shell,
  type MenuItemConstructorOptions
} from 'electron'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'
import { loadSettings, saveSettings } from './store'
import { geocodeSearch } from './geocode'
import {
  addContactAttachmentsFromPaths,
  deleteCompany,
  deleteContact,
  deleteIndustry,
  deleteTag,
  ensureWorkspace,
  listCompanies,
  listContacts,
  listIndustries,
  listTags,
  removeContactAttachment,
  resolveContactAttachmentPath,
  saveCompany,
  saveContact,
  saveIndustry,
  saveTag,
  setContactFavorite,
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

/**
 * macOS needs an Edit menu with standard roles (copy, paste, …). Without them, Cmd+V and related
 * shortcuts often never reach the web contents. App-specific actions stay in the renderer UI.
 */
function installApplicationMenu(): void {
  const editSubmenu: MenuItemConstructorOptions[] = [
    { role: 'undo' },
    { role: 'redo' },
    { type: 'separator' },
    { role: 'cut' },
    { role: 'copy' },
    { role: 'paste' },
    { role: 'pasteAndMatchStyle' },
    { role: 'delete' },
    { type: 'separator' },
    { role: 'selectAll' }
  ]

  if (process.platform === 'darwin') {
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        {
          label: app.name,
          submenu: [{ role: 'quit' }]
        },
        { label: 'Edit', submenu: editSubmenu }
      ])
    )
  } else {
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([{ label: 'Edit', submenu: editSubmenu }])
    )
  }
}

function getWorkspace(): string | null {
  return loadSettings().workspacePath
}

/** Dock / taskbar / window icon: dev uses repo `build/icon.png`; packaged uses generated assets in Resources. */
function resolveWindowIcon(): string | undefined {
  if (app.isPackaged) {
    const r = process.resourcesPath
    if (process.platform === 'win32') {
      const ico = join(r, 'icon.ico')
      if (existsSync(ico)) return ico
    }
    const png = join(r, 'icon.png')
    if (existsSync(png)) return png
  }
  const dev = join(process.cwd(), 'build', 'icon.png')
  return existsSync(dev) ? dev : undefined
}

function createWindow(): void {
  const icon = resolveWindowIcon()
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    titleBarStyle: 'default',
    autoHideMenuBar: true,
    backgroundColor: '#2a2622',
    show: false,
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
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
  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(() => ({ action: 'deny' }))
    contents.on('will-attach-webview', (event, webPreferences, params) => {
      delete webPreferences.preload
      webPreferences.nodeIntegration = false
      webPreferences.contextIsolation = true
      webPreferences.sandbox = true
      webPreferences.webSecurity = true
      const src = typeof params.src === 'string' ? params.src : ''
      try {
        const u = new URL(src)
        if (u.protocol !== 'https:' && u.protocol !== 'http:') {
          event.preventDefault()
        }
      } catch {
        event.preventDefault()
      }
    })
  })
  const dockIcon = resolveWindowIcon()
  if (process.platform === 'darwin' && dockIcon && !app.isPackaged) {
    try {
      app.dock.setIcon(dockIcon)
    } catch {
      /* ignore */
    }
  }
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
  ipcMain.handle('data:listTags', () => {
    const root = needRoot()
    if (!root) return []
    return listTags(root)
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
  ipcMain.handle('data:saveTag', (_e, payload: unknown) => {
    const root = needRoot()
    if (!root) throw new Error('No workspace')
    return saveTag(root, payload as Parameters<typeof saveTag>[1])
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
  ipcMain.handle('data:deleteTag', (_e, id: string) => {
    const root = needRoot()
    if (!root) throw new Error('No workspace')
    deleteTag(root, id)
  })

  ipcMain.handle('data:addContactAttachments', async (_e, contactId: string) => {
    const root = needRoot()
    if (!root) throw new Error('No workspace')
    if (typeof contactId !== 'string' || !contactId.trim()) throw new Error('Invalid contact')
    const win = BrowserWindow.getFocusedWindow() ?? mainWindow
    const r = await dialog.showOpenDialog(win!, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Documents',
          extensions: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'png', 'jpg', 'jpeg', 'webp', 'md']
        },
        { name: 'All files', extensions: ['*'] }
      ]
    })
    if (r.canceled || !r.filePaths.length) return { canceled: true as const }
    const contact = addContactAttachmentsFromPaths(root, contactId, r.filePaths)
    return { canceled: false as const, contact }
  })

  ipcMain.handle('data:removeContactAttachment', (_e, contactId: string, attachmentId: string) => {
    const root = needRoot()
    if (!root) throw new Error('No workspace')
    return removeContactAttachment(root, contactId, attachmentId)
  })

  ipcMain.handle('data:openContactAttachment', (_e, relativePath: string) => {
    const root = needRoot()
    if (!root || typeof relativePath !== 'string') return false
    const full = resolveContactAttachmentPath(root, relativePath)
    if (!full) return false
    void shell.openPath(full)
    return true
  })

  ipcMain.handle('data:revealContactAttachment', (_e, relativePath: string) => {
    const root = needRoot()
    if (!root || typeof relativePath !== 'string') return false
    const full = resolveContactAttachmentPath(root, relativePath)
    if (!full) return false
    shell.showItemInFolder(full)
    return true
  })

  ipcMain.handle('data:setContactFavorite', (_e, contactId: string, favorite: boolean) => {
    const root = needRoot()
    if (!root) throw new Error('No workspace')
    return setContactFavorite(root, contactId, favorite === true)
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
      let img = clipboard.readImage()
      if (img.isEmpty()) {
        for (const fmt of clipboard.availableFormats()) {
          const lower = fmt.toLowerCase()
          if (
            !lower.includes('image') &&
            lower !== 'public.png' &&
            lower !== 'public.jpeg' &&
            lower !== 'public.tiff' &&
            lower !== 'public.gif' &&
            !lower.endsWith('.png') &&
            !lower.endsWith('.jpeg') &&
            !lower.endsWith('.jpg') &&
            !lower.endsWith('.gif') &&
            !lower.endsWith('.webp')
          ) {
            continue
          }
          try {
            const buf = clipboard.readBuffer(fmt)
            if (buf.length === 0) continue
            const fromBuf = nativeImage.createFromBuffer(buf)
            if (!fromBuf.isEmpty()) {
              img = fromBuf
              break
            }
          } catch {
            /* try next format */
          }
        }
      }
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
