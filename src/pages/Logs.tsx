/**
 * Logs page ("Logs") - real application log entries (buffered in the main
 * process, written to disk by Logger.ts), plus a shortcut to open the real
 * logs folder on disk.
 */

import React, { useEffect, useState } from 'react'
import type { LogEntry } from '@types/index'

const LEVEL_CLASSES: Record<LogEntry['level'], string> = {
  debug: 'text-muted',
  info: 'text-info',
  warn: 'text-warn',
  error: 'text-danger',
}

export const Logs: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [cleared, setCleared] = useState(false)

  useEffect(() => {
    let cancelled = false
    const refresh = () => {
      window.app.logs.getRecent(500).then((entries) => {
        if (!cancelled) setLogs(entries)
      })
    }
    refresh()
    const interval = setInterval(refresh, 3000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const visible = cleared ? [] : logs

  return (
    <section className="animate-view-fade">
      <div className="flex items-center justify-between mb-[18px] gap-3 flex-wrap">
        <h1 className="text-[22px] tracking-wide">Registos</h1>
        <div className="flex gap-2">
          <button
            onClick={() => window.app.logs.openFolder()}
            className="px-[15px] py-2.5 rounded-[10px] text-[13px] font-bold border border-border bg-transparent hover:brightness-125 transition"
          >
            Abrir pasta
          </button>
          <button
            onClick={() => setCleared(true)}
            className="px-[15px] py-2.5 rounded-[10px] text-[13px] font-bold border border-border bg-transparent hover:brightness-125 transition"
          >
            Limpar vista
          </button>
        </div>
      </div>

      <div className="bg-[#070b12] border border-border rounded-2xl p-3.5 h-[calc(100vh-200px)] overflow-y-auto font-mono text-xs">
        {visible.length === 0 ? (
          <p className="text-muted italic">Sem registos para mostrar.</p>
        ) : (
          visible.map((entry, i) => (
            <div key={i} className="py-0.5 whitespace-pre-wrap break-words">
              <span className="text-[#5a6b86]">{new Date(entry.timestamp).toLocaleTimeString()}</span>{' '}
              <span className={`font-bold ${LEVEL_CLASSES[entry.level]}`}>[{entry.level.toUpperCase()}]</span>{' '}
              <span className="text-muted">[{entry.module}]</span> {entry.message}
              {entry.data !== undefined ? ` ${JSON.stringify(entry.data)}` : ''}
            </div>
          ))
        )}
      </div>
    </section>
  )
}

export default Logs
