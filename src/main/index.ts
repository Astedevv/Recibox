import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { registerIpcHandlers } from './ipc'

const require = createRequire(import.meta.url)
const { app, BrowserWindow, Menu } = require('electron') as typeof import('electron')
if (process.platform === 'win32') {
  app.setAppUserModelId('com.astedevv.recibox')
}
const iconCandidates = [
  path.join(process.resourcesPath, 'recibox.ico'),
  path.resolve(process.cwd(), 'assets', 'recibox.ico')
]

const appIcon = iconCandidates.find((candidate) => fs.existsSync(candidate))

function createWindow() {
  const win = new BrowserWindow({
    width: 1380,
    height: 860,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: '#0b1120',
    autoHideMenuBar: true,
    icon: appIcon,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  win.setMenu(null)
  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  win.removeMenu()
  win.setMenuBarVisibility(false)
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  registerIpcHandlers()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
