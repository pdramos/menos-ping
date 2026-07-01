/**
 * Tools page - Network diagnostics and utilities.
 * Every result here comes from a real IPC call into the main process
 * (real ICMP/TCP probe, real traceroute, real DNS resolution) - there is
 * no client-side randomness anywhere on this page.
 */

import React, { useState } from 'react'
import Layout from '@components/Layout'
import type { ProbeResult } from '@native/probe'
import type { TracerouteResult } from '@native/traceroute'
import type { DNSLookupResult } from '@native/dnsLookup'

export const Tools: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ping' | 'traceroute' | 'dns'>('ping')

  return (
    <Layout sidebar={<Sidebar activeTab={activeTab} onChange={setActiveTab} />} header={<Header />}>
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {activeTab === 'ping' && <PingTool />}
          {activeTab === 'traceroute' && <TraceRouteTool />}
          {activeTab === 'dns' && <DNSTool />}
        </div>
      </div>
    </Layout>
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
  const avgLatency = successful.length > 0
    ? successful.reduce((a, b) => a + b.latencyMs, 0) / successful.length
    : 0
  const loss = results.length > 0 ? ((results.length - successful.length) / results.length) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-bold mb-4">Ping Tool</h3>
        <p className="text-xs text-gray-500 mb-4">
          Uses real ICMP ping when available, falling back to TCP-connect timing otherwise.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Target Host</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="Enter hostname or IP address"
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
                disabled={isPinging}
              />
              <button
                onClick={handlePing}
                disabled={isPinging || !host}
                className={`px-6 py-2 rounded font-medium transition ${
                  isPinging
                    ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isPinging ? 'Pinging...' : 'Ping'}
              </button>
            </div>
          </div>

          {results.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-gray-700 rounded p-4 text-center">
                <div className="text-gray-400 text-sm">Average Latency</div>
                <div className="text-2xl font-bold text-blue-400">{avgLatency.toFixed(1)}ms</div>
              </div>
              <div className="bg-gray-700 rounded p-4 text-center">
                <div className="text-gray-400 text-sm">Packet Loss</div>
                <div className={`text-2xl font-bold ${loss > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {loss.toFixed(1)}%
                </div>
              </div>
              <div className="bg-gray-700 rounded p-4 text-center">
                <div className="text-gray-400 text-sm">Method</div>
                <div className="text-2xl font-bold text-white uppercase">
                  {results[0]?.method || '-'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {results.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h4 className="font-bold mb-4">Results</h4>
          <div className="space-y-2">
            {results.map((result, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-gray-700 rounded text-sm">
                <span>Reply #{i + 1}</span>
                {result.success ? (
                  <span className="text-green-400">{result.latencyMs.toFixed(2)}ms</span>
                ) : (
                  <span className="text-red-400">Timeout</span>
                )}
              </div>
            ))}
          </div>
        </div>
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
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-bold mb-4">Traceroute Tool</h3>
        <p className="text-gray-400 mb-4 text-sm">
          Runs the real system traceroute/tracert binary and parses its actual output.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Target Host</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="Enter hostname or IP address"
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
                disabled={running}
              />
              <button
                onClick={handleTrace}
                disabled={running || !host}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded font-medium transition"
              >
                {running ? 'Tracing...' : 'Trace'}
              </button>
            </div>
          </div>

          {result?.error && (
            <p className="text-sm text-red-400">
              {result.error}
              {result.error.includes('not installed') &&
                ' - install traceroute (Linux/macOS) or ensure tracert is on PATH (Windows).'}
            </p>
          )}
        </div>
      </div>

      {result && result.hops.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h4 className="font-bold mb-4">Hops to {result.target}</h4>
          <div className="space-y-1">
            {result.hops.map((hop) => (
              <div
                key={hop.hop}
                className="flex items-center justify-between p-2 bg-gray-700 rounded text-sm"
              >
                <span className="w-8 text-gray-400">{hop.hop}</span>
                <span className="flex-1">
                  {hop.address ? (
                    <>
                      {hop.hostname && <span className="text-gray-300">{hop.hostname} </span>}
                      <span className="text-gray-500">{hop.address}</span>
                    </>
                  ) : (
                    <span className="text-gray-500 italic">Request timed out</span>
                  )}
                </span>
                <span className="text-right w-40 text-xs text-gray-400">
                  {hop.samplesMs.map((s, i) => (s === null ? '* ' : `${s.toFixed(1)}ms `)).join(' ')}
                </span>
              </div>
            ))}
          </div>
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
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-bold mb-4">DNS Lookup Tool</h3>
        <p className="text-gray-400 mb-4 text-sm">
          Performs real A, AAAA, MX, NS, TXT and CNAME record queries via the system resolver.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Domain Name</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="Enter domain name"
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
                disabled={running}
              />
              <button
                onClick={handleLookup}
                disabled={running || !domain}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded font-medium transition"
              >
                {running ? 'Looking up...' : 'Lookup'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {result && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 space-y-4">
          {Object.entries(result.records).map(([type, values]) => (
            <div key={type}>
              <h4 className="font-bold text-sm text-gray-300 mb-1">{type}</h4>
              <div className="space-y-1">
                {(values as any[]).map((v, i) => (
                  <div key={i} className="text-sm text-gray-400 bg-gray-700 rounded px-3 py-1">
                    {typeof v === 'string' ? v : JSON.stringify(v)}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {Object.entries(result.errors).map(([type, err]) => (
            <div key={type} className="text-xs text-gray-500">
              {type}: {err}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const Sidebar: React.FC<{
  activeTab: string
  onChange: (tab: 'ping' | 'traceroute' | 'dns') => void
}> = ({ activeTab, onChange }) => (
  <div className="p-4 flex flex-col h-full">
    <h2 className="text-lg font-bold mb-4">Tools</h2>

    <div className="space-y-2">
      {[
        { id: 'ping', label: 'Ping Tool' },
        { id: 'traceroute', label: 'Traceroute' },
        { id: 'dns', label: 'DNS Lookup' },
      ].map((tool) => (
        <button
          key={tool.id}
          onClick={() => onChange(tool.id as 'ping' | 'traceroute' | 'dns')}
          className={`w-full text-left px-4 py-2 rounded text-sm transition ${
            activeTab === tool.id
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          {tool.label}
        </button>
      ))}
    </div>
  </div>
)

const Header: React.FC = () => (
  <div className="px-6 py-4">
    <h2 className="text-2xl font-bold">Network Diagnostic Tools</h2>
    <p className="text-gray-400 text-sm">Real ping, traceroute, and DNS lookup - no simulated data</p>
  </div>
)

export default Tools
