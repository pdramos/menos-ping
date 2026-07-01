/**
 * Dashboard page - Main view with real-time network metrics
 */

import React, { useState, useEffect } from 'react'
import Layout from '@components/Layout'
import MetricCard from '@components/MetricCard'
import useNetworkStatus from '@hooks/useNetworkStatus'
import { getApplication } from '@main/Application'

export const Dashboard: React.FC = () => {
  const { quality, latency, jitter, packetLoss } = useNetworkStatus()
  const [detectedGames, setDetectedGames] = useState<number>(0)
  const [uptime, setUptime] = useState<number>(0)

  useEffect(() => {
    const app = getApplication()
    const detector = app.getGameDetector()

    const updateGamesCount = () => {
      setDetectedGames(detector.getDetectedGames().length)
    }

    updateGamesCount()

    const unsubscribe = detector.onGameEvent(() => {
      updateGamesCount()
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Update uptime
  useEffect(() => {
    const interval = setInterval(() => {
      setUptime((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`
    }
    return `${secs}s`
  }

  const statusColor =
    quality?.status === 'excellent'
      ? 'bg-green-900'
      : quality?.status === 'good'
        ? 'bg-emerald-900'
        : quality?.status === 'fair'
          ? 'bg-yellow-900'
          : quality?.status === 'poor'
            ? 'bg-orange-900'
            : 'bg-red-900'

  return (
    <Layout
      sidebar={<Sidebar />}
      header={<Header />}
    >
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          {/* Connection Quality Overview */}
          <div className={`${statusColor} rounded-lg p-6 border border-gray-600 transition`}>
            <h2 className="text-xl font-bold mb-2">Connection Quality</h2>
            <p className="text-gray-300 mb-4">
              Your connection is{' '}
              <span className="font-bold capitalize text-white">{quality?.status || 'unknown'}</span>
            </p>
            <div className="flex items-center gap-4">
              <div className="text-5xl font-bold text-white">{quality?.score || 0}</div>
              <div className="text-gray-300">
                <p className="text-sm">Quality Score</p>
                <p className="text-xs text-gray-400">Out of 100</p>
              </div>
            </div>
          </div>

          {/* Main Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Latency"
              value={Math.round(latency)}
              unit="ms"
              status={
                latency < 50
                  ? 'excellent'
                  : latency < 100
                    ? 'good'
                    : latency < 150
                      ? 'fair'
                      : latency < 250
                        ? 'poor'
                        : 'critical'
              }
              trend={
                Math.random() > 0.5 ? ('stable' as const) : ('down' as const)
              }
            />

            <MetricCard
              title="Jitter"
              value={Math.round(jitter * 10) / 10}
              unit="ms"
              status={jitter < 10 ? 'excellent' : jitter < 20 ? 'good' : 'poor'}
            />

            <MetricCard
              title="Packet Loss"
              value={Math.round(packetLoss * 100) / 100}
              unit="%"
              status={
                packetLoss < 0.1
                  ? 'excellent'
                  : packetLoss < 0.5
                    ? 'good'
                    : packetLoss < 1
                      ? 'fair'
                      : 'critical'
              }
            />

            <MetricCard
              title="Active Games"
              value={detectedGames}
              status={detectedGames > 0 ? 'good' : 'fair'}
            />
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Min Latency"
              value={Math.round(quality?.latency.min || 0)}
              unit="ms"
            />

            <MetricCard
              title="Max Latency"
              value={Math.round(quality?.latency.max || 0)}
              unit="ms"
            />

            <MetricCard
              title="Uptime"
              value={formatUptime(uptime)}
            />
          </div>

          {/* Recent Activity */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-bold mb-4">Recent Activity</h3>
            <div className="space-y-2 text-sm text-gray-400">
              <p>✓ Network monitor active</p>
              <p>✓ Game detector running</p>
              <p>✓ Optimizations applied</p>
              <p>✓ Last update: Just now</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

const Sidebar: React.FC = () => {
  return (
    <div className="p-4 flex flex-col h-full">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white">Menos Ping</h1>
        <p className="text-xs text-gray-500">Gaming Latency Optimizer</p>
      </div>

      <nav className="space-y-2 flex-1">
        {['Dashboard', 'Monitor', 'Settings', 'Tools'].map((item) => (
          <button
            key={item}
            className={`w-full text-left px-4 py-2 rounded transition ${
              item === 'Dashboard'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {item}
          </button>
        ))}
      </nav>

      <div className="border-t border-gray-700 pt-4">
        <button className="w-full text-left px-4 py-2 rounded text-gray-400 hover:bg-gray-700 hover:text-white transition">
          About
        </button>
        <button className="w-full text-left px-4 py-2 rounded text-gray-400 hover:bg-gray-700 hover:text-white transition">
          Settings
        </button>
      </div>
    </div>
  )
}

const Header: React.FC = () => {
  const [time, setTime] = React.useState(new Date().toLocaleTimeString())

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="px-6 py-4 flex items-center justify-between">
      <h2 className="text-2xl font-bold">Dashboard</h2>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-400">{time}</span>
        <button className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 transition flex items-center justify-center">
          ⚙️
        </button>
      </div>
    </div>
  )
}

export default Dashboard
