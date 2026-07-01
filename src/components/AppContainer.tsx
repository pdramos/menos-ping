/**
 * Main app container with navigation
 */

import React, { useState } from 'react'
import Dashboard from '@pages/Dashboard'
import Monitor from '@pages/Monitor'
import Settings from '@pages/Settings'
import Tools from '@pages/Tools'
import type { PageName } from '@utils/Navigation'

const pages = {
  dashboard: Dashboard,
  monitor: Monitor,
  settings: Settings,
  tools: Tools,
}

const pageLabels: Record<PageName, string> = {
  dashboard: 'Dashboard',
  monitor: 'Monitor',
  settings: 'Settings',
  tools: 'Tools',
}

export const AppContainer: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageName>('dashboard')

  const CurrentPage = pages[currentPage]

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar Navigation */}
      <div className="w-64 border-r border-gray-700 bg-gray-800 flex flex-col">
        <div className="p-4 mb-8 border-b border-gray-700">
          <h1 className="text-xl font-bold text-white">Menos Ping</h1>
          <p className="text-xs text-gray-500">v0.1.0</p>
        </div>

        <nav className="space-y-2 px-4 flex-1">
          {Object.entries(pageLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setCurrentPage(key as PageName)}
              className={`w-full text-left px-4 py-2 rounded transition ${
                currentPage === key
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="border-t border-gray-700 p-4 space-y-2">
          <button className="w-full text-left px-4 py-2 rounded text-sm text-gray-400 hover:bg-gray-700 hover:text-white transition">
            Help
          </button>
          <button className="w-full text-left px-4 py-2 rounded text-sm text-gray-400 hover:bg-gray-700 hover:text-white transition">
            About
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <CurrentPage />
      </div>
    </div>
  )
}

export default AppContainer
