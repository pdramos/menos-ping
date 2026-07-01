/**
 * Monitor page - Detailed network monitoring and diagnostics
 */

import React, { useState, useEffect } from 'react'
import Layout from '@components/Layout'
import MetricCard from '@components/MetricCard'
import LatencyChart from '@components/LatencyChart'
import useNetworkStatus from '@hooks/useNetworkStatus'
import useDetectedGames from '@hooks/useDetectedGames'

export const Monitor: React.FC = () => {
  const { quality } = useNetworkStatus()
  const [latencyHistory, setLatencyHistory] = useState<number[]>([])
  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  const detectedGames = useDetectedGames()

  // Update latency history
  useEffect(() => {
    let cancelled = false

    const updateHistory = () => {
      window.app.network.getLatencyHistory(300).then((history) => {
        if (!cancelled) setLatencyHistory(history)
      })
    }

    updateHistory()
    const interval = setInterval(updateHistory, 1000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return (
    <Layout header={<Header />}>
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          {/* Main chart */}
          <LatencyChart data={latencyHistory} width={800} height={200} maxLatency={300} />

          {/* Detailed metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Current Ping"
              value={Math.round(quality?.latency.average || 0)}
              unit="ms"
              status={
                (quality?.latency.average || 0) < 50
                  ? 'excellent'
                  : (quality?.latency.average || 0) < 100
                    ? 'good'
                    : 'poor'
              }
            />

            <MetricCard
              title="Min Ping"
              value={Math.round(quality?.latency.min || 0)}
              unit="ms"
              status="good"
            />

            <MetricCard
              title="Max Ping"
              value={Math.round(quality?.latency.max || 0)}
              unit="ms"
              status={
                (quality?.latency.max || 0) > 200 ? 'poor' : 'good'
              }
            />

            <MetricCard
              title="Std Dev"
              value={Math.round((quality?.latency.stddev || 0) * 10) / 10}
              unit="ms"
              status={
                (quality?.latency.stddev || 0) < 20
                  ? 'good'
                  : 'poor'
              }
            />
          </div>

          {/* Jitter and Packet Loss */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-bold mb-4">Jitter Analysis</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Current Value:</span>
                  <span className="text-white font-bold">
                    {Math.round((quality?.jitter.value || 0) * 10) / 10}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Trend:</span>
                  <span className="text-white font-bold capitalize">
                    {quality?.jitter.trend || 'stable'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Threshold Exceeded:</span>
                  <span
                    className={`font-bold ${
                      quality?.jitter.threshold_exceeded ? 'text-red-400' : 'text-green-400'
                    }`}
                  >
                    {quality?.jitter.threshold_exceeded ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-bold mb-4">Packet Loss Analysis</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Loss Rate:</span>
                  <span className="text-white font-bold">
                    {Math.round((quality?.packet_loss.percentage || 0) * 100) / 100}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Packets Sent:</span>
                  <span className="text-white font-bold">
                    {quality?.packet_loss.packets_sent || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Packets Lost:</span>
                  <span className="text-white font-bold">
                    {quality?.packet_loss.packets_lost || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Consecutive Losses:</span>
                  <span className="text-white font-bold">
                    {quality?.packet_loss.consecutive_losses || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Games */}
          {detectedGames.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-bold mb-4">Active Games</h3>
              <div className="space-y-2">
                {detectedGames.map((game) => (
                  <div
                    key={game.pid}
                    className="flex items-center justify-between p-3 bg-gray-700 rounded hover:bg-gray-600 cursor-pointer"
                    onClick={() => setSelectedGame(game.profile.id)}
                  >
                    <div>
                      <div className="font-bold">{game.profile.name}</div>
                      <div className="text-sm text-gray-400">
                        PID: {game.pid} • CPU: {Math.round(game.cpu_usage)}% • Memory:{' '}
                        {Math.round(game.memory_usage / 1024 / 1024)}MB
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">
                        ↓ {(game.network_activity.received_bytes / 1024).toFixed(1)}KB
                      </div>
                      <div className="text-sm text-gray-400">
                        ↑ {(game.network_activity.sent_bytes / 1024).toFixed(1)}KB
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Route Issues (from real traceroute analysis) */}
          <RouteIssuesPanel />

          {/* System Statistics */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-bold mb-4">System Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-gray-400 text-sm">Last Updated</div>
                <div className="text-lg font-bold">
                  {quality
                    ? new Date(quality.last_update).toLocaleTimeString()
                    : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">Sample Count</div>
                <div className="text-lg font-bold">{quality?.latency.sample_count || 0}</div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">Quality Score</div>
                <div className="text-lg font-bold">{Math.round(quality?.score || 0)}/100</div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">Status</div>
                <div className="text-lg font-bold capitalize">{quality?.status || 'Unknown'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
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
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-bold mb-2">Route Issues</h3>
      <p className="text-xs text-gray-500 mb-4">
        Detected from real traceroute measurements every 5 minutes.
      </p>
      {issues.length === 0 ? (
        <p className="text-sm text-gray-500 italic">
          No issues detected yet (or traceroute is unavailable on this system).
        </p>
      ) : (
        <div className="space-y-2">
          {issues.map((issue, i) => (
            <div key={i} className="p-3 bg-gray-700 rounded text-sm">
              <span className="text-yellow-400 font-medium">{issue.issue.replace(/_/g, ' ')}</span>
              <span className="text-gray-400"> — {issue.detail}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const Header: React.FC = () => {
  return (
    <div className="px-6 py-4">
      <h2 className="text-2xl font-bold">Detailed Monitoring</h2>
      <p className="text-gray-400 text-sm">Real-time network performance analysis</p>
    </div>
  )
}

export default Monitor
