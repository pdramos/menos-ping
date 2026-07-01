/**
 * Electron preload script for secure IPC communication
 */

import { contextBridge, ipcRenderer } from 'electron'

// Expose safe IPC methods to renderer process
contextBridge.exposeInMainWorld('app', {
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  getStatus: () => ipcRenderer.invoke('app:get-status'),
  onUpdate: (callback: (data: unknown) => void) => {
    ipcRenderer.on('app:update', (_, data) => callback(data))
  },
})

// Expose logging utility
contextBridge.exposeInMainWorld('logger', {
  log: (...args: unknown[]) => console.log('[renderer]', ...args),
  warn: (...args: unknown[]) => console.warn('[renderer]', ...args),
  error: (...args: unknown[]) => console.error('[renderer]', ...args),
})

export {}
