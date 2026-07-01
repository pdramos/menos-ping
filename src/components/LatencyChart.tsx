/**
 * Latency chart component using SVG
 */

import React, { useMemo } from 'react'

interface LatencyChartProps {
  data: number[]
  width?: number
  height?: number
  maxLatency?: number
}

export const LatencyChart: React.FC<LatencyChartProps> = ({
  data,
  width = 400,
  height = 150,
  maxLatency = 300,
}) => {
  const padding = { top: 20, right: 20, bottom: 30, left: 40 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const points = useMemo(() => {
    if (data.length === 0) return []

    const step = chartWidth / (data.length - 1 || 1)
    return data.map((value, index) => ({
      x: padding.left + index * step,
      y: padding.top + chartHeight - (value / maxLatency) * chartHeight,
      value,
    }))
  }, [data, chartWidth, chartHeight, maxLatency])

  const pathD = useMemo(() => {
    if (points.length === 0) return ''
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  }, [points])

  const avgValue = data.length > 0 ? Math.round(data.reduce((a, b) => a + b) / data.length) : 0
  const minValue = data.length > 0 ? Math.min(...data) : 0
  const maxValue = data.length > 0 ? Math.max(...data) : 0

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Latency Over Time</h3>
        <div className="text-sm text-gray-400">
          <span className="mr-4">Avg: {avgValue}ms</span>
          <span className="mr-4">Min: {minValue}ms</span>
          <span>Max: {maxValue}ms</span>
        </div>
      </div>

      <svg width={width} height={height} className="w-full">
        {/* Background grid */}
        <defs>
          <pattern id="grid" width="40" height="30" patternUnits="userSpaceOnUse">
            <path d={`M 40 0 L 0 0 0 30`} fill="none" stroke="#374151" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#grid)" />

        {/* Y-axis labels */}
        {[0, 1, 2].map((i) => (
          <g key={`y-${i}`}>
            <line
              x1={padding.left - 5}
              y1={padding.top + (chartHeight / 2) * i}
              x2={padding.left}
              y2={padding.top + (chartHeight / 2) * i}
              stroke="#6b7280"
              strokeWidth="1"
            />
            <text
              x={padding.left - 10}
              y={padding.top + (chartHeight / 2) * i + 4}
              textAnchor="end"
              fontSize="12"
              fill="#9ca3af"
            >
              {maxLatency - (maxLatency / 2) * i}ms
            </text>
          </g>
        ))}

        {/* Chart area background */}
        <rect
          x={padding.left}
          y={padding.top}
          width={chartWidth}
          height={chartHeight}
          fill="rgba(30, 58, 138, 0.05)"
        />

        {/* Zero line */}
        <line
          x1={padding.left}
          y1={padding.top + chartHeight}
          x2={padding.left + chartWidth}
          y2={padding.top + chartHeight}
          stroke="#4b5563"
          strokeWidth="1"
          strokeDasharray="5,5"
        />

        {/* Path line */}
        <path d={pathD} fill="none" stroke="#0ea5e9" strokeWidth="2" vectorEffect="non-scaling-stroke" />

        {/* Area under line */}
        <path
          d={`${pathD} L ${padding.left + chartWidth} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`}
          fill="url(#gradient)"
          opacity="0.3"
        />

        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Points */}
        {points.map((p, i) => (
          <circle
            key={`point-${i}`}
            cx={p.x}
            cy={p.y}
            r="3"
            fill="#0ea5e9"
            opacity={i === points.length - 1 ? 1 : 0}
          />
        ))}
      </svg>
    </div>
  )
}

export default LatencyChart
