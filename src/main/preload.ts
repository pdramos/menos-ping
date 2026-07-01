/**
 * Electron preload script - the only bridge between the sandboxed renderer
 * and the main process. Every OS-touching operation (network probes, DNS,
 * process scanning, registry/sysctl reads/writes) lives in the main process;
 * the renderer only ever sees the results via these IPC calls.
 */

import { contextBridge, ipcRenderer } from 'electron'

function subscribe(channel: string, callback: (payload: any) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: any) => callback(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

contextBridge.exposeInMainWorld('app', {
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  getStatus: () => ipcRenderer.invoke('app:get-status'),

  network: {
    getQuality: () => ipcRenderer.invoke('network:get-quality'),
    getLatencyHistory: (count?: number) => ipcRenderer.invoke('network:get-latency-history', count),
    onQualityChanged: (callback: (quality: unknown) => void) =>
      subscribe('network:quality-changed', callback),
  },

  games: {
    getDetected: () => ipcRenderer.invoke('games:get-detected'),
    onGameEvent: (callback: (event: { type: string; game: unknown }) => void) =>
      subscribe('games:event', callback),
  },

  config: {
    getActiveProfile: () => ipcRenderer.invoke('config:get-active-profile'),
    getAllProfiles: () => ipcRenderer.invoke('config:get-all-profiles'),
    setActiveProfile: (profileId: string) => ipcRenderer.invoke('config:set-active-profile', profileId),
    applyCustomProfile: (profile: unknown) => ipcRenderer.invoke('config:apply-custom-profile', profile),
    getUISettings: () => ipcRenderer.invoke('config:get-ui-settings'),
    setUISettings: (settings: unknown) => ipcRenderer.invoke('config:set-ui-settings', settings),
    getTelemetrySettings: () => ipcRenderer.invoke('config:get-telemetry-settings'),
    setTelemetrySettings: (settings: unknown) =>
      ipcRenderer.invoke('config:set-telemetry-settings', settings),
  },

  optimization: {
    getCurrentProfile: () => ipcRenderer.invoke('optimization:get-current-profile'),
    apply: (profileId: string) => ipcRenderer.invoke('optimization:apply', profileId),
    revert: (backupId?: string) => ipcRenderer.invoke('optimization:revert', backupId),
  },

  backups: {
    list: () => ipcRenderer.invoke('backups:list'),
    get: (id: string) => ipcRenderer.invoke('backups:get', id),
    create: (label?: string) => ipcRenderer.invoke('backups:create', label),
    delete: (id: string) => ipcRenderer.invoke('backups:delete', id),
  },

  tools: {
    ping: (host: string) => ipcRenderer.invoke('tools:ping', host),
    traceroute: (host: string) => ipcRenderer.invoke('tools:traceroute', host),
    dnsLookup: (domain: string) => ipcRenderer.invoke('tools:dns-lookup', domain),
  },

  routing: {
    getIssues: () => ipcRenderer.invoke('routing:get-issues'),
  },

  windowControls: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximizeToggle: () => ipcRenderer.invoke('window:maximize-toggle'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
    onMaximizeChanged: (callback: (isMaximized: boolean) => void) =>
      subscribe('window:maximize-changed', callback),
  },

  logs: {
    getRecent: (count?: number) => ipcRenderer.invoke('logs:get-recent', count),
    openFolder: () => ipcRenderer.invoke('logs:open-folder'),
  },
})

contextBridge.exposeInMainWorld('logger', {
  log: (...args: unknown[]) => console.log('[renderer]', ...args),
  warn: (...args: unknown[]) => console.warn('[renderer]', ...args),
  error: (...args: unknown[]) => console.error('[renderer]', ...args),
})

export {}
