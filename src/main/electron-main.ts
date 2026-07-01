/**
 * Electron main process entry point
 */

import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import path from 'path'
import { getApplication } from '@main/Application'
import { getLogger } from '@services/Logger'

const logger = getLogger('ElectronMain')
const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null
let application: ReturnType<typeof getApplication> | null = null

async function createWindow() {
  logger.info('Creating main window')

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
      sandbox: true,
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
  })

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  // Initialize application services
  if (!application) {
    application = getApplication()
    await application.initialize()
    await application.start()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  logger.info('Main window created')
}

async function handleAppReady() {
  logger.info('App ready')
  await createWindow()
  createMenu()
}

function createMenu() {
  const template: (Electron.MenuItemConstructorOptions | Electron.MenuItem)[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit()
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            logger.info('About clicked')
          },
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// App lifecycle
app.on('ready', handleAppReady)

app.on('window-all-closed', () => {
  // On macOS, keep app running until user explicitly quits
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // Re-create window when dock icon clicked on macOS
  if (mainWindow === null) {
    createWindow().catch((err) => {
      logger.error('Failed to create window on activate', err)
    })
  }
})

app.on('before-quit', async () => {
  logger.info('App quitting')
  if (application) {
    await application.shutdown()
  }
})

// IPC Handlers
ipcMain.handle('app:get-version', () => {
  return app.getVersion()
})

ipcMain.handle('app:get-status', () => {
  if (!application) return null

  const monitor = application.getNetworkMonitor()
  const detector = application.getGameDetector()

  return {
    isRunning: application.isRunning_(),
    networkMonitoring: monitor.isRunning(),
    gameDetection: detector.isRunning(),
    detectedGames: detector.getDetectedGames().length,
    connectionQuality: monitor.getConnectionQuality(),
  }
})

export {}
