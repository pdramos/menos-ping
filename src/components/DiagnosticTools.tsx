/**
 * Real network diagnostic tools (ping / traceroute / DNS lookup), embedded
 * within the Analysis page. Every result comes from a real IPC call into
 * the main process - no simulated data.
 */

import React, { useState } from 'react'
import type { ProbeResult } from '@native/probe'
import type { TracerouteResult } from '@native/traceroute'
import type { DNSLookupResult } from '@native/dnsLookup'

export const DiagnosticTools: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ping' | 'traceroute' | 'dns'>('ping')

  return (
    <div className="bg-panel rounded-2xl border border-border">
      <div className="flex border-b border-border">
        {[
          { id: 'ping' as const, label: 'Ping' },
          { id: 'traceroute' as const, label: 'Traceroute' },
          { id: 'dns' as const, label: 'DNS Lookup' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-sm font-semibold transition ${
              activeTab === tab.id ? 'text-white border-b-2 border-accent' : 'text-muted hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="p-5">
        {activeTab === 'ping' && <PingTool />}
        {activeTab === 'traceroute' && <TraceRouteTool />}
        {activeTab === 'dns' && <DNSTool />}
      </div>
    </div>
  )
}

const PingTool: React.FC = () => {
  const [host, setHost] = useState('8.8.8.8')
  const [results, setResults] = useState<ProbeResult[]>([])
  const [isPinging, setIsPinging] = useState(false)

  const handlePing = async () => {
    setIsPinging(true)
    setResults([])
    for (let i = 0; i < 4; i++) {
      const result = await window.app.tools.ping(host)
      setResults((prev) => [...prev, result])
    }
    setIsPinging(false)
  }

  const successful = results.filter((r) => r.success)
  const avgLatency =
    successful.length > 0 ? successful.reduce((a, b) => a + b.latencyMs, 0) / successful.length : 0
  const loss = results.length > 0 ? ((results.length - successful.length) / results.length) * 100 : 0

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Usa ICMP ping real quando disponível, com fallback para timing TCP-connect.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="Introduz um hostname ou IP"
          disabled={isPinging}
          className="flex-1 bg-bg-2 border border-border rounded-[10px] px-3.5 py-2.5 text-white text-sm outline-none focus:border-accent"
        />
        <button
          onClick={handlePing}
          disabled={isPinging || !host}
          className="px-5 py-2.5 rounded-[10px] text-sm font-bold bg-gradient-to-br from-accent to-accent-2 text-[#04120a] disabled:opacity-50 transition"
        >
          {isPinging ? 'A pingar…' : 'Ping'}
        </button>
      </div>

      {results.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-panel-2 rounded-[9px] p-3 text-center">
              <div className="text-muted text-xs">Latência Média</div>
              <div className="text-xl font-bold text-accent">{avgLatency.toFixed(1)}ms</div>
            </div>
            <div className="bg-panel-2 rounded-[9px] p-3 text-center">
              <div className="text-muted text-xs">Perda de Pacotes</div>
              <div className={`text-xl font-bold ${loss > 0 ? 'text-danger' : 'text-accent'}`}>{loss.toFixed(1)}%</div>
            </div>
            <div className="bg-panel-2 rounded-[9px] p-3 text-center">
              <div className="text-muted text-xs">Método</div>
              <div className="text-xl font-bold uppercase">{results[0]?.method || '-'}</div>
            </div>
          </div>
          <div className="space-y-1.5">
            {results.map((result, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-panel-2 rounded-[9px] text-sm">
                <span>Resposta #{i + 1}</span>
                {result.success ? (
                  <span className="text-accent">{result.latencyMs.toFixed(2)}ms</span>
                ) : (
                  <span className="text-danger">Timeout</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const TraceRouteTool: React.FC = () => {
  const [host, setHost] = useState('8.8.8.8')
  const [result, setResult] = useState<TracerouteResult | null>(null)
  const [running, setRunning] = useState(false)

  const handleTrace = async () => {
    setRunning(true)
    setResult(null)
    const traceResult = await window.app.tools.traceroute(host)
    setResult(traceResult)
    setRunning(false)
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">Executa o binário real traceroute/tracert do sistema.</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="Introduz um hostname ou IP"
          disabled={running}
          className="flex-1 bg-bg-2 border border-border rounded-[10px] px-3.5 py-2.5 text-white text-sm outline-none focus:border-accent"
        />
        <button
          onClick={handleTrace}
          disabled={running || !host}
          className="px-5 py-2.5 rounded-[10px] text-sm font-bold bg-gradient-to-br from-accent to-accent-2 text-[#04120a] disabled:opacity-50 transition"
        >
          {running ? 'A traçar…' : 'Traçar'}
        </button>
      </div>

      {result?.error && (
        <p className="text-sm text-danger">
          {result.error}
          {result.error.includes('not installed') && ' - instala traceroute (Linux/macOS) ou garante que tracert está no PATH (Windows).'}
        </p>
      )}

      {result && result.hops.length > 0 && (
        <div className="space-y-1">
          {result.hops.map((hop) => (
            <div key={hop.hop} className="flex items-center justify-between p-2 bg-panel-2 rounded-[9px] text-sm">
              <span className="w-8 text-muted">{hop.hop}</span>
              <span className="flex-1">
                {hop.address ? (
                  <>
                    {hop.hostname && <span className="text-gray-300">{hop.hostname} </span>}
                    <span className="text-muted">{hop.address}</span>
                  </>
                ) : (
                  <span className="text-muted italic">Sem resposta</span>
                )}
              </span>
              <span className="text-right w-40 text-xs text-muted">
                {hop.samplesMs.map((s, i) => (s === null ? '* ' : `${s.toFixed(1)}ms `)).join(' ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const DNSTool: React.FC = () => {
  const [domain, setDomain] = useState('google.com')
  const [result, setResult] = useState<DNSLookupResult | null>(null)
  const [running, setRunning] = useState(false)

  const handleLookup = async () => {
    setRunning(true)
    setResult(null)
    const lookupResult = await window.app.tools.dnsLookup(domain)
    setResult(lookupResult)
    setRunning(false)
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">Consulta real de registos A, AAAA, MX, NS, TXT e CNAME via o resolver do sistema.</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="Introduz um domínio"
          disabled={running}
          className="flex-1 bg-bg-2 border border-border rounded-[10px] px-3.5 py-2.5 text-white text-sm outline-none focus:border-accent"
        />
        <button
          onClick={handleLookup}
          disabled={running || !domain}
          className="px-5 py-2.5 rounded-[10px] text-sm font-bold bg-gradient-to-br from-accent to-accent-2 text-[#04120a] disabled:opacity-50 transition"
        >
          {running ? 'A consultar…' : 'Consultar'}
        </button>
      </div>

      {result && (
        <div className="space-y-3">
          {Object.entries(result.records).map(([type, values]) => (
            <div key={type}>
              <h4 className="font-bold text-sm text-gray-300 mb-1">{type}</h4>
              <div className="space-y-1">
                {(values as any[]).map((v, i) => (
                  <div key={i} className="text-sm text-muted bg-panel-2 rounded px-3 py-1">
                    {typeof v === 'string' ? v : JSON.stringify(v)}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {Object.entries(result.errors).map(([type, err]) => (
            <div key={type} className="text-xs text-muted">
              {type}: {err}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default DiagnosticTools
