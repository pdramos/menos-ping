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
      return 'text-accent'
    case 'good':
      return 'text-emerald-400'
    case 'fair':
      return 'text-gold'
    case 'poor':
      return 'text-warn'
    case 'critical':
      return 'text-danger'
    default:
      return 'text-muted'
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
    <div className="bg-panel rounded-2xl p-4 border border-border hover:border-[#2c3d5a] transition">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-muted text-sm font-medium">{title}</h3>
        {icon && <div className="text-muted">{icon}</div>}
      </div>

      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-bold ${getStatusColor(status)}`}>{value}</span>
        {unit && <span className="text-muted text-sm">{unit}</span>}
      </div>

      {trend && (
        <div className="mt-2 flex items-center gap-1">
          <span className="text-muted text-xs">
            {trend === 'up' && '📈'}
            {trend === 'down' && '📉'}
            {trend === 'stable' && '➡️'}
          </span>
          <span className="text-muted text-xs capitalize">{trend}</span>
        </div>
      )}
    </div>
  )
}

export default MetricCard
