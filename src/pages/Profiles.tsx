/**
 * Profiles page ("Perfis") - card grid of built-in and custom optimization
 * profiles, each applying real network/DNS/routing settings on click.
 */

import React, { useCallback, useEffect, useState } from 'react'
import useNotifications from '@hooks/useNotifications'
import type { OptimizationProfile } from '@types/index'
import type { PageName } from '@utils/Navigation'

const PROFILE_ICONS: Record<string, string> = {
  default: '⚖️',
  competitive: '🎯',
  streaming: '🚀',
  'custom-quick': '🔧',
}

export const Profiles: React.FC<{ onNavigate?: (page: PageName) => void }> = ({ onNavigate }) => {
  const [profiles, setProfiles] = useState<OptimizationProfile[]>([])
  const [activeId, setActiveId] = useState('')
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const { success, error: notifyError } = useNotifications()

  const refresh = useCallback(() => {
    window.app.config.getAllProfiles().then(setProfiles)
    window.app.config.getActiveProfile().then((p) => setActiveId(p.id))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleApply = async (profile: OptimizationProfile) => {
    setApplyingId(profile.id)
    try {
      const result = await window.app.config.setActiveProfile(profile.id)
      success('Perfil aplicado', `${result.appliedKeys.length} ajuste(s) aplicados. Backup criado automaticamente.`)
      refresh()
    } catch (err) {
      notifyError('Falha ao aplicar perfil', String(err))
    } finally {
      setApplyingId(null)
    }
  }

  return (
    <section className="animate-view-fade">
      <div className="mb-[18px]">
        <h1 className="text-[22px] tracking-wide">Perfis de Otimização</h1>
      </div>

      <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className={`bg-panel border rounded-2xl p-[18px] flex flex-col gap-2.5 transition hover:-translate-y-0.5 ${
              activeId === profile.id ? 'border-accent/40' : 'border-border hover:border-accent/40'
            }`}
          >
            <div className="text-[30px]">{PROFILE_ICONS[profile.id] || '🔧'}</div>
            <div className="text-base font-extrabold flex items-center gap-2">
              {profile.name}
              {activeId === profile.id && (
                <span className="text-[9.5px] font-extrabold px-[7px] py-0.5 rounded-full uppercase tracking-wide bg-accent/[0.18] text-accent">
                  ativo
                </span>
              )}
            </div>
            <p className="text-[12.5px] text-muted leading-relaxed flex-1">{profile.description}</p>
            <button
              onClick={() => handleApply(profile)}
              disabled={applyingId !== null}
              className="px-4 py-2 rounded-[10px] text-[13px] font-bold bg-gradient-to-br from-accent to-accent-2 text-[#04120a] disabled:opacity-50 transition"
            >
              {applyingId === profile.id ? 'A aplicar…' : 'Aplicar'}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-panel border border-border rounded-2xl p-[18px]">
        <h3 className="text-[15px] mb-2">⭐ Criar perfil personalizado</h3>
        <p className="text-muted text-[13px]">
          Vai a <b className="text-white">Otimizações</b>, seleciona os ajustes que queres e
          clica em "Aplicar selecionadas" - o perfil resultante aparece aqui automaticamente.
        </p>
        <button
          onClick={() => onNavigate?.('optimizations')}
          className="mt-3 px-4 py-2 rounded-[10px] text-[13px] font-bold border border-border bg-transparent hover:brightness-125 transition"
        >
          Ir para Otimizações
        </button>
      </div>
    </section>
  )
}

export default Profiles
