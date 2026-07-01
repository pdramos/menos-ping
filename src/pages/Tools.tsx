/**
 * Tools page - Network diagnostics and utilities
 */

import React, { useState } from 'react'
import Layout from '@components/Layout'

interface PingResult {
  host: string
  latency: number
  success: boolean
}

export const Tools: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ping' | 'traceroute' | 'dns' | 'bandwidth'>('ping')
  const [pingHost, setPingHost] = useState('8.8.8.8')
  const [pingResults, setPingResults] = useState<PingResult[]>([])
  const [isPinging, setIsPinging] = useState(false)

  const handlePing = async () => {
    setIsPinging(true)
    setPingResults([])

    // Simulate ping
    for (let i = 0; i < 4; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500))
      setPingResults((prev) => [
        ...prev,
        {
          host: pingHost,
          latency: Math.random() * 50 + 10,
          success: Math.random() > 0.1,
        },
      ])
    }

    setIsPinging(false)
  }

  return (
    <Layout
      sidebar={<Sidebar activeTab={activeTab} onChange={setActiveTab} />}
      header={<Header />}
    >
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {activeTab === 'ping' && <PingTool host={pingHost} setHost={setPingHost} onPing={handlePing} isPinging={isPinging} results={pingResults} />}
          {activeTab === 'traceroute' && <TraceRouteTool />}
          {activeTab === 'dns' && <DNSTool />}
          {activeTab === 'bandwidth' && <BandwidthTool />}
        </div>
      </div>
    </Layout>
  )
}

const PingTool: React.FC<{
  host: string
  setHost: (host: string) => void
  onPing: () => void
  isPinging: boolean
  results: PingResult[]
}> = ({ host, setHost, onPing, isPinging, results }) => {
  const avgLatency = results.length > 0
    ? results.filter((r) => r.success).reduce((a, b) => a + b.latency, 0) / results.filter((r) => r.success).length
    : 0
  const loss = results.length > 0
    ? (results.filter((r) => !r.success).length / results.length) * 100
    : 0

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-bold mb-4">Ping Tool</h3>

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
                onClick={onPing}
                disabled={isPinging}
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
                <div className="text-2xl font-bold text-blue-400">{Math.round(avgLatency)}ms</div>
              </div>
              <div className="bg-gray-700 rounded p-4 text-center">
                <div className="text-gray-400 text-sm">Packet Loss</div>
                <div className={`text-2xl font-bold ${loss > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {loss.toFixed(1)}%
                </div>
              </div>
              <div className="bg-gray-700 rounded p-4 text-center">
                <div className="text-gray-400 text-sm">Packets Sent</div>
                <div className="text-2xl font-bold text-white">{results.length}</div>
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
                  <span className="text-green-400">{Math.round(result.latency)}ms</span>
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

const TraceRouteTool: React.FC = () => (
  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
    <h3 className="text-xl font-bold mb-4">Traceroute Tool</h3>
    <p className="text-gray-400 mb-4">Trace the network path to a destination host</p>

    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Target Host</label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter hostname or IP address"
            className="flex-1 bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
          />
          <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium transition">
            Trace
          </button>
        </div>
      </div>

      <div className="text-gray-400 text-sm">
        <p>Traceroute will show the network hops and latency to reach the destination.</p>
      </div>
    </div>
  </div>
)

const DNSTool: React.FC = () => (
  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
    <h3 className="text-xl font-bold mb-4">DNS Lookup Tool</h3>
    <p className="text-gray-400 mb-4">Query DNS records for a domain</p>

    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Domain Name</label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter domain name"
            className="flex-1 bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
          />
          <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium transition">
            Lookup
          </button>
        </div>
      </div>

      <div className="text-gray-400 text-sm">
        <p>Perform A, AAAA, MX, NS, and other DNS record lookups.</p>
      </div>
    </div>
  </div>
)

const BandwidthTool: React.FC = () => (
  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
    <h3 className="text-xl font-bold mb-4">Bandwidth Test</h3>
    <p className="text-gray-400 mb-4">Test your network bandwidth</p>

    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Download Speed</label>
          <div className="bg-gray-700 rounded p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">-- Mbps</div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Upload Speed</label>
          <div className="bg-gray-700 rounded p-4 text-center">
            <div className="text-2xl font-bold text-green-400">-- Mbps</div>
          </div>
        </div>
      </div>

      <button className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium transition">
        Start Speed Test
      </button>

      <div className="text-gray-400 text-sm">
        <p>This will test your download and upload speeds using speedtest.net API.</p>
      </div>
    </div>
  </div>
)

const Sidebar: React.FC<{
  activeTab: string
  onChange: (tab: 'ping' | 'traceroute' | 'dns' | 'bandwidth') => void
}> = ({ activeTab, onChange }) => (
  <div className="p-4 flex flex-col h-full">
    <h2 className="text-lg font-bold mb-4">Tools</h2>

    <nav className="space-y-2 mb-6">
      {['Dashboard', 'Monitor', 'Settings', 'Tools'].map((item) => (
        <button
          key={item}
          className={`w-full text-left px-4 py-2 rounded transition ${
            item === 'Tools'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          {item}
        </button>
      ))}
    </nav>

    <div className="border-t border-gray-700 pt-4 space-y-2">
      {[
        { id: 'ping', label: 'Ping Tool' },
        { id: 'traceroute', label: 'Traceroute' },
        { id: 'dns', label: 'DNS Lookup' },
        { id: 'bandwidth', label: 'Bandwidth Test' },
      ].map((tool) => (
        <button
          key={tool.id}
          onClick={() => onChange(tool.id as any)}
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
    <p className="text-gray-400 text-sm">Utility tools for network diagnostics and testing</p>
  </div>
)

export default Tools
