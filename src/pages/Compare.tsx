/**
 * Compare page ("Comparar") - real before/after measurement around applying
 * an optimization profile. Every number here comes from actual pings taken
 * before and after the real registry/sysctl change - nothing is simulated.
 */

import React, { useEffect, useState } from 'react'
import type { ComparisonSnapshot, OptimizationComparison, OptimizationProfile } from '@types/index'

const STATUS_LABELS: Record<OptimizationComparison['status'], string> = {
  measuring_before: '📡 A medir o estado atual da tua conexão…',
  applying: '⚡ A aplicar a otimização…',
  measuring_after: '📡 A medir o efeito da otimização…',
  done: '✅ Comparação concluída',
  failed: '⚠ Falha na comparação',
}

function fmt(n: number, digits = 1): string {
  return n.toFixed(digits)
}

/** Delta for metrics where LOWER is better (latency, jitter, packet loss). */
const DeltaLowerIsBetter: React.FC<{ before: number; after: number; unit: string; digits?: number }> = ({
  before,
  after,
  unit,
  digits = 1,
}) => {
  const delta = after - before
  const improved = delta < -0.01
  const worsened = delta > 0.01
  const pct = before !== 0 ? (delta / before) * 100 : 0
  return (
    <span className={`text-xs font-bold ${improved ? 'text-accent' : worsened ? 'text-danger' : 'text-muted'}`}>
      {improved ? '↓' : worsened ? '↑' : '→'} {delta > 0 ? '+' : ''}
      {fmt(delta, digits)}
      {unit} ({pct > 0 ? '+' : ''}
      {fmt(pct, 0)}%)
    </span>
  )
}

/** Delta for metrics where HIGHER is better (quality score). */
const DeltaHigherIsBetter: React.FC<{ before: number; after: number }> = ({ before, after }) => {
  const delta = after - before
  const improved = delta > 0.5
  const worsened = delta < -0.5
  return (
    <span className={`text-xs font-bold ${improved ? 'text-accent' : worsened ? 'text-danger' : 'text-muted'}`}>
      {improved ? '↑' : worsened ? '↓' : '→'} {delta > 0 ? '+' : ''}
      {fmt(delta, 0)}
    </span>
  )
}

const SnapshotCard: React.FC<{ title: string; snapshot: ComparisonSnapshot | null }> = ({ title, snapshot }) => (
  <div className="bg-panel border border-border rounded-2xl p-5">
    <h3 className="text-[15px] font-bold mb-3.5">{title}</h3>
    {!snapshot || snapshot.sampleCount === 0 ? (
      <p className="text-sm text-muted italic">Sem amostras.</p>
    ) : (
      <dl className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-2 text-[13px]">
        <dt className="text-muted">Latência Média:</dt>
        <dd className="text-right font-semibold">{fmt(snapshot.avgLatencyMs)}ms</dd>
        <dt className="text-muted">Latência Mín/Máx:</dt>
        <dd className="text-right font-semibold">
          {fmt(snapshot.minLatencyMs)}ms / {fmt(snapshot.maxLatencyMs)}ms
        </dd>
        <dt className="text-muted">Jitter:</dt>
        <dd className="text-right font-semibold">{fmt(snapshot.avgJitterMs)}ms</dd>
        <dt className="text-muted">Perda de Pacotes:</dt>
        <dd className="text-right font-semibold">{fmt(snapshot.packetLossPercent, 2)}%</dd>
        <dt className="text-muted">Pontuação:</dt>
        <dd className="text-right font-semibold">{fmt(snapshot.score, 0)}/100</dd>
        <dt className="text-muted">Amostras:</dt>
        <dd className="text-right font-semibold">{snapshot.sampleCount}</dd>
      </dl>
    )}
  </div>
)

export const Compare: React.FC = () => {
  const [profiles, setProfiles] = useState<OptimizationProfile[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [comparison, setComparison] = useState<OptimizationComparison | null>(null)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    window.app.config.getAllProfiles().then((all) => {
      setProfiles(all)
      if (all.length > 0) setSelectedId(all[0].id)
    })
    window.app.config.getActiveProfile().then((p) => setSelectedId(p.id))
    window.app.comparison.getLatest().then((latest) => {
      if (latest) setComparison(latest)
    })
    return window.app.comparison.onStatusChanged(setComparison)
  }, [])

  const handleRun = async () => {
    const profile = profiles.find((p) => p.id === selectedId)
    if (!profile) return
    setRunning(true)
    try {
      await window.app.comparison.run(profile)
    } finally {
      setRunning(false)
    }
  }

  const changedSettings = comparison?.settingsDiff.filter((d) => d.changed) ?? []
  const unchangedSettings = comparison?.settingsDiff.filter((d) => !d.changed) ?? []

  return (
    <section className="animate-view-fade">
      <div className="flex items-center justify-between mb-[18px] gap-3 flex-wrap">
        <h1 className="text-[22px] tracking-wide">Comparar Antes/Depois</h1>
        <div className="flex gap-2 items-center">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={running}
            className="bg-bg-2 border border-border rounded-[10px] px-3.5 py-2.5 text-white text-sm outline-none focus:border-accent disabled:opacity-50"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleRun}
            disabled={running || !selectedId}
            className="px-[15px] py-2.5 rounded-[10px] text-[13px] font-bold bg-gradient-to-br from-accent to-accent-2 text-[#04120a] disabled:opacity-50 transition"
          >
            {running ? 'A testar…' : '🧪 Iniciar Teste'}
          </button>
        </div>
      </div>

      {!comparison ? (
        <div className="bg-panel border border-border rounded-2xl text-center py-[46px] px-[30px]">
          <div className="text-[54px] mb-2">🆚</div>
          <h3 className="text-[19px] mb-2.5">Mede o impacto real de uma otimização</h3>
          <p className="text-muted max-w-[560px] mx-auto my-1.5 text-[13.5px] leading-relaxed">
            Escolhe um perfil e clica em <b className="text-white">Iniciar Teste</b>. O Menos Ping
            mede a tua conexão real durante 8 segundos, aplica a otimização, e mede novamente
            durante mais 8 segundos - mostrando os valores reais de antes e depois, incluindo as
            definições exatas do sistema que mudaram.
          </p>
        </div>
      ) : (
        <div className="space-y-[18px]">
          <div
            className={`rounded-2xl border p-4 px-5 text-sm font-semibold ${
              comparison.status === 'done'
                ? 'bg-accent/[0.06] border-accent/30 text-accent'
                : comparison.status === 'failed'
                  ? 'bg-danger/[0.06] border-danger/30 text-danger'
                  : 'bg-panel-2 border-border text-muted'
            }`}
          >
            {STATUS_LABELS[comparison.status]}
            {comparison.status === 'failed' && comparison.error && (
              <div className="mt-1 text-xs font-normal">{comparison.error}</div>
            )}
          </div>

          {(comparison.before || comparison.after) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SnapshotCard title="Antes" snapshot={comparison.before} />
              <SnapshotCard title="Depois" snapshot={comparison.after} />
            </div>
          )}

          {comparison.before && comparison.after && comparison.status === 'done' && (
            <div className="bg-panel border border-border rounded-2xl p-5">
              <h3 className="text-[15px] font-bold mb-3.5">Diferença</h3>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-2.5 text-[13px]">
                <dt className="text-muted">Latência Média:</dt>
                <dd className="text-right">
                  <DeltaLowerIsBetter before={comparison.before.avgLatencyMs} after={comparison.after.avgLatencyMs} unit="ms" />
                </dd>
                <dt className="text-muted">Jitter:</dt>
                <dd className="text-right">
                  <DeltaLowerIsBetter before={comparison.before.avgJitterMs} after={comparison.after.avgJitterMs} unit="ms" />
                </dd>
                <dt className="text-muted">Perda de Pacotes:</dt>
                <dd className="text-right">
                  <DeltaLowerIsBetter
                    before={comparison.before.packetLossPercent}
                    after={comparison.after.packetLossPercent}
                    unit="%"
                    digits={2}
                  />
                </dd>
                <dt className="text-muted">Pontuação de Qualidade:</dt>
                <dd className="text-right">
                  <DeltaHigherIsBetter before={comparison.before.score} after={comparison.after.score} />
                </dd>
              </dl>
            </div>
          )}

          {comparison.settingsDiff.length > 0 && (
            <div className="bg-panel border border-border rounded-2xl p-5">
              <h3 className="text-[15px] font-bold mb-1">Definições Reais do Sistema</h3>
              <p className="text-xs text-muted mb-3.5">
                Valores lidos diretamente do registo/sysctl antes e depois de aplicar - backup:{' '}
                <b className="text-white">{comparison.backupId || '—'}</b>
              </p>
              <div className="space-y-1.5">
                {changedSettings.map((diff) => (
                  <div
                    key={diff.key}
                    className="flex items-center justify-between p-2.5 bg-gradient-to-r from-accent/[0.06] to-panel-2 rounded-[9px] text-xs"
                  >
                    <span className="font-mono text-white">{diff.key}</span>
                    <span className="text-muted">
                      <span className="text-danger/80">{diff.before ?? '(vazio)'}</span> →{' '}
                      <span className="text-accent">{diff.after ?? '(vazio)'}</span>
                    </span>
                  </div>
                ))}
                {unchangedSettings.map((diff) => (
                  <div key={diff.key} className="flex items-center justify-between p-2.5 bg-panel-2 rounded-[9px] text-xs opacity-60">
                    <span className="font-mono">{diff.key}</span>
                    <span className="text-muted">{diff.after ?? '(vazio)'} (sem alteração)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default Compare
