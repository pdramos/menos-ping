/**
 * Navigation utilities and router
 */

import React, { useState } from 'react'
import Dashboard from '@pages/Dashboard'
import Monitor from '@pages/Monitor'
import Settings from '@pages/Settings'
import Tools from '@pages/Tools'

export type PageName = 'dashboard' | 'monitor' | 'settings' | 'tools'

interface PageConfig {
  name: PageName
  label: string
  component: React.ComponentType
}

export const pages: PageConfig[] = [
  { name: 'dashboard', label: 'Dashboard', component: Dashboard },
  { name: 'monitor', label: 'Monitor', component: Monitor },
  { name: 'settings', label: 'Settings', component: Settings },
  { name: 'tools', label: 'Tools', component: Tools },
]

export const NavigationContext = React.createContext<{
  currentPage: PageName
  navigateTo: (page: PageName) => void
}>({
  currentPage: 'dashboard',
  navigateTo: () => {},
})

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState<PageName>('dashboard')

  return (
    <NavigationContext.Provider value={{ currentPage, navigateTo: setCurrentPage }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  return React.useContext(NavigationContext)
}

export function getCurrentPageComponent(page: PageName) {
  const pageConfig = pages.find((p) => p.name === page)
  return pageConfig?.component || Dashboard
}

export default NavigationContext
