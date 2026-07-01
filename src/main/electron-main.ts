/**
 * Electron main process entry point
 *
 * This process owns the single Application instance and every service that
 * touches the OS (network probes, DNS, process listing, registry/sysctl).
 * The renderer (sandboxed, contextIsolation on, nodeIntegration off) never
 * imports those services directly - it only talks to them through the IPC
 * surface registered below, exposed via preload.ts.
 */

import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron'
import { exec } from 'child_process'
import path from 'path'
import { getApplication } from '@main/Application'
import { getBackupManager } from '@services/BackupManager'
import { getLogger, getAllLogs, getLogsDirectory } from '@services/Logger'
import { probeTarget } from '@native/probe'
import { runTraceroute } from '@native/traceroute'
import { performDNSLookup } from '@native/dnsLookup'
import type { OptimizationProfile } from '@types/index'

const logger = getLogger('ElectronMain')
const isDev = process.env.NODE_ENV === 'development'

/** Whether this process is actually running with elevated (Administrator/root) privileges. */
function isElevated(): Promise<boolean> {
  if (process.platform === 'win32') {
    // `net session` only succeeds for an elevated process on Windows.
    return new Promise((resolve) => {
      exec('net session', (error) => resolve(!error))
    })
  }
  return Promise.resolve(typeof process.getuid === 'function' && process.getuid() === 0)
}

let mainWindow: BrowserWindow | null = null
const application = getApplication()

async function createWindow() {
  logger.info('Creating main window')

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0a0e17',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
  })

  mainWindow.on('maximize', () => forwardToRenderer('window:maximize-changed', true))
  mainWindow.on('unmaximize', () => forwardToRenderer('window:maximize-changed', false))

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  logger.info('Main window created')
}

function forwardToRenderer(channel: string, payload: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload)
  }
}

async function handleAppReady() {
  logger.info('App ready')

  await application.initialize()
  await application.start()

  // Forward real-time service events to the renderer as they happen.
  application.getNetworkMonitor().onConnectionQualityChanged((quality) => {
    forwardToRenderer('network:quality-changed', quality)
  })
  application.getGameDetector().onGameEvent((type, game) => {
    forwardToRenderer('games:event', { type, game })
  })
  application.getComparisonRunner().onStatusChanged((comparison) => {
    forwardToRenderer('comparison:status-changed', comparison)
  })
  application.getGameRouteAnalyzer().onReportChanged((report) => {
    forwardToRenderer('routes:report-changed', report)
  })

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
          click: () => app.quit(),
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
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

app.on('ready', handleAppReady)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow().catch((err) => logger.error('Failed to create window on activate', err))
  }
})

app.on('before-quit', async () => {
  logger.info('App quitting')
  await application.shutdown()
})

// ============================================================================
// IPC Handlers - the entire renderer-facing API surface
// ============================================================================

ipcMain.handle('app:get-version', () => app.getVersion())

// --- Window controls (custom, frameless title bar) --------------------------

ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize()
})

ipcMain.handle('window:maximize-toggle', () => {
  if (!mainWindow) return false
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow.maximize()
  }
  return mainWindow.isMaximized()
})

ipcMain.handle('window:close', () => {
  mainWindow?.close()
})

ipcMain.handle('window:is-maximized', () => {
  return mainWindow?.isMaximized() ?? false
})

ipcMain.handle('app:get-status', async () => {
  const monitor = application.getNetworkMonitor()
  const detector = application.getGameDetector()

  return {
    isRunning: application.isRunning_(),
    networkMonitoring: monitor.isRunning(),
    gameDetection: detector.isRunning(),
    detectedGames: detector.getDetectedGames().length,
    connectionQuality: monitor.getConnectionQuality(),
    requiresElevation: application.getOptimizationEngine().requiresElevation(),
    isElevated: await isElevated(),
  }
})

// --- Network -------------------------------------------------------------

ipcMain.handle('network:get-quality', () => {
  return application.getNetworkMonitor().getConnectionQuality()
})

ipcMain.handle('network:get-latency-history', (_event, count?: number) => {
  return application.getNetworkMonitor().getLatencyHistory(count)
})

// --- Games -----------------------------------------------------------------

ipcMain.handle('games:get-detected', () => {
  return application.getGameDetector().getDetectedGames()
})

// --- Config / Profiles ------------------------------------------------------

ipcMain.handle('config:get-active-profile', () => {
  return application.getConfigManager().getActiveProfile()
})

ipcMain.handle('config:get-all-profiles', () => {
  return application.getConfigManager().getAllProfiles()
})

ipcMain.handle('config:set-active-profile', async (_event, profileId: string) => {
  application.getConfigManager().setActiveProfile(profileId)
  const profile = application.getConfigManager().getActiveProfile()
  return application.getOptimizationEngine().applyOptimizations(profile)
})

ipcMain.handle('config:apply-custom-profile', async (_event, profile: OptimizationProfile) => {
  application.getConfigManager().upsertProfile(profile)
  return application.getOptimizationEngine().applyOptimizations(profile)
})

ipcMain.handle('config:get-ui-settings', () => {
  return application.getConfigManager().getUISettings()
})

ipcMain.handle('config:set-ui-settings', (_event, settings) => {
  application.getConfigManager().setUISettings(settings)
  return application.getConfigManager().getUISettings()
})

ipcMain.handle('config:get-telemetry-settings', () => {
  return application.getConfigManager().getTelemetrySettings()
})

ipcMain.handle('config:set-telemetry-settings', (_event, settings) => {
  application.getConfigManager().setTelemetrySettings(settings)
  return application.getConfigManager().getTelemetrySettings()
})

// --- Optimization / Backup & Restore -----------------------------------------

ipcMain.handle('optimization:get-current-profile', () => {
  return application.getOptimizationEngine().getCurrentProfile()
})

ipcMain.handle('optimization:apply', async (_event, profileId: string) => {
  const profile =
    application.getConfigManager().getProfile(profileId) ||
    application.getConfigManager().getActiveProfile()
  return application.getOptimizationEngine().applyOptimizations(profile)
})

ipcMain.handle('optimization:revert', async (_event, backupId?: string) => {
  return application.getOptimizationEngine().revertOptimizations(backupId)
})

ipcMain.handle('backups:list', async () => {
  return getBackupManager().listBackups()
})

ipcMain.handle('backups:create', async (_event, label?: string) => {
  return application.getOptimizationEngine().createManualBackup(label)
})

ipcMain.handle('backups:get', async (_event, id: string) => {
  return getBackupManager().getBackup(id)
})

ipcMain.handle('backups:delete', async (_event, id: string) => {
  await getBackupManager().deleteBackup(id)
  return true
})

// --- Diagnostic Tools (Ping / Traceroute / DNS Lookup) ------------------------

ipcMain.handle('tools:ping', async (_event, host: string) => {
  return probeTarget(host)
})

ipcMain.handle('tools:traceroute', async (_event, host: string) => {
  return runTraceroute(host)
})

ipcMain.handle('tools:dns-lookup', async (_event, domain: string) => {
  return performDNSLookup(domain)
})

// --- Routing diagnostics ---------------------------------------------------

ipcMain.handle('routing:get-issues', () => {
  return application.getRoutingOptimizer().getIssues()
})

// --- Before/after optimization comparison -----------------------------------

ipcMain.handle('comparison:run', async (_event, profile: OptimizationProfile) => {
  return application.getComparisonRunner().run(profile)
})

ipcMain.handle('comparison:get-latest', () => {
  return application.getComparisonRunner().getCurrent()
})

// --- Game server route analysis ---------------------------------------------

ipcMain.handle('routes:scan', async () => {
  return application.getGameRouteAnalyzer().scan()
})

ipcMain.handle('routes:analyze-host', async (_event, host: string) => {
  return application.getGameRouteAnalyzer().analyzeHost(host)
})

ipcMain.handle('routes:get-latest', () => {
  return application.getGameRouteAnalyzer().getLatest()
})

// --- Logs -------------------------------------------------------------------

ipcMain.handle('logs:get-recent', (_event, count?: number) => {
  return getAllLogs(count)
})

ipcMain.handle('logs:open-folder', async () => {
  await shell.openPath(getLogsDirectory())
})

export {}
