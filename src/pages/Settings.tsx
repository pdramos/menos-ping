/**
 * Settings page - Configuration, preferences, and Backup & Restore
 */

import React, { useState, useEffect, useCallback } from 'react'
import Layout from '@components/Layout'
import useNotifications from '@hooks/useNotifications'
import type { OptimizationProfile } from '@types/index'
import type { BackupMeta } from '@services/BackupManager'

export const Settings: React.FC = () => {
  const [profiles, setProfiles] = useState<OptimizationProfile[]>([])
  const [activeProfileId, setActiveProfileId] = useState<string>('')
  const [uiSettings, setUISettingsState] = useState({
    theme: 'dark' as 'dark' | 'light',
    alwaysOnTop: false,
    minimizeToTray: true,
    autoStart: false,
  })
  const [telemetry, setTelemetryState] = useState({
    enabled: false,
    crashReporting: false,
    performanceData: false,
  })
  const [requiresElevation, setRequiresElevation] = useState(false)
  const { success, error: notifyError } = useNotifications()

  useEffect(() => {
    window.app.config.getAllProfiles().then(setProfiles)
    window.app.config.getActiveProfile().then((p) => setActiveProfileId(p.id))
    window.app.config.getUISettings().then(setUISettingsState)
    window.app.config.getTelemetrySettings().then(setTelemetryState)
    window.app.getStatus().then((status) => setRequiresElevation(status.requiresElevation))
  }, [])

  const handleProfileChange = async (profileId: string) => {
    setActiveProfileId(profileId)
    try {
      const result = await window.app.config.setActiveProfile(profileId)
      success('Profile applied', `${result.appliedKeys.length} setting(s) changed. Previous state backed up.`)
    } catch (err) {
      notifyError('Failed to apply profile', String(err))
    }
  }

  const handleUISettingChange = async (key: string, value: unknown) => {
    const updated = { ...uiSettings, [key]: value }
    setUISettingsState(updated)
    await window.app.config.setUISettings(updated)
  }

  const handleTelemetryChange = async (key: string, value: unknown) => {
    const updated = { ...telemetry, [key]: value }
    setTelemetryState(updated)
    await window.app.config.setTelemetrySettings(updated)
  }

  return (
    <Layout header={<Header />}>
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {requiresElevation && (
            <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4 text-sm text-yellow-100">
              ⚠ Applying network optimizations on this platform requires administrator/root
              privileges. Run Menos Ping elevated for changes to persist.
            </div>
          )}

          {/* Optimization Profiles */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-bold mb-4">Optimization Profiles</h3>

            <div className="space-y-4">
              {profiles.map((profile) => (
                <label
                  key={profile.id}
                  className="flex items-center p-4 bg-gray-700 rounded hover:bg-gray-600 cursor-pointer transition"
                >
                  <input
                    type="radio"
                    name="profile"
                    value={profile.id}
                    checked={activeProfileId === profile.id}
                    onChange={() => handleProfileChange(profile.id)}
                    className="mr-4"
                  />
                  <div className="flex-1">
                    <div className="font-bold">{profile.name}</div>
                    {profile.description && (
                      <div className="text-sm text-gray-400">{profile.description}</div>
                    )}
                  </div>
                  <div
                    className={`px-3 py-1 rounded text-sm ${profile.enabled ? 'bg-green-900 text-green-200' : 'bg-gray-600 text-gray-300'}`}
                  >
                    {profile.enabled ? 'Enabled' : 'Disabled'}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Backup & Restore */}
          <BackupRestoreSection />

          {/* UI Settings */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-bold mb-4">User Interface</h3>

            <div className="space-y-4">
              <SettingToggle
                label="Always on Top"
                description="Keep window above other applications"
                value={uiSettings.alwaysOnTop}
                onChange={(value) => handleUISettingChange('alwaysOnTop', value)}
              />

              <SettingToggle
                label="Minimize to Tray"
                description="Minimize to system tray instead of taskbar"
                value={uiSettings.minimizeToTray}
                onChange={(value) => handleUISettingChange('minimizeToTray', value)}
              />

              <SettingToggle
                label="Start on Boot"
                description="Automatically start Menos Ping on system startup"
                value={uiSettings.autoStart}
                onChange={(value) => handleUISettingChange('autoStart', value)}
              />

              <div>
                <label className="block text-sm font-medium mb-2">Theme</label>
                <select
                  value={uiSettings.theme}
                  onChange={(e) => handleUISettingChange('theme', e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded px-4 py-2 w-full text-white"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </div>
            </div>
          </div>

          {/* Telemetry & Privacy */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-bold mb-2">Telemetry & Privacy</h3>
            <p className="text-sm text-gray-400 mb-4">
              Help us improve Menos Ping by sharing anonymous usage data. None of your personal
              data or game content is collected.
            </p>

            <div className="space-y-4">
              <SettingToggle
                label="Enable Telemetry"
                description="Share anonymous usage statistics"
                value={telemetry.enabled}
                onChange={(value) => handleTelemetryChange('enabled', value)}
              />

              <SettingToggle
                label="Crash Reporting"
                description="Automatically report crashes to help us fix issues"
                value={telemetry.crashReporting}
                onChange={(value) => handleTelemetryChange('crashReporting', value)}
              />

              <SettingToggle
                label="Performance Data"
                description="Share performance metrics (latency, optimization results)"
                value={telemetry.performanceData}
                onChange={(value) => handleTelemetryChange('performanceData', value)}
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

const BackupRestoreSection: React.FC = () => {
  const [backups, setBackups] = useState<BackupMeta[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const { success, error: notifyError, info } = useNotifications()

  const refresh = useCallback(() => {
    window.app.backups.list().then(setBackups)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleCreateBackup = async () => {
    setBusy('create')
    try {
      await window.app.backups.create(`Manual backup - ${new Date().toLocaleString()}`)
      success('Backup created', 'Current network settings were captured.')
      refresh()
    } catch (err) {
      notifyError('Backup failed', String(err))
    } finally {
      setBusy(null)
    }
  }

  const handleRestore = async (id: string, label: string) => {
    setBusy(id)
    try {
      const restored = await window.app.optimization.revert(id)
      if (restored) {
        success('Settings restored', `Reverted to "${label}".`)
      } else {
        notifyError('Restore failed', 'Backup could not be found.')
      }
    } catch (err) {
      notifyError('Restore failed', String(err))
    } finally {
      setBusy(null)
    }
  }

  const handleDelete = async (id: string) => {
    setBusy(id)
    try {
      await window.app.backups.delete(id)
      info('Backup deleted', '')
      refresh()
    } catch (err) {
      notifyError('Delete failed', String(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-bold">Backup & Restore</h3>
        <button
          onClick={handleCreateBackup}
          disabled={busy === 'create'}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-sm font-medium transition"
        >
          {busy === 'create' ? 'Capturing...' : 'Create Backup Now'}
        </button>
      </div>
      <p className="text-sm text-gray-400 mb-4">
        A backup is a real snapshot of your current network settings (TCP buffers, DNS servers,
        window scaling, congestion control, etc). Applying an optimization profile automatically
        creates one first, so you can always revert.
      </p>

      {backups.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No backups yet.</p>
      ) : (
        <div className="space-y-2">
          {backups.map((backup) => (
            <div
              key={backup.id}
              className="flex items-center justify-between p-3 bg-gray-700 rounded"
            >
              <div>
                <div className="font-medium text-sm">{backup.label}</div>
                <div className="text-xs text-gray-400">
                  {new Date(backup.timestamp).toLocaleString()} · {backup.settingCount} setting(s)
                  · {backup.platform}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRestore(backup.id, backup.label)}
                  disabled={busy === backup.id}
                  className="px-3 py-1 bg-green-700 hover:bg-green-600 disabled:bg-gray-600 rounded text-xs font-medium transition"
                >
                  {busy === backup.id ? 'Restoring...' : 'Restore'}
                </button>
                <button
                  onClick={() => handleDelete(backup.id)}
                  disabled={busy === backup.id}
                  className="px-3 py-1 bg-red-900 hover:bg-red-800 disabled:bg-gray-600 rounded text-xs font-medium transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const SettingToggle: React.FC<{
  label: string
  description?: string
  value: boolean
  onChange: (value: boolean) => void
}> = ({ label, description, value, onChange }) => (
  <div className="flex items-center justify-between p-4 bg-gray-700 rounded">
    <div>
      <div className="font-medium">{label}</div>
      {description && <div className="text-sm text-gray-400">{description}</div>}
    </div>
    <button
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 rounded-full transition ${
        value ? 'bg-green-600' : 'bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
          value ? 'translate-x-6' : 'translate-x-1'
        } mt-1`}
      />
    </button>
  </div>
)

const Header: React.FC = () => (
  <div className="px-6 py-4">
    <h2 className="text-2xl font-bold">Settings & Preferences</h2>
  </div>
)

export default Settings
