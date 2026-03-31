import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

export interface AppSettings {
  workspacePath: string | null
}

const file = () => join(app.getPath('userData'), 'settings.json')

const defaultSettings: AppSettings = {
  workspacePath: null
}

export function loadSettings(): AppSettings {
  try {
    if (!existsSync(file())) return { ...defaultSettings }
    const raw = readFileSync(file(), 'utf-8')
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return {
      workspacePath:
        typeof parsed.workspacePath === 'string' ? parsed.workspacePath : null
    }
  } catch {
    return { ...defaultSettings }
  }
}

export function saveSettings(s: AppSettings): void {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(file(), JSON.stringify(s, null, 2), 'utf-8')
}
