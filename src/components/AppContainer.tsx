/**
 * Main app container: custom title bar + sidebar navigation + current page.
 */

import React, { useState } from 'react'
import TitleBar from '@components/TitleBar'
import Sidebar from '@components/Sidebar'
import NotificationCenter from '@components/NotificationCenter'
import Analysis from '@pages/Analysis'
import Optimizations from '@pages/Optimizations'
import Profiles from '@pages/Profiles'
import Backups from '@pages/Backups'
import Manual from '@pages/Manual'
import Logs from '@pages/Logs'
import About from '@pages/About'
import type { PageName } from '@utils/Navigation'

const PAGES: Record<PageName, React.ComponentType<{ onNavigate?: (page: PageName) => void }>> = {
  analysis: Analysis,
  optimizations: Optimizations,
  profiles: Profiles,
  backups: Backups,
  manual: Manual,
  logs: Logs,
  about: About,
}

export const AppContainer: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageName>('analysis')
  const CurrentPage = PAGES[currentPage]

  return (
    <div className="flex flex-col h-screen w-screen bg-bg text-white overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
        <main className="flex-1 overflow-y-auto px-6 py-5 pb-10 relative">
          <CurrentPage onNavigate={setCurrentPage} />
        </main>
      </div>
      <NotificationCenter />
    </div>
  )
}

export default AppContainer
