/**
 * Backups page ("Backups") - real snapshots of network settings captured
 * before every optimization apply, restorable with one click.
 */

import React, { useCallback, useEffect, useState } from 'react'
import useNotifications from '@hooks/useNotifications'
import type { BackupMeta } from '@services/BackupManager'

export const Backups: React.FC = () => {
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
      await window.app.backups.create(`Ponto manual - ${new Date().toLocaleString()}`)
      success('Backup criado', 'As definições de rede atuais foram capturadas.')
      refresh()
    } catch (err) {
      notifyError('Falha ao criar backup', String(err))
    } finally {
      setBusy(null)
    }
  }

  const handleRestore = async (id: string, label: string) => {
    setBusy(id)
    try {
      const restored = await window.app.optimization.revert(id)
      if (restored) {
        success('Definições restauradas', `Revertido para "${label}".`)
      } else {
        notifyError('Falha ao restaurar', 'Backup não encontrado.')
      }
    } catch (err) {
      notifyError('Falha ao restaurar', String(err))
    } finally {
      setBusy(null)
    }
  }

  const handleDelete = async (id: string) => {
    setBusy(id)
    try {
      await window.app.backups.delete(id)
      info('Backup eliminado', '')
      refresh()
    } catch (err) {
      notifyError('Falha ao eliminar', String(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="animate-view-fade">
      <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
        <h1 className="text-[22px] tracking-wide">Backups & Restauro</h1>
        <button
          onClick={handleCreateBackup}
          disabled={busy === 'create'}
          className="px-4 py-2.5 rounded-[10px] text-[13px] font-bold bg-gradient-to-br from-accent to-accent-2 text-[#04120a] disabled:opacity-50 transition"
        >
          {busy === 'create' ? 'A capturar…' : '➕ Criar ponto de restauro'}
        </button>
      </div>
      <p className="text-muted text-[13.5px] mb-3.5">
        Cada otimização é guardada com o valor original (buffers TCP, servidores DNS, window
        scaling, controlo de congestão, etc). Podes restaurar tudo com um clique a qualquer
        momento.
      </p>

      {backups.length === 0 ? (
        <p className="text-sm text-muted italic">Ainda não há backups.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {backups.map((backup) => (
            <div
              key={backup.id}
              className="flex items-center gap-3.5 bg-panel border border-border rounded-[9px] p-3.5"
            >
              <div className="text-[22px]">💾</div>
              <div className="flex-1">
                <div className="font-bold text-sm">{backup.label}</div>
                <div className="text-xs text-muted">
                  {new Date(backup.timestamp).toLocaleString()} · {backup.settingCount} definição(ões)
                  · {backup.platform}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRestore(backup.id, backup.label)}
                  disabled={busy === backup.id}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-br from-accent to-accent-2 text-[#04120a] disabled:opacity-50 transition"
                >
                  {busy === backup.id ? 'A restaurar…' : 'Restaurar'}
                </button>
                <button
                  onClick={() => handleDelete(backup.id)}
                  disabled={busy === backup.id}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-danger/40 text-danger bg-transparent hover:bg-danger/10 disabled:opacity-50 transition"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default Backups
