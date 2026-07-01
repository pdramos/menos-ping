/**
 * Settings page - Configuration and preferences
 */

import React, { useState, useEffect } from 'react'
import Layout from '@components/Layout'
import { getApplication } from '@main/Application'
import type { OptimizationProfile } from '@types/index'

export const Settings: React.FC = () => {
  const [profiles, setProfiles] = useState<OptimizationProfile[]>([])
  const [activeProfileId, setActiveProfileId] = useState<string>('')
  const [uiSettings, setUISettings] = useState({
    theme: 'dark' as const,
    alwaysOnTop: false,
    minimizeToTray: true,
    autoStart: false,
  })
  const [telemetry, setTelemetry] = useState({
    enabled: false,
    crashReporting: false,
    performanceData: false,
  })

  useEffect(() => {
    const app = getApplication()
    const config = app.getConfigManager()

    setProfiles(config.getAllProfiles())
    setActiveProfileId(config.getActiveProfile().id)
    setUISettings(config.getUISettings())
    setTelemetry(config.getTelemetrySettings())
  }, [])

  const handleProfileChange = (profileId: string) => {
    const app = getApplication()
    app.getConfigManager().setActiveProfile(profileId)
    setActiveProfileId(profileId)
  }

  const handleUISettingChange = (key: string, value: unknown) => {
    const app = getApplication()
    setUISettings((prev) => {
      const updated = { ...prev, [key]: value }
      app.getConfigManager().setUISettings(updated)
      return updated
    })
  }

  const handleTelemetryChange = (key: string, value: unknown) => {
    const app = getApplication()
    setTelemetry((prev) => {
      const updated = { ...prev, [key]: value }
      app.getConfigManager().setTelemetrySettings(updated)
      return updated
    })
  }

  return (
    <Layout
      sidebar={<Sidebar />}
      header={<Header />}
    >
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
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
                  <div className={`px-3 py-1 rounded text-sm ${profile.enabled ? 'bg-green-900 text-green-200' : 'bg-gray-600 text-gray-300'}`}>
                    {profile.enabled ? 'Enabled' : 'Disabled'}
                  </div>
                </label>
              ))}
            </div>
          </div>

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
              Help us improve Menos Ping by sharing anonymous usage data. None of your personal data or game content is collected.
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

          {/* Advanced Settings */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-bold mb-4">Advanced Settings</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Network Monitor Interval (ms)</label>
                <input
                  type="number"
                  defaultValue="1000"
                  min="100"
                  max="10000"
                  step="100"
                  className="bg-gray-700 border border-gray-600 rounded px-4 py-2 w-full text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Game Detection Interval (ms)</label>
                <input
                  type="number"
                  defaultValue="1000"
                  min="100"
                  max="5000"
                  step="100"
                  className="bg-gray-700 border border-gray-600 rounded px-4 py-2 w-full text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Maximum Memory Usage (MB)</label>
                <input
                  type="number"
                  defaultValue="100"
                  min="50"
                  max="500"
                  step="10"
                  className="bg-gray-700 border border-gray-600 rounded px-4 py-2 w-full text-white"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium transition">
              Save Settings
            </button>
            <button className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded font-medium transition">
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </Layout>
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

const Sidebar: React.FC = () => (
  <div className="p-4 flex flex-col h-full">
    <h2 className="text-lg font-bold mb-4">Settings</h2>

    <nav className="space-y-2 flex-1">
      {['Dashboard', 'Monitor', 'Settings', 'Tools'].map((item) => (
        <button
          key={item}
          className={`w-full text-left px-4 py-2 rounded transition ${
            item === 'Settings'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          {item}
        </button>
      ))}
    </nav>
  </div>
)

const Header: React.FC = () => (
  <div className="px-6 py-4">
    <h2 className="text-2xl font-bold">Settings & Preferences</h2>
  </div>
)

export default Settings
