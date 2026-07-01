/**
 * Metric card component for displaying network metrics
 */

import React from 'react'

interface MetricCardProps {
  title: string
  value: string | number
  unit?: string
  status?: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  trend?: 'up' | 'down' | 'stable'
  icon?: React.ReactNode
}

const getStatusColor = (status?: string): string => {
  switch (status) {
    case 'excellent':
      return 'text-green-400'
    case 'good':
      return 'text-emerald-400'
    case 'fair':
      return 'text-yellow-400'
    case 'poor':
      return 'text-orange-400'
    case 'critical':
      return 'text-red-400'
    default:
      return 'text-gray-400'
  }
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  status,
  trend,
  icon,
}) => {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
        {icon && <div className="text-gray-500">{icon}</div>}
      </div>

      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-bold ${getStatusColor(status)}`}>{value}</span>
        {unit && <span className="text-gray-500 text-sm">{unit}</span>}
      </div>

      {trend && (
        <div className="mt-2 flex items-center gap-1">
          <span className="text-gray-500 text-xs">
            {trend === 'up' && '📈'}
            {trend === 'down' && '📉'}
            {trend === 'stable' && '➡️'}
          </span>
          <span className="text-gray-500 text-xs capitalize">{trend}</span>
        </div>
      )}
    </div>
  )
}

export default MetricCard
