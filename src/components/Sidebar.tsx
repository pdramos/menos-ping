/**
 * Main navigation sidebar - PEDRO RAMOS emblem, 7-section nav, admin/version
 * footer. Matches the FC26 Optimizer sidebar design.
 */

import React, { useEffect, useState } from 'react'
import { NAV_ITEMS, type PageName } from '@utils/Navigation'

export const Sidebar: React.FC<{
  currentPage: PageName
  onNavigate: (page: PageName) => void
}> = ({ currentPage, onNavigate }) => {
  const [isElevated, setIsElevated] = useState<boolean | null>(null)
  const [version, setVersion] = useState('—')

  useEffect(() => {
    window.app.getStatus().then((status) => setIsElevated(status.isElevated))
    window.app.getVersion().then(setVersion)
  }, [])

  return (
    <nav className="w-[210px] bg-gradient-to-b from-bg-2 to-[#0b111d] border-r border-border flex flex-col p-3.5 gap-1">
      <div className="mb-2.5">
        <div className="flex flex-col items-center py-3.5 px-1.5 border border-border rounded-[14px] bg-[radial-gradient(120px_60px_at_50%_0%,rgba(245,197,66,0.12),transparent)]">
          <span className="text-xs tracking-[6px] text-muted">PEDRO</span>
          <span className="text-[22px] font-black tracking-[4px] bg-gradient-to-r from-gold via-white to-gold bg-clip-text text-transparent">
            RAMOS
          </span>
        </div>
      </div>

      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          className={`flex items-center gap-2.5 bg-transparent border-none px-3 py-2.5 rounded-[9px] text-[13.5px] font-semibold text-left transition ${
            currentPage === item.id
              ? 'bg-gradient-to-r from-accent/[0.16] to-transparent text-white shadow-[inset_3px_0_0_0_#16d67a]'
              : 'text-muted hover:bg-panel hover:text-white'
          }`}
        >
          <span className="text-[15px]">{item.icon}</span> {item.label}
        </button>
      ))}

      <div className="mt-auto flex flex-col gap-1.5">
        <div
          className={`text-[10.5px] px-2 py-1.5 rounded-lg border text-center ${
            isElevated === null
              ? 'bg-panel border-border text-muted'
              : isElevated
                ? 'bg-panel border-accent/35 text-accent'
                : 'bg-panel border-warn/35 text-warn'
          }`}
        >
          {isElevated === null ? 'A verificar privilégios…' : isElevated ? '✓ Administrador' : '⚠ Sem privilégios'}
        </div>
        <div className="text-[10px] text-muted text-center">v{version}</div>
      </div>
    </nav>
  )
}

export default Sidebar
