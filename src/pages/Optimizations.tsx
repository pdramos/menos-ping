/**
 * Optimizations page ("Otimizações") - individual real network/DNS/routing
 * settings as toggleable switches. Selecting a set and applying builds one
 * ad-hoc OptimizationProfile and pushes it through the real optimization
 * engine (registry/sysctl writes), same as any built-in profile.
 */

import React, { useEffect, useMemo, useState } from 'react'
import Switch from '@components/ui/Switch'
import Tag, { type TagVariant } from '@components/ui/Tag'
import useNotifications from '@hooks/useNotifications'
import {
  DEFAULT_NETWORK_OPTIMIZATION,
  DEFAULT_DNS_OPTIMIZATION,
  DEFAULT_ROUTING_OPTIMIZATION,
} from '@config/default'
import type { OptimizationProfile } from '@types/index'

interface OptItem {
  id: string
  group: 'network' | 'dns' | 'routing'
  label: string
  description: string
  impact: TagVariant
}

const ITEMS: OptItem[] = [
  {
    id: 'tcp_nodelay',
    group: 'network',
    label: 'TCP_NODELAY (desativa Nagle)',
    description: 'Envia pacotes pequenos imediatamente em vez de os agrupar - reduz a latência por pacote.',
    impact: 'high',
  },
  {
    id: 'enable_congestion_control',
    group: 'network',
    label: 'Controlo de Congestão BBR',
    description: 'Usa o algoritmo BBR para reagir melhor a picos de latência sem sacrificar débito.',
    impact: 'high',
  },
  {
    id: 'window_scaling',
    group: 'network',
    label: 'TCP Window Scaling',
    description: 'Permite janelas TCP maiores que 64KB, melhorando o débito em ligações rápidas.',
    impact: 'medium',
  },
  {
    id: 'selective_ack',
    group: 'network',
    label: 'Selective ACK (SACK)',
    description: 'Permite retransmitir apenas os pacotes perdidos em vez de tudo o resto.',
    impact: 'medium',
  },
  {
    id: 'enable_caching',
    group: 'dns',
    label: 'Cache de DNS',
    description: 'Guarda respostas DNS localmente para evitar resoluções repetidas.',
    impact: 'medium',
  },
  {
    id: 'enable_dns_over_https',
    group: 'dns',
    label: 'DNS sobre HTTPS',
    description: 'Encripta as consultas DNS, evitando bloqueios/injeção por parte do ISP.',
    impact: 'medium',
  },
  {
    id: 'failover_enabled',
    group: 'dns',
    label: 'Failover automático de DNS',
    description: 'Muda automaticamente para o servidor DNS seguinte se o principal falhar.',
    impact: 'medium',
  },
  {
    id: 'validate_responses',
    group: 'dns',
    label: 'Validar respostas DNS',
    description: 'Rejeita respostas DNS malformadas ou suspeitas antes de as usar.',
    impact: 'low',
  },
  {
    id: 'enable_auto_optimization',
    group: 'routing',
    label: 'Otimização automática de rota',
    description: 'Analisa traceroutes reais periodicamente para detetar rotas com problemas.',
    impact: 'high',
  },
  {
    id: 'use_best_route',
    group: 'routing',
    label: 'Usar melhor rota disponível',
    description: 'Prefere a rota com menor latência entre as candidatas detetadas.',
    impact: 'medium',
  },
  {
    id: 'enable_connection_pooling',
    group: 'routing',
    label: 'Pooling de ligações',
    description: 'Reutiliza ligações existentes em vez de abrir novas para o mesmo destino.',
    impact: 'low',
  },
  {
    id: 'analyze_isp_peering',
    group: 'routing',
    label: 'Analisar peering do ISP',
    description: 'Verifica publicamente (ASN/peering) se o teu ISP tem boas ligações às redes de jogos.',
    impact: 'low',
  },
]

const GROUP_LABELS: Record<OptItem['group'], string> = {
  network: '🌐 Rede (TCP)',
  dns: '🧭 DNS',
  routing: '🛰️ Routing',
}

function draftFromProfile(profile: OptimizationProfile | null): Record<string, boolean> {
  const draft: Record<string, boolean> = {}
  for (const item of ITEMS) {
    if (item.group === 'network') {
      draft[item.id] = Boolean((profile?.network_settings as any)?.[item.id])
    } else if (item.group === 'dns') {
      draft[item.id] = Boolean((profile?.dns_settings as any)?.[item.id])
    } else {
      draft[item.id] = Boolean((profile?.routing_settings as any)?.[item.id])
    }
  }
  return draft
}

export const Optimizations: React.FC = () => {
  const [activeProfile, setActiveProfile] = useState<OptimizationProfile | null>(null)
  const [draft, setDraft] = useState<Record<string, boolean>>({})
  const [applying, setApplying] = useState(false)
  const { success, error: notifyError } = useNotifications()

  useEffect(() => {
    window.app.config.getActiveProfile().then((profile) => {
      setActiveProfile(profile)
      setDraft(draftFromProfile(profile))
    })
  }, [])

  const groups = useMemo(() => {
    const byGroup: Record<OptItem['group'], OptItem[]> = { network: [], dns: [], routing: [] }
    for (const item of ITEMS) byGroup[item.group].push(item)
    return byGroup
  }, [])

  const selectedCount = Object.values(draft).filter(Boolean).length

  const handleSelectRecommended = () => {
    const recommended: Record<string, boolean> = {}
    for (const item of ITEMS) recommended[item.id] = true
    setDraft(recommended)
  }

  const handleClear = () => {
    const cleared: Record<string, boolean> = {}
    for (const item of ITEMS) cleared[item.id] = false
    setDraft(cleared)
  }

  const handleApply = async () => {
    setApplying(true)
    try {
      const profile: OptimizationProfile = {
        id: 'custom-quick',
        name: 'Otimização Rápida',
        description: 'Perfil construído a partir das otimizações selecionadas manualmente',
        enabled: true,
        network_settings: {
          ...DEFAULT_NETWORK_OPTIMIZATION,
          tcp_nodelay: draft.tcp_nodelay,
          window_scaling: draft.window_scaling,
          selective_ack: draft.selective_ack,
          enable_congestion_control: draft.enable_congestion_control,
        },
        dns_settings: {
          ...DEFAULT_DNS_OPTIMIZATION,
          enable_caching: draft.enable_caching,
          enable_dns_over_https: draft.enable_dns_over_https,
          validate_responses: draft.validate_responses,
          failover_enabled: draft.failover_enabled,
        },
        routing_settings: {
          ...DEFAULT_ROUTING_OPTIMIZATION,
          enable_auto_optimization: draft.enable_auto_optimization,
          use_best_route: draft.use_best_route,
          analyze_isp_peering: draft.analyze_isp_peering,
          enable_connection_pooling: draft.enable_connection_pooling,
        },
        apply_to_all_games: true,
        target_games: [],
      }

      const result = await window.app.config.applyCustomProfile(profile)
      success('Otimizações aplicadas', `${result.appliedKeys.length} ajuste(s) aplicados. Backup criado automaticamente.`)
      setActiveProfile(profile)
    } catch (err) {
      notifyError('Falha ao aplicar', String(err))
    } finally {
      setApplying(false)
    }
  }

  return (
    <section className="animate-view-fade">
      <div className="flex items-center justify-between mb-[18px] gap-3 flex-wrap">
        <h1 className="text-[22px] tracking-wide">Otimizações</h1>
        <div className="flex gap-2">
          <button
            onClick={handleSelectRecommended}
            className="px-[15px] py-2.5 rounded-[10px] text-[13px] font-bold border border-border bg-transparent hover:brightness-125 transition"
          >
            Selecionar recomendadas
          </button>
          <button
            onClick={handleClear}
            className="px-[15px] py-2.5 rounded-[10px] text-[13px] font-bold border border-border bg-transparent hover:brightness-125 transition"
          >
            Limpar
          </button>
          <button
            onClick={handleApply}
            disabled={applying}
            className="px-[15px] py-2.5 rounded-[10px] text-[13px] font-bold bg-gradient-to-br from-accent to-accent-2 text-[#04120a] disabled:opacity-50 transition"
          >
            {applying ? 'A aplicar…' : `Aplicar selecionadas (${selectedCount})`}
          </button>
        </div>
      </div>

      {(['network', 'dns', 'routing'] as const).map((group) => (
        <div key={group} className="mb-[22px]">
          <div className="flex items-center gap-2.5 mb-2.5">
            <h3 className="text-[15px]">{GROUP_LABELS[group]}</h3>
            <span className="text-[11px] text-muted bg-panel border border-border px-2 py-0.5 rounded-full">
              {groups[group].filter((i) => draft[i.id]).length}/{groups[group].length}
            </span>
          </div>
          <div className="space-y-2">
            {groups[group].map((item) => {
              const isLiveInActiveProfile =
                activeProfile !== null && draftFromProfile(activeProfile)[item.id] === draft[item.id]
              return (
                <div
                  key={item.id}
                  className={`flex items-start gap-3.5 rounded-[9px] p-3.5 border transition ${
                    draft[item.id] ? 'border-accent/40 bg-gradient-to-r from-accent/[0.06] to-panel' : 'bg-panel border-border'
                  }`}
                >
                  <div className="flex-1">
                    <div className="text-sm font-bold flex items-center gap-2 flex-wrap">
                      {item.label}
                      <Tag variant={item.impact}>{item.impact}</Tag>
                      {draft[item.id] && isLiveInActiveProfile && <Tag variant="applied">aplicado</Tag>}
                    </div>
                    <div className="text-xs text-muted mt-1 leading-relaxed">{item.description}</div>
                  </div>
                  <Switch
                    checked={Boolean(draft[item.id])}
                    onChange={(checked) => setDraft((prev) => ({ ...prev, [item.id]: checked }))}
                  />
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </section>
  )
}

export default Optimizations
