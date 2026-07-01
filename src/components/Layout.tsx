/**
 * Main application layout component
 */

import React from 'react'

interface LayoutProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
  header?: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children, sidebar, header }) => {
  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      {sidebar && <div className="w-64 border-r border-gray-700 bg-gray-800">{sidebar}</div>}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        {header && <div className="border-b border-gray-700 bg-gray-800">{header}</div>}

        {/* Content */}
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  )
}

export default Layout
