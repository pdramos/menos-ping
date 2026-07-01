/**
 * Custom frameless title bar - replaces the native Windows chrome so the
 * whole app matches the FC26 Optimizer look (drag region, brand mark, safety
 * badge, and its own minimize/maximize/close buttons wired to real IPC
 * window controls).
 */

import React, { useEffect, useState } from 'react'

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    if (!window.app?.windowControls) return
    window.app.windowControls.isMaximized().then(setIsMaximized)
    return window.app.windowControls.onMaximizeChanged(setIsMaximized)
  }, [])

  return (
    <header className="h-[46px] flex items-center bg-gradient-to-r from-[#0b1120] to-[#0e1728] border-b border-border pl-3 app-region-drag">
      <div className="flex items-center gap-2.5 app-region-no-drag">
        <div className="w-[30px] h-[30px] rounded-lg bg-gradient-to-br from-gold to-gold-2 text-[#1a1300] font-black grid place-items-center text-[13px] tracking-wide shadow-[0_0_14px_rgba(245,197,66,0.35)]">
          MP
        </div>
        <div className="flex flex-col leading-tight">
          <strong className="text-[13px] tracking-wider">MENOS PING</strong>
          <span className="text-[10px] text-muted">
            by <b className="text-gold tracking-wide">PEDRO RAMOS</b>
          </span>
        </div>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wide bg-accent/10 text-accent border border-accent/35"
          title="Sem risco de ban"
        >
          🛡️ 0% BAN
        </span>
      </div>

      <div className="flex-1 h-full app-region-drag" />

      <div className="flex h-full app-region-no-drag">
        <button
          className="w-[46px] h-[46px] bg-transparent border-none text-muted text-sm hover:bg-white/[0.06] hover:text-white transition"
          title="Minimizar"
          onClick={() => window.app.windowControls?.minimize()}
        >
          &#8211;
        </button>
        <button
          className="w-[46px] h-[46px] bg-transparent border-none text-muted text-sm hover:bg-white/[0.06] hover:text-white transition"
          title="Maximizar"
          onClick={() => window.app.windowControls?.maximizeToggle().then(setIsMaximized)}
        >
          {isMaximized ? '❒' : '□'}
        </button>
        <button
          className="w-[46px] h-[46px] bg-transparent border-none text-muted text-sm hover:bg-danger hover:text-white transition"
          title="Fechar"
          onClick={() => window.app.windowControls?.close()}
        >
          &#10005;
        </button>
      </div>
    </header>
  )
}

export default TitleBar
