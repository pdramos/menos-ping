/**
 * Routes page ("Rotas") - real route analysis between this machine and the
 * game servers you're connected to. Detects the servers from real OS
 * connections, runs a real traceroute, and pinpoints the bottleneck hop.
 * Honest about what it can (diagnose) and can't (magically reroute without
 * relay infrastructure) do.
 */

import React, { useEffect, useState } from 'react'
import type { GameRouteReport, GameServerRoute, RouteVerdict } from '@types/index'

const STATUS_LABELS: Record<GameRouteReport['status'], string> = {
  idle: '',
  detecting: '🔍 A detetar servidores de jogos ativos…',
  tracing: '🛰️ A traçar a rota (traceroute real, pode demorar)…',
  done: '✅ Análise concluída',
  no_games: 'Nenhum jogo detetado',
  no_servers: 'Servidor não identificado automaticamente',
  failed: '⚠ Falha na análise',
}

const VERDICT_STYLE: Record<RouteVerdict, { label: string; cls: string }> = {
  healthy: { label: '✅ Saudável', cls: 'bg-accent/[0.14] text-accent border-accent/35' },
  suboptimal: { label: '⚠ Razoável', cls: 'bg-warn/[0.14] text-warn border-warn/35' },
  problematic: { label: '⛔ Com problemas', cls: 'bg-danger/[0.14] text-danger border-danger/35' },
  unknown: { label: '❔ Indeterminado', cls: 'bg-muted/[0.14] text-muted border-border' },
}

const RouteCard: React.FC<{ route: GameServerRoute }> = ({ route }) => {
  const v = VERDICT_STYLE[route.verdict]
  return (
    <div className="bg-panel border border-border rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div>
          <div className="text-base font-bold flex items-center gap-2 flex-wrap">
            {route.gameName && <span className="text-gold">{route.gameName}</span>}
            <span className="font-mono text-white">{route.serverAddress}</span>
          </div>
          <div className="text-xs text-muted mt-0.5">
            {route.asn ? `${route.asn}` : 'ASN desconhecido'}
            {route.country ? ` · ${route.country}` : ''} · {route.hopCount} saltos ·{' '}
            {route.totalLatencyMs.toFixed(0)}ms
          </div>
        </div>
        <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold border ${v.cls}`}>{v.label}</span>
      </div>

      <p className="text-[13px] text-muted mb-3.5 leading-relaxed">{route.verdictDetail}</p>

      {route.hops.length > 0 && (
        <div className="space-y-1">
          {route.hops.map((hop) => (
            <div
              key={hop.hop}
              className={`flex items-center justify-between p-2 rounded-[9px] text-xs ${
                hop.isBottleneck
                  ? 'bg-gradient-to-r from-danger/[0.12] to-panel-2 border border-danger/30'
                  : 'bg-panel-2'
              }`}
            >
              <span className="w-6 text-muted">{hop.hop}</span>
              <span className="flex-1 font-mono">
                {hop.address ? (
                  <>
                    {hop.hostname && <span className="text-gray-300">{hop.hostname} </span>}
                    <span className="text-muted">{hop.address}</span>
                  </>
                ) : (
                  <span className="text-muted italic">sem resposta</span>
                )}
                {hop.isBottleneck && <span className="ml-2 text-danger font-bold not-italic">◄ gargalo</span>}
              </span>
              <span className="text-right w-28 text-muted">
                {hop.address ? `${hop.latencyMs.toFixed(1)}ms` : '—'}
                {hop.packetLossPercent > 0 && hop.address ? (
                  <span className="text-danger"> · {hop.packetLossPercent.toFixed(0)}% perda</span>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export const Routes: React.FC = () => {
  const [report, setReport] = useState<GameRouteReport | null>(null)
  const [busy, setBusy] = useState(false)
  const [host, setHost] = useState('')

  useEffect(() => {
    window.app.routes.getLatest().then((latest) => {
      if (latest) setReport(latest)
    })
    return window.app.routes.onReportChanged(setReport)
  }, [])

  const handleScan = async () => {
    setBusy(true)
    try {
      await window.app.routes.scan()
    } finally {
      setBusy(false)
    }
  }

  const handleAnalyzeHost = async () => {
    if (!host.trim()) return
    setBusy(true)
    try {
      await window.app.routes.analyzeHost(host.trim())
    } finally {
      setBusy(false)
    }
  }

  const scanning = busy || report?.status === 'detecting' || report?.status === 'tracing'

  return (
    <section className="animate-view-fade">
      <div className="flex items-center justify-between mb-[18px] gap-3 flex-wrap">
        <h1 className="text-[22px] tracking-wide">Rotas de Jogo</h1>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="px-[18px] py-3 rounded-[10px] text-sm font-bold bg-gradient-to-br from-accent to-accent-2 text-[#04120a] disabled:opacity-50 transition"
        >
          {scanning ? 'A analisar…' : '🛰️ Analisar Jogos Ativos'}
        </button>
      </div>

      {/* Honest explainer */}
      <div className="bg-info/[0.06] border border-info/30 rounded-2xl p-4 px-5 mb-[18px]">
        <p className="text-[13px] text-muted leading-relaxed">
          Isto mede a rota <b className="text-white">real</b> entre ti e o servidor do jogo e mostra
          exatamente <b className="text-white">onde</b> está a latência/perda. Um GPN pago (tipo
          ExitLag) tenta contornar saltos maus através de servidores próprios com melhor peering -
          isso exige infraestrutura própria que esta app não tem. Mas esta análise diz-te se um
          reroute sequer ajudaria: se a tua rota já está saudável, não há o que melhorar.
        </p>
      </div>

      {/* Manual host analysis */}
      <div className="bg-panel border border-border rounded-2xl p-5 mb-[18px]">
        <h3 className="text-[15px] font-bold mb-2">Análise Manual</h3>
        <p className="text-xs text-muted mb-3">
          Sabes o IP ou host do servidor? (útil para jogos por UDP que não expõem o destino) —
          introduz aqui.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="ex: 185.40.64.0 ou matchmaking.exemplo.com"
            disabled={scanning}
            className="flex-1 bg-bg-2 border border-border rounded-[10px] px-3.5 py-2.5 text-white text-sm outline-none focus:border-accent"
          />
          <button
            onClick={handleAnalyzeHost}
            disabled={scanning || !host.trim()}
            className="px-5 py-2.5 rounded-[10px] text-sm font-bold border border-border bg-transparent hover:brightness-125 disabled:opacity-50 transition"
          >
            Analisar Host
          </button>
        </div>
      </div>

      {report && report.status !== 'idle' && (
        <div className="space-y-[18px]">
          <div
            className={`rounded-2xl border p-4 px-5 text-sm font-semibold ${
              report.status === 'done'
                ? 'bg-accent/[0.06] border-accent/30 text-accent'
                : report.status === 'failed'
                  ? 'bg-danger/[0.06] border-danger/30 text-danger'
                  : report.status === 'no_games' || report.status === 'no_servers'
                    ? 'bg-warn/[0.06] border-warn/30 text-warn'
                    : 'bg-panel-2 border-border text-muted'
            }`}
          >
            {STATUS_LABELS[report.status]}
            {report.message && <div className="mt-1 text-xs font-normal text-muted">{report.message}</div>}
          </div>

          {report.routes.map((route) => (
            <RouteCard key={route.serverAddress} route={route} />
          ))}
        </div>
      )}
    </section>
  )
}

export default Routes
