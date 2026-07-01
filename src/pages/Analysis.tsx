/**
 * Analysis page ("Análise") - real-time connection quality, detailed
 * metrics, active games and route diagnostics. Merges the former
 * Dashboard + Monitor pages into the FC26-Optimizer-style single view.
 */

import React, { useState, useEffect, useCallback } from 'react'
import MetricCard from '@components/MetricCard'
import LatencyChart from '@components/LatencyChart'
import DiagnosticTools from '@components/DiagnosticTools'
import useNetworkStatus from '@hooks/useNetworkStatus'
import useDetectedGames from '@hooks/useDetectedGames'
import useNotifications from '@hooks/useNotifications'
import type { OptimizationProfile } from '@types/index'
import type { BackupMeta } from '@services/BackupManager'

function computeTrend(history: number[]): 'up' | 'down' | 'stable' {
  if (history.length < 4) return 'stable'
  const mid = Math.floor(history.length / 2)
  const firstHalfAvg = history.slice(0, mid).reduce((a, b) => a + b, 0) / mid
  const secondHalfAvg = history.slice(mid).reduce((a, b) => a + b, 0) / (history.length - mid)
  const delta = secondHalfAvg - firstHalfAvg
  if (Math.abs(delta) < firstHalfAvg * 0.05) return 'stable'
  return delta > 0 ? 'up' : 'down'
}

export const Analysis: React.FC = () => {
  const { quality } = useNetworkStatus()
  const detectedGames = useDetectedGames()
  const { success, error: notifyError } = useNotifications()

  const [analyzed, setAnalyzed] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [latencyHistory, setLatencyHistory] = useState<number[]>([])
  const [latencyTrend, setLatencyTrend] = useState<'up' | 'down' | 'stable'>('stable')
  const [activeProfile, setActiveProfile] = useState<OptimizationProfile | null>(null)
  const [backups, setBackups] = useState<BackupMeta[]>([])
  const [busy, setBusy] = useState<'apply' | 'revert' | null>(null)

  useEffect(() => {
    let cancelled = false
    const refresh = () => {
      window.app.network.getLatencyHistory(300).then((history) => {
        if (!cancelled) {
          setLatencyHistory(history)
          setLatencyTrend(computeTrend(history.slice(-20)))
        }
      })
    }
    refresh()
    const interval = setInterval(refresh, 1000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const refreshProfileAndBackups = useCallback(() => {
    window.app.config.getActiveProfile().then(setActiveProfile)
    window.app.backups.list().then(setBackups)
  }, [])

  useEffect(() => {
    refreshProfileAndBackups()
  }, [refreshProfileAndBackups])

  const handleAnalyze = async () => {
    setAnalyzing(true)
    await window.app.network.getQuality()
    await window.app.network.getLatencyHistory(300).then(setLatencyHistory)
    refreshProfileAndBackups()
    setAnalyzing(false)
    setAnalyzed(true)
  }

  const handleQuickApply = async () => {
    if (!activeProfile) return
    setBusy('apply')
    try {
      await window.app.optimization.apply(activeProfile.id)
      success('Otimização aplicada', `Perfil "${activeProfile.name}" reaplicado com sucesso.`)
      refreshProfileAndBackups()
    } catch (err) {
      notifyError('Falha ao otimizar', String(err))
    } finally {
      setBusy(null)
    }
  }

  const handleQuickRevert = async () => {
    setBusy('revert')
    try {
      const reverted = await window.app.optimization.revert()
      if (reverted) {
        success('Configurações revertidas', 'O último backup foi restaurado.')
      } else {
        notifyError('Nada para reverter', 'Nenhum backup disponível.')
      }
      refreshProfileAndBackups()
    } catch (err) {
      notifyError('Falha ao reverter', String(err))
    } finally {
      setBusy(null)
    }
  }

  const statusColor =
    quality?.status === 'excellent'
      ? 'text-accent'
      : quality?.status === 'good'
        ? 'text-emerald-400'
        : quality?.status === 'fair'
          ? 'text-gold'
          : quality?.status === 'poor'
            ? 'text-warn'
            : 'text-danger'

  return (
    <section className="animate-view-fade">
      <div className="flex items-center justify-between mb-[18px] gap-3 flex-wrap">
        <h1 className="text-[22px] tracking-wide">Análise do Sistema</h1>
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="px-[22px] py-3 rounded-[10px] text-sm font-bold transition bg-gradient-to-br from-accent to-accent-2 text-[#04120a] shadow-[0_6px_18px_rgba(22,214,122,0.25)] disabled:opacity-50"
        >
          {analyzing ? 'A analisar…' : '🔍 Analisar Agora'}
        </button>
      </div>

      {!analyzed ? (
        <div className="bg-panel border border-border rounded-2xl text-center py-[46px] px-[30px]">
          <div className="text-[54px] mb-2">📡</div>
          <h3 className="text-[19px] mb-2.5">Pronto para analisar a tua conexão</h3>
          <p className="text-muted max-w-[560px] mx-auto my-1.5 text-[13.5px] leading-relaxed">
            Clica em <b className="text-white">Analisar Agora</b> para obter as métricas de rede
            em tempo real e verificar quais otimizações estão ativas.
          </p>
          <p className="text-muted max-w-[560px] mx-auto my-1.5 text-[13.5px] leading-relaxed">
            Todas as otimizações são reversíveis e{' '}
            <b className="text-white">não têm qualquer risco de ban</b> — apenas ajustes oficiais
            de rede do sistema operativo.
          </p>
        </div>
      ) : (
        <div className="space-y-[18px]">
          {/* Connection Quality hero */}
          <div className="bg-panel-2 border border-border rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-2">Estado da Conexão</h2>
            <p className="text-muted mb-4">
              A tua conexão está <span className={`font-bold capitalize ${statusColor}`}>{quality?.status || 'desconhecida'}</span>
            </p>
            <div className="flex items-center gap-4">
              <div className={`text-5xl font-bold ${statusColor}`}>{quality?.score || 0}</div>
              <div className="text-muted">
                <p className="text-sm">Pontuação de Qualidade</p>
                <p className="text-xs">De 100</p>
              </div>
            </div>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Latência"
              value={Math.round(quality?.latency.average || 0)}
              unit="ms"
              status={
                (quality?.latency.average || 0) < 50
                  ? 'excellent'
                  : (quality?.latency.average || 0) < 100
                    ? 'good'
                    : (quality?.latency.average || 0) < 150
                      ? 'fair'
                      : (quality?.latency.average || 0) < 250
                        ? 'poor'
                        : 'critical'
              }
              trend={latencyTrend}
            />
            <MetricCard
              title="Jitter"
              value={Math.round((quality?.jitter.value || 0) * 10) / 10}
              unit="ms"
              status={(quality?.jitter.value || 0) < 10 ? 'excellent' : (quality?.jitter.value || 0) < 20 ? 'good' : 'poor'}
            />
            <MetricCard
              title="Perda de Pacotes"
              value={Math.round((quality?.packet_loss.percentage || 0) * 100) / 100}
              unit="%"
              status={
                (quality?.packet_loss.percentage || 0) < 0.1
                  ? 'excellent'
                  : (quality?.packet_loss.percentage || 0) < 0.5
                    ? 'good'
                    : (quality?.packet_loss.percentage || 0) < 1
                      ? 'fair'
                      : 'critical'
              }
            />
            <MetricCard
              title="Jogos Ativos"
              value={detectedGames.length}
              status={detectedGames.length > 0 ? 'good' : 'fair'}
            />
          </div>

          <LatencyChart data={latencyHistory} width={800} height={200} maxLatency={300} />

          {/* Jitter and Packet Loss detail */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-panel rounded-2xl p-6 border border-border">
              <h3 className="text-[15px] font-bold mb-3.5">Análise de Jitter</h3>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-2 text-[13px]">
                <dt className="text-muted">Valor Atual:</dt>
                <dd className="text-right font-semibold">{Math.round((quality?.jitter.value || 0) * 10) / 10}ms</dd>
                <dt className="text-muted">Tendência:</dt>
                <dd className="text-right font-semibold capitalize">{quality?.jitter.trend || 'estável'}</dd>
                <dt className="text-muted">Acima do Limite:</dt>
                <dd className={`text-right font-semibold ${quality?.jitter.threshold_exceeded ? 'text-danger' : 'text-accent'}`}>
                  {quality?.jitter.threshold_exceeded ? 'Sim' : 'Não'}
                </dd>
              </dl>
            </div>

            <div className="bg-panel rounded-2xl p-6 border border-border">
              <h3 className="text-[15px] font-bold mb-3.5">Análise de Perda de Pacotes</h3>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-2 text-[13px]">
                <dt className="text-muted">Taxa de Perda:</dt>
                <dd className="text-right font-semibold">{Math.round((quality?.packet_loss.percentage || 0) * 100) / 100}%</dd>
                <dt className="text-muted">Pacotes Enviados:</dt>
                <dd className="text-right font-semibold">{quality?.packet_loss.packets_sent || 0}</dd>
                <dt className="text-muted">Pacotes Perdidos:</dt>
                <dd className="text-right font-semibold">{quality?.packet_loss.packets_lost || 0}</dd>
                <dt className="text-muted">Perdas Consecutivas:</dt>
                <dd className="text-right font-semibold">{quality?.packet_loss.consecutive_losses || 0}</dd>
              </dl>
            </div>
          </div>

          {/* Active games */}
          {detectedGames.length > 0 && (
            <div className="bg-panel rounded-2xl p-6 border border-border">
              <h3 className="text-[15px] font-bold mb-3.5">Jogos Ativos</h3>
              <div className="space-y-2">
                {detectedGames.map((game) => (
                  <div key={game.pid} className="flex items-center justify-between p-3 bg-panel-2 rounded-[9px]">
                    <div>
                      <div className="font-bold">{game.profile.name}</div>
                      <div className="text-sm text-muted">
                        PID: {game.pid} • CPU: {Math.round(game.cpu_usage)}% • Memória:{' '}
                        {Math.round(game.memory_usage / 1024 / 1024)}MB
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted">
                      <div>↓ {(game.network_activity.received_bytes / 1024).toFixed(1)}KB</div>
                      <div>↑ {(game.network_activity.sent_bytes / 1024).toFixed(1)}KB</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <RouteIssuesPanel />

          {/* System stats */}
          <div className="bg-panel rounded-2xl p-6 border border-border">
            <h3 className="text-[15px] font-bold mb-3.5">Estatísticas do Sistema</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-muted text-sm">Última Atualização</div>
                <div className="text-lg font-bold">
                  {quality ? new Date(quality.last_update).toLocaleTimeString() : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-muted text-sm">Amostras</div>
                <div className="text-lg font-bold">{quality?.latency.sample_count || 0}</div>
              </div>
              <div>
                <div className="text-muted text-sm">Pontuação</div>
                <div className="text-lg font-bold">{Math.round(quality?.score || 0)}/100</div>
              </div>
              <div>
                <div className="text-muted text-sm">Estado</div>
                <div className="text-lg font-bold capitalize">{quality?.status || 'Desconhecido'}</div>
              </div>
            </div>
          </div>

          {/* Summary bar */}
          <div className="flex items-center gap-6 bg-gradient-to-r from-panel-2 to-panel border border-border rounded-2xl px-[22px] py-4 flex-wrap">
            <div className="flex flex-col">
              <b className="text-2xl text-accent">{activeProfile?.name || '—'}</b>
              <span className="text-[11px] text-muted uppercase tracking-wide">Perfil Ativo</span>
            </div>
            <div className="flex flex-col">
              <b className="text-2xl text-accent">{backups.length}</b>
              <span className="text-[11px] text-muted uppercase tracking-wide">Backups</span>
            </div>
            <div className="ml-auto flex gap-2.5">
              <button
                onClick={handleQuickApply}
                disabled={busy !== null || !activeProfile}
                className="px-[15px] py-2.5 rounded-[10px] text-[13px] font-bold bg-gradient-to-br from-accent to-accent-2 text-[#04120a] disabled:opacity-50 transition"
              >
                {busy === 'apply' ? 'A otimizar…' : '⚡ Otimizar Agora'}
              </button>
              <button
                onClick={handleQuickRevert}
                disabled={busy !== null}
                className="px-[15px] py-2.5 rounded-[10px] text-[13px] font-bold border border-border bg-transparent hover:brightness-125 disabled:opacity-50 transition"
              >
                ↩️ Reverter Tudo
              </button>
            </div>
          </div>

          {/* Diagnostic tools (ping / traceroute / DNS lookup) */}
          <DiagnosticTools />
        </div>
      )}
    </section>
  )
}

const RouteIssuesPanel: React.FC = () => {
  const [issues, setIssues] = useState<
    { destination: string; issue: string; detail: string; measuredValue: number }[]
  >([])

  useEffect(() => {
    let cancelled = false
    const refresh = () => {
      window.app.routing.getIssues().then((result) => {
        if (!cancelled) setIssues(result)
      })
    }
    refresh()
    const interval = setInterval(refresh, 30000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="bg-panel rounded-2xl p-6 border border-border">
      <h3 className="text-[15px] font-bold mb-1">Problemas de Rota</h3>
      <p className="text-xs text-muted mb-3.5">
        Detetados a partir de traceroutes reais a cada 5 minutos.
      </p>
      {issues.length === 0 ? (
        <p className="text-sm text-muted italic">
          Nenhum problema detetado até agora (ou traceroute indisponível neste sistema).
        </p>
      ) : (
        <div className="space-y-2">
          {issues.map((issue, i) => (
            <div key={i} className="p-3 bg-panel-2 rounded-[9px] text-sm">
              <span className="text-gold font-medium">{issue.issue.replace(/_/g, ' ')}</span>
              <span className="text-muted"> — {issue.detail}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Analysis
