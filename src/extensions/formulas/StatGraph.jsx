// src/extensions/formulas/StatGraph.jsx
//
// Large statistic graph for the Formulas module — mirrors the Statistics module's
// look (recharts LineChart with black/red colored trend segments) as a self-
// contained component. Props:
//   stat   : { name, stat_type, tracking, upside_down, show_values }
//   series : [{ value, period_date }]  (ascending by period_date)
//   height : number (px, default 420)
import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Customized,
} from 'recharts'

const FG = '#3A5038'

export function fmt(value, statType) {
  if (value == null) return ''
  const n = Number(value)
  if (statType === 'currency')
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (statType === 'percentage') return n.toFixed(2) + '%'
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

export function periodLabel(dateStr, tracking) {
  const d = new Date(dateStr + 'T00:00:00')
  if (tracking === 'yearly') return d.getFullYear().toString()
  if (tracking === 'quarterly') {
    const q = Math.floor(d.getMonth() / 3) + 1
    return `Q${q} ${d.getFullYear()}`
  }
  if (tracking === 'monthly')
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Colored trend segments: black when moving in the "good" direction, red otherwise
// (respecting upside_down = lower-is-better).
function ColoredLineSegments({ formattedGraphicalItems, stat }) {
  const points = (formattedGraphicalItems?.[0]?.props?.points ?? []).filter(
    p => p != null && p.value != null && isFinite(p.x) && isFinite(p.y)
  )
  if (points.length === 0) return null
  return (
    <g>
      {points.map((pt, i) => {
        if (i === 0) return null
        const prev = points[i - 1]
        const going = stat?.upside_down ? pt.value <= prev.value : pt.value >= prev.value
        const color = going ? '#111111' : '#dc2626'
        return (
          <line key={`seg-${i}`} x1={prev.x} y1={prev.y} x2={pt.x} y2={pt.y} stroke={color} strokeWidth={3.1} strokeLinecap="round" />
        )
      })}
      {points.map((pt, i) => {
        const prev = points[i - 1]
        const going = prev == null ? true : stat?.upside_down ? pt.value <= prev.value : pt.value >= prev.value
        const dotColor = going ? '#111111' : '#dc2626'
        return (
          <g key={`dot-${i}`}>
            <circle cx={pt.x} cy={pt.y} r={4} fill={dotColor} stroke="#fff" strokeWidth={2} />
            {stat?.show_values && (
              <text x={pt.x} y={pt.y - 10} textAnchor="middle" fontSize={12} fill="#374151" fontWeight={600}>
                {fmt(pt.value, stat?.stat_type)}
              </text>
            )}
          </g>
        )
      })}
    </g>
  )
}

export default function StatGraph({ stat, series = [], height = 420 }) {
  const chartData = useMemo(
    () =>
      (series || [])
        .filter(r => r && r.value != null && !Number.isNaN(Number(r.value)))
        .map(r => ({ label: periodLabel(r.period_date, stat?.tracking), value: Number(r.value), date: r.period_date })),
    [series, stat]
  )

  const { yDomain, yTicks } = useMemo(() => {
    const vals = chartData.map(d => d.value).filter(v => v != null && isFinite(v))
    if (!vals.length) return { yDomain: ['auto', 'auto'], yTicks: undefined }
    const dataMin = Math.min(...vals)
    const dataMax = Math.max(...vals)
    const range = dataMax - dataMin || Math.abs(dataMax) || 1
    const rawStep = range / 10
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
    const candidates = [1, 2, 2.5, 5, 10].map(f => f * magnitude)
    const step = candidates.find(c => c >= rawStep) ?? candidates[candidates.length - 1]
    const rawBottom = Math.min(0, Math.floor(dataMin / step) * step)
    const rawTop = Math.ceil(dataMax / step) * step + step
    const ticks = []
    for (let t = rawBottom; t <= rawTop + step * 0.01; t = Math.round((t + step) * 1e10) / 1e10) ticks.push(t)
    if (stat?.upside_down) return { yDomain: [ticks[ticks.length - 1], ticks[0]], yTicks: [...ticks].reverse() }
    return { yDomain: [ticks[0], ticks[ticks.length - 1]], yTicks: ticks }
  }, [chartData, stat])

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl" style={{ height }}>
        No data to plot.
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 28, right: 24, left: 16, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#111827', fontWeight: 600, angle: -45, textAnchor: 'end', dx: -4, dy: 4 }}
            tickLine={false}
            axisLine={{ stroke: '#d1d5db' }}
            height={70}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={yDomain}
            ticks={yTicks}
            tick={{ fontSize: 11, fill: '#111827', fontWeight: 600 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => {
              if (stat?.stat_type === 'currency') return '$' + Number(v).toLocaleString()
              if (stat?.stat_type === 'percentage') return v + '%'
              return Number(v).toLocaleString()
            }}
            width={80}
          />
          <Tooltip content={() => null} cursor={{ stroke: '#9ca3af', strokeDasharray: '3 3' }} />
          <Line type="linear" dataKey="value" stroke="transparent" dot={false} activeDot={{ r: 6, fill: FG, stroke: 'white', strokeWidth: 2 }} isAnimationActive={false} />
          <Customized component={props => <ColoredLineSegments {...props} stat={stat} />} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
